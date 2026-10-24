import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RotateCw } from "lucide-react";
import type { CaseData, Catalog, Option } from "./types";
import { BodyRegionDetail } from "./BodyRegionDetail";
import { BodyPaint, bodyPaintStyle } from "./BodyPaint";
import { toggleOption } from "./lib";

type Props = {
  gender: CaseData["gender"];
  zones: Option[];
  selected: string[];
  details: CaseData["body_details"];
  definitions: Catalog["body_details"];
  onDetailChange: (zone: string, parts: string[]) => void;
  onChange: (value: string[]) => void;
};
type Region = { id: string; d: string; mirrored?: boolean };
type ZoneHint = { id: string; x: number; y: number };

const ARM = "M66 91Q59 93 56 105L49 139Q47 146 45 153L39 178Q38 183 42 185L52 189Q56 189 58 183L67 157Q71 146 72 134L78 104Q74 96 66 91Z";
const HAND = "M39 188L52 192L49 208Q48 213 45 214L41 215Q38 215 36 212L32 204Q30 200 32 196L35 189Q37 186 39 188Z";
const LEG = "M75 223L97 239C98 257 94 277 90 289L89 318Q89 328 87 336H75Q73 331 73 323L72 299Q70 287 70 277L68 252Q67 235 75 223Z";
const FOOT = "M75 339H89L92 354Q94 361 89 365H67Q63 365 63 361Q63 358 66 355L72 347Z";

// La mandíbula frontal termina en barbilla; los miembros comparten curvas simétricas.
const FRONT: Region[] = [
  { id: "head", d: "M100 15C88 15 81 24 81 38L82 47Q83 54 91 60Q95 66 100 67Q105 66 109 60Q117 54 118 47L119 38C119 24 112 15 100 15Z" },
  { id: "neck", d: "M91 67Q100 71 109 67L111 79Q100 84 89 79Z" },
  { id: "chest", d: "M88 81Q100 86 112 81L128 87Q138 92 134 108L124 144Q100 150 76 144L66 108Q62 92 72 87Z" },
  { id: "abdomen", d: "M77 148Q100 154 123 148L120 174Q119 181 122 187Q100 192 78 187Q81 181 80 174Z" },
  { id: "pelvis", d: "M78 190Q100 196 122 190Q128 202 126 217L104 233Q100 237 96 233L74 217Q72 202 78 190Z" },
  { id: "right_arm", d: ARM },
  { id: "left_arm", d: ARM, mirrored: true },
  { id: "right_hand", d: HAND },
  { id: "left_hand", d: HAND, mirrored: true },
  { id: "right_leg", d: LEG },
  { id: "left_leg", d: LEG, mirrored: true },
  { id: "right_foot", d: FOOT },
  { id: "left_foot", d: FOOT, mirrored: true },
];

// Mantiene una variante femenina de hombros, cintura, caderas y miembros.
const FEMALE_REGIONS: Record<string, string> = {
  head: "M100 16C89 16 82 25 82 38L83 47Q84 54 92 60Q96 66 100 67Q104 66 108 60Q116 54 117 47L118 38C118 25 111 16 100 16Z",
  neck: "M92 67Q100 71 108 67L110 79Q100 84 90 79Z",
  chest: "M88 81Q100 86 112 81L124 89Q130 96 124 114L121 143Q100 148 79 143L76 114Q70 96 76 89Z",
  abdomen: "M80 147Q100 152 120 147Q119 160 121 174L123 186Q100 191 77 186L79 174Q81 160 80 147Z",
  pelvis: "M79 189Q100 194 121 189Q131 202 130 216L104 235Q100 239 96 235L70 216Q69 202 79 189Z",
  right_arm: "M74 91Q67 93 64 104L56 139Q54 146 52 153L43 180Q42 184 45 186L53 189Q57 189 59 183L68 156Q71 146 73 134L79 104Q79 96 74 91Z",
  left_arm: "M74 91Q67 93 64 104L56 139Q54 146 52 153L43 180Q42 184 45 186L53 189Q57 189 59 183L68 156Q71 146 73 134L79 104Q79 96 74 91Z",
  right_leg: "M71 222L97 240Q98 262 92 285Q90 293 90 305L88 336H76Q74 331 74 323L73 299Q68 278 68 260Q66 238 71 222Z",
  left_leg: "M71 222L97 240Q98 262 92 285Q90 293 90 305L88 336H76Q74 331 74 323L73 299Q68 278 68 260Q66 238 71 222Z",
};

