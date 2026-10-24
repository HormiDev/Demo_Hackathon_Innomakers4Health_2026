import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileText,
  HeartPulse,
  Leaf,
  LoaderCircle,
  LockKeyhole,
  Plus,
  Printer,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";
import { BodyMap } from "./BodyMap";
import { Rankings } from "./Rankings";
import { Choices, Notice, PainScale } from "./components";
import {
  api,
  caseSummary,
  downloadReport,
  DURATIONS,
  EVOLUTIONS,
  GENDERS,
  INITIAL_CASE,
  ONSETS,
  readHistory,
  reportText,
  symptomChoices,
  updateCase,
} from "./lib";
import type { CaseData, Catalog, Health, NextResult, Result } from "./types";

const STEPS = [
  "El paciente",
  "La molestia",
  "Otros síntomas",
  "Preguntas a medida",
  "Revisión médica",
  "Orientación",
];
const STEP_TITLES = [
  "Empecemos por conocerte",
  "¿Dónde notas la molestia?",
  "Un poco más de contexto",
  "Cada respuesta nos orienta",
  "Una visión completa del caso",
  "El siguiente paso, con criterio",
];
const STEP_TEXT = [
  "Cada persona es diferente. Estos datos nos ayudan a adaptar las preguntas a ti.",
  "Selecciona una zona y precisa la localización en la vista ampliada.",
  "Los síntomas sugeridos se adaptan a los datos del paciente y a la zona de la molestia.",
  "Las siguientes preguntas se eligen según la información que has compartido.",
  "Revisa la información y añade el contexto clínico antes de consultar al modelo.",
  "Una orientación para acompañar la decisión del profesional médico.",
];

