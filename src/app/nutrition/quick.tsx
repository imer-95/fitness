import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { deleteFoodEntry, getFoodEntry, saveFoodEntry } from '@/db/repos/nutrition';
import { todayKey } from '@/domain/dates';
import { parseDecimal, toInputValue } from '@/domain/format';
import { MEAL_LABELS, MEAL_ORDER, mealForHour } from '@/domain/labels';
import { kcalFromMacros } from '@/domain/nutrition';
import type { FoodEntry, Meal } from '@/domain/types';
import { haptics } from '@/services/haptics';
import { toast } from '@/state/ui';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip, ChipRow } from '@/ui/Chips';
import { confirm } from '@/ui/dialogs';
import { NumberField, TextField } from '@/ui/Fields';
import { Screen } from '@/ui/Screen';
import { Txt } from '@/ui/Text';
import { spacing, useTheme } from '@/ui/theme';

export default function QuickAddScreen() {
  const params = useLocalSearchParams<{ date?: string; meal?: Meal; entryId?: string }>();
  const { colors } = useTheme();
  const [entry, setEntry] = useState<FoodEntry | null>(null);
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [meal, setMeal] = useState<Meal>(params.meal ?? mealForHour(new Date().getHours()));

  useEffect(() => {
    if (!params.entryId) return;
    let cancelled = false;
    void getFoodEntry(params.entryId).then((e) => {
      if (cancelled || !e) return;
      setEntry(e);
      setName(e.name);
      setKcal(toInputValue(e.kcal, 0));
      setProtein(e.protein ? toInputValue(e.protein, 1) : '');
      setCarbs(e.carbs ? toInputValue(e.carbs, 1) : '');
      setFat(e.fat ? toInputValue(e.fat, 1) : '');
      setMeal(e.meal);
    });
    return () => {
      cancelled = true;
    };
  }, [params.entryId]);

  const macros = { protein: parseDecimal(protein) ?? 0, carbs: parseDecimal(carbs) ?? 0, fat: parseDecimal(fat) ?? 0 };
  const computed = Math.round(kcalFromMacros(macros));

  const save = async () => {
    const value = parseDecimal(kcal) ?? (computed > 0 ? computed : null);
    if (value == null || value <= 0) {
      toast('Bitte Kalorien eintragen', { kind: 'error' });
      return;
    }
    await saveFoodEntry({
      id: entry?.id,
      date: entry?.date ?? params.date ?? todayKey(),
      meal,
      foodId: null,
      name: name.trim() || 'Schnelleintrag',
      amount: null,
      unit: null,
      kcal: value,
      ...macros,
    });
    haptics.success();
    toast('Eingetragen', { message: `${Math.round(value)} kcal · ${MEAL_LABELS[meal]}` });
    if (entry) router.back();
    else router.dismissAll();
  };

  const remove = async () => {
    if (!entry) return;
    if (await confirm('Eintrag löschen?', entry.name, { confirmLabel: 'Löschen', destructive: true })) {
      await deleteFoodEntry(entry.id);
      router.back();
    }
  };

  return (
    <Screen keyboard footer={<Button label="Speichern" icon="check" size="lg" full onPress={save} />}>
      <Stack.Screen options={{ title: entry ? 'Eintrag bearbeiten' : 'Schnell eintragen' }} />
      <Txt variant="callout" color="textSecondary">
        Für Restaurantbesuche oder wenn du nur die Kalorien kennst.
      </Txt>
      <TextField label="Bezeichnung" value={name} onChangeText={setName} placeholder="z. B. Döner, Kantine, Kuchen" />
      <NumberField
        label="Kalorien"
        unit="kcal"
        large
        decimal={false}
        value={kcal}
        onChangeText={setKcal}
        placeholder={computed > 0 ? String(computed) : '0'}
        autoFocus={!params.entryId}
      />
      <Card style={styles.gap}>
        <Txt variant="headline">Makros (optional)</Txt>
        <View style={styles.row}>
          <NumberField
            containerStyle={styles.flex}
            label="Eiweiß"
            unit="g"
            value={protein}
            onChangeText={setProtein}
            placeholder="0"
          />
          <NumberField
            containerStyle={styles.flex}
            label="Kohlenh."
            unit="g"
            value={carbs}
            onChangeText={setCarbs}
            placeholder="0"
          />
          <NumberField
            containerStyle={styles.flex}
            label="Fett"
            unit="g"
            value={fat}
            onChangeText={setFat}
            placeholder="0"
          />
        </View>
      </Card>
      <ChipRow>
        {MEAL_ORDER.map((m) => (
          <Chip key={m} label={MEAL_LABELS[m]} selected={meal === m} onPress={() => setMeal(m)} />
        ))}
      </ChipRow>
      {entry ? (
        <Button label="Eintrag löschen" icon="delete-outline" variant="ghost" color={colors.danger} onPress={remove} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
});
