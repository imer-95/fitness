import type { SqlDatabase } from './sql';

/**
 * Schema migrations. Each entry upgrades the schema by one version; the
 * current version is stored in `PRAGMA user_version`. Never edit a released
 * migration — append a new one instead.
 */
export const MIGRATIONS: string[] = [
  // v1 — initial schema
  `
  CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    muscle TEXT NOT NULL,
    secondary TEXT NOT NULL DEFAULT '[]',
    equipment TEXT NOT NULL,
    tracking TEXT NOT NULL DEFAULT 'weight_reps',
    weight_mode TEXT NOT NULL DEFAULT 'total',
    bar_mode TEXT NOT NULL DEFAULT 'none',
    bar_weight REAL,
    unilateral INTEGER NOT NULL DEFAULT 0,
    rest_seconds INTEGER NOT NULL DEFAULT 90,
    notes TEXT,
    aliases TEXT NOT NULL DEFAULT '[]',
    is_custom INTEGER NOT NULL DEFAULT 0,
    archived INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS workouts (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    notes TEXT,
    template_id TEXT,
    source TEXT NOT NULL DEFAULT 'app',
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_workouts_started ON workouts(started_at);

  CREATE TABLE IF NOT EXISTS workout_exercises (
    id TEXT PRIMARY KEY NOT NULL,
    workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES exercises(id),
    position INTEGER NOT NULL,
    rest_seconds INTEGER,
    notes TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_we_workout ON workout_exercises(workout_id);
  CREATE INDEX IF NOT EXISTS idx_we_exercise ON workout_exercises(exercise_id);

  CREATE TABLE IF NOT EXISTS workout_sets (
    id TEXT PRIMARY KEY NOT NULL,
    workout_exercise_id TEXT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    reps INTEGER,
    weight REAL,
    duration_sec INTEGER,
    side TEXT,
    kind TEXT NOT NULL DEFAULT 'normal',
    rpe REAL,
    rest_sec INTEGER,
    note TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_sets_we ON workout_sets(workout_exercise_id);

  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    notes TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    last_used_at INTEGER,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS template_exercises (
    id TEXT PRIMARY KEY NOT NULL,
    template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES exercises(id),
    position INTEGER NOT NULL,
    rest_seconds INTEGER,
    notes TEXT,
    sets TEXT NOT NULL DEFAULT '[]'
  );
  CREATE INDEX IF NOT EXISTS idx_te_template ON template_exercises(template_id);

  CREATE TABLE IF NOT EXISTS body_weights (
    date TEXT PRIMARY KEY NOT NULL,
    weight REAL NOT NULL,
    body_fat REAL,
    note TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS measurements (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    value REAL NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE (date, type)
  );

  CREATE TABLE IF NOT EXISTS cardio_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    duration_sec INTEGER NOT NULL,
    distance_km REAL,
    kcal REAL,
    avg_hr INTEGER,
    notes TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_cardio_started ON cardio_sessions(started_at);

  CREATE TABLE IF NOT EXISTS foods (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    brand TEXT,
    barcode TEXT,
    unit TEXT NOT NULL DEFAULT 'g',
    kcal REAL NOT NULL,
    protein REAL NOT NULL DEFAULT 0,
    carbs REAL NOT NULL DEFAULT 0,
    fat REAL NOT NULL DEFAULT 0,
    fiber REAL,
    sugar REAL,
    salt REAL,
    serving_size REAL,
    serving_label TEXT,
    category TEXT,
    source TEXT NOT NULL DEFAULT 'custom',
    favorite INTEGER NOT NULL DEFAULT 0,
    use_count INTEGER NOT NULL DEFAULT 0,
    last_used_at INTEGER,
    archived INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_foods_barcode ON foods(barcode);

  CREATE TABLE IF NOT EXISTS food_entries (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    meal TEXT NOT NULL,
    food_id TEXT REFERENCES foods(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    amount REAL,
    unit TEXT,
    kcal REAL NOT NULL,
    protein REAL NOT NULL DEFAULT 0,
    carbs REAL NOT NULL DEFAULT 0,
    fat REAL NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_food_entries_date ON food_entries(date);

  CREATE TABLE IF NOT EXISTS water_log (
    date TEXT PRIMARY KEY NOT NULL,
    ml INTEGER NOT NULL DEFAULT 0
  );
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

export async function migrate(database: SqlDatabase): Promise<number> {
  const row = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  if (version > SCHEMA_VERSION) {
    throw new Error(
      `Die Datenbank stammt aus einer neueren App-Version (Schema ${version}). Bitte aktualisiere die App.`,
    );
  }
  while (version < SCHEMA_VERSION) {
    const sql = MIGRATIONS[version];
    const next = version + 1;
    await database.withTransactionAsync(async () => {
      await database.execAsync(sql);
      await database.execAsync(`PRAGMA user_version = ${next}`);
    });
    version = next;
  }
  return version;
}
