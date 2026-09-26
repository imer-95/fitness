import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { NutritionSummary } from '@/components/nutrition/NutritionSummary';
import { WaterCard } from '@/components/nutrition/WaterCard';
import { copyMeal, deleteFoodEntry, listFoodEntries } from '@/db/repos/nutrition';
import { useQuery } from '@/db/useQuery';
import { addDays, formatDateMedium, formatDayRelative, todayKey } from '@/domain/dates';
import { formatNumber } from '@/domain/format';
import { MEAL_LABELS, MEAL_ORDER } from '@/domain/labels';
import { macroEnergyShare, sumMacros } from '@/domain/nutrition';
import type { FoodEntry, Meal } from '@/domain/types';
import { useSettings } from '@/state/settings';
import { toast } from '@/state/ui';
import { IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { confirm } from '@/ui/dialogs';
import { Icon } from '@/ui/Icon';
import { MEAL_ICONS } from '@/ui/icons';
import { LargeHeader, Screen } from '@/ui/Screen';
import { SelectSheet } from '@/ui/Sheet';
import { Txt } from '@/ui/Text';
import { radius, spacing, useTheme, withAlpha } from '@/ui/theme';

type MealAction = 'add' | 'quick' | 'copy' | 'scan';

export default function NutritionScreen() {
  const { colors } = useTheme();
  const goals = useSettings((s) => s.goals.nutrition);
  const [date, setDate] = useState(todayKey());
  const [mealMenu, setMealMenu] = useState<Meal | null>(null);
  const entries = useQuery(() => listFoodEntries(date), [date], ['food_entries']);
  const list = useMemo(() => entries.data ?? [], [entries.data]);
  const totals = useMemo(() => sumMacros(list), [list]);
  const share = macroEnergyShare(totals);
  const isToday = date === todayKey();

  const openAdd = (meal: Meal) => router.push({ pathname: '/nutrition/add', params: { date, meal } });

  const onMealAction = async (meal: Meal, action: MealAction) => {
    if (action === 'add') openAdd(meal);
    if (action === 'quick') router.push({ pathname: '/nutrition/quick', params: { date, meal } });
    if (action === 'scan') router.push({ pathname: '/nutrition/scan', params: { date, meal } });
    if (action === 'copy') {
      const count = await copyMeal(addDays(date, -1), meal, date);
      toast(count > 0 ? `${count} Einträge übernommen` : 'Gestern war hier nichts eingetragen', {
        kind: count > 0 ? 'success' : 'info',
      });
    }
  };

  const openEntry = (entry: FoodEntry) => {
    if (entry.foodId)
      router.push({ pathname: '/nutrition/food', params: { entryId: entry.id, date, meal: entry.meal } });
    else router.push({ pathname: '/nutrition/quick', params: { entryId: entry.id, date, meal: entry.meal } });
  };

  const removeEntry = async (entry: FoodEntry) => {
    if (await confirm('Eintrag löschen?', entry.name, { confirmLabel: 'Löschen', destructive: true })) {
      await deleteFoodEntry(entry.id);
    }
  };

  return (
    <Screen safeTop>
      <LargeHeader
        title="Ernährung"
        right={
          <IconButton
            icon="barcode-scan"
            accessibilityLabel="Barcode scannen"
            onPress={() => router.push({ pathname: '/nutrition/scan', params: { date } })}
          />
        }
      />
      <View style={[styles.dateNav, { backgroundColor: colors.surfaceAlt }]}>
        <IconButton
          icon="chevron-left"
          size={34}
          background="transparent"
          accessibilityLabel="Vorheriger Tag"
          onPress={() => setDate(addDays(date, -1))}
        />
        <Pressable
          style={styles.flex}
          onPress={() => setDate(todayKey())}
          accessibilityRole="button"
          accessibilityLabel="Zu heute springen"
        >
          <Txt variant="headline" align="center">
            {formatDayRelative(date)}
          </Txt>
          {!isToday ? null : (
            <Txt variant="caption" color="textSecondary" align="center">
              {formatDateMedium(date)}
            </Txt>
          )}
        </Pressable>
        <IconButton
          icon="chevron-right"
          size={34}
          background="transparent"
          accessibilityLabel="Nächster Tag"
          disabled={isToday}
          onPress={() => setDate(addDays(date, 1))}
        />
      </View>

      <Card style={styles.gap}>
        <NutritionSummary totals={totals} goals={goals} />
        {totals.kcal > 0 ? (
          <View style={styles.shareRow}>
            <View style={[styles.shareBar, { backgroundColor: colors.surfaceAlt }]}>
              <View style={{ flex: share.protein, backgroundColor: colors.protein }} />
              <View style={{ flex: share.carbs, backgroundColor: colors.carbs }} />
              <View style={{ flex: share.fat, backgroundColor: colors.fat }} />
            </View>
            <Txt variant="caption" color="textSecondary">
              E {formatNumber(share.protein * 100, 0)} % · K {formatNumber(share.carbs * 100, 0)} % · F{' '}
              {formatNumber(share.fat * 100, 0)} %
            </Txt>
          </View>
        ) : null}
      </Card>

      {MEAL_ORDER.map((meal) => {
        const items = list.filter((e) => e.meal === meal);
        const kcal = items.reduce((s, e) => s + e.kcal, 0);
        return (
          <Card key={meal} padded={false}>
            <View style={styles.mealHeader}>
              <View style={[styles.mealIcon, { backgroundColor: withAlpha(colors.primary, 0.12) }]}>
                <Icon name={MEAL_ICONS[meal]} size={20} color={colors.primary} />
              </View>
              <View style={styles.flex}>
                <Txt variant="headline">{MEAL_LABELS[meal]}</Txt>
                <Txt variant="caption" color="textSecondary">
                  {items.length > 0 ? `${formatNumber(Math.round(kcal), 0)} kcal` : 'Noch nichts eingetragen'}
                </Txt>
              </View>
              <IconButton
                icon="dots-horizontal"
                size={34}
                accessibilityLabel={`${MEAL_LABELS[meal]} Optionen`}
                onPress={() => setMealMenu(meal)}
              />
              <IconButton
                icon="plus"
                size={34}
                background={colors.primary}
                color={colors.onPrimary}
                accessibilityLabel={`${MEAL_LABELS[meal]} hinzufügen`}
                onPress={() => openAdd(meal)}
              />
            </View>
            {items.map((e) => (
              <Pressable
                key={e.id}
                onPress={() => openEntry(e)}
                onLongPress={() => removeEntry(e)}
                accessibilityRole="button"
                accessibilityHint="Lange drücken zum Löschen"
                style={({ pressed }) => [
                  styles.entry,
                  { borderTopColor: colors.border, backgroundColor: pressed ? colors.surfaceAlt : 'transparent' },
                ]}
              >
                <View style={styles.flex}>
                  <Txt variant="callout" numberOfLines={1}>
                    {e.name}
                  </Txt>
                  <Txt variant="caption" color="textSecondary">
                    {e.amount != null ? `${formatNumber(e.amount, 0)} ${e.unit ?? 'g'} · ` : ''}E{' '}
                    {formatNumber(e.protein, 0)} · K {formatNumber(e.carbs, 0)} · F {formatNumber(e.fat, 0)}
                  </Txt>
                </View>
                <Txt variant="subhead" weight="700" tabular>
                  {formatNumber(Math.round(e.kcal), 0)} kcal
                </Txt>
              </Pressable>
            ))}
          </Card>
        );
      })}

      <WaterCard date={date} />

      <SelectSheet<MealAction>
        visible={!!mealMenu}
        onClose={() => setMealMenu(null)}
        title={mealMenu ? MEAL_LABELS[mealMenu] : ''}
        options={[
          { value: 'add', label: 'Lebensmittel suchen', icon: 'magnify' },
          { value: 'scan', label: 'Barcode scannen', icon: 'barcode-scan' },
          { value: 'quick', label: 'Kalorien schnell eintragen', icon: 'lightning-bolt' },
          { value: 'copy', label: 'Von gestern übernehmen', icon: 'content-copy' },
        ]}
        onSelect={(a) => mealMenu && void onMealAction(mealMenu, a)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: spacing.md },
  dateNav: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: spacing.xs },
  shareRow: { gap: spacing.xs },
  shareBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    paddingLeft: spacing.lg,
  },
  mealIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
