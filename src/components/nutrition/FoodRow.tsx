import { Pressable, StyleSheet, View } from 'react-native';

import { formatNumber } from '@/domain/format';
import { Icon } from '@/ui/Icon';
import { Txt } from '@/ui/Text';
import { spacing, useTheme } from '@/ui/theme';

export interface FoodRowData {
  name: string;
  brand: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  unit: 'g' | 'ml';
  favorite?: boolean;
  source?: string;
}

export function FoodRow({ food, onPress }: { food: FoodRowData; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.surfaceAlt : 'transparent' }]}
    >
      <View style={styles.flex}>
        <View style={styles.titleRow}>
          <Txt variant="callout" weight="600" numberOfLines={1} style={styles.shrink}>
            {food.name}
          </Txt>
          {food.favorite ? <Icon name="star" size={14} color={colors.gold} /> : null}
          {food.source === 'off' ? <Icon name="barcode" size={14} color={colors.textTertiary} /> : null}
        </View>
        <Txt variant="caption" color="textSecondary" numberOfLines={1}>
          {food.brand ? `${food.brand} · ` : ''}E {formatNumber(food.protein, 1)} · K {formatNumber(food.carbs, 1)} · F{' '}
          {formatNumber(food.fat, 1)} g
        </Txt>
      </View>
      <View style={styles.kcal}>
        <Txt variant="subhead" weight="700" tabular>
          {formatNumber(food.kcal, 0)}
        </Txt>
        <Txt variant="caption" color="textTertiary">
          kcal/100 {food.unit}
        </Txt>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md - 2,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kcal: { alignItems: 'flex-end' },
});
