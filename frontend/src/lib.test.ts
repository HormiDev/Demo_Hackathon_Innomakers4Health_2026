import { describe, expect, it } from "vitest";
import {
  INITIAL_CASE,
  isEligible,
  eligibleSymptoms,
  symptomChoices,
  readHistory,
  reportText,
  toggleOption,
  updateCase,
} from "./lib";
import type { Catalog } from "./types";

const catalog = {
  questions: [
    {
      id: "foot",
      label: "Pie",
      zones: ["right_foot"],
      symptoms: [],
      max_age_months: null,
      kind: "single",
      options: [],
    },
    {
      id: "infant",
      label: "Bebé",
      zones: [],
      symptoms: [],
      max_age_months: 23,
      kind: "single",
      options: [],
    },
  ],
  body_zones: [{ id: "right_foot", label: "Pie derecho" }],
  symptoms: [],
  alarms: [],
} as unknown as Catalog;

// Crea un archivo con bytes controlados sin depender de APIs ausentes en jsdom.
function textFile(name: string, bytes: Uint8Array, size = bytes.length): File {
  return {
    name,
    size,
    arrayBuffer: async () => bytes.buffer,
  } as unknown as File;
}

describe("Selección y dependencias", () => {
  // Reserva el recorrido pediátrico completo cuando cambia la edad de un caso existente.
  it("reinicia las preguntas adicionales al cambiar la edad", () => {
    const data = {
      ...INITIAL_CASE,
      body_zones: ["right_foot"],
      answers: { foot: "sole" },
    };
    expect(updateCase(data, { age_months: 84 }, catalog).answers).toEqual({});
  });
  // Mantiene la exclusividad y permite quitar una selección existente.
  it("gestiona ninguna, no sé y varias zonas", () => {
    expect(toggleOption(["none"], "cough")).toEqual(["cough"]);
    expect(toggleOption(["head"], "unknown")).toEqual(["unknown"]);
    expect(toggleOption(["head"], "head")).toEqual([]);
    expect(toggleOption(["right_foot"], "left_foot")).toEqual([
      "right_foot",
      "left_foot",
    ]);
  });

  // Elimina respuestas caducadas por edad y zona y revoca la revisión.
  it("invalida preguntas dependientes", () => {
    const data = {
      ...INITIAL_CASE,
      age_months: 4,
      body_zones: ["right_foot"],
      answers: { foot: "sole", infant: "normal" },
      reviewed: true,
    };
    const changed = updateCase(
      data,
      { age_months: 300, body_zones: ["head"] },
      catalog,
    );
    expect(changed.answers).toEqual({});
    expect(changed.reviewed).toBe(false);
  });
});

describe("Dependencias de preguntas y puntos concretos", () => {
  const focal: Catalog = {
    ...catalog,
    symptoms: [
      { id: "wrist_clicks", label: "Chasquidos de muñeca", zones: ["left_hand"], parts: { hand: ["wrist"] } },
      { id: "finger_locking", label: "Bloqueo de dedo", zones: ["left_hand"], parts: { hand: ["index", "thumb"] } },
      { id: "unknown", label: "No sé", zones: [] },
    ],
    questions: [
      { ...catalog.questions[0], id: "finger_motion", zones: ["left_hand"], parts: { hand: ["index", "thumb"] } },
      { ...catalog.questions[0], id: "finger_locking", zones: ["left_hand"], requires_answers: { finger_motion: ["locks"] } },
      { ...catalog.questions[0], id: "locking_pattern", zones: ["left_hand"], requires_answers: { finger_locking: ["morning"] } },
    ],
  };
  const hand = { ...INITIAL_CASE, body_zones: ["left_hand"], body_details: { left_hand: ["index"] } };

  it("distingue muñeca y dedo, conserva declaraciones y reconfirma no sé", () => {
    expect(eligibleSymptoms(hand, focal).map((item) => item.id)).toContain("finger_locking");
    expect(eligibleSymptoms(hand, focal).map((item) => item.id)).not.toContain("wrist_clicks");
    const changed = updateCase({ ...hand, symptoms: ["finger_locking"] }, { body_details: { left_hand: ["wrist"] } }, focal);
    expect(eligibleSymptoms(changed, focal).map((item) => item.id)).toContain("wrist_clicks");
    expect(changed.symptoms).toEqual(["finger_locking"]);
    expect(symptomChoices(changed, focal).other.map((item) => item.id)).toContain("finger_locking");
    expect(updateCase({ ...hand, symptoms: ["unknown"] }, { body_details: { left_hand: ["wrist"] } }, focal).symptoms).toEqual([]);
  });

  it("habilita ramas por respuestas y retira también sus descendientes", () => {
    expect(isEligible(focal.questions[0], hand, focal)).toBe(true);
    expect(isEligible(focal.questions[1], hand, focal)).toBe(false);
    const answered = { ...hand, answers: { finger_motion: "locks", finger_locking: "morning", locking_pattern: "yes" } };
    expect(isEligible(focal.questions[1], answered, focal)).toBe(true);
    const changed = updateCase(answered, { answers: { ...answered.answers, finger_motion: "pain" } }, focal);
    expect(changed.answers).toEqual({ finger_motion: "pain" });
    expect(isEligible(focal.questions[0], { ...hand, body_details: { left_hand: ["wrist"] } }, focal)).toBe(false);
    const branch = { ...focal.questions[1], zones: [], symptoms: ["rash"] };
    expect(isEligible(branch, answered, focal)).toBe(true);
    expect(isEligible(branch, hand, focal)).toBe(false);
  });
});

