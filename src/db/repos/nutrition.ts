import { createId } from '@/domain/id';
import { normalizeName } from '@/domain/notes';
import { sumMacros } from '@/domain/nutrition';
import type { OffFood } from '@/domain/openFoodFacts';
import type { DateKey, Food, FoodEntry, FoodSource, FoodUnit, Macros, Meal } from '@/domain/types';

import { emitChange } from '../events';
import { bool, db, type SqlValue } from '../sql';

interface FoodRow {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  unit: FoodUnit;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  salt: number | null;
  serving_size: number | null;
  serving_label: string | null;
  category: string | null;
  source: FoodSource;
  favorite: number;
  use_count: number;
  last_used_at: number | null;
  archived: number;
  created_at: number;
}

function mapFood(row: FoodRow): Food {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    barcode: row.barcode,
    unit: row.unit,
    kcal: row.kcal,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    fiber: row.fiber,
    sugar: row.sugar,
    salt: row.salt,
    servingSize: row.serving_size,
    servingLabel: row.serving_label,
    category: row.category,
    source: row.source,
    favorite: bool(row.favorite),
    useCount: row.use_count,
    lastUsedAt: row.last_used_at,
    archived: bool(row.archived),
    createdAt: row.created_at,
  };
}

export async function getFood(id: string): Promise<Food | null> {
  const row = await db().getFirstAsync<FoodRow>('SELECT * FROM foods WHERE id = ?', [id]);
  return row ? mapFood(row) : null;
}

export async function getFoodByBarcode(barcode: string): Promise<Food | null> {
  const row = await db().getFirstAsync<FoodRow>(
    'SELECT * FROM foods WHERE barcode = ? ORDER BY archived, created_at DESC LIMIT 1',
    [barcode],
  );
  return row ? mapFood(row) : null;
}

/**
 * Local search. Matches all words of the query in name or brand, ranks
 * prefix matches, favorites and frequently used foods first.
 */
export async function searchFoods(query: string, limit = 60): Promise<Food[]> {
  const words = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const params: SqlValue[] = [];
  let where = 'archived = 0';
  for (const w of words) {
    where += " AND (LOWER(name) LIKE ? OR LOWER(COALESCE(brand, '')) LIKE ?)";
    params.push(`%${w}%`, `%${w}%`);
  }
  const rows = await db().getAllAsync<FoodRow>(`SELECT * FROM foods WHERE ${where}`, params);
  const q = normalizeName(query);
  const score = (f: FoodRow) => {
    const n = normalizeName(f.name);
    let s = f.use_count * 2 + (f.favorite ? 20 : 0);
    if (q && n.startsWith(q)) s += 30;
    if (q && n === q) s += 50;
    return s;
  };
  return rows
    .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map(mapFood);
}

export async function listRecentFoods(limit = 30): Promise<Food[]> {
  const rows = await db().getAllAsync<FoodRow>(
    'SELECT * FROM foods WHERE archived = 0 AND last_used_at IS NOT NULL ORDER BY last_used_at DESC LIMIT ?',
    [limit],
  );
  return rows.map(mapFood);
}

export async function listFavoriteFoods(): Promise<Food[]> {
  const rows = await db().getAllAsync<FoodRow>(
    'SELECT * FROM foods WHERE archived = 0 AND favorite = 1 ORDER BY name',
  );
  return rows.map(mapFood);
}

export async function listCustomFoods(): Promise<Food[]> {
  const rows = await db().getAllAsync<FoodRow>(
    "SELECT * FROM foods WHERE archived = 0 AND source != 'builtin' ORDER BY name",
  );
  return rows.map(mapFood);
}

export type FoodInput = Omit<Food, 'id' | 'createdAt' | 'useCount' | 'lastUsedAt' | 'archived' | 'favorite'> &
  Partial<Pick<Food, 'id' | 'favorite'>>;

