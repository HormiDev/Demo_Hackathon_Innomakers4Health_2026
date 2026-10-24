import type { CSSProperties } from "react";

// Comparte la iluminación y los colores entre el cuerpo completo y sus ampliaciones.
export function BodyPaint({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="var(--body-highlight)" />
        <stop offset="55%" stopColor="var(--body-mid)" />
        <stop offset="100%" stopColor="var(--body-shade)" />
      </linearGradient>
      <linearGradient id={`${id}-hover`} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="var(--body-hover-light)" />
        <stop offset="100%" stopColor="var(--body-hover-dark)" />
      </linearGradient>
      <linearGradient id={`${id}-selected`} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="var(--body-selected-light)" />
        <stop offset="100%" stopColor="var(--body-selected-dark)" />
      </linearGradient>
      <filter id={`${id}-shadow`} x="-25%" y="-10%" width="150%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#224336" floodOpacity="0.12" />
      </filter>
    </defs>
  );
}

// Asocia cada SVG con sus servidores de pintura sin repetir identificadores.
export function bodyPaintStyle(id: string): CSSProperties {
  return {
    "--body-fill": `url(#${id}-fill)`,
    "--body-hover": `url(#${id}-hover)`,
    "--body-selected": `url(#${id}-selected)`,
  } as CSSProperties;
}
