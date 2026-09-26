import { tidy } from './format';
import type { CardioType } from './types';

/**
 * MET values (metabolic equivalents) from the Compendium of Physical
 * Activities. Running and cycling are refined by speed when a distance is known.
 */
export const DEFAULT_MET: Record<CardioType, number> = {
  running: 9.8,
  treadmill: 9.0,
  cycling: 7.5,
  bike_indoor: 6.8,
  elliptical: 5.0,
  rowing: 7.0,
  swimming: 6.0,
  walking: 3.5,
  hiking: 6.0,
  stairs: 9.0,
  hiit: 8.0,
  other: 5.0,
};

const RUNNING_MET_BY_SPEED: [number, number][] = [
  // [min km/h, MET]
  [0, 6.0],
  [7.5, 8.3],
  [9.5, 9.8],
  [10.5, 10.5],
  [11.2, 11.0],
  [12.0, 11.8],
  [12.8, 12.3],
  [13.7, 12.8],
  [14.4, 14.5],
  [16.0, 16.0],
  [17.5, 19.0],
];

const CYCLING_MET_BY_SPEED: [number, number][] = [
  [0, 4.0],
  [16, 6.8],
  [19, 8.0],
  [22.5, 10.0],
  [25.7, 12.0],
  [30.6, 15.8],
];

const WALKING_MET_BY_SPEED: [number, number][] = [
  [0, 2.8],
  [4.0, 3.5],
  [5.5, 4.3],
  [6.4, 5.0],
  [7.2, 7.0],
];

function lookup(table: [number, number][], speed: number): number {
  let met = table[0][1];
  for (const [min, value] of table) {
    if (speed >= min) met = value;
  }
  return met;
}

export function speedKmh(distanceKm: number | null, durationSec: number): number | null {
  if (!distanceKm || distanceKm <= 0 || durationSec <= 0) return null;
  return tidy(distanceKm / (durationSec / 3600), 2);
}

/** Seconds per kilometre. */
export function paceSecPerKm(distanceKm: number | null, durationSec: number): number | null {
  if (!distanceKm || distanceKm <= 0 || durationSec <= 0) return null;
  return durationSec / distanceKm;
}

export function metFor(type: CardioType, distanceKm: number | null, durationSec: number): number {
  const speed = speedKmh(distanceKm, durationSec);
  if (speed != null) {
    if (type === 'running' || type === 'treadmill') return lookup(RUNNING_MET_BY_SPEED, speed);
    if (type === 'cycling') return lookup(CYCLING_MET_BY_SPEED, speed);
    if (type === 'walking') return lookup(WALKING_MET_BY_SPEED, speed);
  }
  return DEFAULT_MET[type];
}

/** Estimated energy expenditure: kcal = MET × kg × hours. */
export function estimateCardioKcal(
  type: CardioType,
  durationSec: number,
  distanceKm: number | null,
  weightKg: number | null,
): number | null {
  if (!weightKg || durationSec <= 0) return null;
  return Math.round(metFor(type, distanceKm, durationSec) * weightKg * (durationSec / 3600));
}
