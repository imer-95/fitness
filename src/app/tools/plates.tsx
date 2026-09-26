import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { formatNumber, parseDecimal } from '@/domain/format';
import { platesForWeight } from '@/domain/strength';
import { useSettings } from '@/state/settings';
import { Card } from '@/ui/Card';
import { Chip, ChipWrap } from '@/ui/Chips';
import { NumberField } from '@/ui/Fields';
import { Screen } from '@/ui/Screen';
import { Txt } from '@/ui/Text';
import { spacing, useTheme } from '@/ui/theme';

const BARS = [20, 15, 10, 7.5, 0];
const PLATE_COLORS: Record<string, string> = {
  '25': '#E53935',
  '20': '#1E88E5',
  '15': '#FDD835',
  '10': '#43A047',
  '5': '#F5F5F5',
  '2.5': '#424242',
  '1.25': '#9E9E9E',
};
const PLATE_HEIGHT: Record<string, number> = {
  '25': 120,
  '20': 120,
  '15': 108,
  '10': 96,
  '5': 72,
  '2.5': 60,
  '1.25': 50,
};

export default function PlatesScreen() {
  const { colors } = useTheme();
  const defaultBar = useSettings((s) => s.prefs.defaultBarWeight);
  const [target, setTarget] = useState('100');
  const [bar, setBar] = useState(defaultBar);
  const weight = parseDecimal(target) ?? 0;
  const { perSide, remainder } = platesForWeight(weight, bar);

  return (
    <Screen keyboard>
      <Card style={styles.gap}>
        <NumberField
          label="Zielgewicht (gesamt)"
          unit="kg"
          value={target}
          onChangeText={setTarget}
          step={2.5}
          min={0}
          large
        />
        <Txt variant="subhead" color="textSecondary">
          Stange
        </Txt>
        <ChipWrap>
          {BARS.map((b) => (
            <Chip
              key={b}
              label={b === 0 ? 'Ohne' : `${formatNumber(b, 1)} kg`}
              selected={bar === b}
              onPress={() => setBar(b)}
              small
            />
          ))}
        </ChipWrap>
      </Card>

      <Card style={styles.gap}>
        <Txt variant="headline">Pro Seite</Txt>
        {weight <= bar ? (
          <Txt variant="callout" color="textSecondary">
            Das Gewicht ist nicht größer als die Stange.
          </Txt>
        ) : (
          <>
            <View style={styles.barbell}>
              <View style={[styles.sleeve, { backgroundColor: colors.borderStrong }]} />
              {perSide.map((p, i) => (
                <View
                  key={i}
                  style={[
                    styles.plate,
                    {
                      height: PLATE_HEIGHT[String(p)] ?? 60,
                      backgroundColor: PLATE_COLORS[String(p)] ?? colors.textSecondary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Txt
                    variant="caption"
                    weight="800"
                    color={p === 5 || p === 15 ? '#111111' : '#FFFFFF'}
                    style={styles.plateText}
                  >
                    {formatNumber(p, 2)}
                  </Txt>
                </View>
              ))}
              <View style={[styles.sleeveEnd, { backgroundColor: colors.borderStrong }]} />
            </View>
            <Txt variant="title3" align="center">
              {perSide.length ? perSide.map((p) => formatNumber(p, 2)).join(' + ') : '–'} kg
            </Txt>
            {remainder > 0 ? (
              <Txt variant="footnote" color="warning" align="center">
                {formatNumber(remainder, 2)} kg lassen sich mit Standardscheiben nicht genau abbilden.
              </Txt>
            ) : null}
          </>
        )}
      </Card>
      <Txt variant="caption" color="textTertiary" align="center">
        Verwendete Scheiben: 25 · 20 · 15 · 10 · 5 · 2,5 · 1,25 kg
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  barbell: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 130, gap: 3 },
  sleeve: { width: 60, height: 14, borderRadius: 3 },
  sleeveEnd: { width: 24, height: 14, borderRadius: 3 },
  plate: { width: 26, borderRadius: 5, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  plateText: { transform: [{ rotate: '-90deg' }], width: 60, textAlign: 'center' },
});
