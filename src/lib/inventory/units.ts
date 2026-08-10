/**
 * Length / fraction helpers for grating inventory parsing.
 * All canonical lengths are inches.
 */

const MM_PER_IN = 25.4;

/** Parse mixed numbers like 1-1/4, 2-1/2, 10-15/16, 9-3/4, or plain 3/16, 2, 1.5 */
export function parseImperialMeasure(token: string): number | null {
  const t = token.trim().replace(/["']/g, "").replace(/,/g, "");
  if (!t) return null;

  // mixed: 1-1/4 or 10-15/16
  const mixed = /^(\d+)\s*-\s*(\d+)\s*\/\s*(\d+)$/.exec(t);
  if (mixed) {
    const whole = Number(mixed[1]);
    const num = Number(mixed[2]);
    const den = Number(mixed[3]);
    if (den === 0) return null;
    return whole + num / den;
  }

  // simple fraction: 3/16
  const frac = /^(\d+)\s*\/\s*(\d+)$/.exec(t);
  if (frac) {
    const num = Number(frac[1]);
    const den = Number(frac[2]);
    if (den === 0) return null;
    return num / den;
  }

  // decimal / integer
  const n = Number(t);
  if (Number.isFinite(n)) return n;
  return null;
}

export function mmToInches(mm: number): number {
  return mm / MM_PER_IN;
}

export function feetToInches(ft: number): number {
  return ft * 12;
}

/**
 * Parse a length token that may include unit suffix: 24', 36", 1219mm, 3'
 */
export function parseLengthToken(token: string): number | null {
  const raw = token.trim();
  if (!raw) return null;

  const mm = /^(-?\d+(?:\.\d+)?)\s*mm$/i.exec(raw);
  if (mm) return mmToInches(Number(mm[1]));

  const ft = /^(-?\d+(?:\.\d+)?)\s*'$/.exec(raw);
  if (ft) return feetToInches(Number(ft[1]));

  const inchSuffix = /^(-?\d+(?:\.\d+)?)\s*"$/.exec(raw);
  if (inchSuffix) return Number(inchSuffix[1]);

  // bare measure — caller decides unit context
  return parseImperialMeasure(raw);
}

/** Format inches as a short fraction-ish string for reports. */
export function formatInches(inches: number | null, digits = 4): string {
  if (inches == null || !Number.isFinite(inches)) return "—";
  return Number(inches.toFixed(digits)).toString();
}

export function panelAreaSqFt(
  widthIn: number | null,
  lengthIn: number | null,
): number | null {
  if (widthIn == null || lengthIn == null) return null;
  if (widthIn <= 0 || lengthIn <= 0) return null;
  return (widthIn * lengthIn) / 144;
}
