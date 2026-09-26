/**
 * Core domain types shared by the database layer, state stores and UI.
 * Weights are always stored in kilograms, distances in kilometres,
 * durations in seconds and timestamps as epoch milliseconds.
 * Calendar days are stored as local date keys (`YYYY-MM-DD`).
 */

export type ID = string;
export type DateKey = string;

// ---------------------------------------------------------------------------
// Strength training
// ---------------------------------------------------------------------------

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'full_body'
  | 'other';

export type Equipment =
  | 'machine'
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'smith'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'other';

/** What is logged per set. */
export type TrackingType = 'weight_reps' | 'reps' | 'time';

/** `per_side`: the logged weight is per side / per hand ("15 kg pro Seite"). */
export type WeightMode = 'total' | 'per_side';

/** Whether the logged weight includes the bar ("inkl. Stange") or not ("exkl. Stange"). */
export type BarMode = 'none' | 'included' | 'excluded';

export interface Exercise {
  id: ID;
  name: string;
  muscle: MuscleGroup;
  secondary: MuscleGroup[];
  equipment: Equipment;
  tracking: TrackingType;
  weightMode: WeightMode;
  barMode: BarMode;
  /** Bar weight in kg, used to compute the real load when `barMode` is `excluded`. */
  barWeight: number | null;
  /** Performed one side at a time (left / right logged separately). */
  unilateral: boolean;
  restSeconds: number;
  notes: string | null;
  /** Alternative names, used to match imported notes. */
  aliases: string[];
  isCustom: boolean;
  archived: boolean;
  createdAt: number;
}

export type SetKind = 'normal' | 'warmup' | 'drop' | 'failure';
export type Side = 'left' | 'right';

export interface WorkoutSet {
  id: ID;
  reps: number | null;
  weight: number | null;
  durationSec: number | null;
  side: Side | null;
  kind: SetKind;
  rpe: number | null;
  /** Rest taken after this set in seconds. */
  restSec: number | null;
  note: string | null;
}

export interface WorkoutExercise {
  id: ID;
  exerciseId: ID;
  restSeconds: number | null;
  notes: string | null;
  sets: WorkoutSet[];
}

export type WorkoutSource = 'app' | 'import';

export interface Workout {
  id: ID;
  title: string;
  startedAt: number;
  endedAt: number | null;
  notes: string | null;
  templateId: ID | null;
  source: WorkoutSource;
  exercises: WorkoutExercise[];
}

/** Aggregated information used by lists (history, dashboard). */
export interface WorkoutSummary {
  id: ID;
  title: string;
  startedAt: number;
  endedAt: number | null;
  exerciseCount: number;
  setCount: number;
  volume: number;
  exerciseNames: string[];
}

export interface TemplateSet {
  reps: number | null;
  weight: number | null;
  durationSec: number | null;
  side: Side | null;
  kind: SetKind;
}

export interface TemplateExercise {
  id: ID;
  exerciseId: ID;
  restSeconds: number | null;
  notes: string | null;
  sets: TemplateSet[];
}

export interface Template {
  id: ID;
  name: string;
  notes: string | null;
  position: number;
  lastUsedAt: number | null;
  createdAt: number;
  exercises: TemplateExercise[];
}

/** Best values of an exercise, used for PR detection. */
export interface ExerciseBests {
  maxWeight: number | null;
  maxE1rm: number | null;
  maxReps: number | null;
  maxDuration: number | null;
  maxSetVolume: number | null;
}

export type PrType = 'weight' | 'e1rm' | 'reps' | 'duration' | 'volume';

// ---------------------------------------------------------------------------
// Body
// ---------------------------------------------------------------------------

export interface WeightEntry {
  date: DateKey;
  weight: number;
  bodyFat: number | null;
  note: string | null;
  createdAt: number;
}

export type MeasurementType =
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'waist'
  | 'belly'
  | 'hips'
  | 'arm_left'
  | 'arm_right'
  | 'thigh_left'
  | 'thigh_right'
  | 'calf_left'
  | 'calf_right';

export interface Measurement {
  id: ID;
  date: DateKey;
  type: MeasurementType;
  /** Centimetres. */
  value: number;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Cardio
// ---------------------------------------------------------------------------

export type CardioType =
  | 'running'
  | 'treadmill'
  | 'cycling'
  | 'bike_indoor'
  | 'elliptical'
  | 'rowing'
  | 'swimming'
  | 'walking'
  | 'hiking'
  | 'stairs'
  | 'hiit'
  | 'other';

export interface CardioSession {
  id: ID;
  type: CardioType;
  startedAt: number;
  durationSec: number;
  distanceKm: number | null;
  kcal: number | null;
  avgHr: number | null;
  notes: string | null;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Nutrition
// ---------------------------------------------------------------------------

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type FoodUnit = 'g' | 'ml';
export type FoodSource = 'builtin' | 'custom' | 'off';

/** Nutrition values are per 100 g / 100 ml. */
export interface Food {
  id: ID;
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
  /** Typical portion in g/ml, e.g. 1 slice = 45 g. */
  servingSize: number | null;
  servingLabel: string | null;
  category: string | null;
  source: FoodSource;
  favorite: boolean;
  useCount: number;
  lastUsedAt: number | null;
  archived: boolean;
  createdAt: number;
}

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodEntry extends Macros {
  id: ID;
  date: DateKey;
  meal: Meal;
  foodId: ID | null;
  name: string;
  amount: number | null;
  unit: FoodUnit | null;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Profile & settings
// ---------------------------------------------------------------------------

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'lose' | 'maintain' | 'gain';
export type ThemePreference = 'system' | 'light' | 'dark';

export interface Profile {
  name: string;
  sex: Sex | null;
  birthYear: number | null;
  heightCm: number | null;
  activity: ActivityLevel;
  goal: Goal;
}

export interface NutritionGoals {
  /** When true the targets are derived from profile + weight. */
  auto: boolean;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Goals {
  targetWeight: number | null;
  nutrition: NutritionGoals;
  waterMl: number;
  workoutsPerWeek: number;
}

export interface ReminderSetting {
  enabled: boolean;
  hour: number;
  minute: number;
}

export interface Preferences {
  theme: ThemePreference;
  defaultRestSec: number;
  weightStep: number;
  keepAwake: boolean;
  restVibration: boolean;
  restNotification: boolean;
  weightReminder: ReminderSetting;
  defaultBarWeight: number;
}
