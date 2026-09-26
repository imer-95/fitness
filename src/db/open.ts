import * as SQLite from 'expo-sqlite';

import type { SqlDatabase } from './sql';

export const DATABASE_NAME = 'formkurve.db';

/** Opens the on-device SQLite database (iOS / Android). */
export async function openDatabase(): Promise<SqlDatabase> {
  const raw = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await raw.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  let depth = 0;
  return {
    execAsync: (sql) => raw.execAsync(sql),
    runAsync: (sql, params = []) => raw.runAsync(sql, params),
    getAllAsync: (sql, params = []) => raw.getAllAsync(sql, params),
    getFirstAsync: (sql, params = []) => raw.getFirstAsync(sql, params),
    async withTransactionAsync(task) {
      if (depth > 0) {
        await task();
        return;
      }
      depth++;
      try {
        await raw.withTransactionAsync(task);
      } finally {
        depth--;
      }
    },
  };
}
