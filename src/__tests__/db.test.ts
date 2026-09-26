import { upsertWeight, listWeights, getLatestWeight, saveMeasurements, listMeasurements } from '@/db/repos/body';
import {
  createBackup,
  exportWeightsCsv,
  exportWorkoutsCsv,
  resetAllData,
  restoreBackup,
  validateBackup,
} from '@/db/repos/backup';
import { listCardio, saveCardio } from '@/db/repos/cardio';
import {
  createExercise,
  deleteExercise,
  getExercise,
  listExercises,
} from '@/db/repos/exercises';
import { buildImportPlan, importWorkouts } from '@/db/repos/importNotes';
import { kvGet, kvSet } from '@/db/repos/kv';
import {
  addWater,
  copyMeal,
  dailyNutrition,
  getFoodByBarcode,
  getWater,
  listFoodEntries,
  listRecentFoods,
  saveFoodEntry,
  searchFoods,
  upsertOffFood,
} from '@/db/repos/nutrition';
import { activityByDay, analyzeTrainingHistory, muscleSetCounts, weeklyTraining } from '@/db/repos/stats';
import { listTemplates, saveTemplate, templateFromWorkout } from '@/db/repos/templates';
import {
  deleteWorkout,
  getExerciseContext,
  getWorkout,
  listWorkoutSummaries,
  saveWorkout,
} from '@/db/repos/workouts';
import { SEED_EXERCISES } from '@/db/seed/exercises';
import { SEED_FOODS } from '@/db/seed/foods';
import { db } from '@/db/sql';
import { dateKeyWithTime } from '@/domain/dates';
import { parseWorkoutNotes } from '@/domain/notes';
import type { Workout } from '@/domain/types';

import { USER_NOTES } from './fixtures/userNotes';
import { setupTestDb, teardownTestDb } from './helpers/testDb';

beforeEach(async () => {
  await setupTestDb();
});
afterEach(teardownTestDb);

function workout(id: string, date: string, sets: [number, number][], exerciseId = 'ex-bench-press'): Workout {
  return {
    id,
    title: 'Brust',
    startedAt: dateKeyWithTime(date, 18, 0),
    endedAt: dateKeyWithTime(date, 19, 0),
    notes: null,
    templateId: null,
    source: 'app',
    exercises: [
      {
        id: `${id}-we`,
        exerciseId,
        restSeconds: 120,
        notes: null,
        sets: sets.map(([reps, weight], i) => ({
          id: `${id}-s${i}`,
          reps,
          weight,
          durationSec: null,
          side: null,
          kind: 'normal' as const,
          rpe: null,
          restSec: 120,
          note: null,
        })),
      },
    ],
  };
}

describe('schema and seed', () => {
  test('seeds exercises and foods with unique ids', async () => {
    const exercises = await listExercises();
    expect(exercises.length).toBe(SEED_EXERCISES.length);
    expect(new Set(SEED_EXERCISES.map((e) => e.id)).size).toBe(SEED_EXERCISES.length);
    expect(new Set(SEED_FOODS.map((f) => f.id)).size).toBe(SEED_FOODS.length);
    const foods = await db().getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM foods');
    expect(foods?.n).toBe(SEED_FOODS.length);
    // Umlaut-aware sorting: "Überzüge" is sorted under U, not after Z
    const names = exercises.map((e) => e.name);
    expect(names.indexOf('Überzüge am Kabel')).toBeLessThan(names.indexOf('Wadenheben sitzend'));
  });

  test('seed values are plausible', () => {
    for (const f of SEED_FOODS) {
      const fromMacros = f.protein * 4 + f.carbs * 4 + f.fat * 9;
      expect(f.protein + f.carbs + f.fat).toBeLessThanOrEqual(100.5);
      // Alcohol and fibre explain small differences; everything else must be close.
      if (!['food-beer', 'food-red-wine'].includes(f.id)) {
        expect(Math.abs(fromMacros - f.kcal)).toBeLessThan(Math.max(25, f.kcal * 0.2));
      }
    }
  });

  test('kv store', async () => {
    await kvSet('test', { a: 1 });
    expect(await kvGet('test')).toEqual({ a: 1 });
    expect(await kvGet('missing')).toBeNull();
  });
});

