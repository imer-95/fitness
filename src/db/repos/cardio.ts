import type { CardioSession, CardioType } from '@/domain/types';

import { emitChange } from '../events';
import { db, type SqlValue } from '../sql';

interface CardioRow {
  id: string;
  type: CardioType;
  started_at: number;
  duration_sec: number;
  distance_km: number | null;
  kcal: number | null;
  avg_hr: number | null;
  notes: string | null;
  created_at: number;
}

function mapCardio(row: CardioRow): CardioSession {
  return {
    id: row.id,
    type: row.type,
    startedAt: row.started_at,
    durationSec: row.duration_sec,
    distanceKm: row.distance_km,
    kcal: row.kcal,
    avgHr: row.avg_hr,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function saveCardio(session: CardioSession): Promise<void> {
  await db().runAsync(
    `INSERT INTO cardio_sessions (id, type, started_at, duration_sec, distance_km, kcal, avg_hr, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       type = excluded.type, started_at = excluded.started_at, duration_sec = excluded.duration_sec,
       distance_km = excluded.distance_km, kcal = excluded.kcal, avg_hr = excluded.avg_hr, notes = excluded.notes`,
    [
      session.id,
      session.type,
      session.startedAt,
      session.durationSec,
      session.distanceKm,
      session.kcal,
      session.avgHr,
      session.notes,
      session.createdAt,
    ],
  );
  emitChange('cardio');
}

export async function getCardio(id: string): Promise<CardioSession | null> {
  const row = await db().getFirstAsync<CardioRow>('SELECT * FROM cardio_sessions WHERE id = ?', [id]);
  return row ? mapCardio(row) : null;
}

export async function deleteCardio(id: string): Promise<void> {
  await db().runAsync('DELETE FROM cardio_sessions WHERE id = ?', [id]);
  emitChange('cardio');
}

/** Sessions newest first. */
export async function listCardio(
  options: { fromMs?: number; toMs?: number; limit?: number } = {},
): Promise<CardioSession[]> {
  const params: SqlValue[] = [options.fromMs ?? 0, options.toMs ?? Number.MAX_SAFE_INTEGER];
  let sql = 'SELECT * FROM cardio_sessions WHERE started_at BETWEEN ? AND ? ORDER BY started_at DESC';
  if (options.limit != null) {
    sql += ' LIMIT ?';
    params.push(options.limit);
  }
  const rows = await db().getAllAsync<CardioRow>(sql, params);
  return rows.map(mapCardio);
}
