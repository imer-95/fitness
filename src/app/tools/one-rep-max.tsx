import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { formatNumber, parseDecimal, parseInteger } from '@/domain/format';
import { estimate1RM, percentTable } from '@/domain/strength';
import { Card } from '@/ui/Card';
import { NumberField } from '@/ui/Fields';
import { Screen } from '@/ui/Screen';
import { Txt } from '@/ui/Text';
import { radius, spacing, useTheme, withAlpha } from '@/ui/theme';

export default function OneRepMaxScreen() {
  const { colors } = useTheme();
  const [weight, setWeight] = useState('80');
  const [reps, setReps] = useState('8');
  const w = parseDecimal(weight) ?? 0;
  const r = parseInteger(reps) ?? 0;
  const oneRm = estimate1RM(w, r);

  return (
    <Screen keyboard>
      <Card style={styles.gap}>
        <Txt variant="callout" color="textSecondary">
          Trag ein Gewicht und die geschafften Wiederholungen ein – der Rechner schätzt dein Maximalgewicht für eine
          Wiederholung (Epley-Formel).
        </Txt>
        <View style={styles.gap}>
          <NumberField label="Gewicht" unit="kg" value={weight} onChangeText={setWeight} step={2.5} min={0} />
          <NumberField
            label="Wiederholungen"
            decimal={false}
            value={reps}
            onChangeText={setReps}
            step={1}
            min={1}
            max={30}
          />
        </View>
      </Card>
      <Card tint={withAlpha(colors.primary, 0.1)} style={styles.result}>
        <Txt variant="overline" color="primary">
          Geschätztes 1RM
        </Txt>
        <Txt variant="numberLarge" color="primary" tabular>
          {oneRm > 0 ? `${formatNumber(oneRm, 1)} kg` : '–'}
        </Txt>
        {r > 12 ? (
          <Txt variant="caption" color="textSecondary" align="center">
            Bei mehr als 12 Wiederholungen wird die Schätzung ungenauer.
          </Txt>
        ) : null}
      </Card>
      {oneRm > 0 ? (
        <Card padded={false}>
          <View style={[styles.tableRow, styles.tableHeader, { borderBottomColor: colors.border }]}>
            <Txt variant="overline" color="textSecondary" style={styles.col}>
              % 1RM
            </Txt>
            <Txt variant="overline" color="textSecondary" style={styles.col}>
              Gewicht
            </Txt>
            <Txt variant="overline" color="textSecondary" style={styles.col}>
              ≈ Wdh.
            </Txt>
          </View>
          {percentTable(oneRm).map((row) => (
            <View
              key={row.percent}
              style={[styles.tableRow, row.percent === 75 && { backgroundColor: withAlpha(colors.primary, 0.08) }]}
            >
              <Txt variant="callout" style={styles.col} tabular>
                {row.percent} %
              </Txt>
              <Txt variant="callout" weight="700" style={styles.col} tabular>
                {formatNumber(row.weight, 1)} kg
              </Txt>
              <Txt variant="callout" color="textSecondary" style={styles.col} tabular>
                {row.reps}
              </Txt>
            </View>
          ))}
        </Card>
      ) : null}
      <Txt variant="caption" color="textTertiary" align="center">
        Für Muskelaufbau eignen sich meist 65–80 % (8–15 Wiederholungen), für Maximalkraft 85–95 %.
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  result: { alignItems: 'center', gap: spacing.xs, borderRadius: radius.xl },
  tableRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2 },
  tableHeader: { borderBottomWidth: StyleSheet.hairlineWidth },
  col: { flex: 1 },
});
