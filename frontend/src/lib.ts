import type { CaseData, Catalog, Question, Result, Symptom } from "./types";

export const INITIAL_CASE: CaseData = {
  age_months: 360,
  gender: "not_specified",
  respondent: "self",
  reason: "",
  body_zones: [],
  body_details: {},
  onset: "",
  duration: "",
  evolution: "",
  pain: null,
  symptoms: [],
  alarms: [],
  answers: {},
  history: "",
  reviewed: false,
};
export const GENDERS = [
  { id: "female", label: "Mujer" },
  { id: "male", label: "Hombre" },
  { id: "non_binary", label: "No binario" },
  { id: "other", label: "Otro" },
  { id: "not_specified", label: "Prefiero no indicarlo" },
];
export const ONSETS = [
  { id: "sudden", label: "De repente" },
  { id: "gradual", label: "Poco a poco" },
  { id: "unknown", label: "No sé" },
];
export const DURATIONS = [
  { id: "hours", label: "Horas" },
  { id: "days", label: "Días" },
  { id: "weeks", label: "Semanas" },
  { id: "months", label: "Meses" },
  { id: "years", label: "Años" },
  { id: "unknown", label: "No sé" },
];
export const EVOLUTIONS = [
  { id: "improving", label: "Mejora" },
  { id: "stable", label: "Sigue igual" },
  { id: "worsening", label: "Empeora" },
  { id: "intermittent", label: "Va y viene" },
  { id: "unknown", label: "No sé" },
];

// Alterna opciones y mantiene exclusivas las respuestas ninguna, general y no sé.
export function toggleOption(current: string[], value: string): string[] {
  const exclusive = ["none", "unknown", "general"];
  if (current.includes(value)) return current.filter((item) => item !== value);
  return exclusive.includes(value)
    ? [value]
    : [...current.filter((item) => !exclusive.includes(item)), value];
}

// Coincide con los puntos de la ampliación y respeta regiones sin precisión opcional.
export function matchesParts(
  parts: Record<string, string[]> | undefined,
  data: CaseData,
  catalog?: Catalog | null,
  zones: string[] = [],
  allowUnspecified = true,
): boolean {
  if (!parts || !Object.keys(parts).length) return true;
  return data.body_zones.some((zone) => {
    if (zones.length && !zones.includes(zone)) return false;
    const kind = catalog?.body_details?.[zone]?.kind || zone.replace(/^(left_|right_)/, "");
    if (!parts[kind]) return false;
    const selected = data.body_details?.[zone] || [];
    return (!selected.length && allowUnspecified) || selected.some((part) => parts[kind].includes(part));
  });
}

// Comparte las condiciones del banco de preguntas para retirar respuestas ya caducadas.
export function isEligible(question: Question, data: CaseData, catalog?: Catalog | null): boolean {
  if (question.max_age_months != null && data.age_months > question.max_age_months) return false;
  if (question.min_age_months != null && data.age_months < question.min_age_months) return false;
  const symptomMatch = question.symptoms.some((symptom) => data.symptoms.includes(symptom));
  const zoneMatch = question.zones.some((zone) => data.body_zones.includes(zone));
  const hasParts = !!Object.keys(question.parts || {}).length;
  const partMatch = hasParts && matchesParts(question.parts, data, catalog, question.zones, !!question.allow_unspecified_parts);
  const required = Object.entries(question.requires_answers || {});
  const answersMatch = required.every(([id, allowed]) => {
    const value = data.answers[id];
    return (Array.isArray(value) ? value : [value]).some((item) => allowed.includes(item));
  });
  if ((question.zones.length || question.symptoms.length || hasParts) && !(symptomMatch || zoneMatch || partMatch || (required.length > 0 && answersMatch))) return false;
  if (hasParts && !(partMatch || symptomMatch || (required.length > 0 && answersMatch))) return false;
  if (question.genders?.length && ["female", "male"].includes(data.gender) && !question.genders.includes(data.gender) && !symptomMatch) return false;
  const scoped = data.body_zones.filter((zone) => !question.zones.length || question.zones.includes(zone));
  if (question.skip_if_details && scoped.length && scoped.every((zone) => data.body_details?.[zone]?.length)) return false;
  if (Object.keys(question.skip_if_parts || {}).length && matchesParts(question.skip_if_parts, data, catalog, [], false)) return false;
  if (question.onsets?.length && !question.onsets.includes(data.onset)) return false;
  if (question.durations?.length && !question.durations.includes(data.duration)) return false;
  if (question.evolutions?.length && !question.evolutions.includes(data.evolution)) return false;
  if (question.skip_if_symptoms?.some((symptom) => data.symptoms.includes(symptom))) return false;
  return answersMatch || (!!question.answer_or_symptoms && symptomMatch);
}