describe('workouts', () => {
  test('saves, loads, updates and deletes a workout', async () => {
    const w = workout('w1', '2026-09-20', [
      [10, 60],
      [8, 70],
    ]);
    await saveWorkout(w);
    const loaded = await getWorkout('w1');
    expect(loaded).toEqual(w);

    w.title = 'Push';
    w.exercises[0].sets.pop();
    await saveWorkout(w);
    const updated = await getWorkout('w1');
    expect(updated?.title).toBe('Push');
    expect(updated?.exercises[0].sets).toHaveLength(1);

    await deleteWorkout('w1');
    expect(await getWorkout('w1')).toBeNull();
    const orphans = await db().getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM workout_sets');
    expect(orphans?.n).toBe(0);
  });

  test('summaries compute volume with "pro Seite" and bar weight', async () => {
    const ex = await createExercise({
      name: 'Curls',
      muscle: 'biceps',
      equipment: 'barbell',
      weightMode: 'per_side',
      barMode: 'excluded',
      barWeight: 10,
    });
    await saveWorkout(workout('w1', '2026-09-20', [[12, 12.5]], ex.id));
    await saveWorkout(workout('w2', '2026-09-21', [[10, 100]]));
    const summaries = await listWorkoutSummaries();
    expect(summaries.map((s) => s.id)).toEqual(['w2', 'w1']);
    expect(summaries[1].volume).toBe(12 * (2 * 12.5 + 10));
    expect(summaries[0].volume).toBe(1000);
    expect(summaries[0].exerciseNames).toEqual(['Bankdrücken (Langhantel)']);
  });

  test('exercise context returns previous session and bests', async () => {
    await saveWorkout(
      workout('w1', '2026-09-10', [
        [10, 60],
        [8, 70],
      ]),
    );
    await saveWorkout(workout('w2', '2026-09-17', [[5, 80]]));
    const ex = (await getExercise('ex-bench-press'))!;
    const ctx = await getExerciseContext(ex.id, ex, dateKeyWithTime('2026-09-24', 0, 0));
    expect(ctx.last?.workoutId).toBe('w2');
    expect(ctx.recent.map((r) => r.workoutId)).toEqual(['w2', 'w1']);
    expect(ctx.bests.maxWeight).toBe(80);
    const before = await getExerciseContext(ex.id, ex, dateKeyWithTime('2026-09-15', 0, 0));
    expect(before.last?.workoutId).toBe('w1');
    expect(before.bests.maxWeight).toBe(70);
  });

  test('history analysis finds records per workout', async () => {
    await saveWorkout(workout('w1', '2026-09-10', [[10, 60]]));
    await saveWorkout(
      workout('w2', '2026-09-17', [
        [10, 62.5],
        [10, 65],
      ]),
    );
    const { prs, progress } = await analyzeTrainingHistory();
    const weightPrs = prs.filter((p) => p.type === 'weight');
    expect(weightPrs).toHaveLength(1);
    expect(weightPrs[0]).toMatchObject({ workoutId: 'w2', value: 65 });
    expect(progress.get('ex-bench-press')?.sessions).toBe(2);
    expect(progress.get('ex-bench-press')?.series).toHaveLength(2);
  });

  test('templates from workouts', async () => {
    const w = workout('w1', '2026-09-10', [[10, 60]]);
    await saveWorkout(w);
    const t = templateFromWorkout(w, 'Brusttag', 0);
    await saveTemplate(t);
    const templates = await listTemplates();
    expect(templates).toHaveLength(1);
    expect(templates[0].exercises[0].sets[0]).toEqual({
      reps: 10,
      weight: 60,
      durationSec: null,
      side: null,
      kind: 'normal',
    });
  });

  test('exercises with history are archived instead of deleted', async () => {
    const custom = await createExercise({ name: 'Test', muscle: 'other', equipment: 'other' });
    expect(await deleteExercise(custom.id)).toBe('deleted');
    await saveWorkout(workout('w1', '2026-09-10', [[10, 60]]));
    expect(await deleteExercise('ex-bench-press')).toBe('archived');
    expect((await listExercises()).some((e) => e.id === 'ex-bench-press')).toBe(false);
  });

  test('weekly statistics and muscle distribution', async () => {
    await saveWorkout(workout('w1', '2026-09-21', [[10, 60]]));
    await saveWorkout(workout('w2', '2026-09-23', [[10, 60]]));
    await saveCardio({
      id: 'c1',
      type: 'running',
      startedAt: dateKeyWithTime('2026-09-22', 7, 0),
      durationSec: 1800,
      distanceKm: 5,
      kcal: 400,
      avgHr: null,
      notes: null,
      createdAt: Date.now(),
    });
    const weeks = await weeklyTraining(2, '2026-09-26');
    expect(weeks.map((w) => w.weekStart)).toEqual(['2026-09-14', '2026-09-21']);
    expect(weeks[1]).toMatchObject({ workouts: 2, sets: 2, volume: 1200, cardioMinutes: 30, cardioKm: 5 });
    const muscles = await muscleSetCounts(0, Date.now() * 2);
    expect(muscles.get('chest')).toBe(2);
    const days = await activityByDay('2026-09-20', '2026-09-26');
    expect(days.get('2026-09-22')).toEqual({ strength: 0, cardio: 1 });
    expect(days.get('2026-09-21')).toEqual({ strength: 1, cardio: 0 });
    expect((await listCardio()).length).toBe(1);
  });
});

