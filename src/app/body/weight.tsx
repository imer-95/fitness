import { useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { computeWeightStats, WEIGHT_RANGES, WeightChart, type WeightRange } from '@/components/body/WeightChart';
import { deleteWeight, listWeights, upsertWeight } from '@/db/repos/body';
import { useQuery } from '@/db/useQuery';
import { bmi, bmiCategory } from '@/domain/body';
import { formatDateMedium, formatDayRelative, todayKey } from '@/domain/dates';
import { formatNumber, formatSigned, parseDecimal, toInputValue } from '@/domain/format';
import type { DateKey, WeightEntry } from '@/domain/types';
import { haptics } from '@/services/haptics';
import { useSettings } from '@/state/settings';
import { toast } from '@/state/ui';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Segmented } from '@/ui/Chips';
import { DateField } from '@/ui/DatePicker';
import { confirm } from '@/ui/dialogs';
import { NumberField } from '@/ui/Fields';
import { EmptyState, StatGrid, StatTile } from '@/ui/Feedback';
import { ListGroup, Section } from '@/ui/List';
import { Screen } from '@/ui/Screen';
import { Txt } from '@/ui/Text';
import { spacing, useTheme } from '@/ui/theme';

export default function WeightScreen() {
  const { colors } = useTheme();
  const targetWeight = useSettings((s) => s.goals.targetWeight);
  const heightCm = useSettings((s) => s.profile.heightCm);
  const [date, setDate] = useState<DateKey>(todayKey());
  const [range, setRange] = useState<WeightRange>('90');
  const weights = useQuery(() => listWeights(), [], ['weights']);
  const entries = useMemo(() => weights.data ?? [], [weights.data]);
  const stats = useMemo(() => computeWeightStats(entries, targetWeight), [entries, targetWeight]);
  const existing = entries.find((e) => e.date === date) ?? null;
  const lastBefore = [...entries].reverse().find((e) => e.date <= date) ?? stats.latest;

  const remove = async (d: DateKey) => {
    if (await confirm('Eintrag löschen?', formatDateMedium(d), { confirmLabel: 'Löschen', destructive: true })) {
      await deleteWeight(d);
    }
  };

  const bmiValue = bmi(stats.trend, heightCm);
  const reversed = [...entries].reverse();

  return (
    <Screen keyboard>
      {weights.data ? (
        <WeightEntryForm
          key={`${date}-${existing?.weight ?? ''}-${existing?.bodyFat ?? ''}`}
          date={date}
          onDateChange={setDate}
          existing={existing}
          lastWeight={lastBefore?.weight ?? null}
        />
      ) : null}

      {entries.length > 0 ? (
        <>
          <StatGrid>
            <StatTile
              label="Trend (7-Tage-Ø)"
              value={stats.trend != null ? formatNumber(stats.trend, 1) : '–'}
              unit="kg"
              icon="scale-bathroom"
              color={colors.weight}
            />
            <StatTile
              label="Pro Woche"
              value={stats.ratePerWeek != null ? formatSigned(stats.ratePerWeek, 2) : '–'}
              unit="kg"
              icon="trending-down"
              sub={stats.ratePerWeek == null ? 'mind. 3 Einträge über 7 Tage' : null}
            />
            <StatTile
              label="7 Tage"
              value={stats.change7 != null ? formatSigned(stats.change7, 1) : '–'}
              unit="kg"
              icon="calendar-week"
            />
            <StatTile
              label="30 Tage"
              value={stats.change30 != null ? formatSigned(stats.change30, 1) : '–'}
              unit="kg"
              icon="calendar-month"
            />
            {targetWeight != null && stats.trend != null ? (
              <StatTile
                label="Bis zum Ziel"
                value={formatSigned(targetWeight - stats.trend, 1)}
                unit="kg"
                icon="flag-checkered"
                color={colors.success}
                sub={stats.goalDate ? `≈ ${formatDateMedium(stats.goalDate)}` : null}
              />
            ) : null}
            {bmiValue != null ? (
              <StatTile label="BMI" value={formatNumber(bmiValue, 1)} icon="human" sub={bmiCategory(bmiValue)} />
            ) : null}
          </StatGrid>

          <Card style={styles.gap}>
            <Segmented<WeightRange> options={WEIGHT_RANGES} value={range} onChange={setRange} />
            <WeightChart entries={entries} range={range} targetWeight={targetWeight} />
            <Txt variant="caption" color="textTertiary">
              Punkte = tägliche Messungen, Linie = 7-Tage-Durchschnitt. Das Tagesgewicht schwankt durch Wasser & Essen –
              entscheidend ist der Trend.
            </Txt>
          </Card>

          <Section title="Einträge">
            <ListGroup>
              {reversed.slice(0, 60).map((e, i) => {
                const prev = reversed[i + 1];
                const delta = prev ? e.weight - prev.weight : null;
                return (
                  <Pressable
                    key={e.date}
                    onPress={() => setDate(e.date)}
                    onLongPress={() => remove(e.date)}
                    accessibilityRole="button"
                    accessibilityHint="Lange drücken zum Löschen"
                    style={({ pressed }) => [
                      styles.entry,
                      { backgroundColor: pressed ? colors.surfaceAlt : 'transparent' },
                    ]}
                  >
                    <Txt variant="callout" style={styles.flex}>
                      {formatDateMedium(e.date)}
                    </Txt>
                    {delta != null ? (
                      <Txt
                        variant="footnote"
                        color={delta > 0 ? 'warning' : delta < 0 ? 'success' : 'textTertiary'}
                        tabular
                      >
                        {formatSigned(delta, 1)}
                      </Txt>
                    ) : null}
                    <Txt variant="headline" tabular style={styles.value}>
                      {formatNumber(e.weight, 1)} kg
                    </Txt>
                  </Pressable>
                );
              })}
            </ListGroup>
            <Txt variant="caption" color="textTertiary" align="center">
              Tippen zum Bearbeiten · lange drücken zum Löschen
            </Txt>
          </Section>
        </>
      ) : (
        <Card>
          <EmptyState
            icon="scale-bathroom"
            title="Noch keine Einträge"
            message="Wiege dich am besten jeden Morgen nach dem Aufstehen – so wird dein Trend am genauesten."
          />
        </Card>
      )}
    </Screen>
  );
}

