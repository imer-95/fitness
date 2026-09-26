import {
  bmi,
  bmiCategory,
  currentTrend,
  dayStreak,
  linearTrend,
  movingAverage,
  projectGoalDate,
  trendChange,
  weeklyRate,
} from '@/domain/body';
import { estimateCardioKcal, metFor, paceSecPerKm, speedKmh } from '@/domain/cardio';
import { analyzeHistory, weeklyStreak } from '@/domain/stats';
import {
  addDays,
  addMonths,
  diffDays,
  eachDay,
  formatAgo,
  formatClock,
  formatDateLong,
  formatDateMedium,
  formatDateShort,
  formatDayRelative,
  formatDuration,
  isDateKey,
  startOfWeek,
  toDateKey,
  weekday,
} from '@/domain/dates';
import {
  formatDistance,
  formatKcal,
  formatMl,
  formatNumber,
  formatPace,
  formatSigned,
  formatWeight,
  parseDecimal,
  toInputValue,
} from '@/domain/format';
import {
  bmr,
  calorieTarget,
  computeNutritionGoals,
  macroEnergyShare,
  macroTargets,
  nutrientsFor,
  recommendedWaterMl,
  sumMacros,
} from '@/domain/nutrition';
import {
  computeBests,
  detectPrs,
  effectiveLoad,
  estimate1RM,
  formatSet,
  mergeBests,
  percentTable,
  platesForWeight,
  progressionHint,
  setVolume,
  weightAnnotation,
} from '@/domain/strength';

