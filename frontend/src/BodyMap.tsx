import { useState } from "react";
import { RotateCw, Check } from "lucide-react";
import type { Option } from "./types";
import { toggleOption } from "./lib";

type Props = {
  zones: Option[];
  selected: string[];
  onChange: (value: string[]) => void;
};

const FRONT = [
  {
    id: "head",
    d: "M100 16C80 16 77 33 81 49L87 61H113L119 49C123 33 120 16 100 16Z",
  },
  { id: "neck", d: "M89 63H111L114 79H86Z" },
  { id: "chest", d: "M85 81H115L130 91L122 145H78L70 91Z" },
  { id: "abdomen", d: "M79 148H121L119 187H81Z" },
  { id: "pelvis", d: "M81 190H119L125 217L101 232L75 217Z" },
  { id: "right_arm", d: "M66 89L77 98L66 157L56 188L41 182L50 145L55 104Z" },
  {
    id: "left_arm",
    d: "M134 89L123 98L134 157L144 188L159 182L150 145L145 104Z",
  },
  { id: "right_hand", d: "M40 185L55 191L51 218L44 224L34 218Z" },
  { id: "left_hand", d: "M160 185L145 191L149 218L156 224L166 218Z" },
  { id: "right_leg", d: "M75 220L98 235L94 289L91 338H72L69 285Z" },
  { id: "left_leg", d: "M125 220L102 235L106 289L109 338H128L131 285Z" },
  { id: "right_foot", d: "M72 341H91L94 356L89 367H65L64 358Z" },
  { id: "left_foot", d: "M109 341H128L136 358L135 367H111L106 356Z" },
];

// Dibuja un mapa vectorial seleccionable con lateralidad anatómica y alternativa textual.
export function BodyMap({ zones, selected, onChange }: Props) {
  const [back, setBack] = useState(false);
  const shapes = back
    ? FRONT.filter((item) => !["chest", "abdomen"].includes(item.id))
        .map((item) => {
          const swap = item.id
            .replace("left_", "TEMP_")
            .replace("right_", "left_")
            .replace("TEMP_", "right_");
          return { ...item, id: swap };
        })
        .concat([
          { id: "upper_back", d: "M85 81H115L130 91L122 145H78L70 91Z" },
          { id: "lower_back", d: "M79 148H121L119 187H81Z" },
        ])
    : FRONT;
  return (
    <div className="body-layout">
      <div className="body-canvas">
        <div className="body-view-label">
          <span>{back ? "Vista posterior" : "Vista frontal"}</span>
          <span>Selecciona las zonas</span>
        </div>
        <svg
          viewBox="0 0 200 382"
          role="group"
          aria-label={`Mapa corporal, ${back ? "vista posterior" : "vista frontal"}`}
        >
          <defs>
            <pattern
              id="grid"
              width="18"
              height="18"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r=".65" fill="#d4dfdb" />
            </pattern>
          </defs>
          <rect width="200" height="382" fill="url(#grid)" />
          {shapes.map(({ id, d }) => (
            <path
              key={id}
              d={d}
              role="checkbox"
              tabIndex={0}
              aria-label={zones.find((zone) => zone.id === id)?.label}
              aria-checked={selected.includes(id)}
              className={`body-region ${selected.includes(id) ? "selected" : ""}`}
              onClick={() => onChange(toggleOption(selected, id))}
              onKeyDown={(event) => {
                if (event.key === " " || event.key === "Enter") {
                  event.preventDefault();
                  onChange(toggleOption(selected, id));
                }
              }}
            >
              <title>{zones.find((zone) => zone.id === id)?.label}</title>
            </path>
          ))}
          <text x="17" y="72" className="anatomy-label">
            {back ? "I" : "D"}
          </text>
          <text x="178" y="72" className="anatomy-label">
            {back ? "D" : "I"}
          </text>
        </svg>
        <button
          type="button"
          className="button subtle rotate-button"
          onClick={() => setBack(!back)}
        >
          <RotateCw size={15} />
          {back ? "Ver frente" : "Ver espalda"}
        </button>
        <p className="anatomy-note">Izquierda y derecha del paciente</p>
      </div>
      <div className="body-options">
        <p className="field-label">También puedes elegir en la lista</p>
        <p className="hint">
          Marca todas las zonas en las que notes molestias.
        </p>
        <div className="zone-grid">
          {zones.map((zone) => (
            <button
              type="button"
              key={zone.id}
              className={`zone-option ${selected.includes(zone.id) ? "chosen" : ""}`}
              aria-pressed={selected.includes(zone.id)}
              onClick={() => onChange(toggleOption(selected, zone.id))}
            >
              <span>{zone.label}</span>
              {selected.includes(zone.id) && <Check size={15} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
