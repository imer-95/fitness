import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { ProProfileCard } from '@/components/pro/ProComponents';
import { getLatestWeight } from '@/db/repos/body';
import { useQuery } from '@/db/useQuery';
import { bmi, bmiCategory } from '@/domain/body';
import { ageFromBirthYear, formatRest, pad2 } from '@/domain/dates';
import { formatMl, formatNumber } from '@/domain/format';
import { GOAL_LABELS } from '@/domain/labels';
import type { ThemePreference } from '@/domain/types';
import { applyWeightReminder } from '@/services/notifications';
import { useSettings } from '@/state/settings';
import { toast } from '@/state/ui';
import { Card } from '@/ui/Card';
import { Segmented } from '@/ui/Chips';
import { TimeField } from '@/ui/DatePicker';
import { notify } from '@/ui/dialogs';
import { ListGroup, ListRow, Section } from '@/ui/List';
import { LargeHeader, Screen } from '@/ui/Screen';
import { BottomSheet, SelectSheet } from '@/ui/Sheet';
import { Txt } from '@/ui/Text';
import { Toggle } from '@/ui/Toggle';
import { radius, spacing, useTheme } from '@/ui/theme';

const REST_OPTIONS = [45, 60, 75, 90, 120, 150, 180];
const STEP_OPTIONS = [0.5, 1, 1.25, 2.5, 5];

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { profile, goals, prefs, setPrefs } = useSettings();
  const latest = useQuery(() => getLatestWeight(), [], ['weights']);
  const [sheet, setSheet] = useState<'rest' | 'step' | 'reminder' | null>(null);
  const weight = latest.data?.weight ?? null;
  const bmiValue = bmi(weight, profile.heightCm);
  const initials = (profile.name || 'F').trim().charAt(0).toUpperCase();

  const setReminder = async (
    enabled: boolean,
    hour = prefs.weightReminder.hour,
    minute = prefs.weightReminder.minute,
  ) => {
    const setting = { enabled, hour, minute };
    const ok = await applyWeightReminder(setting);
    if (enabled && !ok) {
      await notify(
        'Benachrichtigungen nicht erlaubt',
        Platform.OS === 'web'
          ? 'Erinnerungen sind in der Web-Vorschau nicht verfügbar.'
          : 'Bitte erlaube Benachrichtigungen für Formkurve in den Systemeinstellungen.',
      );
      await setPrefs({ weightReminder: { ...setting, enabled: false } });
      return;
    }
    await setPrefs({ weightReminder: setting });
    if (enabled) toast(`Erinnerung täglich um ${pad2(hour)}:${pad2(minute)} Uhr`);
  };

  const summary = [
    profile.birthYear ? `${ageFromBirthYear(profile.birthYear)} Jahre` : null,
    profile.heightCm ? `${profile.heightCm} cm` : null,
    weight ? `${formatNumber(weight, 1)} kg` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Screen safeTop>
      <LargeHeader title="Profil" />
      <Card onPress={() => router.push('/settings/profile')} accessibilityLabel="Profil bearbeiten">
        <View style={styles.profileRow}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Txt variant="title2" color="onPrimary">
              {initials}
            </Txt>
          </View>
          <View style={styles.flex}>
            <Txt variant="title3">{profile.name || 'Dein Profil'}</Txt>
            <Txt variant="footnote" color="textSecondary">
              {summary || 'Tippe, um Größe, Alter und Ziele einzutragen'}
            </Txt>
            <Txt variant="footnote" color="primary" weight="600">
              Ziel: {GOAL_LABELS[profile.goal]}
              {bmiValue ? ` · BMI ${formatNumber(bmiValue, 1)} (${bmiCategory(bmiValue)})` : ''}
            </Txt>
          </View>
        </View>
      </Card>

      <ProProfileCard />

      <Section title="Ziele">
        <ListGroup>
          <ListRow
            icon="flag-checkered"
            iconColor={colors.success}
            title="Zielgewicht"
            value={goals.targetWeight != null ? `${formatNumber(goals.targetWeight, 1)} kg` : 'nicht gesetzt'}
            onPress={() => router.push('/settings/profile')}
          />
          <ListRow
            icon="fire"
            title="Kalorien & Makros"
            subtitle={`E ${goals.nutrition.protein} g · K ${goals.nutrition.carbs} g · F ${goals.nutrition.fat} g${goals.nutrition.auto ? ' · automatisch' : ''}`}
            value={`${formatNumber(goals.nutrition.kcal, 0)} kcal`}
            onPress={() => router.push('/settings/profile')}
          />
          <ListRow
            icon="cup-water"
            iconColor={colors.water}
            title="Wasser"
            value={formatMl(goals.waterMl)}
            onPress={() => router.push('/settings/profile')}
          />
          <ListRow
            icon="calendar-check"
            iconColor={colors.strength}
            title="Trainings pro Woche"
            value={String(goals.workoutsPerWeek)}
            onPress={() => router.push('/settings/profile')}
          />
        </ListGroup>
      </Section>

      <Section title="Körper">
        <ListGroup>
          <ListRow
            icon="scale-bathroom"
            iconColor={colors.weight}
            title="Gewichtsverlauf"
            onPress={() => router.push('/body/weight')}
          />
          <ListRow
            icon="tape-measure"
            iconColor={colors.weight}
            title="Körpermaße"
            onPress={() => router.push('/body/measurements')}
          />
        </ListGroup>
      </Section>

      <Section title="Training">
        <ListGroup>
          <ListRow icon="book-open-variant" title="Übungsbibliothek" onPress={() => router.push('/exercises')} />
          <ListRow
            icon="timer-outline"
            title="Standard-Pausenzeit"
            value={formatRest(prefs.defaultRestSec)}
            onPress={() => setSheet('rest')}
          />
          <ListRow
            icon="plus-minus"
            title="Gewichtsschritte"
            subtitle="Für Steigerungs-Tipps"
            value={`${formatNumber(prefs.weightStep, 2)} kg`}
            onPress={() => setSheet('step')}
          />
          <ListRow
            icon="cellphone"
            title="Bildschirm aktiv halten"
            subtitle="Während eines Trainings"
            right={<Toggle value={prefs.keepAwake} onValueChange={(v) => setPrefs({ keepAwake: v })} />}
          />
          <ListRow
            icon="vibrate"
            title="Vibration bei Pausenende"
            right={<Toggle value={prefs.restVibration} onValueChange={(v) => setPrefs({ restVibration: v })} />}
          />
          <ListRow
            icon="bell-ring-outline"
            title="Mitteilung bei Pausenende"
            subtitle="Auch wenn das Handy gesperrt ist"
            right={<Toggle value={prefs.restNotification} onValueChange={(v) => setPrefs({ restNotification: v })} />}
          />
        </ListGroup>
      </Section>

      <Section title="Erinnerungen">
        <ListGroup>
          <ListRow
            icon="bell-outline"
            iconColor={colors.weight}
            title="Täglich wiegen"
            subtitle={
              prefs.weightReminder.enabled
                ? `Um ${pad2(prefs.weightReminder.hour)}:${pad2(prefs.weightReminder.minute)} Uhr · Tippen zum Ändern`
                : 'Morgens an das Wiegen erinnern'
            }
            onPress={prefs.weightReminder.enabled ? () => setSheet('reminder') : undefined}
            chevron={false}
            right={<Toggle value={prefs.weightReminder.enabled} onValueChange={(v) => void setReminder(v)} />}
          />
        </ListGroup>
      </Section>

      <Section title="Werkzeuge">
        <ListGroup>
          <ListRow
            icon="calculator-variant"
            iconColor={colors.protein}
            title="1RM-Rechner"
            subtitle="Maximalkraft & Trainingsgewichte"
            onPress={() => router.push('/tools/one-rep-max')}
          />
          <ListRow
            icon="weight"
            iconColor={colors.protein}
            title="Scheibenrechner"
            subtitle="Welche Scheiben auf die Stange?"
            onPress={() => router.push('/tools/plates')}
          />
        </ListGroup>
      </Section>

      <Section title="Darstellung">
        <Segmented<ThemePreference>
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Hell' },
            { value: 'dark', label: 'Dunkel' },
          ]}
          value={prefs.theme}
          onChange={(theme) => setPrefs({ theme })}
        />
      </Section>

      <Section title="Daten">
        <ListGroup>
          <ListRow
            icon="clipboard-text-outline"
            iconColor={colors.weight}
            title="Aus Notizen importieren"
            onPress={() => router.push('/workout/import')}
          />
          <ListRow
            icon="database-export"
            title="Backup, Export & Wiederherstellung"
            onPress={() => router.push('/settings/data')}
          />
        </ListGroup>
      </Section>

      <Section title="Rechtliches">
        <ListGroup>
          <ListRow
            icon="shield-lock-outline"
            iconColor={colors.textSecondary}
            title="Datenschutzerklärung"
            onPress={() => router.push('/legal/datenschutz')}
          />
          <ListRow
            icon="file-document-outline"
            iconColor={colors.textSecondary}
            title="Nutzungsbedingungen"
            onPress={() => router.push('/legal/nutzungsbedingungen')}
          />
          <ListRow
            icon="card-account-details-outline"
            iconColor={colors.textSecondary}
            title="Impressum"
            onPress={() => router.push('/legal/impressum')}
          />
        </ListGroup>
      </Section>

      <View style={styles.about}>
        <Txt variant="footnote" color="textTertiary" align="center">
          Formkurve {Constants.expoConfig?.version ?? '1.0.0'} · Alle Daten bleiben auf deinem Gerät.
        </Txt>
        <Txt
          variant="footnote"
          color="textTertiary"
          align="center"
          onPress={() => void Linking.openURL('https://world.openfoodfacts.org')}
        >
          Produktdaten: Open Food Facts (ODbL)
        </Txt>
      </View>

      <SelectSheet<number>
        visible={sheet === 'rest'}
        onClose={() => setSheet(null)}
        title="Standard-Pausenzeit"
        value={prefs.defaultRestSec}
        options={REST_OPTIONS.map((s) => ({
          value: s,
          label: formatRest(s),
          description: s === 90 ? 'Empfohlen für Muskelaufbau' : undefined,
        }))}
        onSelect={(s) => setPrefs({ defaultRestSec: s })}
      />
      <SelectSheet<number>
        visible={sheet === 'step'}
        onClose={() => setSheet(null)}
        title="Gewichtsschritte"
        value={prefs.weightStep}
        options={STEP_OPTIONS.map((s) => ({ value: s, label: `${formatNumber(s, 2)} kg` }))}
        onSelect={(s) => setPrefs({ weightStep: s })}
      />
      <BottomSheet visible={sheet === 'reminder'} onClose={() => setSheet(null)} title="Uhrzeit der Erinnerung">
        <View style={styles.sheet}>
          <TimeField
            hour={prefs.weightReminder.hour}
            minute={prefs.weightReminder.minute}
            onChange={(h, m) => void setReminder(true, h, m)}
          />
        </View>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: { width: 60, height: 60, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  about: { gap: spacing.xs, paddingVertical: spacing.lg },
  sheet: { paddingBottom: spacing.lg },
});
