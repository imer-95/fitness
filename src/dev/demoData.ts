/**
 * Sample data for the web preview (screenshots, trying out the UI).
 * Only registered on the web platform – never used in the mobile apps.
 */
import { saveMeasurements, upsertWeight } from '@/db/repos/body';
import { saveCardio } from '@/db/repos/cardio';
import { addWater, getFood, saveFoodEntry } from '@/db/repos/nutrition';
import { saveTemplate, templateFromWorkout } from '@/db/repos/templates';
import { saveWorkout } from '@/db/repos/workouts';
import { addDays, dateKeyWithTime, todayKey, weekdayMondayFirst } from '@/domain/dates';
import { createId } from '@/domain/id';
import { nutrientsFor } from '@/domain/nutrition';
import type { DateKey, Meal, Side, Workout } from '@/domain/types';

/** Deterministic pseudo random numbers (0..1). */
function random(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface PlanExercise {
  id: string;
  sets: { reps: number | null; weight: number | null; side?: Side }[];
  rest: number;
}

const DAY_A: { title: string; exercises: PlanExercise[] } = {
  title: 'Brust, Bizeps, Bauch',
  exercises: [
    {
      id: 'ex-incline-chest-press-machine',
      rest: 120,
      sets: [
        { reps: 10, weight: 40 },
        { reps: 10, weight: 40 },
        { reps: 10, weight: 50 },
        { reps: 10, weight: 40 },
      ],
    },
    {
      id: 'ex-chest-press-machine',
      rest: 120,
      sets: [
        { reps: 10, weight: 30 },
        { reps: 10, weight: 40 },
        { reps: 10, weight: 40 },
        { reps: 10, weight: 30 },
      ],
    },
    {
      id: 'ex-pec-deck',
      rest: 90,
      sets: [
        { reps: 8, weight: 55 },
        { reps: 8, weight: 45 },
        { reps: 10, weight: 35 },
      ],
    },
    {
      id: 'ex-cable-crossover-low',
      rest: 60,
      sets: [
        { reps: 10, weight: 15 },
        { reps: 12, weight: 15 },
        { reps: 8, weight: 20 },
      ],
    },
    {
      id: 'ex-seated-biceps-curl-bar',
      rest: 60,
      sets: [
        { reps: 12, weight: 10 },
        { reps: 12, weight: 12.5 },
        { reps: 12, weight: 15 },
      ],
    },
    {
      id: 'ex-cable-hammer-curl-rope',
      rest: 60,
      sets: [
        { reps: 12, weight: 35 },
        { reps: 12, weight: 40 },
        { reps: 12, weight: 40 },
      ],
    },
    {
      id: 'ex-ab-crunch-machine',
      rest: 60,
      sets: [
        { reps: 15, weight: 30 },
        { reps: 15, weight: 40 },
        { reps: 15, weight: 50 },
      ],
    },
    {
      id: 'ex-captains-chair-leg-raise',
      rest: 60,
      sets: [
        { reps: 12, weight: null },
        { reps: 12, weight: null },
        { reps: 12, weight: null },
      ],
    },
  ],
};

const DAY_B: { title: string; exercises: PlanExercise[] } = {
  title: 'Rücken, Trizeps',
  exercises: [
    {
      id: 'ex-lat-pulldown',
      rest: 90,
      sets: [
        { reps: 12, weight: 50 },
        { reps: 10, weight: 55 },
        { reps: 10, weight: 55 },
        { reps: 8, weight: 60 },
      ],
    },
    {
      id: 'ex-seated-cable-row',
      rest: 90,
      sets: [
        { reps: 12, weight: 45 },
        { reps: 10, weight: 50 },
        { reps: 10, weight: 50 },
      ],
    },
    {
      id: 'ex-one-arm-row',
      rest: 60,
      sets: [
        { reps: 10, weight: 22.5, side: 'left' },
        { reps: 12, weight: 22.5, side: 'left' },
        { reps: 10, weight: 22.5, side: 'right' },
        { reps: 12, weight: 22.5, side: 'right' },
      ],
    },
    {
      id: 'ex-triceps-rope-pushdown',
      rest: 60,
      sets: [
        { reps: 12, weight: 25 },
        { reps: 12, weight: 27.5 },
        { reps: 10, weight: 30 },
      ],
    },
    {
      id: 'ex-skull-crusher',
      rest: 60,
      sets: [
        { reps: 10, weight: 25 },
        { reps: 10, weight: 25 },
        { reps: 8, weight: 30 },
      ],
    },
    {
      id: 'ex-back-extension',
      rest: 60,
      sets: [
        { reps: 15, weight: null },
        { reps: 15, weight: null },
        { reps: 15, weight: null },
      ],
    },
  ],
};

const DAY_C: { title: string; exercises: PlanExercise[] } = {
  title: 'Beine, Schultern',
  exercises: [
    {
      id: 'ex-leg-press',
      rest: 120,
      sets: [
        { reps: 12, weight: 120 },
        { reps: 10, weight: 140 },
        { reps: 10, weight: 140 },
        { reps: 8, weight: 160 },
      ],
    },
    {
      id: 'ex-leg-extension',
      rest: 60,
      sets: [
        { reps: 12, weight: 45 },
        { reps: 12, weight: 50 },
        { reps: 10, weight: 55 },
      ],
    },
    {
      id: 'ex-leg-curl-lying',
      rest: 60,
      sets: [
        { reps: 12, weight: 35 },
        { reps: 12, weight: 40 },
        { reps: 10, weight: 40 },
      ],
    },
    {
      id: 'ex-shoulder-press-machine',
      rest: 90,
      sets: [
        { reps: 10, weight: 35 },
        { reps: 10, weight: 40 },
        { reps: 8, weight: 40 },
      ],
    },
    {
      id: 'ex-lateral-raise',
      rest: 60,
      sets: [
        { reps: 15, weight: 8 },
        { reps: 12, weight: 10 },
        { reps: 12, weight: 10 },
      ],
    },
    {
      id: 'ex-calf-raise-standing',
      rest: 60,
      sets: [
        { reps: 15, weight: 60 },
        { reps: 15, weight: 70 },
        { reps: 12, weight: 80 },
      ],
    },
  ],
};

function buildWorkout(day: typeof DAY_A, date: DateKey, week: number, rnd: () => number): Workout {
  const start = dateKeyWithTime(date, 17 + Math.floor(rnd() * 2), Math.floor(rnd() * 4) * 15);
  const progress = Math.floor(week / 2);
  return {
    id: createId(),
    title: day.title,
    startedAt: start,
    endedAt: start + (55 + Math.floor(rnd() * 25)) * 60000,
    notes: null,
    templateId: null,
    source: 'app',
    exercises: day.exercises.map((ex) => ({
      id: createId(),
      exerciseId: ex.id,
      restSeconds: ex.rest,
      notes: null,
      sets: ex.sets.map((s, i) => ({
        id: createId(),
        reps: s.reps,
        weight: s.weight == null ? null : s.weight + progress * (s.weight >= 40 ? 2.5 : s.weight >= 15 ? 1.25 : 0.5),
        durationSec: null,
        side: s.side ?? null,
        kind: 'normal' as const,
        rpe: null,
        restSec: i < ex.sets.length - 1 ? ex.rest : null,
        note: null,
      })),
    })),
  };
}

const MEALS: { meal: Meal; items: [string, number][] }[] = [
  {
    meal: 'breakfast',
    items: [
      ['food-oats', 70],
      ['food-milk-15', 250],
      ['food-banana', 120],
    ],
  },
  {
    meal: 'lunch',
    items: [
      ['food-chicken-breast-cooked', 180],
      ['food-rice-cooked', 220],
      ['food-broccoli', 200],
    ],
  },
  {
    meal: 'dinner',
    items: [
      ['food-wholegrain-bread', 100],
      ['food-cottage-cheese', 200],
      ['food-tomato', 150],
    ],
  },
  {
    meal: 'snack',
    items: [
      ['food-skyr', 150],
      ['food-blueberries', 100],
      ['food-protein-bar', 60],
    ],
  },
];

export async function seedDemoData(): Promise<void> {
  const today = todayKey();
  const rnd = random(42);

  // Body weight: slow downward trend with daily noise
  for (let i = 70; i >= 0; i--) {
    const date = addDays(today, -i);
    if (i > 0 && rnd() < 0.12) continue;
    const trend = 86.4 - (70 - i) * 0.032;
    await upsertWeight(date, Math.round((trend + (rnd() - 0.5) * 0.9) * 10) / 10);
  }
  for (const [offset, values] of [
    [63, { waist: 92, chest: 104, arm_right: 36.5, thigh_right: 60 }],
    [35, { waist: 90.5, chest: 104.5, arm_right: 37, thigh_right: 60 }],
    [7, { waist: 88.5, chest: 105, arm_right: 37.5, thigh_right: 60.5 }],
  ] as const) {
    await saveMeasurements(addDays(today, -offset), values);
  }

  // Strength: Mon = A, Wed = B, Fri = C for 9 weeks; cardio Tue + Sat
  const days = [DAY_A, DAY_B, DAY_C];
  let first: Workout[] = [];
  for (let i = 62; i >= 1; i--) {
    const date = addDays(today, -i);
    const wd = weekdayMondayFirst(date);
    const week = Math.floor((62 - i) / 7);
    if (wd === 0 || wd === 2 || wd === 4) {
      if (rnd() < 0.08) continue;
      const workout = buildWorkout(days[wd / 2], date, week, rnd);
      await saveWorkout(workout);
      if (first.length < 3 && !first.some((w) => w.title === workout.title)) first = [...first, workout];
    } else if (wd === 1 || wd === 5) {
      if (rnd() < 0.25) continue;
      const minutes = 25 + Math.floor(rnd() * 20);
      const treadmill = wd === 1;
      const distance = treadmill ? Math.round((minutes / 60) * 9.5 * 10) / 10 : null;
      await saveCardio({
        id: createId(),
        type: treadmill ? 'treadmill' : 'elliptical',
        startedAt: dateKeyWithTime(date, treadmill ? 7 : 10, 30),
        durationSec: minutes * 60,
        distanceKm: distance,
        kcal: Math.round(minutes * (treadmill ? 11.5 : 8)),
        avgHr: 135 + Math.floor(rnd() * 20),
        notes: null,
        createdAt: Date.now(),
      });
    }
  }
  for (const [i, w] of first.entries()) await saveTemplate(templateFromWorkout(w, w.title, i));

  // Nutrition and water for the last 12 days
  for (let i = 11; i >= 0; i--) {
    const date = addDays(today, -i);
    for (const { meal, items } of MEALS) {
      if (i === 0 && meal !== 'breakfast' && meal !== 'lunch') continue;
      if (meal === 'snack' && rnd() < 0.3) continue;
      for (const [foodId, base] of items) {
        const food = await getFood(foodId);
        if (!food) continue;
        const amount = Math.round(base * (0.85 + rnd() * 0.3));
        await saveFoodEntry({
          date,
          meal,
          foodId,
          name: food.name,
          amount,
          unit: food.unit,
          ...nutrientsFor(food, amount),
        });
      }
    }
    await addWater(date, i === 0 ? 1250 : 1750 + Math.round(rnd() * 5) * 250);
  }
}