describe('dates', () => {
  test('date keys and arithmetic', () => {
    expect(toDateKey(new Date(2026, 8, 26, 23, 59))).toBe('2026-09-26');
    expect(addDays('2026-09-26', 7)).toBe('2026-10-03');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
    expect(diffDays('2026-10-03', '2026-09-26')).toBe(7);
    // DST change in Germany on 2026-10-25
    expect(diffDays('2026-10-26', '2026-10-24')).toBe(2);
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-01-15', -2)).toBe('2025-11-15');
    expect(eachDay('2026-09-29', '2026-10-02')).toEqual(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
    expect(isDateKey('2026-02-29')).toBe(false);
    expect(isDateKey('2024-02-29')).toBe(true);
  });

  test('weeks start on Monday', () => {
    expect(weekday('2026-09-26')).toBe(6); // Saturday
    expect(startOfWeek('2026-09-26')).toBe('2026-09-21');
    expect(startOfWeek('2026-09-21')).toBe('2026-09-21');
    expect(startOfWeek('2026-09-27')).toBe('2026-09-21');
  });

  test('german formatting', () => {
    expect(formatDateLong('2025-09-25')).toBe('Donnerstag, 25. September 2025');
    expect(formatDateMedium('2026-09-26', 2026)).toBe('Sa, 26. Sept.');
    expect(formatDateMedium('2025-09-25', 2026)).toBe('Do, 25. Sept. 2025');
    expect(formatDateShort('2026-09-25', 2026)).toBe('25.09.');
    expect(formatDayRelative('2026-09-25', '2026-09-26')).toBe('Gestern');
    expect(formatDayRelative('2026-09-26', '2026-09-26')).toBe('Heute');
    expect(formatAgo('2026-09-23', '2026-09-26')).toBe('vor 3 Tagen');
    expect(formatAgo('2026-09-05', '2026-09-26')).toBe('vor 3 Wochen');
    expect(formatClock(125)).toBe('2:05');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(formatDuration(45)).toBe('45 Sek.');
    expect(formatDuration(62 * 60)).toBe('1 Std. 2 Min.');
    expect(formatDuration(45 * 60)).toBe('45 Min.');
  });
});

describe('format', () => {
  test('formats numbers the German way', () => {
    expect(formatNumber(12.5)).toBe('12,5');
    expect(formatNumber(40)).toBe('40');
    expect(formatNumber(1234.56, 1)).toBe('1.234,6');
    expect(formatNumber(-0.04, 1)).toBe('0');
    expect(formatNumber(2.5, 2, 2)).toBe('2,50');
    expect(formatSigned(0.3)).toBe('+0,3');
    expect(formatSigned(-1.25, 2)).toBe('−1,25');
    expect(formatSigned(0)).toBe('±0');
    expect(formatWeight(82.4)).toBe('82,4 kg');
    expect(formatKcal(1849.6)).toBe('1.850 kcal');
    expect(formatMl(1250)).toBe('1,25 l');
    expect(formatMl(250)).toBe('250 ml');
    expect(formatDistance(4.2)).toBe('4,2 km');
    expect(formatPace(330)).toBe('5:30 /km');
  });

  test('parses user input', () => {
    expect(parseDecimal('12,5')).toBe(12.5);
    expect(parseDecimal('12.5')).toBe(12.5);
    expect(parseDecimal(' 80 ')).toBe(80);
    expect(parseDecimal('1.234,5')).toBe(1234.5);
    expect(parseDecimal('12,')).toBe(12);
    expect(parseDecimal(',5')).toBe(0.5);
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
    expect(parseDecimal('1,2,3')).toBeNull();
    expect(toInputValue(12.5)).toBe('12,5');
    expect(toInputValue(1234)).toBe('1234');
    expect(toInputValue(null)).toBe('');
  });
});

describe('strength', () => {
  const machine = { weightMode: 'total', barMode: 'included', barWeight: null } as const;
  const perSideBar = { weightMode: 'per_side', barMode: 'excluded', barWeight: 10 } as const;

  test('1RM (Epley)', () => {
    expect(estimate1RM(100, 1)).toBe(100);
    expect(estimate1RM(100, 10)).toBeCloseTo(133.33, 2);
    expect(estimate1RM(0, 10)).toBe(0);
  });

  test('effective load and volume respect "pro Seite" and bar', () => {
    expect(effectiveLoad(40, machine)).toBe(40);
    expect(effectiveLoad(12.5, perSideBar)).toBe(35);
    expect(setVolume({ reps: 12, weight: 12.5 }, perSideBar)).toBe(420);
    expect(setVolume({ reps: 12, weight: null }, machine)).toBe(0);
    expect(weightAnnotation(perSideBar)).toBe('pro Seite exkl. Stange');
    expect(weightAnnotation(machine)).toBe('inkl. Stange');
  });

  test('bests and PR detection', () => {
    const history = [
      { reps: 10, weight: 40, durationSec: null, kind: 'normal' as const },
      { reps: 10, weight: 50, durationSec: null, kind: 'normal' as const },
      { reps: 5, weight: 60, durationSec: null, kind: 'warmup' as const },
    ];
    const bests = computeBests(history, machine);
    expect(bests.maxWeight).toBe(50);
    expect(bests.maxE1rm).toBeCloseTo(66.67, 2);
    expect(bests.maxReps).toBe(10);
    expect(detectPrs({ reps: 8, weight: 52.5, durationSec: null, kind: 'normal' }, bests, 'weight_reps')).toEqual([
      'weight',
    ]);
    expect(detectPrs({ reps: 12, weight: 50, durationSec: null, kind: 'normal' }, bests, 'weight_reps')).toEqual([
      'e1rm',
    ]);
    expect(detectPrs({ reps: 10, weight: 50, durationSec: null, kind: 'normal' }, bests, 'weight_reps')).toEqual([]);
    expect(detectPrs({ reps: 20, weight: 70, durationSec: null, kind: 'warmup' }, bests, 'weight_reps')).toEqual([]);
    // No history -> no record
    expect(
      detectPrs({ reps: 10, weight: 40, durationSec: null, kind: 'normal' }, computeBests([], machine), 'weight_reps'),
    ).toEqual([]);
    const repsBests = mergeBests(
      computeBests([], machine),
      { reps: 12, weight: null, durationSec: null, kind: 'normal' },
      machine,
    );
    expect(detectPrs({ reps: 13, weight: null, durationSec: null, kind: 'normal' }, repsBests, 'reps')).toEqual([
      'reps',
    ]);
  });

  test('formats sets', () => {
    expect(formatSet({ reps: 10, weight: 40, durationSec: null, kind: 'normal' }, 'weight_reps')).toBe('10 × 40 kg');
    expect(formatSet({ reps: 12, weight: null, durationSec: null, kind: 'normal' }, 'reps')).toBe('12 Wdh.');
    expect(formatSet({ reps: 10, weight: 12.5, durationSec: null, kind: 'normal', side: 'left' }, 'weight_reps')).toBe(
      '10 × 12,5 kg (L)',
    );
    expect(formatSet({ reps: null, weight: null, durationSec: 45, kind: 'normal' }, 'time')).toBe('45 s');
  });

  test('progression hint', () => {
    const s = (weights: number[], reps = 10) => ({
      sets: weights.map((w) => ({ reps, weight: w, durationSec: null, kind: 'normal' as const })),
    });
    expect(progressionHint([s([40, 40, 50, 40]), s([40, 50, 40])], 2.5)).toEqual({
      weight: 52.5,
      basedOn: { weight: 50, reps: 10 },
    });
    expect(progressionHint([s([40, 45]), s([40, 50])], 2.5)).toBeNull();
    expect(progressionHint([s([50], 8), s([50], 10)], 2.5)).toBeNull();
    expect(progressionHint([s([50])], 2.5)).toBeNull();
  });

  test('plate calculator and percent table', () => {
    expect(platesForWeight(100, 20)).toEqual({ perSide: [25, 15], remainder: 0 });
    expect(platesForWeight(62.5, 20)).toEqual({ perSide: [20, 1.25], remainder: 0 });
    expect(platesForWeight(21, 20)).toEqual({ perSide: [], remainder: 1 });
    const table = percentTable(100);
    expect(table[0]).toEqual({ percent: 100, weight: 100, reps: 1 });
    expect(table.find((r) => r.percent === 75)).toEqual({ percent: 75, weight: 75, reps: 10 });
  });
});

describe('body', () => {
  const entries = [
    { date: '2026-09-01', value: 84 },
    { date: '2026-09-02', value: 83.6 },
    { date: '2026-09-04', value: 83.8 },
    { date: '2026-09-08', value: 83.2 },
    { date: '2026-09-10', value: 82.9 },
    { date: '2026-09-15', value: 82.8 },
    { date: '2026-09-20', value: 82.2 },
    { date: '2026-09-25', value: 82 },
  ];

  test('moving average uses a 7 day window', () => {
    const avg = movingAverage(entries);
    expect(avg[0].value).toBe(84);
    expect(avg[1].value).toBeCloseTo(83.8, 5);
    // 09-08 window: 09-02..09-08 -> 83.6, 83.8, 83.2
    expect(avg[3].value).toBeCloseTo((83.6 + 83.8 + 83.2) / 3, 3);
    expect(currentTrend(entries)).toBeCloseTo((82.2 + 82) / 2, 3);
  });

  test('regression, weekly rate and goal projection', () => {
    const line = linearTrend([
      { date: '2026-09-01', value: 80 },
      { date: '2026-09-08', value: 79 },
    ])!;
    expect(line.slopePerDay).toBeCloseTo(-1 / 7, 6);
    const rate = weeklyRate(entries, '2026-09-26')!;
    expect(rate).toBeLessThan(-0.4);
    expect(rate).toBeGreaterThan(-0.6);
    expect(trendChange(entries, 7)).toBeLessThan(0);
    expect(projectGoalDate(82, 80, -0.5, '2026-09-26')).toBe('2026-10-24');
    expect(projectGoalDate(82, 80, 0.5, '2026-09-26')).toBeNull();
    expect(projectGoalDate(82, 80, null, '2026-09-26')).toBeNull();
    expect(weeklyRate(entries.slice(0, 2), '2026-09-26')).toBeNull();
  });

  test('bmi and streaks', () => {
    expect(bmi(80, 180)).toBe(24.7);
    expect(bmiCategory(24.7)).toBe('Normalgewicht');
    expect(bmiCategory(31)).toBe('Adipositas');
    const days = new Set(['2026-09-24', '2026-09-25', '2026-09-23', '2026-09-20']);
    // today not logged yet -> streak still counts until yesterday
    expect(dayStreak(days, '2026-09-26')).toBe(3);
    expect(dayStreak(days, '2026-09-25')).toBe(3);
    expect(dayStreak(days, '2026-09-28')).toBe(0);
    days.add('2026-09-26');
    expect(dayStreak(days, '2026-09-26')).toBe(4);
  });
});

describe('nutrition', () => {
  test('BMR, TDEE and targets', () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 1780
    expect(bmr({ sex: 'male', weightKg: 80, heightCm: 180, age: 30 })).toBe(1780);
    expect(bmr({ sex: 'female', weightKg: 60, heightCm: 165, age: 30 })).toBe(1320.25);
    // 1780 * 1.55 = 2759 -> -500 = 2259 -> rounded 2260
    expect(calorieTarget(1780, 'moderate', 'lose')).toBe(2260);
    expect(calorieTarget(1780, 'moderate', 'gain')).toBe(3060);
    // deficit never below BMR
    expect(calorieTarget(1780, 'sedentary', 'lose')).toBe(1780);
    const macros = macroTargets(2260, 80, 'lose');
    expect(macros.protein).toBe(160);
    expect(macros.fat).toBe(63);
    expect(macros.carbs).toBe(Math.round((2260 - 160 * 4 - 63 * 9) / 4));
  });

  test('goals from profile', () => {
    const goals = computeNutritionGoals(
      { name: 'Imer', sex: 'male', birthYear: 1996, heightCm: 180, activity: 'moderate', goal: 'maintain' },
      80,
      '2026-09-26',
    );
    expect(goals).toEqual({ auto: true, kcal: 2760, protein: 144, carbs: 373, fat: 77 });
    expect(
      computeNutritionGoals(
        { name: '', sex: null, birthYear: null, heightCm: 180, activity: 'moderate', goal: 'maintain' },
        80,
      ),
    ).toBeNull();
    expect(recommendedWaterMl(80)).toBe(2750);
    expect(recommendedWaterMl(null)).toBe(2500);
  });

  test('food calculations', () => {
    const oats = { kcal: 372, protein: 13.5, carbs: 58.7, fat: 7 };
    expect(nutrientsFor(oats, 60)).toEqual({ kcal: 223.2, protein: 8.1, carbs: 35.2, fat: 4.2 });
    expect(sumMacros([nutrientsFor(oats, 40), nutrientsFor(oats, 60)])).toEqual(nutrientsFor(oats, 100));
    const share = macroEnergyShare({ protein: 25, carbs: 50, fat: 10 });
    expect(share.protein + share.carbs + share.fat).toBeCloseTo(1, 6);
  });
});

