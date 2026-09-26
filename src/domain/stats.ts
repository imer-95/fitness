import { addDays, startOfWeek, toDateKey } from './dates';
import { detectPrs, estimate1RM, mergeBests, EMPTY_BESTS, type ExerciseConfig } from './strength';
import type { DateKey, ExerciseBests, PrType, SetKind } from './types';

/**
 * Consecutive weeks (Mon–Sun) with at least `goal` workouts. The current
 * week only counts once the goal is reached, but does not break the streak.
 */
export function weeklyStreak(
  workoutDays: readonly DateKey[],
  goal: number,
  today: DateKey,
): number {
  if (goal <= 0) return 0;
  const perWeek = new Map<DateKey, number>();
  for (const day of workoutDays) {
    const week = startOfWeek(day);
    perWeek.set(week, (perWeek.get(week) ?? 0) + 1);
  }
  const currentWeek = startOfWeek(today);
  let streak = (perWeek.get(currentWeek) ?? 0) >= goal ? 1 : 0;
  let week = addDays(currentWeek, -7);
  while ((perWeek.get(week) ?? 0) >= goal) {
    streak++;
    week = addDays(week, -7);
  }
  return streak;
}

export interface HistorySet {
  workoutId: string;
  startedAt: number;
  exerciseId: string;
  reps: number | null;
  weight: number | null;
  durationSec: number | null;
  kind: SetKind;
}

export interface PrEvent {
  exerciseId: string;
  workoutId: string;
  date: DateKey;
  startedAt: number;
  type: PrType;
  /** Weight in kg, e1RM in kg, reps or seconds depending on the type. */
  value: number;
  reps: number | null;
  weight: number | null;
  durationSec: number | null;
}

export interface ExerciseProgress {
  exerciseId: string;
  sessions: number;
  lastAt: number;
  bests: ExerciseBests;
  /** Best value per session (e1RM, reps or seconds depending on tracking). */
  series: { date: DateKey; startedAt: number; value: number }[];
}

function prValue(type: PrType, set: HistorySet): number {
  switch (type) {
    case 'weight':
      return set.weight ?? 0;
    case 'e1rm':
      return estimate1RM(set.weight ?? 0, set.reps ?? 0);
    case 'reps':
      return set.reps ?? 0;
    case 'duration':
      return set.durationSec ?? 0;
    default:
      return 0;
  }
}

function sessionValue(set: HistorySet, config: ExerciseConfig): number {
  if (config.tracking === 'time') return set.durationSec ?? 0;
  if (config.tracking === 'reps' || !set.weight) return set.reps ?? 0;
  return estimate1RM(set.weight, set.reps ?? 0);
}

/**
 * Walks through the complete history (sorted by time) and derives personal
 * records and per-exercise progress. Only the best record of each type per
 * workout is reported.
 */
export function analyzeHistory(
  sets: readonly HistorySet[],
  configs: ReadonlyMap<string, ExerciseConfig>,
): { prs: PrEvent[]; progress: Map<string, ExerciseProgress> } {
  const bests = new Map<string, ExerciseBests>();
  const progress = new Map<string, ExerciseProgress>();
  const prs: PrEvent[] = [];

  let i = 0;
  while (i < sets.length) {
    // one block = all sets of one exercise within one workout
    const { workoutId, exerciseId, startedAt } = sets[i];
    let j = i;
    while (j < sets.length && sets[j].workoutId === workoutId && sets[j].exerciseId === exerciseId) j++;
    const block = sets.slice(i, j);
    i = j;

    const config = configs.get(exerciseId);
    if (!config) continue;
    const before = bests.get(exerciseId) ?? EMPTY_BESTS;
    const blockPrs = new Map<PrType, PrEvent>();
    let running = before;
    let sessionBest = 0;
    for (const set of block) {
      for (const type of detectPrs(set, running, config.tracking)) {
        const value = prValue(type, set);
        const existing = blockPrs.get(type);
        if (!existing || value > existing.value) {
          blockPrs.set(type, {
            exerciseId,
            workoutId,
            date: toDateKey(startedAt),
            startedAt,
            type,
            value,
            reps: set.reps,
            weight: set.weight,
            durationSec: set.durationSec,
          });
        }
      }
      running = mergeBests(running, set, config);
      if (set.kind !== 'warmup') sessionBest = Math.max(sessionBest, sessionValue(set, config));
    }
    bests.set(exerciseId, running);
    prs.push(...blockPrs.values());

    const p = progress.get(exerciseId) ?? {
      exerciseId,
      sessions: 0,
      lastAt: 0,
      bests: EMPTY_BESTS,
      series: [],
    };
    const lastPoint = p.series[p.series.length - 1];
    if (!lastPoint || lastPoint.startedAt !== startedAt) {
      p.sessions++;
      if (sessionBest > 0) p.series.push({ date: toDateKey(startedAt), startedAt, value: sessionBest });
    } else if (sessionBest > lastPoint.value) {
      lastPoint.value = sessionBest;
    }
    p.lastAt = Math.max(p.lastAt, startedAt);
    p.bests = running;
    progress.set(exerciseId, p);
  }

  prs.sort((a, b) => b.startedAt - a.startedAt);
  return { prs, progress };
}