describe('import of the user notes', () => {
  test('matches all exercises of the notes and imports them', async () => {
    const parsed = parseWorkoutNotes(USER_NOTES, { today: '2026-09-26' });
    const plans = await buildImportPlan(parsed, '2026-09-26');
    expect(plans).toHaveLength(1);
    expect(plans[0].title).toBe('Brust, Bizeps, Bauch');
    expect(plans[0].exercises.map((e) => [e.parsed.name, e.exerciseId, e.match])).toEqual([
      ['Schräg-Brustmaschine', 'ex-incline-chest-press-machine', 'exact'],
      ['Brustmaschine', 'ex-chest-press-machine', 'exact'],
      ['Butterfly', 'ex-pec-deck', 'exact'],
      ['Kabel Crossover von unten', 'ex-cable-crossover-low', 'exact'],
      ['Bizeps beidhängig im Sitzen', 'ex-seated-biceps-curl-bar', 'exact'],
      ['Hammercurls am Kabel mit Seil', 'ex-cable-hammer-curl-rope', 'exact'],
      ['Bauchmaschine Crunch', 'ex-ab-crunch-machine', 'exact'],
      ['Dipbarren Bauchmuskel', 'ex-captains-chair-leg-raise', 'exact'],
      ['Rudern', 'ex-one-arm-row', 'exact'],
    ]);

    const [id] = await importWorkouts(plans);
    const saved = (await getWorkout(id))!;
    expect(saved.source).toBe('import');
    expect(saved.exercises).toHaveLength(9);
    expect(saved.exercises.reduce((n, e) => n + e.sets.length, 0)).toBe(32);
    expect(saved.exercises[0].restSeconds).toBe(120);

    const summary = (await listWorkoutSummaries())[0];
    // Volume: per side exercises count double, bar weight of the curl bar is unknown
    const expected =
      10 * 40 * 3 + 10 * 50 + // Schräg-Brustmaschine
      10 * 30 * 2 + 10 * 40 * 2 + // Brustmaschine
      8 * 55 + 8 * 45 + 10 * 35 + // Butterfly
      2 * (10 * 15 + 12 * 15 + 8 * 20) + // Crossover pro Seite
      2 * (12 * 10 + 12 * 12.5 + 12 * 15) + // Bizeps pro Seite
      12 * 35 + 12 * 40 * 2 + // Hammercurls
      15 * 30 + 15 * 40 + 15 * 50; // Bauchmaschine
    expect(summary.volume).toBe(expected);

    // A second import finds the existing workout as possible duplicate
    const again = await buildImportPlan(parsed, '2026-09-26');
    expect(again[0].existing).toHaveLength(1);
  });

  test('creates unknown exercises once and remembers aliases', async () => {
    const text = `Training 20.09.\nMeine Spezialübung\n10x20kg\n\nTraining 22.09.\nMeine Spezialübung\n10x22,5kg\n\nLatzug breiit\n12x50kg`;
    const parsed = parseWorkoutNotes(text, { today: '2026-09-26' });
    const plans = await buildImportPlan(parsed, '2026-09-26');
    expect(plans[0].exercises[0].match).toBe('new');
    expect(plans[1].exercises[1]).toMatchObject({ exerciseId: 'ex-lat-pulldown', match: 'fuzzy' });
    await importWorkouts(plans);
    const custom = (await listExercises()).filter((e) => e.isCustom);
    expect(custom.map((e) => e.name)).toEqual(['Meine Spezialübung']);
    expect(custom[0].muscle).toBe('other');
    const lat = await getExercise('ex-lat-pulldown');
    expect(lat?.aliases).toContain('Latzug breiit');
  });
});

