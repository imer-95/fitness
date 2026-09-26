import { initializeDatabase } from '@/db/init';
import { setDatabase } from '@/db/sql';
import { createSqlJsDatabase } from '@/db/sqljs';

/** Fresh in-memory database with schema and built-in data. */
export async function setupTestDb() {
  const database = await createSqlJsDatabase();
  await initializeDatabase(database);
  return database;
}

export function teardownTestDb() {
  setDatabase(null);
}
