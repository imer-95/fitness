import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { GoalFields, PersonalFields, type ProfileFormValues } from '@/components/ProfileForm';
import { getLatestWeight } from '@/db/repos/body';
import { useQuery } from '@/db/useQuery';
import { formatNumber, parseDecimal, parseInteger, toInputValue } from '@/domain/format';
import { computeNutritionGoals, macroTargets, recommendedWaterMl } from '@/domain/nutrition';
import type { Profile } from '@/domain/types';
import { useSettings } from '@/state/settings';
import { toast } from '@/state/ui';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { NumberField } from '@/ui/Fields';
import { Screen } from '@/ui/Screen';
import { Txt } from '@/ui/Text';
import { Toggle } from '@/ui/Toggle';
import { spacing } from '@/ui/theme';

export default function ProfileSettingsScreen() {
  const settings = useSettings();
  const latest = useQuery(() => getLatestWeight(), [], ['weights']);
  const [values, setValues] = useState<ProfileFormValues>({
    name: settings.profile.name,
    sex: settings.profile.sex,
    birthYear: settings.profile.birthYear ? String(settings.profile.birthYear) : '',
    heightCm: settings.profile.heightCm ? String(settings.profile.heightCm) : '',
    activity: settings.profile.activity,
    goal: settings.profile.goal,
  });
  const [targetWeight, setTargetWeight] = useState(toInputValue(settings.goals.targetWeight));
  const [auto, setAuto] = useState(settings.goals.nutrition.auto);
  const [kcal, setKcal] = useState(String(settings.goals.nutrition.kcal));
  const [protein, setProtein] = useState(String(settings.goals.nutrition.protein));
  const [carbs, setCarbs] = useState(String(settings.goals.nutrition.carbs));
  const [fat, setFat] = useState(String(settings.goals.nutrition.fat));
  const [water, setWater] = useState(String(settings.goals.waterMl));
  const [workouts, setWorkouts] = useState(String(settings.goals.workoutsPerWeek));
  const [saving, setSaving] = useState(false);

  const profile: Profile = {
    name: values.name.trim(),
    sex: values.sex,
    birthYear: parseInteger(values.birthYear),
    heightCm: parseInteger(values.heightCm),
    activity: values.activity,
    goal: values.goal,
  };
  const weight = latest.data?.weight ?? null;
  const computed = computeNutritionGoals(profile, weight);

  const fillMacros = () => {
    const k = parseInteger(kcal);
    if (!k || !weight) return;
    const m = macroTargets(k, weight, values.goal);
    setProtein(String(m.protein));
    setCarbs(String(m.carbs));
    setFat(String(m.fat));
  };

  const save = async () => {
    setSaving(true);
    try {
      const s = useSettings.getState();
      await s.setProfile(profile);
      await s.setGoals({
        targetWeight: parseDecimal(targetWeight),
        waterMl: Math.max(500, parseInteger(water) ?? 2500),
        workoutsPerWeek: Math.min(14, Math.max(1, parseInteger(workouts) ?? 3)),
      });
      if (auto) {
        await s.setNutritionGoals({ auto: true });
      } else {
        await s.setNutritionGoals({
          auto: false,
          kcal: parseInteger(kcal) ?? s.goals.nutrition.kcal,
          protein: parseInteger(protein) ?? s.goals.nutrition.protein,
          carbs: parseInteger(carbs) ?? s.goals.nutrition.carbs,
          fat: parseInteger(fat) ?? s.goals.nutrition.fat,
        });
      }
      toast('Profil gespeichert');
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen keyboard footer={<Button label="Speichern" icon="check" size="lg" full loading={saving} onPress={save} />}>
      <Card>
        <PersonalFields values={values} onChange={(p) => setValues((v) => ({ ...v, ...p }))} />
      </Card>
      <Card style={styles.gap}>
        <GoalFields values={values} onChange={(p) => setValues((v) => ({ ...v, ...p }))} />
        <NumberField
          label="Zielgewicht"
          unit="kg"
          value={targetWeight}
          onChangeText={setTargetWeight}
          placeholder="optional"
          step={0.5}
          hint={weight ? `Aktuell ${formatNumber(weight, 1)} kg` : undefined}
        />
      </Card>

      <Card style={styles.gap}>
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <Txt variant="headline">Kalorien & Makros automatisch</Txt>
            <Txt variant="caption" color="textSecondary">
              Aus Größe, Alter, Gewicht, Aktivität und Ziel (Mifflin-St Jeor). Passt sich an, wenn sich dein Gewicht
              ändert.
            </Txt>
          </View>
          <Toggle value={auto} onValueChange={setAuto} />
        </View>
        {auto ? (
          computed ? (
            <View style={styles.computed}>
              <Txt variant="title2" color="primary" tabular>
                {formatNumber(computed.kcal, 0)} kcal
              </Txt>
              <Txt variant="footnote" color="textSecondary">
                Eiweiß {computed.protein} g · Kohlenhydrate {computed.carbs} g · Fett {computed.fat} g
              </Txt>
            </View>
          ) : (
            <Txt variant="footnote" color="warning">
              Für die Berechnung fehlen noch Geburtsjahr, Größe oder ein Gewichtseintrag.
            </Txt>
          )
        ) : (
          <>
            <NumberField
              label="Kalorien pro Tag"
              unit="kcal"
              decimal={false}
              value={kcal}
              onChangeText={setKcal}
              step={50}
            />
            <View style={styles.row}>
              <NumberField
                containerStyle={styles.flex}
                label="Eiweiß"
                unit="g"
                decimal={false}
                value={protein}
                onChangeText={setProtein}
              />
              <NumberField
                containerStyle={styles.flex}
                label="Kohlenh."
                unit="g"
                decimal={false}
                value={carbs}
                onChangeText={setCarbs}
              />
              <NumberField
                containerStyle={styles.flex}
                label="Fett"
                unit="g"
                decimal={false}
                value={fat}
                onChangeText={setFat}
              />
            </View>
            {weight ? (
              <Button
                label="Makros aus Kalorien berechnen"
                icon="calculator-variant"
                variant="secondary"
                size="sm"
                onPress={fillMacros}
              />
            ) : null}
          </>
        )}
      </Card>

      <Card style={styles.gap}>
        <NumberField
          label="Wasser pro Tag"
          unit="ml"
          decimal={false}
          value={water}
          onChangeText={setWater}
          step={250}
          min={500}
          hint={`Empfehlung für dein Gewicht: ca. ${formatNumber(recommendedWaterMl(weight), 0)} ml`}
        />
        <NumberField
          label="Trainings pro Woche (Ziel)"
          decimal={false}
          value={workouts}
          onChangeText={setWorkouts}
          step={1}
          min={1}
          max={14}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  computed: { gap: spacing.xs },
});
