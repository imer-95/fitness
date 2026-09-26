import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  ACTIVITY_DESCRIPTIONS,
  ACTIVITY_LABELS,
  ACTIVITY_ORDER,
  GOAL_DESCRIPTIONS,
  GOAL_LABELS,
  SEX_LABELS,
} from '@/domain/labels';
import type { ActivityLevel, Goal, Sex } from '@/domain/types';
import { Chip, ChipWrap } from '@/ui/Chips';
import { NumberField, PressableField, TextField } from '@/ui/Fields';
import { SelectSheet } from '@/ui/Sheet';
import { Txt } from '@/ui/Text';
import { radius, spacing, useTheme, withAlpha } from '@/ui/theme';

export interface ProfileFormValues {
  name: string;
  sex: Sex | null;
  birthYear: string;
  heightCm: string;
  activity: ActivityLevel;
  goal: Goal;
}

/** Shared fields of onboarding and profile settings. */
export function PersonalFields({
  values,
  onChange,
}: {
  values: ProfileFormValues;
  onChange: (patch: Partial<ProfileFormValues>) => void;
}) {
  return (
    <View style={styles.gap}>
      <TextField
        label="Vorname"
        value={values.name}
        onChangeText={(name) => onChange({ name })}
        placeholder="Wie dürfen wir dich nennen?"
        autoCapitalize="words"
      />
      <View style={styles.gapSm}>
        <Txt variant="subhead" color="textSecondary">
          Geschlecht (für den Grundumsatz)
        </Txt>
        <ChipWrap>
          {(['male', 'female'] as const).map((s) => (
            <Chip
              key={s}
              label={SEX_LABELS[s]}
              selected={values.sex === s}
              onPress={() => onChange({ sex: values.sex === s ? null : s })}
            />
          ))}
        </ChipWrap>
      </View>
      <View style={styles.row}>
        <NumberField
          containerStyle={styles.flex}
          label="Geburtsjahr"
          decimal={false}
          value={values.birthYear}
          onChangeText={(birthYear) => onChange({ birthYear })}
          placeholder="z. B. 1995"
        />
        <NumberField
          containerStyle={styles.flex}
          label="Größe"
          unit="cm"
          decimal={false}
          value={values.heightCm}
          onChangeText={(heightCm) => onChange({ heightCm })}
          placeholder="z. B. 180"
        />
      </View>
    </View>
  );
}

export function GoalFields({
  values,
  onChange,
}: {
  values: ProfileFormValues;
  onChange: (patch: Partial<ProfileFormValues>) => void;
}) {
  const { colors } = useTheme();
  const [activityOpen, setActivityOpen] = useState(false);
  return (
    <View style={styles.gap}>
      <Txt variant="subhead" color="textSecondary">
        Dein Ziel
      </Txt>
      <View style={styles.gapSm}>
        {(['lose', 'maintain', 'gain'] as const).map((g) => {
          const selected = values.goal === g;
          return (
            <Pressable
              key={g}
              onPress={() => onChange({ goal: g })}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[
                styles.goal,
                {
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? withAlpha(colors.primary, 0.1) : colors.surface,
                },
              ]}
            >
              <Txt variant="headline" color={selected ? 'primary' : 'text'}>
                {GOAL_LABELS[g]}
              </Txt>
              <Txt variant="footnote" color="textSecondary">
                {GOAL_DESCRIPTIONS[g]}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      <PressableField
        label="Aktivität im Alltag"
        value={`${ACTIVITY_LABELS[values.activity]} – ${ACTIVITY_DESCRIPTIONS[values.activity]}`}
        icon="walk"
        onPress={() => setActivityOpen(true)}
      />
      <SelectSheet<ActivityLevel>
        visible={activityOpen}
        onClose={() => setActivityOpen(false)}
        title="Aktivitätslevel"
        value={values.activity}
        options={ACTIVITY_ORDER.map((a) => ({
          value: a,
          label: ACTIVITY_LABELS[a],
          description: ACTIVITY_DESCRIPTIONS[a],
        }))}
        onSelect={(activity) => onChange({ activity })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: spacing.lg },
  gapSm: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  goal: { borderWidth: 1.5, borderRadius: radius.lg, padding: spacing.md, gap: 2 },
});