function WeightEntryForm({
  date,
  onDateChange,
  existing,
  lastWeight,
}: {
  date: DateKey;
  onDateChange: (date: DateKey) => void;
  existing: WeightEntry | null;
  lastWeight: number | null;
}) {
  const { colors } = useTheme();
  const [value, setValue] = useState(existing ? toInputValue(existing.weight) : '');
  const [bodyFat, setBodyFat] = useState(existing?.bodyFat != null ? toInputValue(existing.bodyFat) : '');

  const save = async () => {
    const weight = parseDecimal(value) ?? (existing ? null : lastWeight);
    if (weight == null || weight < 20 || weight > 400) {
      toast('Bitte ein gültiges Gewicht eintragen', { kind: 'error' });
      return;
    }
    await upsertWeight(date, weight, { bodyFat: parseDecimal(bodyFat) });
    await useSettings.getState().refreshAutoNutrition();
    haptics.success();
    toast(`${formatNumber(weight, 1)} kg gespeichert`, { message: formatDayRelative(date) });
  };

  return (
    <Card style={styles.gap}>
      <Txt variant="headline">{existing ? 'Eintrag ändern' : 'Gewicht eintragen'}</Txt>
      <DateField value={date} onChange={onDateChange} maxDate={todayKey()} />
      <NumberField
        value={value}
        onChangeText={setValue}
        unit="kg"
        large
        step={0.1}
        placeholder={lastWeight != null ? toInputValue(lastWeight) : '80,0'}
        accessibilityLabel="Körpergewicht"
      />
      <NumberField
        label="Körperfett (optional)"
        unit="%"
        value={bodyFat}
        onChangeText={setBodyFat}
        placeholder="z. B. 18"
      />
      <Button label={existing ? 'Aktualisieren' : 'Speichern'} icon="check" full onPress={save} color={colors.weight} />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: spacing.md },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  value: { minWidth: 84, textAlign: 'right' },
});
