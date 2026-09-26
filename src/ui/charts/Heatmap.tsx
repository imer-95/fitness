import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { addDays, MONTHS_SHORT, splitKey, startOfWeek, todayKey } from '@/domain/dates';
import type { DateKey } from '@/domain/types';

import { Txt } from '../Text';
import { useTheme, withAlpha } from '../theme';

/**
 * GitHub-style activity calendar: one column per week (Mon–Sun), newest week
 * on the right. `values` maps days to an intensity (0 = nothing).
 */
export function ActivityHeatmap({
  weeks = 16,
  end = todayKey(),
  values,
  color,
  maxValue = 2,
}: {
  weeks?: number;
  end?: DateKey;
  values: ReadonlyMap<DateKey, number>;
  color?: string;
  maxValue?: number;
}) {
  const { colors } = useTheme();
  const accent = color ?? colors.primary;
  const [width, setWidth] = useState(0);
  const gap = 3;
  const cell = width > 0 ? Math.min(20, Math.floor((width - gap * (weeks - 1)) / weeks)) : 0;
  const firstWeek = addDays(startOfWeek(end), -(weeks - 1) * 7);

  const columns = Array.from({ length: weeks }, (_, w) => addDays(firstWeek, w * 7));
  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width))}>
      {cell > 0 ? (
        <>
          <View style={styles.months}>
            {columns.map((weekStart, i) => {
              const month = splitKey(weekStart)[1];
              const prevMonth = i > 0 ? splitKey(columns[i - 1])[1] : null;
              if (month === prevMonth || i > weeks - 2) return null;
              return (
                <Txt
                  key={weekStart}
                  variant="caption"
                  color="textTertiary"
                  numberOfLines={1}
                  style={[styles.monthLabel, { left: i * (cell + gap) }]}
                >
                  {MONTHS_SHORT[month - 1]}
                </Txt>
              );
            })}
          </View>
          <View style={[styles.grid, { gap }]}>
            {columns.map((weekStart) => (
              <View key={weekStart} style={{ gap }}>
                {Array.from({ length: 7 }, (_, d) => {
                  const day = addDays(weekStart, d);
                  const v = values.get(day) ?? 0;
                  const future = day > end;
                  const intensity = v <= 0 ? 0 : 0.35 + 0.65 * Math.min(1, v / maxValue);
                  return (
                    <View
                      key={day}
                      style={{
                        width: cell,
                        height: cell,
                        borderRadius: Math.max(3, cell / 4),
                        backgroundColor: future
                          ? 'transparent'
                          : v > 0
                            ? withAlpha(accent, intensity)
                            : colors.surfaceAlt,
                      }}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  months: { height: 18 },
  monthLabel: { position: 'absolute', top: 0, width: 48 },
  grid: { flexDirection: 'row' },
});
