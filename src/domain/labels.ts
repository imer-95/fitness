import type {
  ActivityLevel,
  BarMode,
  CardioType,
  Equipment,
  Goal,
  Meal,
  MeasurementType,
  MuscleGroup,
  SetKind,
  Sex,
  TrackingType,
  WeightMode,
} from './types';

/** German display labels for all enumerations. */

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Brust',
  back: 'Rücken',
  shoulders: 'Schultern',
  biceps: 'Bizeps',
  triceps: 'Trizeps',
  forearms: 'Unterarme',
  abs: 'Bauch',
  quads: 'Oberschenkel',
  hamstrings: 'Beinbeuger',
  glutes: 'Gesäß',
  calves: 'Waden',
  full_body: 'Ganzkörper',
  other: 'Sonstiges',
};

/** Short labels used in compact chips and titles ("Brust, Bizeps, Bauch"). */
export const MUSCLE_SHORT: Record<MuscleGroup, string> = {
  chest: 'Brust',
  back: 'Rücken',
  shoulders: 'Schultern',
  biceps: 'Bizeps',
  triceps: 'Trizeps',
  forearms: 'Unterarme',
  abs: 'Bauch',
  quads: 'Beine',
  hamstrings: 'Beine',
  glutes: 'Po',
  calves: 'Waden',
  full_body: 'Ganzkörper',
  other: 'Sonstiges',
};

export const MUSCLE_ORDER: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'full_body',
  'other',
];

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  machine: 'Maschine',
  barbell: 'Langhantel',
  dumbbell: 'Kurzhantel',
  cable: 'Kabelzug',
  smith: 'Multipresse',
  bodyweight: 'Körpergewicht',
  kettlebell: 'Kettlebell',
  band: 'Widerstandsband',
  other: 'Sonstiges',
};

export const EQUIPMENT_ORDER: Equipment[] = [
  'machine',
  'cable',
  'barbell',
  'dumbbell',
  'smith',
  'bodyweight',
  'kettlebell',
  'band',
  'other',
];

export const TRACKING_LABELS: Record<TrackingType, string> = {
  weight_reps: 'Gewicht × Wiederholungen',
  reps: 'Nur Wiederholungen',
  time: 'Zeit',
};

export const WEIGHT_MODE_LABELS: Record<WeightMode, string> = {
  total: 'Gesamtgewicht',
  per_side: 'Pro Seite',
};

export const BAR_MODE_LABELS: Record<BarMode, string> = {
  none: 'Keine Stange',
  included: 'Inkl. Stange',
  excluded: 'Exkl. Stange',
};

export const SET_KIND_LABELS: Record<SetKind, string> = {
  normal: 'Arbeitssatz',
  warmup: 'Aufwärmsatz',
  drop: 'Dropsatz',
  failure: 'Bis zum Versagen',
};

export const SET_KIND_SHORT: Record<SetKind, string> = {
  normal: '',
  warmup: 'W',
  drop: 'D',
  failure: 'V',
};

export const CARDIO_LABELS: Record<CardioType, string> = {
  running: 'Laufen',
  treadmill: 'Laufband',
  cycling: 'Radfahren',
  bike_indoor: 'Ergometer',
  elliptical: 'Crosstrainer',
  rowing: 'Rudergerät',
  swimming: 'Schwimmen',
  walking: 'Gehen',
  hiking: 'Wandern',
  stairs: 'Stepper / Treppe',
  hiit: 'HIIT',
  other: 'Sonstiges',
};

export const CARDIO_ORDER: CardioType[] = [
  'running',
  'treadmill',
  'cycling',
  'bike_indoor',
  'elliptical',
  'rowing',
  'swimming',
  'walking',
  'hiking',
  'stairs',
  'hiit',
  'other',
];

/** Types for which a distance is usually tracked. */
export const CARDIO_HAS_DISTANCE: Record<CardioType, boolean> = {
  running: true,
  treadmill: true,
  cycling: true,
  bike_indoor: true,
  elliptical: false,
  rowing: true,
  swimming: true,
  walking: true,
  hiking: true,
  stairs: false,
  hiit: false,
  other: false,
};

export const MEAL_LABELS: Record<Meal, string> = {
  breakfast: 'Frühstück',
  lunch: 'Mittagessen',
  dinner: 'Abendessen',
  snack: 'Snacks',
};

export const MEAL_ORDER: Meal[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/** Sensible default meal for the current time of day. */
export function mealForHour(hour: number): Meal {
  if (hour < 10) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour >= 17 && hour < 22) return 'dinner';
  return 'snack';
}

export const MEASUREMENT_LABELS: Record<MeasurementType, string> = {
  neck: 'Hals',
  shoulders: 'Schultern',
  chest: 'Brust',
  waist: 'Taille',
  belly: 'Bauch (Nabelhöhe)',
  hips: 'Hüfte',
  arm_left: 'Oberarm links',
  arm_right: 'Oberarm rechts',
  thigh_left: 'Oberschenkel links',
  thigh_right: 'Oberschenkel rechts',
  calf_left: 'Wade links',
  calf_right: 'Wade rechts',
};

export const MEASUREMENT_ORDER: MeasurementType[] = [
  'neck',
  'shoulders',
  'chest',
  'arm_left',
  'arm_right',
  'waist',
  'belly',
  'hips',
  'thigh_left',
  'thigh_right',
  'calf_left',
  'calf_right',
];

export const SEX_LABELS: Record<Sex, string> = {
  male: 'Männlich',
  female: 'Weiblich',
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Kaum aktiv',
  light: 'Leicht aktiv',
  moderate: 'Mäßig aktiv',
  active: 'Sehr aktiv',
  very_active: 'Extrem aktiv',
};

export const ACTIVITY_DESCRIPTIONS: Record<ActivityLevel, string> = {
  sedentary: 'Bürojob, wenig Bewegung',
  light: '1–2 Trainings pro Woche',
  moderate: '3–4 Trainings pro Woche',
  active: '5–6 Trainings pro Woche',
  very_active: 'Tägliches hartes Training oder körperliche Arbeit',
};

export const ACTIVITY_ORDER: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active'];

export const GOAL_LABELS: Record<Goal, string> = {
  lose: 'Abnehmen',
  maintain: 'Gewicht halten',
  gain: 'Muskelaufbau',
};

export const GOAL_DESCRIPTIONS: Record<Goal, string> = {
  lose: 'Kaloriendefizit von ca. 500 kcal',
  maintain: 'Kalorien auf Erhaltungsniveau',
  gain: 'Leichter Überschuss von ca. 300 kcal',
};