export async function saveFood(input: FoodInput): Promise<Food> {
  const existing = input.id ? await getFood(input.id) : null;
  const food: Food = {
    ...input,
    id: input.id ?? createId(),
    favorite: input.favorite ?? existing?.favorite ?? false,
    useCount: existing?.useCount ?? 0,
    lastUsedAt: existing?.lastUsedAt ?? null,
    archived: false,
    createdAt: existing?.createdAt ?? Date.now(),
  };
  await db().runAsync(
    `INSERT INTO foods (id, name, brand, barcode, unit, kcal, protein, carbs, fat, fiber, sugar, salt,
        serving_size, serving_label, category, source, favorite, use_count, last_used_at, archived, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name, brand = excluded.brand, barcode = excluded.barcode, unit = excluded.unit,
       kcal = excluded.kcal, protein = excluded.protein, carbs = excluded.carbs, fat = excluded.fat,
       fiber = excluded.fiber, sugar = excluded.sugar, salt = excluded.salt,
       serving_size = excluded.serving_size, serving_label = excluded.serving_label,
       category = excluded.category, favorite = excluded.favorite, archived = 0`,
    [
      food.id,
      food.name.trim(),
      food.brand,
      food.barcode,
      food.unit,
      food.kcal,
      food.protein,
      food.carbs,
      food.fat,
      food.fiber,
      food.sugar,
      food.salt,
      food.servingSize,
      food.servingLabel,
      food.category,
      food.source,
      food.favorite ? 1 : 0,
      food.useCount,
      food.lastUsedAt,
      food.createdAt,
    ],
  );
  emitChange('foods');
  return food;
}

/** Stores a product from Open Food Facts (updates an existing product with the same barcode). */
export async function upsertOffFood(product: OffFood): Promise<Food> {
  const existing = product.barcode ? await getFoodByBarcode(product.barcode) : null;
  return saveFood({
    id: existing?.id,
    name: product.name,
    brand: product.brand,
    barcode: product.barcode,
    unit: product.unit,
    kcal: product.kcal,
    protein: product.protein,
    carbs: product.carbs,
    fat: product.fat,
    fiber: product.fiber,
    sugar: product.sugar,
    salt: product.salt,
    servingSize: product.servingSize,
    servingLabel: product.servingLabel,
    category: null,
    source: existing?.source === 'custom' ? 'custom' : 'off',
  });
}

export async function setFoodFavorite(id: string, favorite: boolean): Promise<void> {
  await db().runAsync('UPDATE foods SET favorite = ? WHERE id = ?', [favorite ? 1 : 0, id]);
  emitChange('foods');
}

/** Hides a food from search; diary entries keep their copied values. */
export async function archiveFood(id: string): Promise<void> {
  await db().runAsync('UPDATE foods SET archived = 1, favorite = 0 WHERE id = ?', [id]);
  emitChange('foods');
}

async function markFoodUsed(id: string): Promise<void> {
  await db().runAsync('UPDATE foods SET use_count = use_count + 1, last_used_at = ? WHERE id = ?', [Date.now(), id]);
}

// ---------------------------------------------------------------------------
// Diary
// ---------------------------------------------------------------------------

interface EntryRow {
  id: string;
  date: string;
  meal: Meal;
  food_id: string | null;
  name: string;
  amount: number | null;
  unit: FoodUnit | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  created_at: number;
}

function mapEntry(row: EntryRow): FoodEntry {
  return {
    id: row.id,
    date: row.date,
    meal: row.meal,
    foodId: row.food_id,
    name: row.name,
    amount: row.amount,
    unit: row.unit,
    kcal: row.kcal,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    createdAt: row.created_at,
  };
}

export type FoodEntryInput = Omit<FoodEntry, 'id' | 'createdAt'> & { id?: string };