describe('body, cardio and nutrition', () => {
  test('weights: one entry per day', async () => {
    await upsertWeight('2026-09-25', 82.4);
    await upsertWeight('2026-09-26', 82.1);
    await upsertWeight('2026-09-26', 81.9, { bodyFat: 18 });
    const weights = await listWeights();
    expect(weights.map((w) => [w.date, w.weight, w.bodyFat])).toEqual([
      ['2026-09-25', 82.4, null],
      ['2026-09-26', 81.9, 18],
    ]);
    expect((await getLatestWeight('2026-09-25'))?.weight).toBe(82.4);
  });

  test('measurements', async () => {
    await saveMeasurements('2026-09-26', { waist: 84, chest: 102 });
    await saveMeasurements('2026-09-26', { waist: 83.5, chest: null });
    const m = await listMeasurements();
    expect(m.map((x) => [x.type, x.value])).toEqual([['waist', 83.5]]);
  });

  test('food search, diary, totals and copy', async () => {
    const results = await searchFoods('hafer');
    expect(results.map((f) => f.id)).toEqual(expect.arrayContaining(['food-oats', 'food-oat-drink']));
    expect((await searchFoods('milch 1,5')).map((f) => f.id)).toContain('food-milk-15');

    await saveFoodEntry({
      date: '2026-09-26',
      meal: 'breakfast',
      foodId: 'food-oats',
      name: 'Haferflocken',
      amount: 60,
      unit: 'g',
      kcal: 223.2,
      protein: 8.1,
      carbs: 35.2,
      fat: 4.2,
    });
    await saveFoodEntry({
      date: '2026-09-26',
      meal: 'snack',
      foodId: null,
      name: 'Schnelleintrag',
      amount: null,
      unit: null,
      kcal: 150,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
    const totals = await dailyNutrition('2026-09-20', '2026-09-26');
    expect(totals.get('2026-09-26')?.kcal).toBeCloseTo(373.2, 5);
    expect((await listRecentFoods())[0].id).toBe('food-oats');
    expect((await searchFoods('hafer'))[0].useCount).toBe(1);

    await copyMeal('2026-09-26', 'breakfast', '2026-09-27');
    expect(await listFoodEntries('2026-09-27')).toHaveLength(1);
  });

  test('open food facts products are stored by barcode', async () => {
    const product = {
      barcode: '3017620422003',
      name: 'Nutella',
      brand: 'Ferrero',
      unit: 'g' as const,
      kcal: 539,
      protein: 6.3,
      carbs: 57.5,
      fat: 30.9,
      fiber: null,
      sugar: 56.3,
      salt: 0.11,
      servingSize: 15,
      servingLabel: '15 g',
    };
    const first = await upsertOffFood(product);
    const second = await upsertOffFood({ ...product, kcal: 540 });
    expect(second.id).toBe(first.id);
    expect((await getFoodByBarcode('3017620422003'))?.kcal).toBe(540);
  });

  test('water', async () => {
    await addWater('2026-09-26', 250);
    await addWater('2026-09-26', 500);
    await addWater('2026-09-26', -1000);
    expect(await getWater('2026-09-26')).toBe(0);
    await addWater('2026-09-26', 250);
    expect(await getWater('2026-09-26')).toBe(250);
  });
});

describe('backup', () => {
  test('backup round trip restores everything', async () => {
    await saveWorkout(workout('w1', '2026-09-10', [[10, 60]]));
    await upsertWeight('2026-09-26', 82);
    await kvSet('settings', { name: 'Imer' });
    const backup = JSON.parse(JSON.stringify(await createBackup()));
    expect(validateBackup(backup).tables.workouts).toHaveLength(1);

    await resetAllData();
    expect(await getWorkout('w1')).toBeNull();
    expect(await listWeights()).toHaveLength(0);
    expect((await listExercises()).length).toBe(SEED_EXERCISES.length);

    await restoreBackup(validateBackup(backup));
    expect(await getWorkout('w1')).not.toBeNull();
    expect((await listWeights())[0].weight).toBe(82);
    expect(await kvGet('settings')).toEqual({ name: 'Imer' });
  });

  test('rejects foreign files', () => {
    expect(() => validateBackup({ foo: 1 })).toThrow('kein Formkurve-Backup');
    expect(() => validateBackup(null)).toThrow();
  });

  test('csv export uses semicolons and German decimals', async () => {
    await upsertWeight('2026-09-26', 82.45);
    const csv = await exportWeightsCsv();
    expect(csv).toContain('Datum;Gewicht (kg)');
    expect(csv).toContain('2026-09-26;82,45;;');
    await saveWorkout(workout('w1', '2026-09-10', [[10, 62.5]]));
    const workoutsCsv = await exportWorkoutsCsv();
    expect(workoutsCsv).toContain('Bankdrücken (Langhantel);1;10;62,5');
  });
});
