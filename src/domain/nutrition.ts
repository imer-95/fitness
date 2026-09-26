import { ageFromBirthYear, todayKey } from './dates';
import { roundTo, tidy } from './format';
import type { ActivityLevel, DateKey, Food, Goal, Macros, NutritionGoals, Profile, Sex } from './types';

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const GOAL_KCAL_OFFSET: Record<Goal, number> = {
  lose: -500,
  maintain: 0,
  gain: 300,
};

/** Protein target in g per kg body weight. */
export const PROTEIN_PER_KG: Record<Goal, number> = {
  lose: 2.0,
  maintain: 1.8,
  gain: 2.0,
};

export const FAT_SHARE = 0.25;

export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

/**
 * Basal metabolic rate (Mifflin-St Jeor):
 * 10 × kg + 6,25 × cm − 5 × Alter + 5 (Männer) bzw. − 161 (Frauen).
 * Without a sex the mean of both constants is used.
 */
export function bmr(input: { sex: Sex | null; weightKg: number; heightCm: number; age: number }): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  const constant = input.sex === 'male' ? 5 : input.sex === 'female' ? -161 : -78;
  return base + constant;
}

export function tdee(basal: number, activity: ActivityLevel): number {
  return basal * ACTIVITY_FACTORS[activity];
}

/** Daily calorie target for a goal. A deficit never goes below the BMR. */
export function calorieTarget(basal: number, activity: ActivityLevel, goal: Goal): number {
  const total = tdee(basal, activity) + GOAL_KCAL_OFFSET[goal];
  return roundTo(goal === 'lose' ? Math.max(total, basal) : total, 10);
}

export function macroTargets(
  kcal: number,
  weightKg: number,
  goal: Goal,
): { protein: number; carbs: number; fat: number } {
  const protein = Math.round(weightKg * PROTEIN_PER_KG[goal]);
  const fat = Math.round((kcal * FAT_SHARE) / KCAL_PER_GRAM.fat);
  const rest = kcal - protein * KCAL_PER_GRAM.protein - fat * KCAL_PER_GRAM.fat;
  const carbs = Math.max(0, Math.round(rest / KCAL_PER_GRAM.carbs));
  return { protein, carbs, fat };
}

/** Derives calorie and macro goals from the profile, or `null` if data is missing. */
export function computeNutritionGoals(
  profile: Profile,
  weightKg: number | null,
  today: DateKey = todayKey(),
): NutritionGoals | null {
  if (!weightKg || !profile.heightCm || !profile.birthYear) return null;
  const basal = bmr({
    sex: profile.sex,
    weightKg,
    heightCm: profile.heightCm,
    age: ageFromBirthYear(profile.birthYear, today),
  });
  const kcal = calorieTarget(basal, profile.activity, profile.goal);
  return { auto: true, kcal, ...macroTargets(kcal, weightKg, profile.goal) };
}

/** Recommended daily water intake: ~35 ml per kg, rounded to 250 ml. */
export function recommendedWaterMl(weightKg: number | null): number {
  if (!weightKg) return 2500;
  return Math.min(4000, Math.max(1500, roundTo(weightKg * 35, 250)));
}

/** Nutrition values for an amount (g/ml) of a food with values per 100. */
export function nutrientsFor(food: Pick<Food, 'kcal' | 'protein' | 'carbs' | 'fat'>, amount: number): Macros {
  const f = amount / 100;
  return {
    kcal: tidy(food.kcal * f, 1),
    protein: tidy(food.protein * f, 1),
    carbs: tidy(food.carbs * f, 1),
    fat: tidy(food.fat * f, 1),
  };
}

export const ZERO_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export function sumMacros(items: readonly Macros[]): Macros {
  const total = { ...ZERO_MACROS };
  for (const m of items) {
    total.kcal += m.kcal;
    total.protein += m.protein;
    total.carbs += m.carbs;
    total.fat += m.fat;
  }
  return {
    kcal: tidy(total.kcal, 1),
    protein: tidy(total.protein, 1),
    carbs: tidy(total.carbs, 1),
    fat: tidy(total.fat, 1),
  };
}

/** Share of calories coming from each macro (0..1), based on 4/4/9 kcal per gram. */
export function macroEnergyShare(m: Pick<Macros, 'protein' | 'carbs' | 'fat'>): {
  protein: number;
  carbs: number;
  fat: number;
} {
  const p = m.protein * KCAL_PER_GRAM.protein;
  const c = m.carbs * KCAL_PER_GRAM.carbs;
  const f = m.fat * KCAL_PER_GRAM.fat;
  const total = p + c + f;
  if (total <= 0) return { protein: 0, carbs: 0, fat: 0 };
  return { protein: p / total, carbs: c / total, fat: f / total };
}

/** Calories implied by macros (useful to validate custom foods). */
export function kcalFromMacros(m: Pick<Macros, 'protein' | 'carbs' | 'fat'>): number {
  return m.protein * KCAL_PER_GRAM.protein + m.carbs * KCAL_PER_GRAM.carbs + m.fat * KCAL_PER_GRAM.fat;
}
