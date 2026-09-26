import { computeBests, EMPTY_BESTS, type LoadConfig } from '@/domain/strength';
import type {
  ExerciseBests,
  SetKind,
  Side,
  Workout,
  WorkoutExercise,
  WorkoutSet,
  WorkoutSource,
  WorkoutSummary,
} from '@/domain/types';

import { emitChange } from '../events';
import { db, placeholders, type SqlValue } from '../sql';

interface WorkoutRow {
  id: string;
  title: string;
  started_at: number;
  ended_at: number | null;
  notes: string | null;
  template_id: string | null;
  source: WorkoutSource;
}

interface WorkoutExerciseRow {
  id: string;
  workout_id: string;
  exercise_id: string;
  position: number;
  rest_seconds: number | null;
  notes: string | null;
}

interface SetRow {
  id: string;
  workout_exercise_id: string;
  position: number;
  reps: number | null;
  weight: number | null;
  duration_sec: number | null;
  side: Side | null;
  kind: SetKind;
  rpe: number | null;
  rest_sec: number | null;
  note: string | null;
}

function mapSet(row: SetRow): WorkoutSet {
  return {
    id: row.id,
    reps: row.reps,
    weight: row.weight,
    durationSec: row.duration_sec,
    side: row.side,
    kind: row.kind,
    rpe: row.rpe,
    restSec: row.rest_sec,
    note: row.note,
  };
}

/** SQL expression for the tonnage of a set (must match `setVolume` in domain/strength). */
export const SET_VOLUME_SQL = `
  CASE WHEN s.reps IS NOT NULL AND s.weight IS NOT NULL AND s.weight > 0 THEN
    s.reps * ((CASE WHEN e.weight_mode = 'per_side' THEN 2 ELSE 1 END) * s.weight
      + (CASE WHEN e.bar_mode = 'excluded' THEN COALESCE(e.bar_weight, 0) ELSE 0 END))
  ELSE 0 END`;

