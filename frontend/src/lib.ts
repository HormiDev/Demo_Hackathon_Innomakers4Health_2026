import type { CaseData, Catalog, Question, Result } from "./types";

export const INITIAL_CASE: CaseData = {
  age_months: 360,
  respondent: "self",
  reason: "",
  body_zones: [],
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

// Comprueba las condiciones compartidas con el catálogo recibido del backend.
export function isEligible(question: Question, data: CaseData): boolean {
  if (
    question.max_age_months !== null &&
    data.age_months > question.max_age_months
  )
    return false;
  return (
    !(question.zones.length || question.symptoms.length) ||
    question.zones.some((zone) => data.body_zones.includes(zone)) ||
    question.symptoms.some((symptom) => data.symptoms.includes(symptom))
  );
}

// Descarta respuestas dependientes que ya no se aplican y revoca la revisión anterior.
export function updateCase(
  current: CaseData,
  patch: Partial<CaseData>,
  catalog: Catalog | null,
): CaseData {
  const next = { ...current, ...patch, reviewed: false };
  if (patch.age_months !== undefined && patch.age_months !== current.age_months)
    next.answers = {};
  if (next.age_months >= 216)
    next.alarms = next.alarms.filter((item) => item !== "child_breathing");
  if (catalog)
    next.answers = Object.fromEntries(
      Object.entries(next.answers).filter(([id]) =>
        catalog.questions.some((q) => q.id === id && isEligible(q, next)),
      ),
    );
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
