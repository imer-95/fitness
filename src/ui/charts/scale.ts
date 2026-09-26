import { addDays, diffDays } from '@/domain/dates';
import { tidy } from '@/domain/format';
import type { DateKey } from '@/domain/types';

/** "Nice" tick step (1, 2, 2.5, 5 × 10^n) for a value range. */
export function niceStep(range: number, targetTicks: number): number {
  if (!(range > 0) || targetTicks <= 0) return 1;
  const raw = range / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

export interface NiceDomain {
  min: number;
  max: number;
  step: number;
  ticks: number[];
}

export function niceDomain(minValue: number, maxValue: number, targetTicks = 4, minRange = 0): NiceDomain {
  let min = Number.isFinite(minValue) ? minValue : 0;
  let max = Number.isFinite(maxValue) ? maxValue : 1;
  if (max < min) [min, max] = [max, min];
  if (max - min < minRange) {
    const mid = (min + max) / 2;
    min = mid - minRange / 2;
    max = mid + minRange / 2;
  }
  if (max === min) {
    min -= 1;
    max += 1;
  }
  const step = niceStep(max - min, targetTicks);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(tidy(v, 6));
  return { min: lo, max: hi, step, ticks };
}

const EPOCH: DateKey = '1970-01-01';

/** Day number for date-based x axes. */
export function dayNumber(key: DateKey): number {
  return diffDays(key, EPOCH);
}

export function dayFromNumber(n: number): DateKey {
  return addDays(EPOCH, Math.round(n));
}
