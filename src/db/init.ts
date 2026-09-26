import { migrate } from './migrations';
import { seedDatabase } from './seed';
import { setDatabase, type SqlDatabase } from './sql';

/** Runs migrations and seeding and makes the database available to the repositories. */
export async function initializeDatabase(database: SqlDatabase): Promise<void> {
  await migrate(database);
  await seedDatabase(database);
  setDatabase(database);
}
