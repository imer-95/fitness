import { StyleSheet, View } from 'react-native';

import { addWater, getWater } from '@/db/repos/nutrition';
import { useQuery } from '@/db/useQuery';
import { formatMl } from '@/domain/format';
import type { DateKey } from '@/domain/types';
import { haptics } from '@/services/haptics';
import { useSettings } from '@/state/settings';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/Icon';
import { Txt } from '@/ui/Text';
import { spacing, useTheme, withAlpha } from '@/ui/theme';

const GLASS_ML = 250;

export function WaterCard({ date }: { date: DateKey }) {
  const { colors } = useTheme();
  const goal = useSettings((s) => s.goals.waterMl);
  const water = useQuery(() => getWater(date), [date], ['water']);
  const ml = water.data ?? 0;
  const glasses = Math.max(8, Math.ceil(goal / GLASS_ML));
  const filled = Math.floor(ml / GLASS_ML);
  const reached = ml >= goal;

  const add = async (delta: number) => {
    haptics.light();
    const next = await addWater(date, delta);
    if (next >= goal && next - delta < goal) haptics.success();
  };

  return (
    <Card style={styles.gap}>
      <View style={styles.header}>
        <Icon name="cup-water" size={22} color={colors.water} />
        <Txt variant="headline" style={styles.flex}>
          Wasser
        </Txt>
        <Txt variant="subhead" tabular>
          <Txt variant="subhead" weight="800" color={reached ? 'success' : 'text'}>
            {formatMl(ml)}
          </Txt>
          <Txt variant="subhead" color="textSecondary">
            {' '}
            / {formatMl(goal)}
          </Txt>
        </Txt>
      </View>
      <View style={styles.glasses}>
        {Array.from({ length: glasses }, (_, i) => (
          <View
            key={i}
            style={[
              styles.glass,
              {
                backgroundColor: i < filled ? colors.water : withAlpha(colors.water, 0.12),
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.actions}>
        <IconButton
          icon="minus"
          accessibilityLabel="250 ml entfernen"
          disabled={ml <= 0}
          onPress={() => add(-GLASS_ML)}
        />
        <Button
          label="+ 250 ml"
          size="sm"
          variant="tinted"
          color={colors.water}
          style={styles.flex}
          onPress={() => add(GLASS_ML)}
        />
        <Button
          label="+ 500 ml"
          size="sm"
          variant="tinted"
          color={colors.water}
          style={styles.flex}
          onPress={() => add(500)}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  glasses: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  glass: { flex: 1, minWidth: 18, height: 26, borderRadius: 6, borderBottomLeftRadius: 9, borderBottomRightRadius: 9 },
  actions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
});