// La nuca redondeada y el cuello posterior evitan reutilizar la cara en la espalda.
const BACK_HEAD = "M100 15C87 15 80 25 80 39C80 54 87 59 100 60C113 59 120 54 120 39C120 25 113 15 100 15Z";
const BACK_NECK = "M90 61Q100 65 110 61L113 79Q100 83 87 79Z";

// Distingue las vistas con detalles discretos que no interceptan las zonas del mapa.
function AnatomyDetails({ back }: { back: boolean }) {
  return (
    <g className="anatomy-detail" aria-hidden="true" pointerEvents="none">
      {back ? (
        <>
          <path d="M86 51Q100 58 114 51M100 88L100 180" />
          <path d="M82 96Q76 110 85 126M118 96Q124 110 115 126" />
          <path d="M86 160Q100 165 114 160M100 204L100 225" />
          <path d="M76 283Q82 287 88 283M112 283Q118 287 124 283" />
        </>
      ) : (
        <>
          <path d="M88 37Q91 36 94 37M106 37Q109 36 112 37" />
          <path d="M100 40L98 47Q100 49 102 47M96 55Q100 54.5 104 55" />
          <path d="M81 91Q90 89 98 95M102 95Q110 89 119 91M100 98L100 126" />
          <path d="M98 170Q100 173 102 170M77 284Q82 280 87 284M113 284Q118 280 123 284" />
          <path d="M69 357Q79 355 89 358M111 358Q121 355 131 357" />
        </>
      )}
    </g>
  );
}

