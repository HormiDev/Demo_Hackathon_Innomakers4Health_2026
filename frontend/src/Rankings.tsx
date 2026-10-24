import { ChevronRight } from "lucide-react";
import type { Result } from "./types";

type Ranking = Result["rankings"][number];

// Redondea solo al presentar: la suma de Otros utiliza las puntuaciones originales.
function percentage(value: number): string {
  return `${(value * 100).toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} %`;
}

// Conserva la posición original de cada destino al expandir el detalle.
function RankingRows({ items, offset = 0 }: { items: Ranking[]; offset?: number }) {
  return items.map((item, index) => (
    <div
      className={`ranking-row ${index + offset === 0 ? "first" : ""}`}
      key={item.id}
    >
      <span className="ranking-number">
        {String(index + offset + 1).padStart(2, "0")}
      </span>
      <div className="ranking-content">
        <div>
          <span>{item.name}</span>
          <strong>{percentage(item.probability)}</strong>
        </div>
        <div className="ranking-track">
          <span style={{ width: `${item.probability * 100}%` }} />
        </div>
      </div>
    </div>
  ));
}

// Resume las cinco primeras opciones y permite consultar el resto sin perder datos.
export function Rankings({ rankings }: { rankings: Ranking[] }) {
  const first = rankings.slice(0, 5);
  const rest = rankings.slice(5);
  const otherTotal = rest.reduce((sum, item) => sum + item.probability, 0);

  return (
    <div className="results-rankings">
      <div className="rankings-screen">
        <div className="ranking-list ranking-top">
          <RankingRows items={first} />
        </div>
        {rest.length > 0 && (
          <details className="ranking-others">
            <summary>
              <ChevronRight className="ranking-expand-icon" size={16} />
              <span className="ranking-others-title">Otros</span>
              <strong>{percentage(otherTotal)}</strong>
              <span className="ranking-track">
                <span style={{ width: `${otherTotal * 100}%` }} />
              </span>
              <span className="ranking-expand-label">
                Suma de {rest.length} destinos ·{" "}
                <span className="when-collapsed">Ver detalle</span>
                <span className="when-expanded">Ocultar detalle</span>
              </span>
            </summary>
            <div className="ranking-list ranking-details">
              <RankingRows items={rest} offset={5} />
            </div>
          </details>
        )}
      </div>
      <ol className="print-only ranking-print" aria-label="Todos los porcentajes">
        {rankings.map((item) => (
          <li key={item.id}>
            <span>{item.name}</span>
            <strong>{percentage(item.probability)}</strong>
          </li>
        ))}
      </ol>
    </div>
  );
}