// Mantiene disponibles síntomas de otras zonas sin inferir anatomía por el género.
export function availableSymptoms(data: CaseData, catalog: Catalog): Symptom[] {
  return catalog.symptoms.filter((item) =>
    (item.min_age_months == null || data.age_months >= item.min_age_months) &&
      (item.max_age_months == null || data.age_months <= item.max_age_months),
  );
}

// Interpreta las reglas del catálogo compartido para las sugerencias de cada caso.
export function matchesSymptomContext(
  item: Symptom,
  data: CaseData,
  prioritizeGender = true,
  catalog?: Catalog | null,
): boolean {
  const broad = data.body_zones.some((zone) =>
    ["general", "unknown"].includes(zone),
  );
  return (
    (!item.zones?.length ||
      (broad && !!item.general) ||
      item.zones.some((zone) => data.body_zones.includes(zone))) &&
    matchesParts(item.parts, data, catalog, item.zones) &&
    (!item.onsets?.length || item.onsets.includes(data.onset)) &&
    (!item.durations?.length || item.durations.includes(data.duration)) &&
    (!prioritizeGender ||
      !item.preferred_genders?.length ||
      !["male", "female"].includes(data.gender) ||
      item.preferred_genders.includes(data.gender))
  );
}

// Ordena primero las opciones íntimas y las más específicas de las zonas elegidas.
export function eligibleSymptoms(data: CaseData, catalog: Catalog): Symptom[] {
  return availableSymptoms(data, catalog)
    .filter((item) => matchesSymptomContext(item, data, true, catalog))
    .sort((a, b) =>
      Number(!a.preferred_genders?.length) - Number(!b.preferred_genders?.length) ||
      Number(!(Object.keys(a.parts || {}).length && matchesParts(a.parts, data, catalog, a.zones, false))) -
        Number(!(Object.keys(b.parts || {}).length && matchesParts(b.parts, data, catalog, b.zones, false))) ||
        (a.zones?.length || 999) - (b.zones?.length || 999),
    );
}

// Limita las sugerencias iniciales conservando generales, ninguna y no sé.
export function symptomChoices(data: CaseData, catalog: Catalog) {
  const suggested = eligibleSymptoms(data, catalog);
  const exclusive = suggested.filter((item) =>
    ["none", "unknown"].includes(item.id),
  );
  const common = suggested.filter((item) =>
    !item.zones?.length && !["none", "unknown"].includes(item.id),
  );
  const regional = suggested.filter((item) => item.zones?.length);
  const primary = [
    ...regional.slice(0, Math.max(0, 10 - common.length)),
    ...common,
    ...exclusive,
  ];
  const primaryIds = new Set(primary.map((item) => item.id));
  const suggestedIds = new Set(suggested.map((item) => item.id));
  const more = availableSymptoms(data, catalog).filter((item) =>
    !primaryIds.has(item.id),
  );
  return {
    primary,
    related: more.filter((item) => suggestedIds.has(item.id)),
    other: more.filter((item) => !suggestedIds.has(item.id)),
  };
}

// Descarta respuestas dependientes que ya no se aplican y revoca la revisión anterior.
export function updateCase(
  current: CaseData,
  patch: Partial<CaseData>,
  catalog: Catalog | null,
): CaseData {
  const next = { ...current, ...patch, reviewed: false };
  next.body_details = Object.fromEntries(
    Object.entries(next.body_details || {}).filter(([zone]) => next.body_zones.includes(zone)),
  );
  if (JSON.stringify(next.body_details) !== JSON.stringify(current.body_details || {})) {
    next.answers = {};
    next.symptoms = next.symptoms.filter((id) => !["none", "unknown"].includes(id));
  }
  if (patch.age_months !== undefined && patch.age_months !== current.age_months)
    next.answers = {};
  if (next.age_months >= 216)
    next.alarms = next.alarms.filter((item) => item !== "child_breathing");
  if (catalog) {
    const regionChanged =
      patch.body_zones !== undefined &&
      [...patch.body_zones].sort().join() !== [...current.body_zones].sort().join();
    const timingChanged =
      (patch.onset !== undefined && patch.onset !== current.onset) ||
      (patch.duration !== undefined && patch.duration !== current.duration);
    const ageChanged =
      patch.age_months !== undefined && patch.age_months !== current.age_months;
    const genderChanged =
      patch.gender !== undefined && patch.gender !== current.gender;
    if (regionChanged || timingChanged || ageChanged || genderChanged)
      next.answers = {};
    if (regionChanged || timingChanged || ageChanged) {
      const allowed = new Set(
        availableSymptoms(next, catalog)
          .filter((item) =>
            !(regionChanged || timingChanged) ||
              matchesSymptomContext(item, next, false, catalog),
          )
          .map((item) => item.id),
      );
      // Ninguna/no sé describían la lista anterior: hay que confirmar la nueva.
      next.symptoms = next.symptoms.filter((id) =>
        allowed.has(id) && !["none", "unknown"].includes(id),
      );
    }
    if (genderChanged)
      next.symptoms = next.symptoms.filter((id) =>
        !["none", "unknown"].includes(id),
      );
    // Repite el filtrado para retirar también ramas que dependían de una respuesta retirada.
    let previousCount: number;
    do {
      previousCount = Object.keys(next.answers).length;
      next.answers = Object.fromEntries(
        Object.entries(next.answers).filter(([id]) =>
          catalog.questions.some((question) => question.id === id && isEligible(question, next, catalog)),
        ),
      );
    } while (Object.keys(next.answers).length !== previousCount);
  }
  return next;
}

