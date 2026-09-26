/**
 * Minimal async SQL interface. It is implemented by expo-sqlite on iOS and
 * Android and by sql.js for the web preview and the Jest tests, so the
 * repositories are platform independent.
 */

export type SqlValue = string | number | null;

export interface RunResult {
  changes: number;
  lastInsertRowId: number;
}

export interface SqlDatabase {
  /** Executes one or more statements without parameters. */
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: SqlValue[]): Promise<RunResult>;
  getAllAsync<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

let current: SqlDatabase | null = null;

export function setDatabase(db: SqlDatabase | null): void {
  current = db;
}

export function db(): SqlDatabase {
  if (!current) throw new Error('Datenbank ist noch nicht initialisiert.');
  return current;
}

export function hasDatabase(): boolean {
  return current != null;
}

/** Helper for boolean columns. */
export function bool(value: unknown): boolean {
  return value === 1 || value === true || value === '1';
}

export function jsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/** "?, ?, ?" for IN clauses. */
export function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}
