/**
 * Number formatting and parsing using German conventions
 * ("1.234,5"). Implemented manually to be deterministic on every JS engine.
 */

export const MINUS = '−';

export function formatNumber(value: number, maxDecimals = 1, minDecimals = 0): string {
  if (!Number.isFinite(value)) return '–';
  const factor = 10 ** maxDecimals;
  const rounded = Math.round(Math.abs(value) * factor) / factor;
  const [intPart, rawFrac = ''] = rounded.toFixed(maxDecimals).split('.');
  let frac = rawFrac.replace(/0+$/, '');
  while (frac.length < minDecimals) frac += '0';
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = value < 0 && rounded !== 0 ? '-' : '';
  return `${sign}${grouped}${frac ? `,${frac}` : ''}`;
}

/** Like `formatNumber` but always shows a sign ("+0,3", "−1,2", "±0"). */
export function formatSigned(value: number, maxDecimals = 1): string {
  const abs = formatNumber(Math.abs(value), maxDecimals);
  if (abs === '0') return '±0';
  return value > 0 ? `+${abs}` : `${MINUS}${abs}`;
}

/**
 * Parses user input like "12,5", "12.5", " 80 " or "1.234,5".
 * Returns `null` for empty or invalid input.
 */
export function parseDecimal(input: string | null | undefined): number | null {
  if (input == null) return null;
  let s = String(input).trim().replace(/\s/g, '').replace(MINUS, '-');
  if (!s) return null;
  if (s.includes(',') && s.includes('.')) {
    // "1.234,5" -> thousands separator "." and decimal ","
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    s = s.replace(',', '.');
  }
  if (!/^-?\d*\.?\d+$|^-?\d+\.$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseInteger(input: string | null | undefined): number | null {
  const n = parseDecimal(input);
  if (n == null) return null;
  return Math.round(n);
}

/** Value for a text input: 12.5 -> "12,5", null -> "". */
export function toInputValue(value: number | null | undefined, maxDecimals = 2): string {
  if (value == null || !Number.isFinite(value)) return '';
  return formatNumber(value, maxDecimals).replace(/\./g, '');
}

export function formatWeight(kg: number | null | undefined, maxDecimals = 2): string {
  if (kg == null) return '–';
  return `${formatNumber(kg, maxDecimals)} kg`;
}

export function formatVolume(kg: number): string {
  return `${formatNumber(Math.round(kg), 0)} kg`;
}

export function formatKcal(kcal: number): string {
  return `${formatNumber(Math.round(kcal), 0)} kcal`;
}

export function formatGrams(g: number): string {
  return `${formatNumber(g, g < 10 ? 1 : 0)} g`;
}

export function formatMl(ml: number): string {
  if (Math.abs(ml) >= 1000) return `${formatNumber(ml / 1000, 2)} l`;
  return `${formatNumber(ml, 0)} ml`;
}

export function formatDistance(km: number): string {
  return `${formatNumber(km, 2)} km`;
}

/** "5:30 /km" */
export function formatPace(secondsPerKm: number): string {
  if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return '–';
  const total = Math.round(secondsPerKm);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? `0${s}` : s} /km`;
}

export function formatSpeed(kmh: number): string {
  return `${formatNumber(kmh, 1)} km/h`;
}

export function formatPercent(fraction: number, maxDecimals = 0): string {
  return `${formatNumber(fraction * 100, maxDecimals)} %`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function roundTo(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}

/** Rounds to a sane number of decimals to avoid float artefacts (0.1 + 0.2). */
export function tidy(value: number, decimals = 3): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function sum(values: readonly number[]): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

export function average(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return sum(values) / values.length;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${formatNumber(count, 0)} ${count === 1 ? singular : plural}`;
}