export async function saveFoodEntry(input: FoodEntryInput): Promise<FoodEntry> {
  const entry: FoodEntry = { ...input, id: input.id ?? createId(), createdAt: Date.now() };
  const isNew = !input.id;
  await db().runAsync(
    `INSERT INTO food_entries (id, date, meal, food_id, name, amount, unit, kcal, protein, carbs, fat, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       date = excluded.date, meal = excluded.meal, name = excluded.name, amount = excluded.amount,
       unit = excluded.unit, kcal = excluded.kcal, protein = excluded.protein, carbs = excluded.carbs,
       fat = excluded.fat`,
    [
      entry.id,
      entry.date,
      entry.meal,
      entry.foodId,
      entry.name,
      entry.amount,
      entry.unit,
      entry.kcal,
      entry.protein,
      entry.carbs,
      entry.fat,
      entry.createdAt,
    ],
  );
  if (isNew && entry.foodId) await markFoodUsed(entry.foodId);
  emitChange('food_entries', 'foods');
  return entry;
}

export async function getFoodEntry(id: string): Promise<FoodEntry | null> {
  const row = await db().getFirstAsync<EntryRow>('SELECT * FROM food_entries WHERE id = ?', [id]);
  return row ? mapEntry(row) : null;
}

export async function deleteFoodEntry(id: string): Promise<void> {
  await db().runAsync('DELETE FROM food_entries WHERE id = ?', [id]);
  emitChange('food_entries');
}

export async function listFoodEntries(date: DateKey): Promise<FoodEntry[]> {
  const rows = await db().getAllAsync<EntryRow>(
    'SELECT * FROM food_entries WHERE date = ? ORDER BY created_at',
    [date],
  );
  return rows.map(mapEntry);
}

/** Copies all entries of a meal to another day (e.g. "Frühstück wie gestern"). */
export async function copyMeal(fromDate: DateKey, meal: Meal, toDate: DateKey, toMeal: Meal = meal): Promise<number> {
  const entries = (await listFoodEntries(fromDate)).filter((e) => e.meal === meal);
  const database = db();
  await database.withTransactionAsync(async () => {
    for (const e of entries) {
      await database.runAsync(
        `INSERT INTO food_entries (id, date, meal, food_id, name, amount, unit, kcal, protein, carbs, fat, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [createId(), toDate, toMeal, e.foodId, e.name, e.amount, e.unit, e.kcal, e.protein, e.carbs, e.fat, Date.now()],
      );
    }
  });
  emitChange('food_entries');
  return entries.length;
}

/** Daily sums of calories and macros in a date range. */
export async function dailyNutrition(from: DateKey, to: DateKey): Promise<Map<DateKey, Macros>> {
  const rows = await db().getAllAsync<{ date: string; kcal: number; protein: number; carbs: number; fat: number }>(
    `SELECT date, SUM(kcal) AS kcal, SUM(protein) AS protein, SUM(carbs) AS carbs, SUM(fat) AS fat
       FROM food_entries WHERE date BETWEEN ? AND ? GROUP BY date`,
    [from, to],
  );
  return new Map(rows.map((r) => [r.date, sumMacros([r])]));
}

// ---------------------------------------------------------------------------
// Water
// ---------------------------------------------------------------------------

export async function getWater(date: DateKey): Promise<number> {
  const row = await db().getFirstAsync<{ ml: number }>('SELECT ml FROM water_log WHERE date = ?', [date]);
  return row?.ml ?? 0;
}

export async function addWater(date: DateKey, deltaMl: number): Promise<number> {
  const next = Math.max(0, (await getWater(date)) + deltaMl);
  await db().runAsync(
    'INSERT INTO water_log (date, ml) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET ml = excluded.ml',
    [date, next],
  );
  emitChange('water');
  return next;
}

export async function waterRange(from: DateKey, to: DateKey): Promise<Map<DateKey, number>> {
  const rows = await db().getAllAsync<{ date: string; ml: number }>(
    'SELECT date, ml FROM water_log WHERE date BETWEEN ? AND ?',
    [from, to],
  );
  return new Map(rows.map((r) => [r.date, r.ml]));
}
