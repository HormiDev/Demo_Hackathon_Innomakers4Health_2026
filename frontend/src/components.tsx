import type { ReactNode } from "react";
import { Check, Info, TriangleAlert } from "lucide-react";
import type { Option } from "./types";
import { toggleOption } from "./lib";

// Presenta opciones accesibles que funcionan como radios o selección múltiple.
export function Choices({
  label,
  options,
  value,
  multi = false,
  onChange,
}: {
  label: string;
  options: Option[];
  value: string | string[];
  multi?: boolean;
  onChange: (value: string | string[]) => void;
}) {
  return (
    <fieldset className="choice-field">
      <legend>{label}</legend>
      <div className="choices">
        {options.map((opt) => {
          const chosen = Array.isArray(value)
            ? value.includes(opt.id)
            : value === opt.id;
          return (
            <label className={`choice ${chosen ? "chosen" : ""}`} key={opt.id}>
              <input
                type={multi ? "checkbox" : "radio"}
                name={label}
                value={opt.id}
                checked={chosen}
                onChange={() =>
                  onChange(
                    multi
                      ? toggleOption(Array.isArray(value) ? value : [], opt.id)
                      : opt.id,
                  )
                }
              />
              <span className={`choice-mark ${multi ? "square" : ""}`}>
                {chosen && (multi ? <Check size={12} /> : <span />)}
              </span>
              <span>{opt.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// Muestra mensajes informativos o de atención sin depender solo del color.
export function Notice({
  children,
  danger = false,
}: {
  children: ReactNode;
  danger?: boolean;
}) {
  const Icon = danger ? TriangleAlert : Info;
  return (
    <div
      className={`notice ${danger ? "danger" : ""}`}
      role={danger ? "alert" : "note"}
    >
      <Icon size={19} />
      <div>{children}</div>
    </div>
  );
}

// Ofrece una escala de dolor explícita e incluye la opción de no poder valorarlo.
export function PainScale({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <fieldset className="pain-field">
      <legend>¿Qué intensidad tiene el dolor?</legend>
      <p className="hint">Elige un número. Si no hay dolor, marca 0.</p>
      <div className="pain-scale">
        {Array.from({ length: 11 }, (_, index) => (
          <button
            type="button"
            key={index}
            aria-pressed={value === index}
            aria-label={`Dolor ${index} de 10`}
            className={value === index ? "active" : ""}
            onClick={() => onChange(index)}
          >
            {index}
          </button>
        ))}
      </div>
      <div className="pain-labels">
        <span>Sin dolor</span>
        <span>Máximo dolor imaginable</span>
      </div>
      <button
        type="button"
        className={`unknown-pain ${value === null ? "selected" : ""}`}
        aria-pressed={value === null}
        onClick={() => onChange(null)}
      >
        No sé valorarlo
      </button>
    </fieldset>
  );
}