describe('cardio', () => {
  test('speed, pace and MET based calories', () => {
    expect(speedKmh(5, 1800)).toBe(10);
    expect(paceSecPerKm(5, 1800)).toBe(360);
    expect(metFor('running', 5, 1800)).toBe(9.8);
    expect(metFor('running', null, 1800)).toBe(9.8);
    expect(metFor('cycling', 20, 3600)).toBe(8);
    expect(metFor('elliptical', null, 1800)).toBe(5);
    // 9.8 MET * 80 kg * 0.5 h = 392
    expect(estimateCardioKcal('running', 1800, 5, 80)).toBe(392);
    expect(estimateCardioKcal('running', 1800, 5, null)).toBeNull();
  });
});

describe('history analysis', () => {
  const config = {
    tracking: 'weight_reps' as const,
    weightMode: 'total' as const,
    barMode: 'none' as const,
    barWeight: null,
  };
  const set = (workoutId: string, startedAt: number, reps: number, weight: number) => ({
    workoutId,
    startedAt,
    exerciseId: 'ex',
    reps,
    weight,
    durationSec: null,
    kind: 'normal' as const,
  });

  test('the first session of an exercise sets no records, later sessions do', () => {
    const { prs, progress } = analyzeHistory(
      [set('w1', 1, 10, 40), set('w1', 1, 10, 50), set('w2', 2, 10, 50), set('w2', 2, 8, 55), set('w2', 2, 8, 57.5)],
      new Map([['ex', config]]),
    );
    expect(prs.filter((p) => p.workoutId === 'w1')).toEqual([]);
    expect(prs.filter((p) => p.type === 'weight')).toEqual([
      expect.objectContaining({ workoutId: 'w2', value: 57.5, reps: 8 }),
    ]);
    expect(progress.get('ex')?.sessions).toBe(2);
  });

  test('weekly streak counts weeks that reached the goal', () => {
    const days = ['2026-09-01', '2026-09-03', '2026-09-08', '2026-09-10', '2026-09-15', '2026-09-22', '2026-09-24'];
    // Weeks: 31.08 (2), 07.09 (2), 14.09 (1), 21.09 (2, current)
    expect(weeklyStreak(days, 2, '2026-09-26')).toBe(1);
    expect(weeklyStreak(days, 1, '2026-09-26')).toBe(4);
    expect(weeklyStreak(days, 3, '2026-09-26')).toBe(0);
  });
});
