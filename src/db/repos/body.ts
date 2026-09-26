import { createId } from '@/domain/id';
import type { DateKey, Measurement, MeasurementType, WeightEntry } from '@/domain/types';

import { emitChange } from '../events';
import { db } from '../sql';

interface WeightRow {
  date: string;
  weight: number;
  body_fat: number | null;
  note: string | null;
  created_at: number;
}

function mapWeight(row: WeightRow): WeightEntry {
  return {
    date: row.date,
    weight: row.weight,
    bodyFat: row.body_fat,
    note: row.note,
    createdAt: row.created_at,
  };
}

/** One weight entry per day — saving again overwrites the day. */
export async function upsertWeight(
  date: DateKey,
  weight: number,
  extra: { bodyFat?: number | null; note?: string | null } = {},
): Promise<void> {
  await db().runAsync(
    `INSERT INTO body_weights (date, weight, body_fat, note, created_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET weight = excluded.weight, body_fat = excluded.body_fat, note = excluded.note`,
    [date, weight, extra.bodyFat ?? null, extra.note ?? null, Date.now()],
  );
  emitChange('weights');
}

export async function deleteWeight(date: DateKey): Promise<void> {
  await db().runAsync('DELETE FROM body_weights WHERE date = ?', [date]);
  emitChange('weights');
}

export async function getWeight(date: DateKey): Promise<WeightEntry | null> {
  const row = await db().getFirstAsync<WeightRow>('SELECT * FROM body_weights WHERE date = ?', [date]);
  return row ? mapWeight(row) : null;
}

/** Entries sorted ascending by date. */
export async function listWeights(from: DateKey = '0000-01-01', to: DateKey = '9999-12-31'): Promise<WeightEntry[]> {
  const rows = await db().getAllAsync<WeightRow>(
    'SELECT * FROM body_weights WHERE date BETWEEN ? AND ? ORDER BY date',
    [from, to],
  );
  return rows.map(mapWeight);
}

export async function getLatestWeight(onOrBefore: DateKey = '9999-12-31'): Promise<WeightEntry | null> {
  const row = await db().getFirstAsync<WeightRow>(
    'SELECT * FROM body_weights WHERE date <= ? ORDER BY date DESC LIMIT 1',
    [onOrBefore],
  );
  return row ? mapWeight(row) : null;
}

interface MeasurementRow {
  id: string;
  date: string;
  type: MeasurementType;
  value: number;
  created_at: number;
}

/** Saves all given measurements of a day; `null` removes a value. */
export async function saveMeasurements(
  date: DateKey,
  values: Partial<Record<MeasurementType, number | null>>,
): Promise<void> {
  const database = db();
  await database.withTransactionAsync(async () => {
    for (const [type, value] of Object.entries(values) as [MeasurementType, number | null][]) {
      if (value == null) {
        await database.runAsync('DELETE FROM measurements WHERE date = ? AND type = ?', [date, type]);
      } else {
        await database.runAsync(
          `INSERT INTO measurements (id, date, type, value, created_at) VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(date, type) DO UPDATE SET value = excluded.value`,
          [createId(), date, type, value, Date.now()],
        );
      }
    }
  });
  emitChange('measurements');
}

export async function listMeasurements(): Promise<Measurement[]> {
  const rows = await db().getAllAsync<MeasurementRow>('SELECT * FROM measurements ORDER BY date, type');
  return rows.map((r) => ({ id: r.id, date: r.date, type: r.type, value: r.value, createdAt: r.created_at }));
}

export async function deleteMeasurementsOn(date: DateKey): Promise<void> {
  await db().runAsync('DELETE FROM measurements WHERE date = ?', [date]);
  emitChange('measurements');
}
