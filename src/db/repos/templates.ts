import { createId } from '@/domain/id';
import type { Template, TemplateExercise, TemplateSet, Workout } from '@/domain/types';

import { emitChange } from '../events';
import { db, jsonParse } from '../sql';

interface TemplateRow {
  id: string;
  name: string;
  notes: string | null;
  position: number;
  last_used_at: number | null;
  created_at: number;
}

interface TemplateExerciseRow {
  id: string;
  template_id: string;
  exercise_id: string;
  position: number;
  rest_seconds: number | null;
  notes: string | null;
  sets: string;
}

export async function listTemplates(): Promise<Template[]> {
  const database = db();
  const rows = await database.getAllAsync<TemplateRow>(
    'SELECT * FROM templates ORDER BY position, created_at',
  );
  const exerciseRows = await database.getAllAsync<TemplateExerciseRow>(
    `SELECT te.* FROM template_exercises te
       JOIN exercises e ON e.id = te.exercise_id
      ORDER BY te.template_id, te.position`,
  );
  const byTemplate = new Map<string, TemplateExercise[]>();
  for (const r of exerciseRows) {
    const list = byTemplate.get(r.template_id) ?? [];
    list.push({
      id: r.id,
      exerciseId: r.exercise_id,
      restSeconds: r.rest_seconds,
      notes: r.notes,
      sets: jsonParse<TemplateSet[]>(r.sets, []),
    });
    byTemplate.set(r.template_id, list);
  }
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    notes: r.notes,
    position: r.position,
    lastUsedAt: r.last_used_at,
    createdAt: r.created_at,
    exercises: byTemplate.get(r.id) ?? [],
  }));
}

export async function getTemplate(id: string): Promise<Template | null> {
  const all = await listTemplates();
  return all.find((t) => t.id === id) ?? null;
}

export async function saveTemplate(template: Template): Promise<void> {
  const database = db();
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT INTO templates (id, name, notes, position, last_used_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name, notes = excluded.notes, position = excluded.position,
         last_used_at = excluded.last_used_at`,
      [template.id, template.name.trim(), template.notes, template.position, template.lastUsedAt, template.createdAt],
    );
    await database.runAsync('DELETE FROM template_exercises WHERE template_id = ?', [template.id]);
    for (let i = 0; i < template.exercises.length; i++) {
      const ex = template.exercises[i];
      await database.runAsync(
        `INSERT INTO template_exercises (id, template_id, exercise_id, position, rest_seconds, notes, sets)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [ex.id, template.id, ex.exerciseId, i, ex.restSeconds, ex.notes, JSON.stringify(ex.sets)],
      );
    }
  });
  emitChange('templates');
}

export async function deleteTemplate(id: string): Promise<void> {
  await db().runAsync('DELETE FROM templates WHERE id = ?', [id]);
  emitChange('templates');
}

export async function markTemplateUsed(id: string, at: number = Date.now()): Promise<void> {
  await db().runAsync('UPDATE templates SET last_used_at = ? WHERE id = ?', [at, id]);
  emitChange('templates');
}

export async function nextTemplatePosition(): Promise<number> {
  const row = await db().getFirstAsync<{ p: number | null }>('SELECT MAX(position) AS p FROM templates');
  return (row?.p ?? -1) + 1;
}

/** Creates a plan from a finished workout (sets become the target values). */
export function templateFromWorkout(workout: Workout, name: string, position: number): Template {
  return {
    id: createId(),
    name,
    notes: null,
    position,
    lastUsedAt: null,
    createdAt: Date.now(),
    exercises: workout.exercises.map((ex) => ({
      id: createId(),
      exerciseId: ex.exerciseId,
      restSeconds: ex.restSeconds,
      notes: ex.notes,
      sets: ex.sets.map((s) => ({
        reps: s.reps,
        weight: s.weight,
        durationSec: s.durationSec,
        side: s.side,
        kind: s.kind,
      })),
    })),
  };
}
