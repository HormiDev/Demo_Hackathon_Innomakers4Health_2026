import { describe, expect, it } from "vitest";
import {
  INITIAL_CASE,
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
        body_zones: ["right_foot"],
        history: "Sin alergias referidas",
      },
      catalog,
    );
    expect(text).toContain("Pie derecho");
    expect(text).toContain("Sin alergias referidas");
    expect(text).toContain("Pendiente de validación clínica");
  });
});
