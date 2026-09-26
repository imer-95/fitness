import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { deleteFoodEntry, getFood, getFoodEntry, saveFoodEntry, setFoodFavorite } from '@/db/repos/nutrition';
import { todayKey } from '@/domain/dates';
import { formatNumber, parseDecimal, toInputValue } from '@/domain/format';
import { MEAL_LABELS, MEAL_ORDER, mealForHour } from '@/domain/labels';
import { nutrientsFor } from '@/domain/nutrition';
import type { Food, FoodEntry, Meal } from '@/domain/types';
import { haptics } from '@/services/haptics';
import { toast } from '@/state/ui';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip, ChipRow, ChipWrap } from '@/ui/Chips';
import { confirm } from '@/ui/dialogs';
import { NumberField } from '@/ui/Fields';
import { EmptyState, Loading, StatGrid, StatTile } from '@/ui/Feedback';
import { Screen } from '@/ui/Screen';
import { Txt } from '@/ui/Text';
import { spacing, useTheme } from '@/ui/theme';

const QUICK_AMOUNTS = [50, 100, 150, 200, 250];

export default function FoodAmountScreen() {
  const params = useLocalSearchParams<{ foodId?: string; entryId?: string; date?: string; meal?: Meal }>();
  const { colors } = useTheme();
  const [food, setFood] = useState<Food | null>(null);
  const [entry, setEntry] = useState<FoodEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [meal, setMeal] = useState<Meal>(params.meal ?? mealForHour(new Date().getHours()));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let foodId = params.foodId ?? null;
      if (params.entryId) {
        const e = await getFoodEntry(params.entryId);
        if (!cancelled && e) {
          setEntry(e);
          setMeal(e.meal);
          setAmount(toInputValue(e.amount));
          foodId = e.foodId;
        }
      }
      const f = foodId ? await getFood(foodId) : null;
      if (cancelled) return;
      setFood(f);
      if (!params.entryId && f) setAmount(toInputValue(f.servingSize ?? 100));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [params.foodId, params.entryId]);

  if (loading) return <Loading />;
  if (!food) {
    return (
      <Screen>
        <EmptyState icon="food-off" title="Lebensmittel nicht gefunden" />
      </Screen>
    );
  }

  const grams = parseDecimal(amount) ?? 0;
  const values = nutrientsFor(food, grams);
  const unit = food.unit;

  const save = async () => {
    if (grams <= 0) {
      toast('Bitte eine Menge eintragen', { kind: 'error' });
      return;
    }
    setSaving(true);
    try {
      await saveFoodEntry({
        id: entry?.id,
        date: entry?.date ?? params.date ?? todayKey(),
        meal,
        foodId: food.id,
        name: food.brand ? `${food.name} (${food.brand})` : food.name,
        amount: grams,
        unit,
        ...values,
      });
      haptics.success();
      toast(entry ? 'Eintrag aktualisiert' : `${food.name} hinzugefügt`, {
        message: `${formatNumber(values.kcal, 0)} kcal · ${MEAL_LABELS[meal]}`,
      });
      if (entry) router.back();
      else router.dismissAll();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!entry) return;
    if (await confirm('Eintrag löschen?', entry.name, { confirmLabel: 'Löschen', destructive: true })) {
      await deleteFoodEntry(entry.id);
      router.back();
    }
  };

  const toggleFavorite = async () => {
    await setFoodFavorite(food.id, !food.favorite);
    setFood({ ...food, favorite: !food.favorite });
    haptics.selection();
  };

  return (
    <Screen
      keyboard
      footer={
        <Button
          label={entry ? 'Speichern' : 'Hinzufügen'}
          icon="check"
          size="lg"
          full
          loading={saving}
          onPress={save}
        />
      }
    >
      <Stack.Screen
        options={{
          title: entry ? 'Eintrag bearbeiten' : 'Menge',
          headerRight: () => (
            <IconButton
              icon={food.favorite ? 'star' : 'star-outline'}
              color={food.favorite ? colors.gold : colors.textSecondary}
              size={34}
              accessibilityLabel={food.favorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
              onPress={toggleFavorite}
            />
          ),
        }}
      />
      <View style={styles.header}>
        <Txt variant="title2">{food.name}</Txt>
        {food.brand ? (
          <Txt variant="subhead" color="textSecondary">
            {food.brand}
          </Txt>
        ) : null}
        <Txt variant="footnote" color="textTertiary">
          pro 100 {unit}: {formatNumber(food.kcal, 0)} kcal · E {formatNumber(food.protein, 1)} g · K{' '}
          {formatNumber(food.carbs, 1)} g · F {formatNumber(food.fat, 1)} g
        </Txt>
      </View>

      <Card style={styles.gap}>
        <NumberField
          value={amount}
          onChangeText={setAmount}
          unit={unit}
          large
          step={unit === 'ml' ? 50 : 10}
          min={0}
          autoFocus={!entry}
          accessibilityLabel="Menge"
        />
        <ChipWrap>
          {food.servingSize ? (
            <>
              <Chip
                label={`1 × ${food.servingLabel ?? 'Portion'} (${formatNumber(food.servingSize, 0)} ${unit})`}
                selected={grams === food.servingSize}
                onPress={() => setAmount(toInputValue(food.servingSize))}
                small
              />
              <Chip
                label="2 ×"
                selected={grams === food.servingSize * 2}
                onPress={() => setAmount(toInputValue(food.servingSize! * 2))}
                small
              />
            </>
          ) : null}
          {QUICK_AMOUNTS.map((a) => (
            <Chip key={a} label={`${a} ${unit}`} selected={grams === a} onPress={() => setAmount(String(a))} small />
          ))}
        </ChipWrap>
      </Card>

      <Card style={styles.gap}>
        <View style={styles.kcalRow}>
          <Txt variant="numberLarge" color="primary" tabular>
            {formatNumber(values.kcal, 0)}
          </Txt>
          <Txt variant="headline" color="textSecondary">
            kcal
          </Txt>
        </View>
        <StatGrid>
          <StatTile
            third
            label="Eiweiß"
            value={formatNumber(values.protein, 1)}
            unit="g"
            color={colors.protein}
            icon="food-drumstick"
          />
          <StatTile
            third
            label="Kohlenh."
            value={formatNumber(values.carbs, 1)}
            unit="g"
            color={colors.carbs}
            icon="bread-slice"
          />
          <StatTile third label="Fett" value={formatNumber(values.fat, 1)} unit="g" color={colors.fat} icon="water" />
        </StatGrid>
      </Card>

      <Txt variant="subhead" color="textSecondary">
        Mahlzeit
      </Txt>
      <ChipRow>
        {MEAL_ORDER.map((m) => (
          <Chip key={m} label={MEAL_LABELS[m]} selected={meal === m} onPress={() => setMeal(m)} />
        ))}
      </ChipRow>

      {food.source !== 'builtin' ? (
        <Button
          label="Lebensmittel bearbeiten"
          icon="pencil-outline"
          variant="ghost"
          onPress={() => router.push({ pathname: '/nutrition/food-edit', params: { id: food.id } })}
        />
      ) : null}
      {entry ? (
        <Button label="Eintrag löschen" icon="delete-outline" variant="ghost" color={colors.danger} onPress={remove} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  gap: { gap: spacing.md },
  kcalRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, justifyContent: 'center' },
});