describe("Historial local", () => {
  // Conserva Markdown como texto y caracteres UTF-8 sin interpretarlos.
  it("acepta TXT y Markdown UTF-8", async () => {
    const text = "# Revisión\nSin antecedentes";
    expect(
      await readHistory(
        textFile("historial.md", new TextEncoder().encode(text)),
      ),
    ).toBe(text);
    expect(
      await readHistory(
        textFile("historial.txt", new TextEncoder().encode(text)),
      ),
    ).toBe(text);
  });

  // Evita aceptar archivos binarios, extensiones ajenas o tamaños excesivos.
  it("rechaza formatos y bytes inválidos", async () => {
    await expect(
      readHistory(textFile("historial.pdf", new Uint8Array())),
    ).rejects.toThrow(".txt");
    await expect(
      readHistory(textFile("historial.md", new Uint8Array(), 1048577)),
    ).rejects.toThrow("1 MiB");
    await expect(
      readHistory(textFile("historial.txt", new Uint8Array([0xff]))),
    ).rejects.toThrow("UTF-8");
    await expect(
      readHistory(textFile("historial.txt", new Uint8Array([0]))),
    ).rejects.toThrow("binarios");
  });

  // Incluye los límites de interpretación en el informe que se exporta.
  it("exporta contexto y límites", () => {
    const text = reportText(
      {
        ...INITIAL_CASE,
        reason: "Dolor de pie",
        gender: "non_binary",
        body_zones: ["right_foot"],
        history: "Sin alergias referidas",
      },
      catalog,
    );
    expect(text).toContain("Pie derecho");
    expect(text).toContain("Género: No binario");
    expect(text).toContain("Sin alergias referidas");
    expect(text).toContain("Pendiente de validación clínica");
  });
});

// Usa metadatos del mismo contrato que publica el catálogo del backend.
const adaptiveCatalog: Catalog = {
  ...catalog,
  symptoms: [
    { id: "fever", label: "Fiebre", zones: [] },
    { id: "nail_change", label: "Cambios en las uñas", zones: ["right_foot", "left_hand"] },
    { id: "vision", label: "Molestias visuales", zones: ["head"], min_age_months: 24 },
    { id: "menstrual_changes", label: "Cambios en la regla", zones: ["pelvis"], min_age_months: 96, preferred_genders: ["female"] },
    { id: "testicular_pain", label: "Molestia testicular", zones: ["pelvis"], preferred_genders: ["male"] },
    { id: "bruising", label: "Moratón", zones: ["right_foot"], onsets: ["sudden"], durations: ["hours", "days"] },
    { id: "infant_feeding", label: "Menos tomas", zones: [], max_age_months: 23 },
    { id: "none", label: "Ninguno de estos", zones: [] },
    { id: "unknown", label: "No sé", zones: [] },
  ],
};

