import { addDays, diffDays, todayKey } from './dates';
import { tidy } from './format';
import type { DateKey } from './types';

export interface DatedValue {
  date: DateKey;
  value: number;
}

/**
 * Trailing moving average: for every entry the mean of all entries within
 * the last `windowDays` days (inclusive). Entries must be sorted ascending.
 * Daily body weight fluctuates by 1–2 kg, the trend line shows the real change.
 */
export function movingAverage(entries: readonly DatedValue[], windowDays = 7): DatedValue[] {
  const out: DatedValue[] = [];
  let start = 0;
  let windowSum = 0;
  for (let i = 0; i < entries.length; i++) {
    windowSum += entries[i].value;
    while (diffDays(entries[i].date, entries[start].date) >= windowDays) {
      windowSum -= entries[start].value;
      start++;
    }
    out.push({ date: entries[i].date, value: tidy(windowSum / (i - start + 1), 3) });
  }
  return out;
}

/** Least-squares line through the points (x = days since the first point). */
export function linearTrend(points: readonly DatedValue[]): { slopePerDay: number; intercept: number } | null {
  if (points.length < 2) return null;
  const x0 = points[0].date;
  const n = points.length;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (const p of points) {
    const x = diffDays(p.date, x0);
    sx += x;
    sy += p.value;
    sxx += x * x;
    sxy += x * p.value;
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  const slope = (n * sxy - sx * sy) / denom;
  return { slopePerDay: slope, intercept: (sy - slope * sx) / n };
}

/**
 * Average change per week (kg/week) over the last `days` days.
 * Needs at least 3 entries spanning 7 days, otherwise `null`.
 */
export function weeklyRate(entries: readonly DatedValue[], today: DateKey = todayKey(), days = 28): number | null {
  const from = addDays(today, -days);
  const recent = entries.filter((e) => e.date > from && e.date <= today);
  if (recent.length < 3) return null;
  if (diffDays(recent[recent.length - 1].date, recent[0].date) < 7) return null;
  const trend = linearTrend(recent);
  return trend ? tidy(trend.slopePerDay * 7, 3) : null;
}

/** Trend value (7-day average) at the latest entry. */
export function currentTrend(entries: readonly DatedValue[]): number | null {
  if (entries.length === 0) return null;
  const avg = movingAverage(entries);
  return avg[avg.length - 1].value;
}

/**
 * Change of the trend compared to `days` days before the latest entry
 * (uses the closest entry on or before that day).
 */
export function trendChange(entries: readonly DatedValue[], days: number): number | null {
  if (entries.length < 2) return null;
  const avg = movingAverage(entries);
  const last = avg[avg.length - 1];
  const target = addDays(last.date, -days);
  let ref: DatedValue | null = null;
  for (const p of avg) {
    if (p.date <= target) ref = p;
    else break;
  }
  if (!ref) return null;
  return tidy(last.value - ref.value, 3);
}

/** Estimated day on which the target weight is reached at the current rate. */
export function projectGoalDate(
  current: number,
  target: number,
  ratePerWeek: number | null,
  today: DateKey = todayKey(),
): DateKey | null {
  if (ratePerWeek == null || Math.abs(ratePerWeek) < 0.02) return null;
  const remaining = target - current;
  if (Math.abs(remaining) < 0.05) return today;
  // Moving in the wrong direction
  if (Math.sign(remaining) !== Math.sign(ratePerWeek)) return null;
  const days = Math.ceil((remaining / ratePerWeek) * 7);
  if (days > 3 * 365) return null;
  return addDays(today, days);
}

export function bmi(weightKg: number | null, heightCm: number | null): number | null {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  return tidy(weightKg / (m * m), 1);
}

export function bmiCategory(value: number): string {
  if (value < 18.5) return 'Untergewicht';
  if (value < 25) return 'Normalgewicht';
  if (value < 30) return 'Übergewicht';
  return 'Adipositas';
}

/**
 * Consecutive days with an entry, counting back from today. If today has no
 * entry yet the streak counts from yesterday (it is not broken yet).
 */
export function dayStreak(dates: ReadonlySet<DateKey>, today: DateKey = todayKey()): number {
  let day = dates.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (dates.has(day)) {
    streak++;
    day = addDays(day, -1);
  }
  return streak;
}
