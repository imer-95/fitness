import { addDays, startOfDayMs, startOfWeek, toDateKey } from '@/domain/dates';
import { analyzeHistory, type ExerciseProgress, type HistorySet, type PrEvent } from '@/domain/stats';
import type { ExerciseConfig } from '@/domain/strength';
import type { DateKey, MuscleGroup, SetKind } from '@/domain/types';

import { db } from '../sql';
import { listExercises } from './exercises';
import { SET_VOLUME_SQL } from './workouts';

export interface WeekBucket {
  weekStart: DateKey;
  workouts: number;
  sets: number;
  volume: number;
  cardioMinutes: number;
  cardioKm: number;
}

/** Training per week (Mon–Sun) for the last `weeks` weeks including the current one. */
export async function weeklyTraining(weeks: number, today: DateKey): Promise<WeekBucket[]> {
  const firstWeek = startOfWeek(addDays(today, -(weeks - 1) * 7));
  const fromMs = startOfDayMs(firstWeek);
  const buckets = new Map<DateKey, WeekBucket>();
  for (let i = 0; i < weeks; i++) {
    const weekStart = addDays(firstWeek, i * 7);
    buckets.set(weekStart, { weekStart, workouts: 0, sets: 0, volume: 0, cardioMinutes: 0, cardioKm: 0 });
  }
  const workouts = await db().getAllAsync<{ started_at: number; sets: number; volume: number }>(
    `SELECT w.started_at,
       (SELECT COUNT(*) FROM workout_sets s JOIN workout_exercises we ON we.id = s.workout_exercise_id
         WHERE we.workout_id = w.id) AS sets,
       (SELECT COALESCE(SUM(${SET_VOLUME_SQL}), 0) FROM workout_sets s
          JOIN workout_exercises we ON we.id = s.workout_exercise_id
          JOIN exercises e ON e.id = we.exercise_id
         WHERE we.workout_id = w.id) AS volume
     FROM workouts w WHERE w.started_at >= ?`,
    [fromMs],
  );
  for (const w of workouts) {
    const b = buckets.get(startOfWeek(toDateKey(w.started_at)));
    if (!b) continue;
    b.workouts++;
    b.sets += w.sets;
    b.volume += w.volume;
  }
  const cardio = await db().getAllAsync<{ started_at: number; duration_sec: number; distance_km: number | null }>(
    'SELECT started_at, duration_sec, distance_km FROM cardio_sessions WHERE started_at >= ?',
    [fromMs],
  );
  for (const c of cardio) {
    const b = buckets.get(startOfWeek(toDateKey(c.started_at)));
    if (!b) continue;
    b.cardioMinutes += c.duration_sec / 60;
    b.cardioKm += c.distance_km ?? 0;
  }
  return [...buckets.values()];
}

/** Working sets per primary muscle group in a time range. */
export async function muscleSetCounts(fromMs: number, toMs: number): Promise<Map<MuscleGroup, number>> {
  const rows = await db().getAllAsync<{ muscle: MuscleGroup; n: number }>(
    `SELECT e.muscle, COUNT(s.id) AS n
       FROM workout_sets s
       JOIN workout_exercises we ON we.id = s.workout_exercise_id
       JOIN workouts w ON w.id = we.workout_id
       JOIN exercises e ON e.id = we.exercise_id
      WHERE w.started_at BETWEEN ? AND ? AND s.kind != 'warmup'
      GROUP BY e.muscle`,
    [fromMs, toMs],
  );
  return new Map(rows.map((r) => [r.muscle, r.n]));
}

export interface DayActivity {
  strength: number;
  cardio: number;
}

/** Number of strength workouts and cardio sessions per day. */
export async function activityByDay(from: DateKey, to: DateKey): Promise<Map<DateKey, DayActivity>> {
  const fromMs = startOfDayMs(from);
  const toMs = startOfDayMs(addDays(to, 1)) - 1;
  const map = new Map<DateKey, DayActivity>();
  const get = (key: DateKey) => {
    let a = map.get(key);
    if (!a) {
      a = { strength: 0, cardio: 0 };
      map.set(key, a);
    }
    return a;
  };
  const workouts = await db().getAllAsync<{ started_at: number }>(
    'SELECT started_at FROM workouts WHERE started_at BETWEEN ? AND ?',
    [fromMs, toMs],
  );
  for (const w of workouts) get(toDateKey(w.started_at)).strength++;
  const cardio = await db().getAllAsync<{ started_at: number }>(
    'SELECT started_at FROM cardio_sessions WHERE started_at BETWEEN ? AND ?',
    [fromMs, toMs],
  );
  for (const c of cardio) get(toDateKey(c.started_at)).cardio++;
  return map;
}

export interface HistoryAnalysis {
  prs: PrEvent[];
  progress: Map<string, ExerciseProgress>;
}

/** Personal records and per-exercise progress over the complete history. */
export async function analyzeTrainingHistory(): Promise<HistoryAnalysis> {
  const rows = await db().getAllAsync<{
    workout_id: string;
    started_at: number;
    exercise_id: string;
    reps: number | null;
    weight: number | null;
    duration_sec: number | null;
    kind: SetKind;
  }>(
    `SELECT w.id AS workout_id, w.started_at, we.exercise_id, s.reps, s.weight, s.duration_sec, s.kind
       FROM workout_sets s
       JOIN workout_exercises we ON we.id = s.workout_exercise_id
       JOIN workouts w ON w.id = we.workout_id
      ORDER BY w.started_at, w.id, we.exercise_id, we.position, s.position`,
  );
  const sets: HistorySet[] = rows.map((r) => ({
    workoutId: r.workout_id,
    startedAt: r.started_at,
    exerciseId: r.exercise_id,
    reps: r.reps,
    weight: r.weight,
    durationSec: r.duration_sec,
    kind: r.kind,
  }));
  const exercises = await listExercises({ includeArchived: true });
  const configs = new Map<string, ExerciseConfig>(exercises.map((e) => [e.id, e]));
  return analyzeHistory(sets, configs);
}
