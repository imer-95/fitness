import { formatNumber, tidy } from './format';
import type { BarMode, Exercise, ExerciseBests, PrType, SetKind, Side, TrackingType, WeightMode } from './types';

export type LoadConfig = Pick<Exercise, 'weightMode' | 'barMode' | 'barWeight'>;
export type ExerciseConfig = LoadConfig & Pick<Exercise, 'tracking'>;

export interface SetValues {
  reps: number | null;
  weight: number | null;
  durationSec: number | null;
  kind: SetKind;
  side?: Side | null;
}

/**
 * Estimated one-rep max using the Epley formula
 * (1RM = w × (1 + reps / 30)). One rep returns the weight itself.
 */
export function estimate1RM(weight: number, reps: number): number {
  if (!(weight > 0) || !(reps > 0)) return 0;
  if (reps === 1) return weight;
  return tidy(weight * (1 + reps / 30), 2);
}

/** Weight that can be lifted for `reps` repetitions given a 1RM (inverse Epley). */
export function weightForReps(oneRepMax: number, reps: number): number {
  if (reps <= 1) return oneRepMax;
  return tidy(oneRepMax / (1 + reps / 30), 2);
}

/**
 * Real load moved per repetition in kg:
 * "pro Seite" doubles the value, "exkl. Stange" adds the bar weight if known.
 */
export function effectiveLoad(weight: number, config: LoadConfig): number {
  let load = config.weightMode === 'per_side' ? weight * 2 : weight;
  if (config.barMode === 'excluded' && config.barWeight) load += config.barWeight;
  return load;
}

export function isWorkingSet(set: { kind: SetKind }): boolean {
  return set.kind !== 'warmup';
}

/** Tonnage of a single set (reps × effective load). Warm-up sets count as well. */
export function setVolume(set: Pick<SetValues, 'reps' | 'weight'>, config: LoadConfig): number {
  if (!set.reps || !set.weight) return 0;
  return set.reps * effectiveLoad(set.weight, config);
}

export const EMPTY_BESTS: ExerciseBests = {
  maxWeight: null,
  maxE1rm: null,
  maxReps: null,
  maxDuration: null,
  maxSetVolume: null,
};

function maxOf(a: number | null, b: number | null): number | null {
  if (a == null) return b;
  if (b == null) return a;
  return Math.max(a, b);
}

/** Folds one set into the running bests (warm-up sets are ignored). */
export function mergeBests(bests: ExerciseBests, set: SetValues, config: LoadConfig): ExerciseBests {
  if (!isWorkingSet(set)) return bests;
  const reps = set.reps && set.reps > 0 ? set.reps : null;
  const weight = set.weight && set.weight > 0 ? set.weight : null;
  const duration = set.durationSec && set.durationSec > 0 ? set.durationSec : null;
  return {
    maxWeight: maxOf(bests.maxWeight, reps ? weight : null),
    maxE1rm: maxOf(bests.maxE1rm, reps && weight ? estimate1RM(weight, reps) : null),
    maxReps: maxOf(bests.maxReps, reps),
    maxDuration: maxOf(bests.maxDuration, duration),
    maxSetVolume: maxOf(bests.maxSetVolume, reps && weight ? setVolume({ reps, weight }, config) : null),
  };
}

export function computeBests(sets: readonly SetValues[], config: LoadConfig): ExerciseBests {
  return sets.reduce((acc, s) => mergeBests(acc, s, config), EMPTY_BESTS);
}

const EPS = 1e-6;

/** True if there is at least one previous value, i.e. records can be broken. */
export function hasBests(bests: ExerciseBests): boolean {
  return bests.maxWeight != null || bests.maxE1rm != null || bests.maxReps != null || bests.maxDuration != null;
}

/**
 * Which personal records a new set beats. A record needs a previous value
 * (the very first set of an exercise is not celebrated as a record).
 */
export function detectPrs(set: SetValues, bests: ExerciseBests, tracking: TrackingType): PrType[] {
  if (!isWorkingSet(set)) return [];
  const prs: PrType[] = [];
  const reps = set.reps ?? 0;
  const weight = set.weight ?? 0;
  if (tracking === 'weight_reps') {
    if (reps > 0 && weight > 0) {
      if (bests.maxWeight != null && weight > bests.maxWeight + EPS) prs.push('weight');
      const e1rm = estimate1RM(weight, reps);
      if (bests.maxE1rm != null && e1rm > bests.maxE1rm + EPS && !prs.includes('weight')) {
        prs.push('e1rm');
      }
    }
  } else if (tracking === 'reps') {
    if (reps > 0 && bests.maxReps != null && reps > bests.maxReps) prs.push('reps');
  } else if (tracking === 'time') {
    const d = set.durationSec ?? 0;
    if (d > 0 && bests.maxDuration != null && d > bests.maxDuration) prs.push('duration');
  }
  return prs;
}

