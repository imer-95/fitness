import { StyleSheet, View } from 'react-native';

import { formatNumber } from '@/domain/format';
import type { Macros, NutritionGoals } from '@/domain/types';
import { Ring } from '@/ui/charts/Ring';
import { ProgressBar } from '@/ui/Feedback';
import { Txt } from '@/ui/Text';
import { spacing, useTheme } from '@/ui/theme';

export function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  return (
    <View style={styles.macro}>
      <View style={styles.macroHeader}>
        <Txt variant="caption" color="textSecondary" style={styles.flex}>
          {label}
        </Txt>
        <Txt variant="caption" weight="700" tabular>
          {formatNumber(value, 0)}
          <Txt variant="caption" color="textTertiary">
            {' '}
            / {formatNumber(goal, 0)} g
          </Txt>
        </Txt>
      </View>
      <ProgressBar value={goal > 0 ? value / goal : 0} color={color} height={7} />
    </View>
  );
}

/** Calorie ring with remaining calories and the three macro bars. */
export function NutritionSummary({
  totals,
  goals,
  compact,
}: {
  totals: Macros;
  goals: NutritionGoals;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const remaining = goals.kcal - totals.kcal;
  const over = remaining < 0;
  const size = compact ? 112 : 128;
  return (
    <View style={styles.row}>
      <Ring
        size={size}
        stroke={compact ? 11 : 12}
        progress={goals.kcal > 0 ? totals.kcal / goals.kcal : 0}
        color={over ? colors.danger : colors.primary}
      >
        <Txt variant={compact ? 'title3' : 'title2'} tabular>
          {formatNumber(Math.abs(Math.round(remaining)), 0)}
        </Txt>
        <Txt variant="caption" color={over ? 'danger' : 'textSecondary'}>
          {over ? 'kcal zu viel' : 'kcal übrig'}
        </Txt>
      </Ring>
      <View style={styles.bars}>
        <View style={styles.kcalRow}>
          <Txt variant="headline" tabular>
            {formatNumber(Math.round(totals.kcal), 0)}
          </Txt>
          <Txt variant="footnote" color="textSecondary">
            {' '}
            / {formatNumber(goals.kcal, 0)} kcal
          </Txt>
        </View>
        <MacroBar label="Eiweiß" value={totals.protein} goal={goals.protein} color={colors.protein} />
        <MacroBar label="Kohlenhydrate" value={totals.carbs} goal={goals.carbs} color={colors.carbs} />
        <MacroBar label="Fett" value={totals.fat} goal={goals.fat} color={colors.fat} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  bars: { flex: 1, gap: spacing.sm },
  kcalRow: { flexDirection: 'row', alignItems: 'baseline' },
  macro: { gap: 4 },
  macroHeader: { flexDirection: 'row', alignItems: 'center' },
});