// Comunica errores recuperables sin sustituir las respuestas reales del servidor.
export async function api<T>(
  path: string,
  data?: CaseData,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method: data ? "POST" : "GET",
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    cache: "no-store",
    signal,
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("El servidor no ha devuelto una respuesta válida.");
  }
  if (!response.ok)
    throw new Error(
      payload.error?.message || "No se ha podido completar la operación.",
    );
  return payload as T;
}

// Lee archivos de texto UTF-8 sin renderizar Markdown ni aceptar formatos binarios.
export async function readHistory(file: File): Promise<string> {
  if (!/\.(txt|md)$/i.test(file.name))
    throw new Error("Elige un archivo .txt o .md.");
  if (file.size > 1048576) throw new Error("El archivo supera 1 MiB.");
  const bytes = await file.arrayBuffer();
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("Guarda el archivo con codificación UTF-8.");
  }
  if (text.includes("\0"))
    throw new Error(
      "El archivo contiene datos binarios. Elige un archivo de texto.",
    );
  return text;
}

// Traduce identificadores del caso a etiquetas legibles para revisión y exportación.
export function caseSummary(
  data: CaseData,
  catalog: Catalog,
): [string, string][] {
  const labels = (ids: string[], options: { id: string; label: string }[]) =>
    ids
      .map((id) => options.find((opt) => opt.id === id)?.label || id)
      .join(", ");
  const rows: [string, string][] = [
    [
      "Edad",
      `${Math.floor(data.age_months / 12)} años y ${data.age_months % 12} meses`,
    ],
    ["Género", labels([data.gender], GENDERS)],
    ["Responde", data.respondent === "self" ? "Paciente" : "Acompañante"],
    ["Motivo de consulta", data.reason],
    ["Localización", labels(data.body_zones, catalog.body_zones)],
    [
      "Intensidad del dolor",
      data.pain === null ? "No sé valorarlo" : `${data.pain}/10`,
    ],
    ["Comienzo", labels([data.onset], ONSETS)],
    ["Duración", labels([data.duration], DURATIONS)],
    ["Evolución", labels([data.evolution], EVOLUTIONS)],
    ["Síntomas asociados", labels(data.symptoms, catalog.symptoms)],
    ["Señales de alarma declaradas", labels(data.alarms, catalog.alarms)],
  ];
  const detailed = Object.entries(data.body_details || {}).map(([zone, parts]) =>
    `${labels([zone], catalog.body_zones)}: ${labels(parts, catalog.body_details?.[zone]?.options || [])}`,
  );
  if (detailed.length) rows.splice(5, 0, ["Localización detallada", detailed.join("; ")]);
  for (const [id, value] of Object.entries(data.answers)) {
    const q = catalog.questions.find((item) => item.id === id);
    if (q)
      rows.push([
        q.label,
        labels(Array.isArray(value) ? value : [value], q.options),
      ]);
  }
  return rows;
}

// Crea un resumen descargable que conserva porcentajes y límites de interpretación.
export function reportText(
  data: CaseData,
  catalog: Catalog,
  result?: Result,
): string {
  const lines = [
    "DERIVA · Resumen orientativo de derivación",
    "Demo de hackathon · Pendiente de validación clínica",
    "",
    ...caseSummary(data, catalog).map(([label, value]) => `${label}: ${value}`),
    "",
    "HISTORIAL",
    data.history || "No aportado",
  ];
  if (result)
    lines.push(
      "",
      "RESULTADOS",
      result.label,
      ...result.warnings,
      ...result.rankings.map(
        (item) => `${item.name}: ${(item.probability * 100).toFixed(2)} %`,
      ),
      `Modelo: ${result.model} · Catálogo: ${result.catalog_version} · Latencia: ${result.latency_ms} ms`,
    );
  lines.push(
    "",
    "La decisión de derivación corresponde al profesional médico.",
  );
  return lines.join("\n");
}

// Descarga el informe mediante un recurso temporal que se libera tras su uso.
export function downloadReport(text: string): void {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "deriva-resumen.txt";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
