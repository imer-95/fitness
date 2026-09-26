import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { deleteMeasurementsOn, listMeasurements, saveMeasurements } from '@/db/repos/body';
import { useQuery } from '@/db/useQuery';
import { formatDateMedium, todayKey } from '@/domain/dates';
import { formatNumber, formatSigned, parseDecimal, toInputValue } from '@/domain/format';
import { MEASUREMENT_LABELS, MEASUREMENT_ORDER } from '@/domain/labels';
import type { DateKey, Measurement, MeasurementType } from '@/domain/types';
import { haptics } from '@/services/haptics';
import { toast } from '@/state/ui';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Sparkline } from '@/ui/charts/Sparkline';
import { DateField } from '@/ui/DatePicker';
import { confirm } from '@/ui/dialogs';
import { NumberField } from '@/ui/Fields';
import { EmptyState } from '@/ui/Feedback';
import { ListGroup, Section } from '@/ui/List';
import { Screen } from '@/ui/Screen';
import { Txt } from '@/ui/Text';
import { spacing, useTheme } from '@/ui/theme';

type Values = Partial<Record<MeasurementType, string>>;

export default function MeasurementsScreen() {
  const { colors } = useTheme();
  const [date, setDate] = useState<DateKey>(todayKey());
  const measurements = useQuery(listMeasurements, [], ['measurements']);
  const all = useMemo(() => measurements.data ?? [], [measurements.data]);

  const byType = useMemo(() => {
    const map = new Map<MeasurementType, Measurement[]>();
    for (const m of all) {
      const list = map.get(m.type) ?? [];
      list.push(m);
      map.set(m.type, list);
    }
    return map;
  }, [all]);

  const dates = useMemo(() => [...new Set(all.map((m) => m.date))].sort().reverse(), [all]);

  const latest = (type: MeasurementType) => {
    const list = byType.get(type);
    return list ? list[list.length - 1] : undefined;
  };

  return (
    <Screen keyboard>
      {measurements.data ? (
        <MeasurementForm
          key={`${date}-${all
            .filter((m) => m.date === date)
            .map((m) => `${m.type}${m.value}`)
            .join()}`}
          date={date}
          onDateChange={setDate}
          all={all}
          latest={latest}
          hasDate={dates.includes(date)}
        />
      ) : null}

      {all.length === 0 ? (
        <Card>
          <EmptyState
            icon="tape-measure"
            title="Noch keine Maße"
            message="Körpermaße zeigen Fortschritte, die die Waage nicht sieht."
          />
        </Card>
      ) : (
        <>
          <Section title="Entwicklung">
            <ListGroup>
              {MEASUREMENT_ORDER.filter((t) => byType.has(t)).map((type) => {
                const list = byType.get(type)!;
                const first = list[0];
                const last = list[list.length - 1];
                const delta = list.length > 1 ? last.value - first.value : null;
                return (
                  <View key={type} style={styles.row}>
                    <View style={styles.flex}>
                      <Txt variant="callout" weight="600">
                        {MEASUREMENT_LABELS[type]}
                      </Txt>
                      <Txt variant="caption" color="textSecondary">
                        {delta != null
                          ? `${formatSigned(delta, 1)} cm seit ${formatDateMedium(first.date)}`
                          : formatDateMedium(last.date)}
                      </Txt>
                    </View>
                    <Sparkline values={list.map((m) => m.value)} width={70} height={28} color={colors.weight} />
                    <Txt variant="headline" tabular style={styles.value}>
                      {formatNumber(last.value, 1)}
                    </Txt>
                  </View>
                );
              })}
            </ListGroup>
          </Section>
          <Section title="Messtage">
            <ListGroup>
              {dates.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setDate(d)}
                  onLongPress={async () => {
                    if (
                      await confirm('Messung löschen?', formatDateMedium(d), {
                        confirmLabel: 'Löschen',
                        destructive: true,
                      })
                    ) {
                      await deleteMeasurementsOn(d);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    { backgroundColor: pressed ? colors.surfaceAlt : 'transparent' },
                  ]}
                >
                  <Txt variant="callout" style={styles.flex}>
                    {formatDateMedium(d)}
                  </Txt>
                  <Txt variant="footnote" color="textSecondary">
                    {all.filter((m) => m.date === d).length} Werte
                  </Txt>
                </Pressable>
              ))}
            </ListGroup>
          </Section>
        </>
      )}
    </Screen>
  );
}

function MeasurementForm({
  date,
  onDateChange,
  all,
  latest,
  hasDate,
}: {
  date: DateKey;
  onDateChange: (date: DateKey) => void;
  all: Measurement[];
  latest: (type: MeasurementType) => Measurement | undefined;
  hasDate: boolean;
}) {
  const { colors } = useTheme();
  const [values, setValues] = useState<Values>(() => {
    const initial: Values = {};
    for (const m of all) if (m.date === date) initial[m.type] = toInputValue(m.value);
    return initial;
  });

  const save = async () => {
    const payload: Partial<Record<MeasurementType, number | null>> = {};
    for (const type of MEASUREMENT_ORDER) {
      const raw = values[type];
      payload[type] = raw ? parseDecimal(raw) : null;
    }
    if (Object.values(payload).every((v) => v == null) && !hasDate) {
      toast('Bitte mindestens einen Wert eintragen', { kind: 'error' });
      return;
    }
    await saveMeasurements(date, payload);
    haptics.success();
    toast('Maße gespeichert');
  };

  return (
    <Card style={styles.gap}>
      <Txt variant="headline">Maße eintragen (cm)</Txt>
      <DateField value={date} onChange={onDateChange} maxDate={todayKey()} />
      <View style={styles.grid}>
        {MEASUREMENT_ORDER.map((type) => {
          const last = latest(type);
          return (
            <NumberField
              key={type}
              containerStyle={styles.cell}
              label={MEASUREMENT_LABELS[type]}
              unit="cm"
              value={values[type] ?? ''}
              onChangeText={(t) => setValues((v) => ({ ...v, [type]: t }))}
              placeholder={last ? toInputValue(last.value) : '–'}
            />
          );
        })}
      </View>
      <Button label="Speichern" icon="check" full onPress={save} color={colors.weight} />
      <Txt variant="caption" color="textTertiary">
        Tipp: Immer an derselben Stelle und zur gleichen Tageszeit messen, z. B. Taille auf Nabelhöhe morgens.
      </Txt>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  cell: { flexBasis: '46%', flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  value: { minWidth: 56, textAlign: 'right' },
});
