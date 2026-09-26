import type { SqlDatabase } from '../sql';
import { SEED_EXERCISES } from './exercises';
import { SEED_FOODS } from './foods';

/** Increase when built-in exercises or foods are added. Existing rows are never overwritten. */
export const SEED_VERSION = 1;

export async function seedDatabase(database: SqlDatabase, now = Date.now()): Promise<boolean> {
  const row = await database.getFirstAsync<{ value: string }>("SELECT value FROM kv WHERE key = 'seedVersion'");
  const current = row ? Number(JSON.parse(row.value)) : 0;
  if (current >= SEED_VERSION) return false;

  await database.withTransactionAsync(async () => {
    for (const e of SEED_EXERCISES) {
      await database.runAsync(
        `INSERT OR IGNORE INTO exercises
          (id, name, muscle, secondary, equipment, tracking, weight_mode, bar_mode, bar_weight,
           unilateral, rest_seconds, notes, aliases, is_custom, archived, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 0, 0, ?)`,
        [
          e.id,
          e.name,
          e.muscle,
          JSON.stringify(e.secondary ?? []),
          e.equipment,
          e.tracking ?? 'weight_reps',
          e.weightMode ?? 'total',
          e.barMode ?? 'none',
          e.barWeight ?? null,
          e.unilateral ? 1 : 0,
          e.rest ?? 90,
          JSON.stringify(e.aliases ?? []),
          now,
        ],
      );
    }
    for (const f of SEED_FOODS) {
      await database.runAsync(
        `INSERT OR IGNORE INTO foods
          (id, name, brand, barcode, unit, kcal, protein, carbs, fat, fiber, sugar, salt,
           serving_size, serving_label, category, source, favorite, use_count, last_used_at, archived, created_at)
         VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?, 'builtin', 0, 0, NULL, 0, ?)`,
        [
          f.id,
          f.name,
          f.unit,
          f.kcal,
          f.protein,
          f.carbs,
          f.fat,
          f.servingSize ?? null,
          f.servingLabel ?? null,
          f.category,
          now,
        ],
      );
    }
    await database.runAsync("INSERT OR REPLACE INTO kv (key, value) VALUES ('seedVersion', ?)", [
      JSON.stringify(SEED_VERSION),
    ]);
  });
  return true;
}
