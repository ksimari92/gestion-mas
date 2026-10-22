/**
 * Tokens de visualización.
 *
 * Los tres colores de marca que pueden convivir en un mismo gráfico
 * (dato / atención / excedido) se validaron con el script del método:
 *   #0B7A4B · #D97706 · #991B1B — light, superficie #FFFFFF, todos los pares.
 *   Banda de luminosidad OK · piso de croma OK · contraste ≥3:1 OK.
 *   Separación bajo daltonismo: peor par 7.2 (deuteranopía), dentro de la
 *   banda 6–8 → **obliga** codificación secundaria. Por eso todo estado
 *   viaja siempre con ícono + texto, nunca con el color solo.
 */
export const VIZ = {
    /** Tinta única de datos: la longitud de la barra codifica la magnitud, no el color. */
    data: '#0B7A4B',
    /** Pista del medidor: un paso más claro de la misma tinta. */
    track: 'rgba(11, 122, 75, 0.12)',
    /** Estados. Nunca se usan como color de serie. */
    warning: '#D97706',
    warningTrack: 'rgba(217, 119, 6, 0.14)',
    critical: '#991B1B',
    criticalTrack: 'rgba(153, 27, 27, 0.14)',
    /** Cromo del gráfico: recesivo, hairline, sólido. */
    grid: '#E7E5E4',
    axis: '#C7C5BF',
    surface: '#FFFFFF',
} as const;

/** Grosor máximo de una marca: nunca llena la banda, el resto es aire. */
export const BAR_THICKNESS = 10;
export const COLUMN_MAX_THICKNESS = 24;