// Dibuja las dos vistas, conserva la lateralidad y etiqueta cada zona al explorarla.
export function BodyMap({ gender, zones, selected, details, definitions, onDetailChange, onChange }: Props) {
  const [back, setBack] = useState(false);
  const [hint, setHint] = useState<ZoneHint | null>(null);
  const id = useId();
  const [active, setActive] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const activeId = active && selected.includes(active) && definitions[active]
    ? active : [...selected].reverse().find((zone) => definitions[zone]);
  const activeZone = zones.find((zone) => zone.id === activeId);

  // En pantallas pequeñas lleva la nueva ampliación al área visible.
  useEffect(() => {
    if (!activeId || !window.matchMedia("(max-width: 760px)").matches) return;
    const frame = requestAnimationFrame(() => detailRef.current?.scrollIntoView({
      block: "nearest",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    }));
    return () => cancelAnimationFrame(frame);
  }, [activeId]);

  // Abre la zona elegida y conserva la selección múltiple del mapa completo.
  function selectZone(zone: string, focusDetail = false) {
    setHint(null);
    setActive(zone);
    onChange(toggleOption(selected, zone));
    if (focusDetail && !selected.includes(zone)) requestAnimationFrame(() =>
      detailRef.current?.querySelector("select")?.focus({ preventScroll: true }),
    );
  }

  // El selector de ampliación también permite añadir otra región sin quitar las anteriores.
  function expandZone(zone: string) {
    setHint(null);
    setActive(zone);
    if (!selected.includes(zone)) onChange(toggleOption(selected, zone));
  }

  const front = gender === "female"
    ? FRONT.map((region) => ({ ...region, d: FEMALE_REGIONS[region.id] || region.d }))
    : FRONT;
  const shapes = back
    ? front.map((region) => {
        const identifier = region.id
          .replace("left_", "TEMP_")
          .replace("right_", "left_")
          .replace("TEMP_", "right_");
        if (identifier === "head") return { ...region, d: BACK_HEAD };
        if (identifier === "neck") return { ...region, d: BACK_NECK };
        if (identifier === "chest") return { ...region, id: "upper_back" };
        if (identifier === "abdomen") return { ...region, id: "lower_back" };
        return { ...region, id: identifier };
      })
    : front;

  // Retira la etiqueta si el panel se desplaza o cambia el tamaño de la ventana.
  useEffect(() => {
    if (!hint) return;
    const hide = () => setHint(null);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [hint?.id]);

  // Sitúa la etiqueta cerca del puntero, manteniéndola dentro de la ventana.
  function showHint(zone: string, x: number, y: number) {
    setHint({
      id: zone,
      x: Math.max(100, Math.min(window.innerWidth - 100, x)),
      y: Math.max(44, y - 14),
    });
  }

  return (
    <div className={`body-layout ${activeZone ? "has-detail" : ""}`}>
      <div className="body-canvas">
        <div className="body-view-label">
          <span>{back ? "Vista posterior" : "Vista frontal"}</span>
        </div>
        <svg
          viewBox="20 8 160 370"
          role="group"
          aria-label={`Mapa corporal${gender === "female" ? " femenino" : ""}, ${back ? "vista posterior" : "vista frontal"}`}
          style={bodyPaintStyle(id)}
        >
          <BodyPaint id={id} />
          <g filter={`url(#${id}-shadow)`}>
            {shapes.map((region) => (
              <path
                key={region.id}
                d={region.d}
                transform={region.mirrored ? "translate(200 0) scale(-1 1)" : undefined}
                role="checkbox"
                tabIndex={0}
                aria-label={zones.find((zone) => zone.id === region.id)?.label}
                aria-checked={selected.includes(region.id)}
                aria-describedby={hint?.id === region.id ? `${id}-hint` : undefined}
                className={`body-region ${selected.includes(region.id) ? "selected" : ""}`}
                onClick={() => selectZone(region.id)}
                onPointerEnter={(event) => {
                  if (event.pointerType !== "touch") showHint(region.id, event.clientX, event.clientY);
                }}
                onPointerMove={(event) => {
                  if (event.pointerType !== "touch") showHint(region.id, event.clientX, event.clientY);
                }}
                onPointerLeave={() => setHint(null)}
                onFocus={(event) => {
                  if (!event.currentTarget.matches(":focus-visible")) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  showHint(region.id, rect.left + rect.width / 2, rect.top);
                }}
                onBlur={() => setHint(null)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setHint(null);
                  if (event.key === " " || event.key === "Enter") {
                    event.preventDefault();
                    selectZone(region.id, true);
                  }
                }}
              />
            ))}
          </g>
          <AnatomyDetails back={back} />
          <text x="29" y="76" className="anatomy-label" textAnchor="middle" aria-hidden="true">
            {back ? "I" : "D"}
          </text>
          <text x="171" y="76" className="anatomy-label" textAnchor="middle" aria-hidden="true">
            {back ? "D" : "I"}
          </text>
        </svg>
        <button
          type="button"
          className="button subtle rotate-button"
          onClick={() => {
            setHint(null);
            setBack(!back);
          }}
        >
          <RotateCw size={15} />
          {back ? "Ver frente" : "Ver espalda"}
        </button>
        <p className="anatomy-note">D / I: lado del paciente</p>
      </div>
      {activeZone && activeId ? (
        <div ref={detailRef} className="body-detail-container">
          <BodyRegionDetail
            key={`${activeId}:${back}`}
            zone={activeZone}
            zones={zones}
            definition={definitions[activeId]}
            selected={details[activeId] || []}
            initialBack={back}
            onZoneChange={expandZone}
            onChange={(parts) => onDetailChange(activeId, parts)}
          />
        </div>
      ) : (
        <div className="body-options">
          <p className="field-label">También puedes elegir en la lista</p>
          <p className="hint">Marca todas las zonas en las que notes molestias.</p>
          <div className="zone-grid">
            {zones.map((zone) => (
              <button
                type="button"
                key={zone.id}
                className={`zone-option ${selected.includes(zone.id) ? "chosen" : ""}`}
                aria-pressed={selected.includes(zone.id)}
                onClick={(event) => selectZone(zone.id, event.detail === 0)}
              >
                {zone.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {hint && createPortal(
        <div
          id={`${id}-hint`}
          role="tooltip"
          className="body-zone-tooltip"
          style={{ left: hint.x, top: hint.y }}
        >
          {zones.find((zone) => zone.id === hint.id)?.label}
        </div>,
        document.body,
      )}
    </div>
  );
}