// Coordina un caso en memoria, sus revisiones y las peticiones cancelables a la API local.
export function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [data, setData] = useState<CaseData>({ ...INITIAL_CASE });
  const [age, setAge] = useState("");
  const [ageUnit, setAgeUnit] = useState("years");
  const [mode, setMode] = useState<"patient" | "doctor">("patient");
  const [step, setStep] = useState(0);
  const [next, setNext] = useState<NextResult | null>(null);
  const [draft, setDraft] = useState<string | string[]>("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [historyNotice, setHistoryNotice] = useState("");
  const controller = useRef<AbortController | null>(null);
  const version = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Vincula el tema al rol activo y comunica visualmente el relevo de la consulta.
  useEffect(() => {
    document.documentElement.dataset.mode = mode;
    return () => {
      delete document.documentElement.dataset.mode;
    };
  }, [mode]);

  // Carga los metadatos públicos sin restaurar ningún caso anterior.
  useEffect(() => {
    const abort = new AbortController();
    Promise.all([
      api<Catalog>("catalog", undefined, abort.signal),
      api<Health>("health", undefined, abort.signal),
    ])
      .then(([items, status]) => {
        setCatalog(items);
        setHealth(status);
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError")
          setError(
            "No se puede cargar la aplicación. Comprueba el backend y recarga la página.",
          );
      });
    return () => {
      abort.abort();
      controller.current?.abort();
    };
  }, []);

  // Mueve el foco al título para anunciar el nuevo paso a lectores de pantalla.
  useEffect(() => {
    heading.current?.focus();
    document.querySelector(".card-content")?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // Impide interactuar con el contenido de fondo mientras se confirma el borrado.
  useEffect(() => {
    const shell = document.querySelector<HTMLElement>(".page-shell");
    if (shell) shell.inert = resetOpen;
    return () => {
      if (shell) shell.inert = false;
    };
  }, [resetOpen]);

  // Cancela análisis pendientes y devuelve la revisión al cambiar a modo paciente.
  function switchToPatient() {
    cancelPending();
    setMode("patient");
    setData((current) => ({ ...current, reviewed: false }));
    if (step === 5) setStep(4);
  }

  // Presenta el nuevo rol desde el inicio y conserva el foco en el paso actual.
  function switchToDoctor() {
    setMode("doctor");
    heading.current?.focus({ preventScroll: true });
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
    document.querySelector(".card-content")?.scrollTo({ top: 0, behavior });
    window.scrollTo({ top: 0, behavior });
  }

  // Invalida peticiones antiguas antes de modificar datos o borrar el caso.
  function cancelPending() {
    version.current += 1;
    controller.current?.abort();
    setBusy(false);
  }

  // Actualiza dependencias y obliga a confirmar de nuevo la revisión médica.
  function update(patch: Partial<CaseData>) {
    cancelPending();
    setData((current) => updateCase(current, patch, catalog));
    setResult(null);
    setNext(null);
    setError("");
  }

  // Repite únicamente la comprobación de disponibilidad del modelo.
  async function refreshHealth() {
    try {
      setHealth(await api<Health>("health"));
    } catch {
      setError("No se ha podido comprobar la conexión.");
    }
  }

  // Pide una pregunta adaptativa e ignora respuestas de peticiones ya canceladas.
  async function askNext(current: CaseData) {
    cancelPending();
    const requestVersion = version.current;
    controller.current = new AbortController();
    setBusy(true);
    setError("");
    setNext(null);
    setDraft("");
    try {
      const response = await api<NextResult>(
        "next-question",
        current,
        controller.current.signal,
      );
      if (requestVersion !== version.current) return;
      setNext(response);
      setDraft(response.question?.kind === "multi" ? [] : "");
      if (response.status !== "question") setStep(4);
    } catch (err) {
      if (
        requestVersion === version.current &&
        (err as Error).name !== "AbortError"
      )
        setError((err as Error).message);
    } finally {
      if (requestVersion === version.current) setBusy(false);
    }
  }

  // Comprueba mínimos del paso antes de avanzar al siguiente bloque.
  function continueForm() {
    setError("");
    if (
      step === 0 &&
      (age === "" ||
        !Number.isInteger(Number(age)) ||
        Number(age) < 0 ||
        data.age_months > 1440 ||
        data.reason.trim().length < 3)
    ) {
      setError(
        "Indica una edad válida y describe el motivo de consulta con al menos tres caracteres.",
      );
      return;
    }
    if (
      step === 1 &&
      (!data.body_zones.length ||
        !data.onset ||
        !data.duration ||
        !data.evolution)
    ) {
      setError(
        "Selecciona una zona, el comienzo, la duración y la evolución. Puedes elegir «No sé».",
      );
      return;
    }
    if (step === 2 && (!data.symptoms.length || !data.alarms.length)) {
      setError(
        "Responde sobre los síntomas y las señales de alarma. Puedes elegir «Ninguno» o «No sé».",
      );
      return;
    }
    if (step === 2) {
      setStep(3);
      void askNext(data);
    } else setStep(step + 1);
  }

  // Guarda una respuesta antes de consultar la siguiente, sin duplicar preguntas.
  function submitAnswer() {
    if (!next?.question || (Array.isArray(draft) ? !draft.length : !draft)) {
      setError("Selecciona una respuesta para continuar.");
      return;
    }
    const current = updateCase(
      data,
      { answers: { ...data.answers, [next.question.id]: draft } },
      catalog,
    );
    setData(current);
    void askNext(current);
  }

  // Envía el caso revisado y conserva el formulario si el modelo no responde.
  async function classify() {
    if (mode !== "doctor" || !data.reviewed) {
      setError("Activa el modo médico y confirma la revisión del caso.");
      return;
    }
    cancelPending();
    const requestVersion = version.current;
    controller.current = new AbortController();
    setBusy(true);
    setError("");
    try {
      const response = await api<Result>(
        "classify",
        data,
        controller.current.signal,
      );
      if (requestVersion !== version.current) return;
      setResult(response);
      setStep(5);
    } catch (err) {
      if (
        requestVersion === version.current &&
        (err as Error).name !== "AbortError"
      )
        setError((err as Error).message);
    } finally {
      if (requestVersion === version.current) setBusy(false);
    }
  }

  // Incorpora archivos locales válidos y muestra su contenido para revisión.
  async function importHistory(file?: File) {
    if (!file) return;
    const requestVersion = version.current;
    try {
      const text = await readHistory(file);
      if (version.current !== requestVersion) return;
      update({ history: text });
      setHistoryNotice(
        "Archivo leído. Revisa y abrevia el texto si es necesario antes de clasificar.",
      );
    } catch (err) {
      setError((err as Error).message);
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  // Elimina todo el estado clínico de esta consulta, incluidas peticiones e informes.
  function resetCase() {
    cancelPending();
    setData({ ...INITIAL_CASE, answers: {} });
    setAge("");
    setAgeUnit("years");
    setStep(0);
    setNext(null);
    setDraft("");
    setResult(null);
    setError("");
    setHistoryNotice("");
    setResetOpen(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  // Exporta únicamente el caso actual que el usuario decide descargar.
  function exportCase() {
    if (catalog) downloadReport(reportText(data, catalog, result || undefined));
  }

  const pediatric = data.age_months < 216;
  const urgent = data.alarms.some(
    (item) => !["none", "unknown"].includes(item),
  );
  const selectedZones =
    catalog?.body_zones.filter((zone) => data.body_zones.includes(zone.id)) ||
    [];
  const summary = catalog ? caseSummary(data, catalog) : [];
  const symptoms = catalog ? symptomChoices(data, catalog) : null;
  const moreSelected = symptoms
    ? [...symptoms.related, ...symptoms.other].filter((item) => data.symptoms.includes(item.id)).length
    : 0;

  return (
    <>
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="/" aria-label="Deriva, inicio">
            <span className="brand-icon">
              <Plus strokeWidth={3} size={25} />
            </span>
            <span>
              deriva<span className="brand-dot">.</span>
            </span>
          </a>
          <div className="brand-caption">
            Cada paciente,
            <br />
            <strong>su especialista.</strong>
          </div>
          <div className="topbar-right">
            <span className="demo-tag">DEMO · INNOMAKERS4HEALTH</span>
            <span className="local-badge">
              <LockKeyhole size={13} /> Entorno local
            </span>
          </div>
        </div>
      </header>

      <div className="page-shell">
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <span />
              {mode === "doctor"
                ? "ESPACIO DEL PROFESIONAL"
                : "ORIENTACIÓN CLÍNICA ASISTIDA"}
            </div>
            <h1>
              Un camino más claro hacia
              <br />
              la atención adecuada<span>.</span>
            </h1>
            <p>Escuchar, comprender y orientar. Paso a paso.</p>
          </div>
          <div className="heading-illustration" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="hero-medical">
              {mode === "doctor" ? (
                <Stethoscope size={53} strokeWidth={1.3} />
              ) : (
                <HeartPulse size={53} strokeWidth={1.3} />
              )}
            </div>
            <span className="hero-plus">+</span>
            {mode === "doctor" ? (
              <ClipboardCheck className="hero-leaf" size={25} />
            ) : (
              <Leaf className="hero-leaf" size={25} />
            )}
          </div>
        </div>

        <div className="workspace-bar">
          <div className="consultation-label" role="status" aria-atomic="true">
            <span className="small-icon">
              {mode === "doctor" ? (
                <Stethoscope size={18} />
              ) : (
                <UserRound size={18} />
              )}
            </span>
            <div>
              <strong>
                {mode === "doctor" ? "Revisión clínica" : "Consulta del paciente"}
              </strong>
              <span>
                {mode === "doctor" ? "Revisar y completar" : "Escuchar y comprender"}
              </span>
            </div>
          </div>
          <div className="mode-switch" aria-label="Modo de uso">
            <button
              className={mode === "patient" ? "active" : ""}
              aria-pressed={mode === "patient"}
              onClick={switchToPatient}
            >
              <UserRound size={15} />
              Paciente
            </button>
            <button
              className={mode === "doctor" ? "active" : ""}
              aria-pressed={mode === "doctor"}
              onClick={switchToDoctor}
            >
              <Stethoscope size={16} />
              Médico
            </button>
          </div>
        </div>

        <div className="workspace">
          <aside className="sidebar" aria-label="Progreso de la consulta">
            <div className="sidebar-top">
              <span className="eyebrow">TU RECORRIDO</span>
              <span className="step-count">{step + 1} / 6</span>
            </div>
            <ol className="step-list">
              {STEPS.map((label, index) => (
                <li
                  key={label}
                  className={`${index === step ? "current" : ""} ${index < step ? "done" : ""}`}
                >
                  <button
                    disabled={index >= step || busy}
                    onClick={() => {
                      cancelPending();
                      setError("");
                      setStep(index);
                    }}
                    aria-label={`Paso ${index + 1}: ${label}`}
                    aria-current={index === step ? "step" : undefined}
                  >
                    <span className="step-number">
                      {index < step ? (
                        <Check size={14} />
                      ) : (
                        String(index + 1).padStart(2, "0")
                      )}
                    </span>
                    <span>
                      {label}
                      {index === step && <small>Estás aquí</small>}
                    </span>
                    {index === step && <ChevronRight size={15} />}
                  </button>
                </li>
              ))}
            </ol>
            <div className="sidebar-context">
              <span className="context-icon">
                <ShieldCheck size={20} />
              </span>
              <strong>Tu información se queda aquí</strong>
              <p>
                El análisis se realiza en este equipo. El caso no se guarda al
                cerrar o recargar la página.
              </p>
            </div>
            <div className="model-status">
              <span
                className={`status-dot ${health?.status === "ready" ? "online" : ""}`}
              />
              <div>
                <strong>
                  {health?.status === "ready"
                    ? "Modelo conectado"
                    : "Comprobar modelo"}
                </strong>
                <span>{health?.model || "Conectando…"}</span>
              </div>
              <button
                className="icon-button"
                aria-label="Comprobar conexión con el modelo"
                onClick={refreshHealth}
              >
                <RefreshCw size={14} />
              </button>
            </div>
            <button className="reset-button" onClick={() => setResetOpen(true)}>
              <RefreshCw size={14} />
              Empezar un caso nuevo
            </button>
          </aside>

          <main id="main" className="main-card">
            <div className="card-header">
              <div className="step-eyebrow">
                PASO {String(step + 1).padStart(2, "0")}{" "}
                <span>/ {STEPS[step]}</span>
              </div>
              <h2 tabIndex={-1} ref={heading}>
                {STEP_TITLES[step]}
              </h2>
              <p>{STEP_TEXT[step]}</p>
            </div>
            <div className="card-content">
              {error && (
                <div className="error-message" role="alert">
                  <span>{error}</span>
                  <button
                    className="icon-button"
                    aria-label="Cerrar mensaje"
                    onClick={() => setError("")}
                  >
                    <X size={17} />
                  </button>
                </div>
              )}
              {!catalog && (
                <div className="loading-state">
                  <LoaderCircle className="spin" size={26} />
                  <p>Cargando el formulario…</p>
                  <button
                    className="button subtle"
                    onClick={() => window.location.reload()}
                  >
                    Recargar
                  </button>
                </div>
              )}

              {catalog && step === 0 && (
                <div className="form-stack patient-form">
                  <div className="welcome-note">
                    <span className="welcome-icon">
                      <UserRound size={23} />
                    </span>
                    <div>
                      <strong>Vamos a orientarte mejor</strong>
                      <p>
                        No necesitas conocer términos médicos. Responde con lo
                        que sabes.
                      </p>
                    </div>
                    <span className="welcome-sparkle">
                      <Sparkles size={20} />
                    </span>
                  </div>
                  <div className="two-columns patient-details">
                    <div>
                      <label className="field-label" htmlFor="age">
                        Edad del paciente <span className="required">*</span>
                      </label>
                      <div className="age-input">
                        <input
                          id="age"
                          type="number"
                          min="0"
                          max={ageUnit === "years" ? 120 : 1440}
                          step="1"
                          placeholder="Ej. 35"
                          value={age}
                          onChange={(event) => {
                            const value = event.target.value;
                            setAge(value);
                            const months =
                              Number(value) * (ageUnit === "years" ? 12 : 1);
                            update({
                              age_months: months,
                              respondent:
                                months < 216 ? "companion" : data.respondent,
                            });
                          }}
                        />
                        <select
                          aria-label="Unidad de edad"
                          value={ageUnit}
                          onChange={(event) => {
                            setAgeUnit(event.target.value);
                            update({
                              age_months:
                                Number(age) *
                                (event.target.value === "years" ? 12 : 1),
                            });
                          }}
                        >
                          <option value="years">años</option>
                          <option value="months">meses</option>
                        </select>
                      </div>
                      <p className="hint">
                        Para bebés, puedes indicar la edad en meses.
                      </p>
                    </div>
                    <div>
                      <label className="field-label" htmlFor="gender">
                        Género del paciente{" "}
                        <span className="optional">Opcional</span>
                      </label>
                      <select
                        id="gender"
                        className="gender-select"
                        value={data.gender}
                        onChange={(event) =>
                          update({
                            gender: event.target.value as CaseData["gender"],
                          })
                        }
                      >
                        {GENDERS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Choices
                      label="¿Quién responde?"
                      options={[
                        { id: "self", label: "El paciente" },
                        { id: "companion", label: "Un acompañante" },
                      ]}
                      value={data.respondent}
                      onChange={(value) =>
                        update({ respondent: value as CaseData["respondent"] })
                      }
                    />
                  </div>
                  <div className="reason-field">
                    <label className="field-label" htmlFor="reason">
                      ¿Qué te trae a consulta?{" "}
                      <span className="required">*</span>
                    </label>
                    <p className="hint">
                      Describe la molestia principal o lo que te preocupa.
                    </p>
                    <textarea
                      id="reason"
                      rows={3}
                      maxLength={600}
                      placeholder="Por ejemplo: me duele la planta del pie derecho al caminar desde hace unos días…"
                      value={data.reason}
                      onChange={(event) =>
                        update({ reason: event.target.value })
                      }
                    />
                    <div className="input-bottom">
                      <span>Con tus palabras es suficiente.</span>
                      <span>{data.reason.length}/600</span>
                    </div>
                  </div>
                  {age !== "" && pediatric && (
                    <Notice>
                      Adaptaremos las preguntas a la edad del menor. El
                      acompañante puede responder observando cómo se encuentra.
                    </Notice>
                  )}
                  <div className="quiet-line">
                    <ShieldCheck size={15} />
                    <span>
                      No necesitamos nombre, DNI ni otros datos identificativos.
                    </span>
                  </div>
                </div>
              )}

              {catalog && step === 1 && (
                <div className="form-stack discomfort-form">
                  <div className="form-stack location-fields">
                    <BodyMap
                      gender={data.gender}
                      zones={catalog.body_zones}
                      selected={data.body_zones}
                      details={data.body_details}
                      definitions={catalog.body_details || {}}
                      onDetailChange={(zone, parts) => {
                        const details = { ...data.body_details };
                        if (parts.length) details[zone] = parts;
                        else delete details[zone];
                        update({ body_details: details });
                      }}
                      onChange={(value) => update({ body_zones: value })}
                    />
                    <div className="selected-zone-summary">
                      {selectedZones.length ? (
                        selectedZones.map((zone) => (
                          <span key={zone.id}>
                            {zone.label}
                            <button
                              aria-label={`Quitar ${zone.label}`}
                              onClick={() =>
                                update({
                                  body_zones: data.body_zones.filter(
                                    (id) => id !== zone.id,
                                  ),
                                })
                              }
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))
                      ) : (
                        <p>Selecciona una o varias zonas para continuar.</p>
                      )}
                    </div>
                  </div>
                  <div className="form-stack discomfort-details">
                    <PainScale
                      value={data.pain}
                      onChange={(value) => update({ pain: value })}
                    />
                    <Choices
                      label="¿Cómo empezó?"
                      options={ONSETS}
                      value={data.onset}
                      onChange={(value) => update({ onset: value as string })}
                    />
                    <Choices
                      label="¿Desde cuándo ocurre?"
                      options={DURATIONS}
                      value={data.duration}
                      onChange={(value) => update({ duration: value as string })}
                    />
                    <Choices
                      label="¿Cómo ha evolucionado?"
                      options={EVOLUTIONS}
                      value={data.evolution}
                      onChange={(value) => update({ evolution: value as string })}
                    />
                  </div>
                </div>
              )}

              {catalog && symptoms && step === 2 && (
                <div className="form-stack symptoms-form">
                  <div className="form-stack symptoms-fields">
                    <Choices
                      label="¿Notas alguno de estos síntomas?"
                      options={symptoms.primary}
                      value={data.symptoms}
                      multi
                      onChange={(value) =>
                        update({ symptoms: value as string[] })
                      }
                    />
                    {(symptoms.related.length > 0 || symptoms.other.length > 0) && (
                      <details className="more-symptoms">
                        <summary>
                          Más síntomas y otras zonas
                          {moreSelected > 0 &&
                            ` · ${moreSelected} ${moreSelected === 1 ? "seleccionado" : "seleccionados"}`}
                        </summary>
                        <div className="more-symptoms-content">
                          <p className="hint">
                            Puedes indicar otros síntomas aunque no estén entre los sugeridos.
                          </p>
                          {symptoms.related.length > 0 && (
                            <Choices
                              label="Más síntomas de la zona"
                              options={symptoms.related}
                              value={data.symptoms}
                              multi
                              onChange={(value) =>
                                update({ symptoms: value as string[] })
                              }
                            />
                          )}
                          {symptoms.other.length > 0 && (
                            <Choices
                              label="Otros síntomas disponibles"
                              options={symptoms.other}
                              value={data.symptoms}
                              multi
                              onChange={(value) =>
                                update({ symptoms: value as string[] })
                              }
                            />
                          )}
                        </div>
                      </details>
                    )}
                    <p className="hint">
                      Esta comprobación cubre solo algunas señales. Si hay
                      preocupación por el estado del paciente, solicita valoración
                      médica.
                    </p>
                  </div>
                  <div className="alarm-section">
                    <div className="section-heading">
                      <ShieldCheck size={20} />
                      <div>
                        <h3>Antes de continuar</h3>
                        <p>
                          Indica si hay alguna de estas señales en este momento.
                        </p>
                      </div>
                    </div>
                    <Choices
                      label="Señales que necesitan atención inmediata"
                      options={catalog.alarms.filter(
                        (item) =>
                          item.max_age_months == null ||
                          data.age_months <= item.max_age_months,
                      )}
                      value={data.alarms}
                      multi
                      onChange={(value) =>
                        update({ alarms: value as string[] })
                      }
                    />
                  </div>
                  {urgent && (
                    <Notice danger>
                      Has indicado una señal de alarma. Solicita valoración
                      médica inmediata. No esperes al resultado del modelo.
                    </Notice>
                  )}
                </div>
              )}

              {catalog && step === 3 && (
                <div className="form-stack">
                  <div className="adaptive-banner">
                    <Sparkles size={20} />
                    <div>
                      <strong>Preguntas que se adaptan a ti</strong>
                      <p>
                        {Object.keys(data.answers).length} de hasta 8 preguntas
                        adicionales respondidas
                      </p>
                    </div>
                    <span className="model-tag">TEV LOCAL</span>
                  </div>
                  {busy && (
                    <div className="loading-state" aria-live="polite">
                      <div className="thinking-icon">
                        <Activity size={30} />
                      </div>
                      <h3>Buscando la siguiente pregunta</h3>
                      <p>
                        El modelo está teniendo en cuenta tus respuestas.
                        <br />
                        Puedes tardar un poco más en la primera consulta.
                      </p>
                      <LoaderCircle className="spin" size={21} />
                    </div>
                  )}
                  {!busy && next?.question && (
                    <>
                      <div className="question-number">
                        {next.source === "rules"
                          ? "CONTEXTO PEDIÁTRICO"
                          : "PREGUNTA ADAPTATIVA"}{" "}
                        · {Object.keys(data.answers).length + 1}
                      </div>
                      <Choices
                        label={next.question.label}
                        options={next.question.options}
                        value={draft}
                        multi={next.question.kind === "multi"}
                        onChange={setDraft}
                      />
                    </>
                  )}
                  {!busy && !next?.question && (
                    <div className="empty-state">
                      <FileText size={32} />
                      <h3>No se ha seleccionado una pregunta</h3>
                      <p>
                        Puedes reintentar la selección de preguntas o revisar lo
                        recogido con el médico.
                      </p>
                      <button
                        className="button secondary"
                        onClick={() => askNext(data)}
                      >
                        <RefreshCw size={16} />
                        Reintentar con Tev
                      </button>
                    </div>
                  )}
                </div>
              )}

              {catalog && step === 4 && (
                <div className="form-stack">
                  {next?.status === "complete" && (
                    <section className="adaptive-review-note" aria-label="Revisión de preguntas a medida">
                      <Notice>
                        {next.completion_reason === "model_enough"
                          ? `Tev ha valorado ${next.candidates_considered || 0} ${next.candidates_considered === 1 ? "pregunta relacionada" : "preguntas relacionadas"} y no propone más por ahora.`
                          : next.completion_reason === "no_candidates"
                            ? "No quedan preguntas nuevas que correspondan a las respuestas actuales."
                            : "No se proponen más preguntas por ahora."}
                        {Object.keys(data.answers).length === 0
                          ? " No se ha añadido ninguna pregunta adicional; puedes continuar con la revisión médica."
                          : " Las respuestas recogidas se incluyen en el resumen para el médico."}
                      </Notice>
                      {!!next.considered_questions?.length && (
                        <details className="adaptive-considered">
                          <summary>Ver preguntas valoradas ({next.considered_questions.length})</summary>
                          <ul>
                            {next.considered_questions.map((question) => <li key={question.id}>{question.label}</li>)}
                          </ul>
                        </details>
                      )}
                    </section>
                  )}
                  {next?.warnings.map((warning) => (
                    <Notice danger={urgent} key={warning}>
                      {warning}
                    </Notice>
                  ))}
                  {urgent && !next?.warnings.length && (
                    <Notice danger>
                      Se ha declarado una señal de alarma. Prioriza la
                      valoración médica inmediata.
                    </Notice>
                  )}
                  {mode === "patient" && (
                    <div className="doctor-handoff">
                      <div className="handoff-icons" aria-hidden="true">
                        <span>
                          <UserRound size={20} />
                        </span>
                        <ArrowRight size={16} />
                        <span>
                          <Stethoscope size={20} />
                        </span>
                      </div>
                      <div>
                        <strong>Ahora continúa el médico</strong>
                        <p>
                          El médico puede comprobar tus respuestas y añadir el
                          historial en este mismo equipo.
                        </p>
                      </div>
                      <button
                        className="button secondary"
                        onClick={switchToDoctor}
                      >
                        Continuar como médico
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  )}
                  <div className="section-heading spaced">
                    <div>
                      <h3>Resumen de la consulta</h3>
                      <p>
                        Comprueba los datos antes de obtener una orientación.
                      </p>
                    </div>
                    <button className="text-button" onClick={() => setStep(0)}>
                      Editar respuestas
                      <ArrowRight size={14} />
                    </button>
                  </div>
                  <dl className="review-summary">
                    {summary.map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div>
                    <label className="field-label" htmlFor="review-reason">
                      Motivo y detalles adicionales
                    </label>
                    <textarea
                      id="review-reason"
                      rows={3}
                      maxLength={600}
                      value={data.reason}
                      onChange={(event) =>
                        update({ reason: event.target.value })
                      }
                    />
                  </div>
                  <section className="history-section">
                    <div className="section-heading">
                      <span className="small-icon">
                        <FileText size={21} />
                      </span>
                      <div>
                        <h3>
                          Historial clínico{" "}
                          <span className="optional">Opcional</span>
                        </h3>
                        <p>
                          Añade antecedentes, medicación y contexto relevante.
                        </p>
                      </div>
                    </div>
                    <input
                      ref={fileInput}
                      className="visually-hidden"
                      type="file"
                      accept=".txt,.md,text/plain,text/markdown"
                      aria-label="Cargar historial TXT o Markdown"
                      onChange={(event) =>
                        void importHistory(event.target.files?.[0])
                      }
                    />
                    <button
                      className="upload-area"
                      onClick={() => fileInput.current?.click()}
                    >
                      <span className="upload-icon">
                        <Plus size={22} />
                      </span>
                      <strong>Seleccionar archivo de texto</strong>
                      <span>.txt o .md · UTF-8 · Máximo 1 MiB</span>
                    </button>
                    <label className="field-label" htmlFor="history">
                      O pega y edita el historial aquí
                    </label>
                    <textarea
                      id="history"
                      rows={6}
                      maxLength={1048576}
                      placeholder="Antecedentes relevantes, tratamientos actuales, alergias y observaciones clínicas…"
                      value={data.history}
                      onChange={(event) => {
                        update({ history: event.target.value });
                        setHistoryNotice("");
                      }}
                    />
                    <div className="input-bottom">
                      <span>
                        Utiliza un resumen breve y relevante para este caso.
                      </span>
                      <span>{data.history.length} caracteres</span>
                    </div>
                    {historyNotice && (
                      <p className="success-text" role="status">
                        <Check size={15} />
                        {historyNotice}
                      </p>
                    )}
                  </section>
                  <Notice>
                    Las puntuaciones de Tev orientan la derivación y no
                    representan probabilidades clínicas validadas ni un
                    diagnóstico. El médico toma la decisión final.
                  </Notice>
                  {mode === "doctor" && (
                    <label className="review-confirmation">
                      <input
                        type="checkbox"
                        checked={data.reviewed}
                        onChange={(event) => {
                          cancelPending();
                          setData({ ...data, reviewed: event.target.checked });
                        }}
                      />
                      <span>
                        He revisado las respuestas, las señales de alarma y el
                        contexto clínico del caso.
                      </span>
                    </label>
                  )}
                </div>
              )}

              {catalog && step === 5 && result && (
                <div className="form-stack">
                  {result.warnings.map((warning) => (
                    <Notice
                      key={warning}
                      danger={
                        result.status === "urgent" ||
                        result.rankings[0]?.id === "emergency"
                      }
                    >
                      {warning}
                    </Notice>
                  ))}
                  {result.rankings.length > 0 && (
                    <>
                      <div className="result-feature">
                        <div className="result-icon">
                          <Stethoscope size={28} />
                        </div>
                        <div>
                          <span>
                            {result.status === "inconclusive"
                              ? "RESULTADO NO CONCLUYENTE"
                              : "PRIMER DESTINO SEGÚN EL MODELO"}
                          </span>
                          <h3>
                            {result.status === "inconclusive"
                              ? "No se ha encontrado un resultado claro"
                              : result.rankings[0].name}
                          </h3>
                          <p>
                            {result.status === "inconclusive"
                              ? `Mayor puntuación: ${result.rankings[0].name}. Pendiente de revisión médica.`
                              : "Pendiente de decisión médica"}
                          </p>
                        </div>
                        <strong>
                          {(
                            result.rankings[0].probability * 100
                          ).toLocaleString("es-ES", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                          <small>%</small>
                        </strong>
                      </div>
                      <div className="section-heading">
                        <div>
                          <h3>Orientación por especialidad</h3>
                          <p>
                            Las cinco primeras opciones · El resto, en «Otros»
                          </p>
                        </div>
                        <span className="catalog-tag">
                          {result.rankings.length} destinos
                        </span>
                      </div>
                      <Rankings rankings={result.rankings} />
                    </>
                  )}
                  <Notice>
                    {result.label} La ausencia de una alarma detectada no
                    descarta urgencia clínica.
                  </Notice>
                  <details className="considered-data">
                    <summary>Datos considerados en esta clasificación</summary>
                    <dl className="review-summary">
                      {summary.map(([label, value]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                    <h4>Historial aportado</h4>
                    <p className="history-text">
                      {data.history || "No aportado"}
                    </p>
                  </details>
                  <div className="result-meta">
                    <span>
                      <Activity size={14} />
                      {result.model}
                    </span>
                    <span>Catálogo {result.catalog_version}</span>
                    <span>{(result.latency_ms / 1000).toFixed(2)} s</span>
                  </div>
                  <div className="report-actions">
                    <button className="button secondary" onClick={exportCase}>
                      <ArrowDownToLine size={16} />
                      Descargar resumen
                    </button>
                    <button
                      className="button subtle"
                      onClick={() => window.print()}
                    >
                      <Printer size={16} />
                      Imprimir
                    </button>
                  </div>
                  <div className="print-only">
                    <h3>Datos considerados</h3>
                    {summary.map(([label, value]) => (
                      <p key={label}>
                        <strong>{label}: </strong>
                        {value}
                      </p>
                    ))}
                    <h3>Historial</h3>
                    <p className="history-text">
                      {data.history || "No aportado"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {catalog && (
              <div className="card-footer">
                <div>
                  {step > 0 && (
                    <button
                      className="button subtle"
                      disabled={busy}
                      onClick={() => {
                        cancelPending();
                        setError("");
                        setStep(step === 5 ? 4 : step === 4 ? 2 : step - 1);
                      }}
                    >
                      <ArrowLeft size={16} />
                      {step === 5 ? "Volver a revisión" : "Atrás"}
                    </button>
                  )}
                </div>
                {step < 3 && (
                  <button className="button primary" onClick={continueForm}>
                    Continuar
                    <ArrowRight size={17} />
                  </button>
                )}
                {step === 3 && !busy && next?.question && (
                  <button className="button primary" onClick={submitAnswer}>
                    Guardar y continuar
                    <ArrowRight size={17} />
                  </button>
                )}
                {step === 3 && !busy && !next?.question && (
                  <button className="button primary" onClick={() => setStep(4)}>
                    Revisar con el médico
                    <ArrowRight size={17} />
                  </button>
                )}
                {step === 4 && (
                  <button
                    className="button primary"
                    disabled={busy || mode !== "doctor" || !data.reviewed}
                    onClick={classify}
                  >
                    {busy ? (
                      <>
                        <LoaderCircle className="spin" size={16} />
                        Analizando con Tev…
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        {urgent
                          ? "Ver indicación prioritaria"
                          : "Obtener orientación"}
                      </>
                    )}
                  </button>
                )}
                {step === 5 && (
                  <button
                    className="button primary"
                    onClick={() => setResetOpen(true)}
                  >
                    Nuevo caso
                    <Plus size={17} />
                  </button>
                )}
              </div>
            )}
          </main>
        </div>
        <div className="mobile-tools">
          <button className="text-button" onClick={refreshHealth}>
            <RefreshCw size={13} />
            {health?.status === "ready" ? "Tev conectado" : "Comprobar Tev"}
          </button>
          <button className="text-button" onClick={() => setResetOpen(true)}>
            <RefreshCw size={13} />
            Borrar caso
          </button>
        </div>
        <div className="below-workspace">
          <span>
            <LockKeyhole size={13} />
            Procesamiento local
          </span>
          <span>
            <Stethoscope size={14} />
            Decisión final del médico
          </span>
          <span>
            <HeartPulse size={14} />
            Diseñado para acompañar
          </span>
        </div>
        <footer className="page-footer">
          <span>
            deriva. <small>Tecnología al servicio del cuidado.</small>
          </span>
          <span>Demo de hackathon · Sin validación clínica</span>
        </footer>
      </div>
      {resetOpen && (
        <div className="modal-backdrop">
          <div
            className="modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reset-title"
            onKeyDown={(event) => {
              if (event.key === "Escape") setResetOpen(false);
              if (event.key === "Tab") {
                const buttons = event.currentTarget.querySelectorAll("button");
                const first = buttons[0],
                  last = buttons[buttons.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                  event.preventDefault();
                  last.focus();
                }
                if (!event.shiftKey && document.activeElement === last) {
                  event.preventDefault();
                  first.focus();
                }
              }
            }}
          >
            <span className="small-icon">
              <RefreshCw size={24} />
            </span>
            <h2 id="reset-title">¿Empezar un caso nuevo?</h2>
            <p>
              Se borrarán las respuestas, el historial y los resultados de esta
              consulta. Descarga el resumen antes si quieres conservarlo.
            </p>
            <div className="modal-actions">
              <button
                autoFocus
                className="button secondary"
                onClick={() => setResetOpen(false)}
              >
                Seguir con este caso
              </button>
              <button className="button primary" onClick={resetCase}>
                Borrar y empezar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