describe("Síntomas adaptados al contexto", () => {
  // Sustituye la lista regional y mantiene disponibles síntomas de otros sistemas.
  it("cambia las sugerencias con la zona", () => {
    const data = { ...INITIAL_CASE, body_zones: ["right_foot"] };
    const foot = symptomChoices(data, adaptiveCatalog);
    expect(foot.primary.map((item) => item.id)).toContain("nail_change");
    expect(foot.primary.map((item) => item.id)).not.toContain("vision");
    expect(foot.other.map((item) => item.id)).toContain("vision");
    const head = symptomChoices({ ...data, body_zones: ["head"] }, adaptiveCatalog);
    expect(head.primary.map((item) => item.id)).toContain("vision");
    expect(head.primary.map((item) => item.id)).not.toContain("nail_change");
  });

  // El género cambia sugerencias, pero no elimina síntomas que el paciente haya declarado.
  it("prioriza por género sin asumir anatomía", () => {
    const data = { ...INITIAL_CASE, gender: "female" as const, body_zones: ["pelvis"] };
    const choices = symptomChoices(data, adaptiveCatalog);
    expect(choices.primary.map((item) => item.id)).toContain("menstrual_changes");
    expect(choices.primary.map((item) => item.id)).not.toContain("testicular_pain");
    expect(choices.other.map((item) => item.id)).toContain("testicular_pain");
    const changed = updateCase({ ...data, symptoms: ["menstrual_changes"] }, { gender: "male" }, adaptiveCatalog);
    expect(changed.symptoms).toEqual(["menstrual_changes"]);
    expect(symptomChoices(changed, adaptiveCatalog).other.map((item) => item.id)).toContain("menstrual_changes");
  });

  // Descarta valores de una lista anterior y obliga a confirmar de nuevo ninguna/no sé.
  it("limpia síntomas y respuestas al cambiar zona, edad o tiempo", () => {
    const data = {
      ...INITIAL_CASE, body_zones: ["right_foot"], symptoms: ["nail_change", "fever"],
      answers: { foot: "sole" }, reviewed: true,
    };
    const changed = updateCase(data, { body_zones: ["head"] }, adaptiveCatalog);
    expect(changed.symptoms).toEqual(["fever"]);
    expect(changed.answers).toEqual({});
    expect(changed.reviewed).toBe(false);
    expect(updateCase({ ...data, symptoms: ["none"] }, { duration: "months" }, adaptiveCatalog).symptoms).toEqual([]);
    expect(updateCase({ ...data, age_months: 4, symptoms: ["infant_feeding"] }, { age_months: 24 }, adaptiveCatalog).symptoms).toEqual([]);
  });

  // Las reglas temporales afectan solo a las sugerencias, sin bloquear otras declaraciones.
  it("adapta edad, comienzo y duración", () => {
    const acute = { ...INITIAL_CASE, body_zones: ["right_foot"], onset: "sudden", duration: "hours" };
    expect(eligibleSymptoms(acute, adaptiveCatalog).map((item) => item.id)).toContain("bruising");
    const chronic = { ...acute, onset: "gradual", duration: "months" };
    expect(eligibleSymptoms(chronic, adaptiveCatalog).map((item) => item.id)).not.toContain("bruising");
    expect(symptomChoices(chronic, adaptiveCatalog).other.map((item) => item.id)).toContain("bruising");
    const infant = symptomChoices({ ...acute, age_months: 4 }, adaptiveCatalog);
    expect(infant.primary.map((item) => item.id)).toContain("infant_feeding");
    expect([...infant.primary, ...infant.related, ...infant.other].map((item) => item.id)).not.toContain("vision");
  });
});


// Conserva precisión y lateralidad en revisión y exportación, retirando detalles caducados.
describe("Localización ampliada", () => {
  const detailCatalog: Catalog = {
    ...catalog,
    body_zones: [{ id: "left_hand", label: "Mano izquierda" }, { id: "right_foot", label: "Pie derecho" }],
    body_details: {
      left_hand: { kind: "hand", views: ["front", "back"], default_view: "front", options: [
        { id: "index", label: "Dedo índice", views: ["front", "back"] },
        { id: "wrist", label: "Muñeca", views: ["front", "back"] },
      ] },
    },
  };

  // Invalida la revisión y las preguntas cuando se precisa una región del caso.
  it("incorpora el detalle al informe y revoca la revisión", () => {
    const changed = updateCase({
      ...INITIAL_CASE, body_zones: ["left_hand"], answers: { foot: "sole" }, reviewed: true,
    }, { body_details: { left_hand: ["index", "wrist"] } }, detailCatalog);
    expect(changed.reviewed).toBe(false);
    expect(changed.answers).toEqual({});
    expect(reportText(changed, detailCatalog)).toContain("Localización detallada: Mano izquierda: Dedo índice, Muñeca");
  });

  // Impide arrastrar localizaciones finas de regiones que se han desmarcado.
  it("elimina solo los detalles de zonas retiradas", () => {
    const changed = updateCase({
      ...INITIAL_CASE, body_zones: ["left_hand", "right_foot"],
      body_details: { left_hand: ["index"], right_foot: ["heel"] },
    }, { body_zones: ["right_foot"] }, detailCatalog);
    expect(changed.body_details).toEqual({ right_foot: ["heel"] });
  });
});
