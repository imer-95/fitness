import { useMemo } from 'react';

import { currentTrend, movingAverage, projectGoalDate, trendChange, weeklyRate } from '@/domain/body';
import { addDays, formatDayMonth, todayKey } from '@/domain/dates';
import { formatNumber } from '@/domain/format';
import type { DateKey, WeightEntry } from '@/domain/types';
import { LineChart } from '@/ui/charts/LineChart';
import { dayFromNumber, dayNumber } from '@/ui/charts/scale';
import { useTheme, withAlpha } from '@/ui/theme';

export type WeightRange = '30' | '90' | '365' | 'all';

export const WEIGHT_RANGES: { value: WeightRange; label: string }[] = [
  { value: '30', label: '30 T' },
  { value: '90', label: '3 M' },
  { value: '365', label: '1 J' },
  { value: 'all', label: 'Alle' },
];

export interface WeightStats {
  latest: WeightEntry | null;
  trend: number | null;
  change7: number | null;
  change30: number | null;
  ratePerWeek: number | null;
  goalDate: DateKey | null;
  start: WeightEntry | null;
}

export function computeWeightStats(
  entries: readonly WeightEntry[],
  targetWeight: number | null,
  today = todayKey(),
): WeightStats {
  const points = entries.map((e) => ({ date: e.date, value: e.weight }));
  const trend = currentTrend(points);
  const rate = weeklyRate(points, today);
  return {
    latest: entries[entries.length - 1] ?? null,
    start: entries[0] ?? null,
    trend,
    change7: trendChange(points, 7),
    change30: trendChange(points, 30),
    ratePerWeek: rate,
    goalDate: trend != null && targetWeight != null ? projectGoalDate(trend, targetWeight, rate, today) : null,
  };
}

export function WeightChart({
  entries,
  range,
  targetWeight,
  height = 210,
}: {
  entries: readonly WeightEntry[];
  range: WeightRange;
  targetWeight: number | null;
  height?: number;
}) {
  const { colors } = useTheme();
  const series = useMemo(() => {
    const from = range === 'all' ? '0000-01-01' : addDays(todayKey(), -Number(range));
    const points = entries.map((e) => ({ date: e.date, value: e.weight }));
    const trend = movingAverage(points).filter((p) => p.date >= from);
    const raw = points.filter((p) => p.date >= from);
    return {
      raw: raw.map((p) => ({ x: dayNumber(p.date), y: p.value })),
      trend: trend.map((p) => ({ x: dayNumber(p.date), y: p.value })),
    };
  }, [entries, range]);

  const showGoal =
    targetWeight != null && series.raw.length > 0 && Math.abs(targetWeight - series.raw[series.raw.length - 1].y) <= 12;

  return (
    <LineChart
      height={height}
      series={[
        { key: 'trend', points: series.trend, color: colors.weight, strokeWidth: 3, area: true },
        {
          key: 'raw',
          points: series.raw,
          color: withAlpha(colors.weight, 0.55),
          strokeWidth: 0,
          dots: true,
          opacity: 0.8,
        },
      ]}
      selectSeries={1}
      goal={showGoal ? targetWeight : null}
      goalLabel={showGoal ? `Ziel ${formatNumber(targetWeight!, 1)} kg` : undefined}
      minYRange={2}
      formatY={(v) => formatNumber(v, 1)}
      formatX={(x) => formatDayMonth(dayFromNumber(x))}
      formatTooltip={(p) => `${formatNumber(p.y, 1)} kg · ${formatDayMonth(dayFromNumber(p.x))}`}
    />
  );
}
