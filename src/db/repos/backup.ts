import { formatTime, toDateKey } from '@/domain/dates';
import { formatNumber } from '@/domain/format';
import { CARDIO_LABELS, MEAL_LABELS, SET_KIND_LABELS } from '@/domain/labels';
import { SIDE_LABELS } from '@/domain/strength';
import type { CardioType, Meal, SetKind, Side } from '@/domain/types';

import { ALL_TABLES, emitChange } from '../events';
import { SCHEMA_VERSION } from '../migrations';
import { seedDatabase } from '../seed';
import { db, type SqlValue } from '../sql';

/** Tables in foreign-key order (parents first). */
export const BACKUP_TABLES = [
  'kv',
  'exercises',
  'workouts',
  'workout_exercises',
  'workout_sets',
  'templates',
  'template_exercises',
  'body_weights',
  'measurements',
  'cardio_sessions',
  'foods',
  'food_entries',
  'water_log',
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];

export interface BackupFile {
  app: 'formkurve';
  format: 1;
  schemaVersion: number;
  exportedAt: string;
  tables: Partial<Record<BackupTable, Record<string, SqlValue>[]>>;
}

export async function createBackup(): Promise<BackupFile> {
  const tables: BackupFile['tables'] = {};
  for (const table of BACKUP_TABLES) {
    tables[table] = await db().getAllAsync<Record<string, SqlValue>>(`SELECT * FROM ${table}`);
  }
  return {
    app: 'formkurve',
    format: 1,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    tables,
  };
}

/** Checks the structure of a parsed backup file and returns it typed. */
export function validateBackup(data: unknown): BackupFile {
  if (!data || typeof data !== 'object') throw new Error('Die Datei ist kein gültiges Backup.');
  const file = data as Partial<BackupFile>;
  if (file.app !== 'formkurve' || file.format !== 1 || !file.tables || typeof file.tables !== 'object') {
    throw new Error('Die Datei ist kein Formkurve-Backup.');
  }
  if ((file.schemaVersion ?? 0) > SCHEMA_VERSION) {
    throw new Error('Das Backup stammt aus einer neueren App-Version. Bitte aktualisiere die App.');
  }
  for (const [table, rows] of Object.entries(file.tables)) {
    if (!(BACKUP_TABLES as readonly string[]).includes(table)) {
      throw new Error(`Unbekannte Tabelle im Backup: ${table}`);
    }
    if (!Array.isArray(rows)) throw new Error(`Ungültige Daten in Tabelle ${table}.`);
  }
  return file as BackupFile;
}

async function tableColumns(table: BackupTable): Promise<string[]> {
  const rows = await db().getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return rows.map((r) => r.name);
}

async function clearAll(): Promise<void> {
  for (const table of [...BACKUP_TABLES].reverse()) {
    await db().runAsync(`DELETE FROM ${table}`);
  }
}

/** Replaces all data with the backup content. */
export async function restoreBackup(backup: BackupFile): Promise<void> {
  const database = db();
  await database.withTransactionAsync(async () => {
    await clearAll();
    for (const table of BACKUP_TABLES) {
      const rows = backup.tables[table] ?? [];
      if (rows.length === 0) continue;
      const columns = await tableColumns(table);
      for (const row of rows) {
        const keys = Object.keys(row).filter((k) => columns.includes(k));
        if (keys.length === 0) continue;
        await database.runAsync(
          `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
          keys.map((k) => row[k] ?? null),
        );
      }
    }
  });
  // Adds built-in exercises/foods that are newer than the backup.
  await seedDatabase(database);
  emitChange(...ALL_TABLES);
}

/** Deletes all personal data and restores the built-in library. */
export async function resetAllData(): Promise<void> {
  const database = db();
  await database.withTransactionAsync(clearAll);
  await seedDatabase(database);
  emitChange(...ALL_TABLES);
}

// ---------------------------------------------------------------------------
// CSV (semicolon separated, German decimals — opens directly in Excel)
// ---------------------------------------------------------------------------

function csvCell(value: string | number | null | undefined): string {
  if (value == null) return '';
  const text = typeof value === 'number' ? formatNumber(value, 2).replace(/\./g, '') : value;
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  return `﻿${[header, ...rows].map((r) => r.map(csvCell).join(';')).join('\n')}\n`;
}

export async function exportWeightsCsv(): Promise<string> {
  const rows = await db().getAllAsync<{ date: string; weight: number; body_fat: number | null; note: string | null }>(
    'SELECT date, weight, body_fat, note FROM body_weights ORDER BY date',
  );
  return toCsv(
    ['Datum', 'Gewicht (kg)', 'Körperfett (%)', 'Notiz'],
    rows.map((r) => [r.date, r.weight, r.body_fat, r.note]),
  );
}

export async function exportWorkoutsCsv(): Promise<string> {
  const rows = await db().getAllAsync<{
    started_at: number;
    title: string;
    name: string;
    position: number;
    reps: number | null;
    weight: number | null;
    duration_sec: number | null;
    side: Side | null;
    kind: SetKind;
    rest_sec: number | null;
  }>(
    `SELECT w.started_at, w.title, e.name, s.position, s.reps, s.weight, s.duration_sec, s.side, s.kind, s.rest_sec
       FROM workout_sets s
       JOIN workout_exercises we ON we.id = s.workout_exercise_id
       JOIN workouts w ON w.id = we.workout_id
       JOIN exercises e ON e.id = we.exercise_id
      ORDER BY w.started_at, we.position, s.position`,
  );
  return toCsv(
    ['Datum', 'Uhrzeit', 'Training', 'Übung', 'Satz', 'Wiederholungen', 'Gewicht (kg)', 'Dauer (s)', 'Seite', 'Art', 'Pause (s)'],
    rows.map((r) => [
      toDateKey(r.started_at),
      formatTime(r.started_at),
      r.title,
      r.name,
      r.position + 1,
      r.reps,
      r.weight,
      r.duration_sec,
      r.side ? SIDE_LABELS[r.side] : null,
      SET_KIND_LABELS[r.kind],
      r.rest_sec,
    ]),
  );
}

export async function exportNutritionCsv(): Promise<string> {
  const rows = await db().getAllAsync<{
    date: string;
    meal: Meal;
    name: string;
    amount: number | null;
    unit: string | null;
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  }>('SELECT date, meal, name, amount, unit, kcal, protein, carbs, fat FROM food_entries ORDER BY date, created_at');
  return toCsv(
    ['Datum', 'Mahlzeit', 'Lebensmittel', 'Menge', 'Einheit', 'kcal', 'Eiweiß (g)', 'Kohlenhydrate (g)', 'Fett (g)'],
    rows.map((r) => [r.date, MEAL_LABELS[r.meal], r.name, r.amount, r.unit, r.kcal, r.protein, r.carbs, r.fat]),
  );
}

export async function exportCardioCsv(): Promise<string> {
  const rows = await db().getAllAsync<{
    started_at: number;
    type: CardioType;
    duration_sec: number;
    distance_km: number | null;
    kcal: number | null;
    avg_hr: number | null;
    notes: string | null;
  }>('SELECT * FROM cardio_sessions ORDER BY started_at');
  return toCsv(
    ['Datum', 'Uhrzeit', 'Art', 'Dauer (min)', 'Distanz (km)', 'kcal', 'Ø Puls', 'Notiz'],
    rows.map((r) => [
      toDateKey(r.started_at),
      formatTime(r.started_at),
      CARDIO_LABELS[r.type],
      Math.round((r.duration_sec / 60) * 10) / 10,
      r.distance_km,
      r.kcal,
      r.avg_hr,
      r.notes,
    ]),
  );
}
