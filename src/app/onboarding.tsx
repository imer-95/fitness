import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoalFields, PersonalFields, type ProfileFormValues } from '@/components/ProfileForm';
import { upsertWeight } from '@/db/repos/body';
import { todayKey } from '@/domain/dates';
import { formatNumber, parseDecimal, parseInteger } from '@/domain/format';
import { computeNutritionGoals, recommendedWaterMl } from '@/domain/nutrition';
import type { Profile } from '@/domain/types';
import { useSettings } from '@/state/settings';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { NumberField } from '@/ui/Fields';
import { StatGrid, StatTile } from '@/ui/Feedback';
import { Icon, type IconName } from '@/ui/Icon';
import { Txt } from '@/ui/Text';
import { radius, spacing, useTheme, withAlpha } from '@/ui/theme';

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'dumbbell',
    title: 'Krafttraining',
    text: 'Sätze, Gewichte & Pausen-Timer – mit deinen Werten vom letzten Mal.',
  },
  { icon: 'scale-bathroom', title: 'Körpergewicht', text: 'Tägliches Wiegen mit Trendlinie und Ziel-Prognose.' },
  { icon: 'run', title: 'Cardio', text: 'Laufen, Rad, Crosstrainer & mehr mit Kalorienschätzung.' },
  { icon: 'food-apple', title: 'Ernährung', text: 'Kalorien, Makros, Wasser – mit Barcode-Scanner.' },
  {
    icon: 'clipboard-text-outline',
    title: 'Notizen-Import',
    text: 'Deine bisherigen Trainingsnotizen einfach übernehmen.',
  },
];

