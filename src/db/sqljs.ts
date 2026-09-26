import initSqlJs from 'sql.js/dist/sql-asm.js';

import type { RunResult, SqlDatabase, SqlValue } from './sql';

export interface SqlJsDatabase extends SqlDatabase {
  /** Serialized database file. */
  exportBytes(): Uint8Array;
}

/**
 * sql.js (SQLite compiled to JavaScript) adapter. Used by the web preview and
 * the unit tests. `onWrite` is called (debounced by the caller) after writes.
 */
export async function createSqlJsDatabase(
  options: { data?: Uint8Array | null; onWrite?: () => void } = {},
): Promise<SqlJsDatabase> {
  const SQL = await initSqlJs();
  const raw = new SQL.Database(options.data ?? undefined);
  raw.run('PRAGMA foreign_keys = ON;');
  let transactionDepth = 0;

  const notify = () => {
    if (transactionDepth === 0) options.onWrite?.();
  };

  const all = <T>(sql: string, params: SqlValue[] = []): T[] => {
    const stmt = raw.prepare(sql);
    try {
      stmt.bind(params);
      const rows: T[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as T);
      return rows;
    } finally {
      stmt.free();
    }
  };

  const adapter: SqlJsDatabase = {
    async execAsync(sql: string) {
      raw.exec(sql);
      notify();
    },
    async runAsync(sql: string, params: SqlValue[] = []): Promise<RunResult> {
      raw.run(sql, params);
      const changes = raw.getRowsModified();
      const id = raw.exec('SELECT last_insert_rowid() AS id')[0]?.values[0]?.[0];
      notify();
      return { changes, lastInsertRowId: Number(id ?? 0) };
    },
    async getAllAsync<T>(sql: string, params?: SqlValue[]) {
      return all<T>(sql, params);
    },
    async getFirstAsync<T>(sql: string, params?: SqlValue[]) {
      const rows = all<T>(sql, params);
      return rows.length > 0 ? rows[0] : null;
    },
    async withTransactionAsync(task: () => Promise<void>) {
      if (transactionDepth > 0) {
        // Nested transaction: just run inside the outer one.
        await task();
        return;
      }
      raw.run('BEGIN');
      transactionDepth++;
      try {
        await task();
        raw.run('COMMIT');
      } catch (error) {
        raw.run('ROLLBACK');
        throw error;
      } finally {
        transactionDepth--;
      }
      notify();
    },
    exportBytes() {
      if (transactionDepth > 0) throw new Error('Export während einer Transaktion nicht möglich');
      const bytes = raw.export();
      // export() closes and reopens the database, which resets pragmas.
      raw.run('PRAGMA foreign_keys = ON;');
      return bytes;
    },
  };
  return adapter;
}
