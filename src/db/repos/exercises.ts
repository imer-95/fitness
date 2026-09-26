import { createId } from '@/domain/id';
import { normalizeName } from '@/domain/notes';
import type { BarMode, Equipment, Exercise, MuscleGroup, TrackingType, WeightMode } from '@/domain/types';

import { emitChange } from '../events';
import { bool, db, jsonParse, placeholders } from '../sql';

interface ExerciseRow {
  id: string;
  name: string;
  muscle: MuscleGroup;
  secondary: string;
  equipment: Equipment;
  tracking: TrackingType;
  weight_mode: WeightMode;
  bar_mode: BarMode;
  bar_weight: number | null;
  unilateral: number;
  rest_seconds: number;
  notes: string | null;
  aliases: string;
  is_custom: number;
  archived: number;
  created_at: number;
}

export function mapExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    muscle: row.muscle,
    secondary: jsonParse<MuscleGroup[]>(row.secondary, []),
    equipment: row.equipment,
    tracking: row.tracking,
    weightMode: row.weight_mode,
    barMode: row.bar_mode,
    barWeight: row.bar_weight,
    unilateral: bool(row.unilateral),
    restSeconds: row.rest_seconds,
    notes: row.notes,
    aliases: jsonParse<string[]>(row.aliases, []),
    isCustom: bool(row.is_custom),
    archived: bool(row.archived),
    createdAt: row.created_at,
  };
}

/** Sort key that orders umlauts like their base letter (Ä -> A). */
export function germanSortKey(value: string): string {
  return value.toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss');
}

export function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ka = germanSortKey(a.name);
    const kb = germanSortKey(b.name);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
}

export async function listExercises(options: { includeArchived?: boolean } = {}): Promise<Exercise[]> {
  const rows = await db().getAllAsync<ExerciseRow>(
    options.includeArchived ? 'SELECT * FROM exercises' : 'SELECT * FROM exercises WHERE archived = 0',
  );
  return sortByName(rows.map(mapExercise));
}

export async function getExercise(id: string): Promise<Exercise | null> {
  const row = await db().getFirstAsync<ExerciseRow>('SELECT * FROM exercises WHERE id = ?', [id]);
  return row ? mapExercise(row) : null;
}

export async function getExercisesByIds(ids: readonly string[]): Promise<Map<string, Exercise>> {
  const unique = [...new Set(ids)];
  const map = new Map<string, Exercise>();
  if (unique.length === 0) return map;
  const rows = await db().getAllAsync<ExerciseRow>(
    `SELECT * FROM exercises WHERE id IN (${placeholders(unique.length)})`,
    unique,
  );
  for (const row of rows) map.set(row.id, mapExercise(row));
  return map;
}

export type ExerciseInput = Pick<Exercise, 'name' | 'muscle' | 'equipment'> &
  Partial<Omit<Exercise, 'id' | 'createdAt' | 'name' | 'muscle' | 'equipment'>>;