export const PR_LABELS: Record<PrType, string> = {
  weight: 'Höchstes Gewicht',
  e1rm: 'Bestes geschätztes 1RM',
  reps: 'Meiste Wiederholungen',
  duration: 'Längste Dauer',
  volume: 'Größtes Satzvolumen',
};

/** Annotation for the logged weight, e.g. "pro Seite exkl. Stange". */
export function weightAnnotation(config: { weightMode: WeightMode; barMode: BarMode }): string {
  const parts: string[] = [];
  if (config.weightMode === 'per_side') parts.push('pro Seite');
  if (config.barMode === 'included') parts.push('inkl. Stange');
  if (config.barMode === 'excluded') parts.push('exkl. Stange');
  return parts.join(' ');
}

export const SIDE_LABELS: Record<Side, string> = { left: 'links', right: 'rechts' };
export const SIDE_SHORT: Record<Side, string> = { left: 'L', right: 'R' };

/** Compact set description: "10 × 40 kg", "12 Wdh.", "45 s", "10 × 15 kg (L)". */
export function formatSet(set: SetValues, tracking: TrackingType): string {
  let text: string;
  if (tracking === 'time') {
    text = set.durationSec != null ? `${formatNumber(set.durationSec, 0)} s` : '–';
    if (set.weight) text += ` · ${formatNumber(set.weight, 2)} kg`;
  } else if (tracking === 'reps' || !set.weight) {
    text = set.reps != null ? `${set.reps} Wdh.` : '–';
    if (tracking === 'reps' && set.weight) text = `${set.reps ?? 0} × +${formatNumber(set.weight, 2)} kg`;
  } else {
    text = `${set.reps ?? 0} × ${formatNumber(set.weight, 2)} kg`;
  }
  if (set.side) text += ` (${SIDE_SHORT[set.side]})`;
  return text;
}

export interface SessionSets {
  sets: SetValues[];
}

/** Heaviest working weight of a session and the lowest reps achieved with it. */
export function topSet(session: SessionSets): { weight: number; reps: number } | null {
  let best: { weight: number; reps: number } | null = null;
  for (const s of session.sets) {
    if (!isWorkingSet(s) || !s.weight || !s.reps) continue;
    if (!best || s.weight > best.weight) best = { weight: s.weight, reps: s.reps };
    else if (s.weight === best.weight) best = { weight: best.weight, reps: Math.min(best.reps, s.reps) };
  }
  return best;
}

/**
 * Progressive-overload hint: if the heaviest weight of the last two sessions
 * was the same and the reps held up, suggest the next weight step.
 * `sessions` must be ordered newest first.
 */
export function progressionHint(
  sessions: readonly SessionSets[],
  step: number,
): { weight: number; basedOn: { weight: number; reps: number } } | null {
  if (sessions.length < 2 || step <= 0) return null;
  const last = topSet(sessions[0]);
  const prev = topSet(sessions[1]);
  if (!last || !prev) return null;
  if (Math.abs(last.weight - prev.weight) > EPS) return null;
  if (last.reps < prev.reps || last.reps < 5) return null;
  return { weight: tidy(last.weight + step, 2), basedOn: last };
}

/** Plates per side to load `target` kg on a bar. Greedy with standard plates. */
export function platesForWeight(
  target: number,
  barWeight: number,
  available: readonly number[] = [25, 20, 15, 10, 5, 2.5, 1.25],
): { perSide: number[]; remainder: number } {
  let perSideWeight = (target - barWeight) / 2;
  const perSide: number[] = [];
  if (perSideWeight <= 0) return { perSide, remainder: tidy(Math.max(0, target - barWeight), 3) };
  const sorted = [...available].sort((a, b) => b - a);
  for (const plate of sorted) {
    while (perSideWeight + EPS >= plate) {
      perSide.push(plate);
      perSideWeight = tidy(perSideWeight - plate, 4);
    }
  }
  return { perSide, remainder: tidy(perSideWeight * 2, 3) };
}

/** Percentage table (100 % … 50 %) of a 1RM with estimated reps. */
export function percentTable(oneRepMax: number): { percent: number; weight: number; reps: number }[] {
  const rows: { percent: number; weight: number; reps: number }[] = [];
  for (let p = 100; p >= 50; p -= 5) {
    const weight = (oneRepMax * p) / 100;
    // inverse Epley: reps = 30 * (1RM / w - 1)
    const reps = p === 100 ? 1 : Math.max(1, Math.round(30 * (100 / p - 1)));
    rows.push({ percent: p, weight: tidy(weight, 2), reps });
  }
  return rows;
}
