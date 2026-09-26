import type { CardioType, Meal, MuscleGroup } from '@/domain/types';

import type { IconName } from './Icon';

export const CARDIO_ICONS: Record<CardioType, IconName> = {
  running: 'run',
  treadmill: 'run-fast',
  cycling: 'bike',
  bike_indoor: 'bike-fast',
  elliptical: 'shoe-sneaker',
  rowing: 'rowing',
  swimming: 'swim',
  walking: 'walk',
  hiking: 'hiking',
  stairs: 'stairs-up',
  hiit: 'lightning-bolt',
  other: 'heart-pulse',
};

export const MEAL_ICONS: Record<Meal, IconName> = {
  breakfast: 'coffee-outline',
  lunch: 'silverware-fork-knife',
  dinner: 'food-variant',
  snack: 'food-apple-outline',
};

export const MUSCLE_ICONS: Record<MuscleGroup, IconName> = {
  chest: 'arm-flex-outline',
  back: 'human-handsup',
  shoulders: 'human-handsup',
  biceps: 'arm-flex',
  triceps: 'arm-flex-outline',
  forearms: 'hand-back-right-outline',
  abs: 'human',
  quads: 'human-male',
  hamstrings: 'human-male',
  glutes: 'human-male',
  calves: 'shoe-print',
  full_body: 'human-handsup',
  other: 'dumbbell',
};
