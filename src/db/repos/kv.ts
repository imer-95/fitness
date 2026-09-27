import { emitChange } from '../events';
import { db } from '../sql';

/** Small key/value store (JSON values) for settings and drafts. */

/** Last known Pro subscription status (see state/pro.ts). */
export const PRO_STATUS_KEY = 'proStatus';

/** Keys that describe this device/store account and are therefore not part of backups. */
export const DEVICE_ONLY_KEYS: readonly string[] = [PRO_STATUS_KEY];

export async function kvGet<T>(key: string): Promise<T | null> {
  const row = await db().getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', [key]);
  if (!row) return null;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
}

export async function kvGetRaw(key: string): Promise<string | null> {
  const row = await db().getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function kvSetRaw(key: string, value: string): Promise<void> {
  await db().runAsync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', [key, value]);
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await kvSetRaw(key, JSON.stringify(value));
  emitChange('kv');
}

export async function kvDelete(key: string): Promise<void> {
  await db().runAsync('DELETE FROM kv WHERE key = ?', [key]);
  emitChange('kv');
}