export async function createExercise(input: ExerciseInput): Promise<Exercise> {
  const exercise: Exercise = {
    id: createId(),
    name: input.name.trim(),
    muscle: input.muscle,
    secondary: input.secondary ?? [],
    equipment: input.equipment,
    tracking: input.tracking ?? 'weight_reps',
    weightMode: input.weightMode ?? 'total',
    barMode: input.barMode ?? 'none',
    barWeight: input.barWeight ?? null,
    unilateral: input.unilateral ?? false,
    restSeconds: input.restSeconds ?? 90,
    notes: input.notes ?? null,
    aliases: input.aliases ?? [],
    isCustom: input.isCustom ?? true,
    archived: false,
    createdAt: Date.now(),
  };
  await db().runAsync(
    `INSERT INTO exercises
      (id, name, muscle, secondary, equipment, tracking, weight_mode, bar_mode, bar_weight,
       unilateral, rest_seconds, notes, aliases, is_custom, archived, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      exercise.id,
      exercise.name,
      exercise.muscle,
      JSON.stringify(exercise.secondary),
      exercise.equipment,
      exercise.tracking,
      exercise.weightMode,
      exercise.barMode,
      exercise.barWeight,
      exercise.unilateral ? 1 : 0,
      exercise.restSeconds,
      exercise.notes,
      JSON.stringify(exercise.aliases),
      exercise.isCustom ? 1 : 0,
      exercise.createdAt,
    ],
  );
  emitChange('exercises');
  return exercise;
}

export async function updateExercise(id: string, patch: Partial<Omit<Exercise, 'id'>>): Promise<void> {
  const columns: string[] = [];
  const values: (string | number | null)[] = [];
  const set = (column: string, value: string | number | null) => {
    columns.push(`${column} = ?`);
    values.push(value);
  };
  if (patch.name !== undefined) set('name', patch.name.trim());
  if (patch.muscle !== undefined) set('muscle', patch.muscle);
  if (patch.secondary !== undefined) set('secondary', JSON.stringify(patch.secondary));
  if (patch.equipment !== undefined) set('equipment', patch.equipment);
  if (patch.tracking !== undefined) set('tracking', patch.tracking);
  if (patch.weightMode !== undefined) set('weight_mode', patch.weightMode);
  if (patch.barMode !== undefined) set('bar_mode', patch.barMode);
  if (patch.barWeight !== undefined) set('bar_weight', patch.barWeight);
  if (patch.unilateral !== undefined) set('unilateral', patch.unilateral ? 1 : 0);
  if (patch.restSeconds !== undefined) set('rest_seconds', patch.restSeconds);
  if (patch.notes !== undefined) set('notes', patch.notes);
  if (patch.aliases !== undefined) set('aliases', JSON.stringify(patch.aliases));
  if (patch.archived !== undefined) set('archived', patch.archived ? 1 : 0);
  if (columns.length === 0) return;
  values.push(id);
  await db().runAsync(`UPDATE exercises SET ${columns.join(', ')} WHERE id = ?`, values);
  emitChange('exercises');
}

/** Adds an alternative name (used when mapping imported notes). */
export async function addExerciseAlias(id: string, alias: string): Promise<void> {
  const exercise = await getExercise(id);
  if (!exercise) return;
  const key = normalizeName(alias);
  if (!key || normalizeName(exercise.name) === key) return;
  if (exercise.aliases.some((a) => normalizeName(a) === key)) return;
  await updateExercise(id, { aliases: [...exercise.aliases, alias.trim()] });
}

export async function isExerciseUsed(id: string): Promise<boolean> {
  const row = await db().getFirstAsync<{ n: number }>(
    `SELECT (SELECT COUNT(*) FROM workout_exercises WHERE exercise_id = ?)
          + (SELECT COUNT(*) FROM template_exercises WHERE exercise_id = ?) AS n`,
    [id, id],
  );
  return (row?.n ?? 0) > 0;
}

/** Deletes an unused exercise; exercises with history are archived instead. */
export async function deleteExercise(id: string): Promise<'deleted' | 'archived'> {
  if (await isExerciseUsed(id)) {
    await updateExercise(id, { archived: true });
    return 'archived';
  }
  await db().runAsync('DELETE FROM exercises WHERE id = ?', [id]);
  emitChange('exercises');
  return 'deleted';
}

export interface ExerciseUsage {
  sessions: number;
  lastAt: number;
}

/** How often and when each exercise was trained. */
export async function exerciseUsage(): Promise<Map<string, ExerciseUsage>> {
  const rows = await db().getAllAsync<{ exercise_id: string; sessions: number; last_at: number }>(
    `SELECT we.exercise_id, COUNT(DISTINCT we.workout_id) AS sessions, MAX(w.started_at) AS last_at
       FROM workout_exercises we JOIN workouts w ON w.id = we.workout_id
      GROUP BY we.exercise_id`,
  );
  return new Map(rows.map((r) => [r.exercise_id, { sessions: r.sessions, lastAt: r.last_at }]));
}
