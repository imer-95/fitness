import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { archiveFood, getFood, saveFood } from '@/db/repos/nutrition';
import { formatNumber, parseDecimal, toInputValue } from '@/domain/format';
import { kcalFromMacros } from '@/domain/nutrition';
import type { Food, FoodUnit, Meal } from '@/domain/types';
import { toast } from '@/state/ui';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Segmented } from '@/ui/Chips';
import { confirm } from '@/ui/dialogs';
import { NumberField, TextField } from '@/ui/Fields';
import { Loading } from '@/ui/Feedback';
import { Screen } from '@/ui/Screen';
import { Txt } from '@/ui/Text';
import { spacing, useTheme } from '@/ui/theme';

interface Form {
  name: string;
  brand: string;
  barcode: string;
  unit: FoodUnit;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  sugar: string;
  salt: string;
  servingSize: string;
  servingLabel: string;
}

export default function FoodEditScreen() {
  const params = useLocalSearchParams<{ id?: string; barcode?: string; name?: string; date?: string; meal?: Meal }>();
  const { colors } = useTheme();
  const [existing, setExisting] = useState<Food | null>(null);
  const [loading, setLoading] = useState(!!params.id);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form>({
    name: params.name ?? '',
    brand: '',
    barcode: params.barcode ?? '',
    unit: 'g',
    kcal: '',
    protein: '',
    carbs: '',
    fat: '',
    fiber: '',
    sugar: '',
    salt: '',
    servingSize: '',
    servingLabel: '',
  });

  useEffect(() => {
    if (!params.id) return;
    let cancelled = false;
    void getFood(params.id).then((f) => {
      if (cancelled) return;
      if (f) {
        setExisting(f);
        setForm({
          name: f.name,
          brand: f.brand ?? '',
          barcode: f.barcode ?? '',
          unit: f.unit,
          kcal: toInputValue(f.kcal),
          protein: toInputValue(f.protein),
          carbs: toInputValue(f.carbs),
          fat: toInputValue(f.fat),
          fiber: toInputValue(f.fiber),
          sugar: toInputValue(f.sugar),
          salt: toInputValue(f.salt),
          servingSize: toInputValue(f.servingSize),
          servingLabel: f.servingLabel ?? '',
        });
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));
  const macros = {
    protein: parseDecimal(form.protein) ?? 0,
    carbs: parseDecimal(form.carbs) ?? 0,
    fat: parseDecimal(form.fat) ?? 0,
  };
  const computedKcal = Math.round(kcalFromMacros(macros));

  const save = async () => {
    const name = form.name.trim();
    const kcal = parseDecimal(form.kcal) ?? (computedKcal > 0 ? computedKcal : null);
    if (!name || kcal == null) {
      toast(name ? 'Bitte Kalorien eintragen' : 'Bitte einen Namen eingeben', { kind: 'error' });
      return;
    }
    setSaving(true);
    try {
      const food = await saveFood({
        id: existing?.id,
        name,
        brand: form.brand.trim() || null,
        barcode: form.barcode.trim() || null,
        unit: form.unit,
        kcal,
        ...macros,
        fiber: parseDecimal(form.fiber),
        sugar: parseDecimal(form.sugar),
        salt: parseDecimal(form.salt),
        servingSize: parseDecimal(form.servingSize),
        servingLabel: form.servingLabel.trim() || null,
        category: existing?.category ?? null,
        source: existing?.source ?? 'custom',
      });
      toast(existing ? 'Lebensmittel gespeichert' : 'Lebensmittel angelegt');
      if (!existing && params.date) {
        router.replace({
          pathname: '/nutrition/food',
          params: { foodId: food.id, date: params.date, meal: params.meal },
        });
      } else {
        router.back();
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    if (
      await confirm('Lebensmittel entfernen?', 'Bisherige Tagebucheinträge bleiben erhalten.', {
        confirmLabel: 'Entfernen',
        destructive: true,
      })
    ) {
      await archiveFood(existing.id);
      router.dismissAll();
    }
  };

  if (loading) return <Loading />;

  return (
    <Screen keyboard footer={<Button label="Speichern" icon="check" size="lg" full loading={saving} onPress={save} />}>
      <Stack.Screen options={{ title: existing ? 'Lebensmittel bearbeiten' : 'Eigenes Lebensmittel' }} />
      <TextField
        label="Name"
        value={form.name}
        onChangeText={(t) => set('name', t)}
        placeholder="z. B. Omas Linsensuppe"
        autoFocus={!existing && !form.name}
      />
      <TextField label="Marke (optional)" value={form.brand} onChangeText={(t) => set('brand', t)} />
      <Segmented<FoodUnit>
        options={[
          { value: 'g', label: 'Feste Nahrung (g)' },
          { value: 'ml', label: 'Getränk (ml)' },
        ]}
        value={form.unit}
        onChange={(u) => set('unit', u)}
      />
      <Card style={styles.gap}>
        <Txt variant="headline">Nährwerte pro 100 {form.unit}</Txt>
        <NumberField
          label="Energie"
          unit="kcal"
          value={form.kcal}
          onChangeText={(t) => set('kcal', t)}
          placeholder={computedKcal > 0 ? String(computedKcal) : '0'}
          hint={
            computedKcal > 0 && !form.kcal
              ? `Leer lassen = aus Makros berechnet (${formatNumber(computedKcal, 0)} kcal)`
              : undefined
          }
        />
        <View style={styles.row}>
          <NumberField
            containerStyle={styles.flex}
            label="Eiweiß"
            unit="g"
            value={form.protein}
            onChangeText={(t) => set('protein', t)}
            placeholder="0"
          />
          <NumberField
            containerStyle={styles.flex}
            label="Kohlenh."
            unit="g"
            value={form.carbs}
            onChangeText={(t) => set('carbs', t)}
            placeholder="0"
          />
          <NumberField
            containerStyle={styles.flex}
            label="Fett"
            unit="g"
            value={form.fat}
            onChangeText={(t) => set('fat', t)}
            placeholder="0"
          />
        </View>
        <View style={styles.row}>
          <NumberField
            containerStyle={styles.flex}
            label="Ballastst."
            unit="g"
            value={form.fiber}
            onChangeText={(t) => set('fiber', t)}
            placeholder="–"
          />
          <NumberField
            containerStyle={styles.flex}
            label="Zucker"
            unit="g"
            value={form.sugar}
            onChangeText={(t) => set('sugar', t)}
            placeholder="–"
          />
          <NumberField
            containerStyle={styles.flex}
            label="Salz"
            unit="g"
            value={form.salt}
            onChangeText={(t) => set('salt', t)}
            placeholder="–"
          />
        </View>
      </Card>
      <Card style={styles.gap}>
        <Txt variant="headline">Portion (optional)</Txt>
        <View style={styles.row}>
          <NumberField
            containerStyle={styles.flex}
            label="Größe"
            unit={form.unit}
            value={form.servingSize}
            onChangeText={(t) => set('servingSize', t)}
            placeholder="z. B. 30"
          />
          <TextField
            containerStyle={styles.flex}
            label="Bezeichnung"
            value={form.servingLabel}
            onChangeText={(t) => set('servingLabel', t)}
            placeholder="z. B. Riegel"
          />
        </View>
      </Card>
      <TextField
        label="Barcode (optional)"
        value={form.barcode}
        onChangeText={(t) => set('barcode', t.replace(/\D/g, ''))}
        keyboardType="number-pad"
      />
      {existing ? (
        <Button
          label="Lebensmittel entfernen"
          icon="delete-outline"
          variant="ghost"
          color={colors.danger}
          onPress={remove}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
});