const STEPS = 4;

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<ProfileFormValues>({
    name: '',
    sex: null,
    birthYear: '',
    heightCm: '',
    activity: 'moderate',
    goal: 'gain',
  });
  const [weight, setWeight] = useState('');
  const [target, setTarget] = useState('');
  const [workouts, setWorkouts] = useState('3');
  const [saving, setSaving] = useState(false);
  // Opened again (e.g. via browser history) although the setup is done.
  const [alreadyOnboarded] = useState(() => useSettings.getState().onboarded);

  const profile: Profile = {
    name: values.name.trim(),
    sex: values.sex,
    birthYear: parseInteger(values.birthYear),
    heightCm: parseInteger(values.heightCm),
    activity: values.activity,
    goal: values.goal,
  };
  const weightKg = parseDecimal(weight);
  const goals = computeNutritionGoals(profile, weightKg);

  const finish = async (openImport: boolean) => {
    setSaving(true);
    try {
      const s = useSettings.getState();
      await s.setProfile(profile);
      if (weightKg && weightKg > 20 && weightKg < 400) await upsertWeight(todayKey(), weightKg);
      await s.setGoals({
        targetWeight: parseDecimal(target),
        waterMl: recommendedWaterMl(weightKg),
        workoutsPerWeek: Math.max(1, Math.min(14, parseInteger(workouts) ?? 3)),
      });
      await s.setNutritionGoals({ auto: true });
      await s.completeOnboarding();
      router.replace('/');
      if (openImport) router.push('/workout/import');
    } finally {
      setSaving(false);
    }
  };

  const skip = async () => {
    await useSettings.getState().completeOnboarding();
    router.replace('/');
  };

  if (alreadyOnboarded) return <Redirect href="/" />;

  if (step === 0) {
    return (
      <LinearGradient colors={[colors.primary, '#FF8A3D']} style={styles.flex}>
        <ScrollView
          contentContainerStyle={[
            styles.welcome,
            { paddingTop: insets.top + spacing.xxxl, paddingBottom: insets.bottom + spacing.xl },
          ]}
        >
          <View style={styles.logo}>
            <Icon name="chart-timeline-variant" size={46} color={colors.primary} />
          </View>
          <Txt variant="display" color="#FFFFFF">
            Formkurve
          </Txt>
          <Txt variant="title3" color="#FFFFFF" style={styles.claim}>
            Dein Training, dein Gewicht, deine Ernährung – alles an einem Ort.
          </Txt>
          <View style={styles.features}>
            {FEATURES.map((f) => (
              <View key={f.title} style={styles.feature}>
                <View style={styles.featureIcon}>
                  <Icon name={f.icon} size={22} color="#FFFFFF" />
                </View>
                <View style={styles.flex}>
                  <Txt variant="headline" color="#FFFFFF">
                    {f.title}
                  </Txt>
                  <Txt variant="footnote" color="rgba(255,255,255,0.85)">
                    {f.text}
                  </Txt>
                </View>
              </View>
            ))}
          </View>
          <Button
            label="Los geht's"
            iconRight="arrow-right"
            size="lg"
            full
            color="#FFFFFF"
            textColor={colors.primary}
            style={styles.whiteButton}
            onPress={() => setStep(1)}
          />
          <Button label="Überspringen" variant="ghost" color="#FFFFFF" onPress={skip} />
          <Txt
            variant="caption"
            color="rgba(255,255,255,0.85)"
            align="center"
            accessibilityRole="link"
            onPress={() => router.push('/legal/datenschutz')}
          >
            Deine Daten bleiben auf deinem Gerät · Datenschutzerklärung
          </Txt>
        </ScrollView>
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <IconButton icon="arrow-left" accessibilityLabel="Zurück" onPress={() => setStep(step - 1)} />
        <View style={styles.dots}>
          {Array.from({ length: STEPS - 1 }, (_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i < step ? colors.primary : colors.surfaceHigh }]} />
          ))}
        </View>
        <Button label="Später" variant="ghost" size="sm" onPress={skip} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 ? (
          <>
            <Txt variant="title1">Erzähl uns von dir</Txt>
            <Txt variant="callout" color="textSecondary">
              Damit berechnen wir deinen Kalorienbedarf. Alles bleibt auf deinem Gerät.
            </Txt>
            <Card>
              <PersonalFields values={values} onChange={(p) => setValues((v) => ({ ...v, ...p }))} />
            </Card>
            <Button label="Weiter" iconRight="arrow-right" size="lg" full onPress={() => setStep(2)} />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Txt variant="title1">Gewicht & Ziel</Txt>
            <Card style={styles.gap}>
              <View style={styles.row}>
                <NumberField
                  containerStyle={styles.flex}
                  label="Aktuelles Gewicht"
                  unit="kg"
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="z. B. 82,5"
                />
                <NumberField
                  containerStyle={styles.flex}
                  label="Zielgewicht"
                  unit="kg"
                  value={target}
                  onChangeText={setTarget}
                  placeholder="optional"
                />
              </View>
            </Card>
            <Card>
              <GoalFields values={values} onChange={(p) => setValues((v) => ({ ...v, ...p }))} />
            </Card>
            <Button label="Weiter" iconRight="arrow-right" size="lg" full onPress={() => setStep(3)} />
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Txt variant="title1">{profile.name ? `Fast geschafft, ${profile.name}!` : 'Fast geschafft!'}</Txt>
            {goals ? (
              <Card tint={withAlpha(colors.primary, 0.1)} style={styles.gap}>
                <Txt variant="overline" color="primary">
                  Dein Tagesbedarf
                </Txt>
                <Txt variant="numberLarge" color="primary" tabular>
                  {formatNumber(goals.kcal, 0)} kcal
                </Txt>
                <StatGrid>
                  <StatTile third label="Eiweiß" value={String(goals.protein)} unit="g" color={colors.protein} />
                  <StatTile third label="Kohlenh." value={String(goals.carbs)} unit="g" color={colors.carbs} />
                  <StatTile third label="Fett" value={String(goals.fat)} unit="g" color={colors.fat} />
                </StatGrid>
                <Txt variant="caption" color="textSecondary">
                  Berechnet nach Mifflin-St Jeor mit deinem Aktivitätslevel. Du kannst die Werte jederzeit im Profil
                  anpassen.
                </Txt>
              </Card>
            ) : (
              <Card>
                <Txt variant="callout" color="textSecondary">
                  Ohne Größe, Geburtsjahr und Gewicht nutzen wir Standardwerte. Du kannst sie später im Profil ergänzen.
                </Txt>
              </Card>
            )}
            <Card style={styles.gap}>
              <NumberField
                label="Wie oft willst du pro Woche trainieren?"
                decimal={false}
                value={workouts}
                onChangeText={setWorkouts}
                step={1}
                min={1}
                max={14}
              />
            </Card>
            <Card tint={withAlpha(colors.weight, 0.1)} style={styles.gap}>
              <View style={styles.row}>
                <Icon name="clipboard-text-outline" size={22} color={colors.weight} />
                <Txt variant="headline" style={styles.flex}>
                  Trainingsnotizen übernehmen?
                </Txt>
              </View>
              <Txt variant="footnote" color="textSecondary">
                Wenn du bisher in der Notizen-App mitgeschrieben hast („10x40kg inkl. Stange, 120sek Pause …“), kannst
                du alles direkt importieren.
              </Txt>
              <Button
                label="Fertig & Notizen importieren"
                icon="clipboard-text-outline"
                variant="tinted"
                color={colors.weight}
                loading={saving}
                onPress={() => finish(true)}
              />
            </Card>
            <Button label="Fertig" icon="check" size="lg" full loading={saving} onPress={() => finish(false)} />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  welcome: { paddingHorizontal: spacing.xl, gap: spacing.lg, flexGrow: 1 },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  claim: { opacity: 0.95 },
  features: { gap: spacing.md, marginVertical: spacing.md },
  feature: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whiteButton: { marginTop: spacing.md },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  dots: { flex: 1, flexDirection: 'row', gap: spacing.xs, justifyContent: 'center' },
  dot: { width: 34, height: 5, borderRadius: 3 },
  content: { padding: spacing.lg, gap: spacing.lg },
});
