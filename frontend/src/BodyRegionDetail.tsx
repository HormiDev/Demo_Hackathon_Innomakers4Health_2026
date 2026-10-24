import { useId, useState } from "react";
import { RotateCw, ScanLine } from "lucide-react";
import { BodyPaint, bodyPaintStyle } from "./BodyPaint";
import { detailDrawing } from "./bodyDetailShapes";
import { toggleOption } from "./lib";
import type { BodyDetail, Option } from "./types";

type Props = {
  zone: Option;
  zones: Option[];
  definition: BodyDetail;
  selected: string[];
  initialBack: boolean;
  onZoneChange: (zone: string) => void;
  onChange: (parts: string[]) => void;
};

// Presenta una ampliación interactiva y conserva el lado anatómico del paciente.
export function BodyRegionDetail({ zone, zones, definition, selected, initialBack, onZoneChange, onChange }: Props) {
  const [view, setView] = useState<"front" | "back">(
    definition.views.includes(initialBack ? "back" : "front")
      ? initialBack ? "back" : "front"
      : definition.default_view,
  );
  const [pointed, setPointed] = useState<string | null>(null);
  const id = useId();
  const back = view === "back";
  const drawing = detailDrawing(definition.kind, back);
  const options = definition.options.filter((option) => option.views.includes(view));
  const lateral = /^(left|right)_/.test(zone.id);
  const mirrored = lateral ? zone.id.startsWith("left_") !== back : back;
  const surface = definition.kind === "hand" ? back ? "Dorso" : "Palma"
    : definition.kind === "foot" ? back ? "Planta" : "Vista superior"
    : back ? "Vista posterior" : "Vista anterior";
  const nextSurface = definition.kind === "hand" ? back ? "Ver palma" : "Ver dorso"
    : definition.kind === "foot" ? back ? "Ver empeine" : "Ver planta"
    : back ? "Ver frente" : "Ver espalda";

  return (
    <section className="body-detail" aria-label={`Ampliación de ${zone.label.toLocaleLowerCase("es")}`}>
      <div className="body-detail-heading">
        <ScanLine size={15} aria-hidden="true" />
        <select aria-label="Zona ampliada" value={zone.id} onChange={(event) => onZoneChange(event.target.value)}>
          {zones.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
        </select>
      </div>
      <div className="body-detail-stage">
        <svg
          viewBox="0 0 240 280"
          className="body-detail-svg"
          role="group"
          aria-label={`Detalle de ${zone.label.toLocaleLowerCase("es")}, ${surface.toLocaleLowerCase("es")}`}
          style={bodyPaintStyle(id)}
        >
          <BodyPaint id={id} />
          {drawing.outline && <defs><clipPath id={`${id}-clip`}><path d={drawing.outline} /></clipPath></defs>}
          <g transform={mirrored ? "translate(240 0) scale(-1 1)" : undefined}>
            {drawing.outline && <path d={drawing.outline} className="detail-outline" />}
            <g clipPath={drawing.outline ? `url(#${id}-clip)` : undefined} filter={`url(#${id}-shadow)`}>
              {drawing.regions.map((part) => (
                <path
                  key={part.id}
                  d={part.d}
                  className={`body-region ${selected.includes(part.id) ? "selected" : ""}`}
                  role="checkbox"
                  tabIndex={0}
                  aria-label={definition.options.find((option) => option.id === part.id)?.label}
                  aria-checked={selected.includes(part.id)}
                  onClick={() => onChange(toggleOption(selected, part.id))}
                  onPointerEnter={() => setPointed(part.id)}
                  onPointerLeave={() => setPointed(null)}
                  onFocus={() => setPointed(part.id)}
                  onBlur={() => setPointed(null)}
                  onKeyDown={(event) => {
                    if (event.key === " " || event.key === "Enter") {
                      event.preventDefault();
                      onChange(toggleOption(selected, part.id));
                    }
                  }}
                >
                  <title>{definition.options.find((option) => option.id === part.id)?.label}</title>
                </path>
              ))}
            </g>
            <g className="anatomy-detail" aria-hidden="true" pointerEvents="none">
              {drawing.lines.map((line, index) => <path key={index} d={line} />)}
            </g>
          </g>
        </svg>
        <div className="detail-options" aria-label="Puntos de la zona ampliada">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              className={selected.includes(option.id) ? "chosen" : ""}
              aria-pressed={selected.includes(option.id)}
              onClick={() => onChange(toggleOption(selected, option.id))}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="body-detail-footer">
        {definition.views.length > 1 ? (
          <button type="button" className="detail-view-button" onClick={() => {
            setPointed(null);
            setView(back ? "front" : "back");
          }}>
            <RotateCw size={12} />{nextSurface}
          </button>
        ) : <span>{surface}</span>}
        <span className="body-detail-status" aria-live="polite">
          {pointed ? definition.options.find((option) => option.id === pointed)?.label
            : selected.length ? `${selected.length} ${selected.length === 1 ? "punto" : "puntos"}` : "Opcional"}
        </span>
      </div>
    </section>
  );
}