/** Inserts or replaces a complete workout including exercises and sets. */
export async function saveWorkout(workout: Workout): Promise<void> {
  const database = db();
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT INTO workouts (id, title, started_at, ended_at, notes, template_id, source, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title, started_at = excluded.started_at, ended_at = excluded.ended_at,
         notes = excluded.notes, template_id = excluded.template_id, source = excluded.source`,
      [
        workout.id,
        workout.title,
        workout.startedAt,
        workout.endedAt,
        workout.notes,
        workout.templateId,
        workout.source,
        Date.now(),
      ],
    );
    await database.runAsync('DELETE FROM workout_exercises WHERE workout_id = ?', [workout.id]);
    for (let i = 0; i < workout.exercises.length; i++) {
      const ex = workout.exercises[i];
      await database.runAsync(
        `INSERT INTO workout_exercises (id, workout_id, exercise_id, position, rest_seconds, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [ex.id, workout.id, ex.exerciseId, i, ex.restSeconds, ex.notes],
      );
      for (let j = 0; j < ex.sets.length; j++) {
        const s = ex.sets[j];
        await database.runAsync(
          `INSERT INTO workout_sets
            (id, workout_exercise_id, position, reps, weight, duration_sec, side, kind, rpe, rest_sec, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [s.id, ex.id, j, s.reps, s.weight, s.durationSec, s.side, s.kind, s.rpe, s.restSec, s.note],
        );
      }
    }
  });
  emitChange('workouts');
}

export async function getWorkout(id: string): Promise<Workout | null> {
  const database = db();
  const row = await database.getFirstAsync<WorkoutRow>('SELECT * FROM workouts WHERE id = ?', [id]);
  if (!row) return null;
  const exerciseRows = await database.getAllAsync<WorkoutExerciseRow>(
    'SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY position',
    [id],
  );
  const setRows = await database.getAllAsync<SetRow>(
    `SELECT s.* FROM workout_sets s
       JOIN workout_exercises we ON we.id = s.workout_exercise_id
      WHERE we.workout_id = ?
      ORDER BY s.position`,
    [id],
  );
  const setsByExercise = new Map<string, WorkoutSet[]>();
  for (const s of setRows) {
    const list = setsByExercise.get(s.workout_exercise_id) ?? [];
    list.push(mapSet(s));
    setsByExercise.set(s.workout_exercise_id, list);
  }
  const exercises: WorkoutExercise[] = exerciseRows.map((r) => ({
    id: r.id,
    exerciseId: r.exercise_id,
    restSeconds: r.rest_seconds,
    notes: r.notes,
    sets: setsByExercise.get(r.id) ?? [],
  }));
  return {
    id: row.id,
    title: row.title,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    notes: row.notes,
    templateId: row.template_id,
    source: row.source,
    exercises,
  };
}

export async function deleteWorkout(id: string): Promise<void> {
  await db().runAsync('DELETE FROM workouts WHERE id = ?', [id]);
  emitChange('workouts');
}

export async function listWorkoutSummaries(
  options: { limit?: number; offset?: number; fromMs?: number; toMs?: number } = {},
): Promise<WorkoutSummary[]> {
  const database = db();
  const params: SqlValue[] = [options.fromMs ?? 0, options.toMs ?? Number.MAX_SAFE_INTEGER];
  let sql = `
    SELECT w.id, w.title, w.started_at, w.ended_at,
      (SELECT COUNT(*) FROM workout_exercises we WHERE we.workout_id = w.id) AS exercise_count,
      (SELECT COUNT(*) FROM workout_sets s JOIN workout_exercises we ON we.id = s.workout_exercise_id
        WHERE we.workout_id = w.id) AS set_count,
      (SELECT COALESCE(SUM(${SET_VOLUME_SQL}), 0)
         FROM workout_sets s
         JOIN workout_exercises we ON we.id = s.workout_exercise_id
         JOIN exercises e ON e.id = we.exercise_id
        WHERE we.workout_id = w.id) AS volume
    FROM workouts w
    WHERE w.started_at BETWEEN ? AND ?
    ORDER BY w.started_at DESC`;
  if (options.limit != null) {
    sql += ' LIMIT ? OFFSET ?';
    params.push(options.limit, options.offset ?? 0);
  }
  const rows = await database.getAllAsync<{
    id: string;
    title: string;
    started_at: number;
    ended_at: number | null;
    exercise_count: number;
    set_count: number;
    volume: number;
  }>(sql, params);
  if (rows.length === 0) return [];
  const names = await database.getAllAsync<{ workout_id: string; name: string }>(
    `SELECT we.workout_id, e.name FROM workout_exercises we JOIN exercises e ON e.id = we.exercise_id
      WHERE we.workout_id IN (${placeholders(rows.length)})
      ORDER BY we.workout_id, we.position`,
    rows.map((r) => r.id),
  );
  const namesByWorkout = new Map<string, string[]>();
  for (const n of names) {
    const list = namesByWorkout.get(n.workout_id) ?? [];
    list.push(n.name);
    namesByWorkout.set(n.workout_id, list);
  }
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    exerciseCount: r.exercise_count,
    setCount: r.set_count,
    volume: r.volume,
    exerciseNames: namesByWorkout.get(r.id) ?? [],
  }));
}

export async function countWorkouts(): Promise<number> {
  const row = await db().getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM workouts');
  return row?.n ?? 0;
}

/** Start timestamps of all workouts in a range (for calendars and streaks). */
export async function workoutTimestamps(fromMs = 0, toMs = Number.MAX_SAFE_INTEGER): Promise<number[]> {
  const rows = await db().getAllAsync<{ started_at: number }>(
    'SELECT started_at FROM workouts WHERE started_at BETWEEN ? AND ? ORDER BY started_at',
    [fromMs, toMs],
  );
  return rows.map((r) => r.started_at);
}

export interface ExerciseSession {
  workoutId: string;
  workoutExerciseId: string;
  title: string;
  startedAt: number;
  restSeconds: number | null;
  notes: string | null;
  sets: WorkoutSet[];
}

/** All sessions of an exercise, newest first. */
export async function getExerciseHistory(
  exerciseId: string,
  options: { beforeMs?: number; limit?: number } = {},
): Promise<ExerciseSession[]> {
  const database = db();
  const params: SqlValue[] = [exerciseId, options.beforeMs ?? Number.MAX_SAFE_INTEGER];
  let sql = `
    SELECT we.id AS we_id, we.rest_seconds, we.notes, w.id AS workout_id, w.title, w.started_at
      FROM workout_exercises we JOIN workouts w ON w.id = we.workout_id
     WHERE we.exercise_id = ? AND w.started_at < ?
     ORDER BY w.started_at DESC, we.position`;
  if (options.limit != null) {
    sql += ' LIMIT ?';
    params.push(options.limit);
  }
  const sessions = await database.getAllAsync<{
    we_id: string;
    rest_seconds: number | null;
    notes: string | null;
    workout_id: string;
    title: string;
    started_at: number;
  }>(sql, params);
  if (sessions.length === 0) return [];
  const setRows = await database.getAllAsync<SetRow>(
    `SELECT * FROM workout_sets WHERE workout_exercise_id IN (${placeholders(sessions.length)})
      ORDER BY position`,
    sessions.map((s) => s.we_id),
  );
  const byExercise = new Map<string, WorkoutSet[]>();
  for (const s of setRows) {
    const list = byExercise.get(s.workout_exercise_id) ?? [];
    list.push(mapSet(s));
    byExercise.set(s.workout_exercise_id, list);
  }
  return sessions
    .map((s) => ({
      workoutId: s.workout_id,
      workoutExerciseId: s.we_id,
      title: s.title,
      startedAt: s.started_at,
      restSeconds: s.rest_seconds,
      notes: s.notes,
      sets: byExercise.get(s.we_id) ?? [],
    }))
    .filter((s) => s.sets.length > 0);
}

export interface ExerciseContext {
  /** Most recent session before `beforeMs` ("Vorher" values). */
  last: ExerciseSession | null;
  /** Up to 3 most recent sessions (newest first) for progression hints. */
  recent: ExerciseSession[];
  bests: ExerciseBests;
}

/** Everything the workout screen needs to know about the history of an exercise. */
export async function getExerciseContext(
  exerciseId: string,
  config: LoadConfig,
  beforeMs: number = Number.MAX_SAFE_INTEGER,
): Promise<ExerciseContext> {
  const history = await getExerciseHistory(exerciseId, { beforeMs });
  if (history.length === 0) return { last: null, recent: [], bests: EMPTY_BESTS };
  const bests = computeBests(
    history.flatMap((h) => h.sets),
    config,
  );
  return { last: history[0], recent: history.slice(0, 3), bests };
}
