import { memo } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { formatNumber } from '@/domain/format';
import { SET_KIND_SHORT } from '@/domain/labels';
import { SIDE_SHORT } from '@/domain/strength';
import type { TrackingType } from '@/domain/types';
import type { DraftSet, PreviousSet } from '@/state/activeWorkout';
import { DONE_ACCESSORY_ID } from '@/ui/Fields';
import { Icon } from '@/ui/Icon';
import { Txt } from '@/ui/Text';
import { noOutline, radius, spacing, useTheme, withAlpha } from '@/ui/theme';

export const COLUMN = {
  set: 34,
  side: 30,
  weight: 74,
  reps: 60,
  check: 42,
};

function formatPrevious(prev: PreviousSet | undefined, tracking: TrackingType): string {
  if (!prev) return '–';
  if (tracking === 'time') return prev.durationSec != null ? `${prev.durationSec} s` : '–';
  if (tracking === 'reps' || prev.weight == null) return prev.reps != null ? `${prev.reps}×` : '–';
  return `${formatNumber(prev.weight, 2)} × ${prev.reps ?? 0}`;
}

function hintText(value: number | null, decimals = 2): string {
  return value == null ? '' : formatNumber(value, decimals).replace(/\./g, '');
}

export interface SetRowProps {
  set: DraftSet;
  index: number;
  tracking: TrackingType;
  unilateral: boolean;
  previous?: PreviousSet;
  onChange: (patch: Partial<Pick<DraftSet, 'weight' | 'reps' | 'duration' | 'side'>>) => void;
  onToggle: () => void;
  onMenu: () => void;
  onCopyPrevious: () => void;
}

function SetRowComponent({
  set,
  index,
  tracking,
  unilateral,
  previous,
  onChange,
  onToggle,
  onMenu,
  onCopyPrevious,
}: SetRowProps) {
  const { colors } = useTheme();
  const kindLabel = SET_KIND_SHORT[set.kind];
  const kindColor =
    set.kind === 'warmup'
      ? colors.warning
      : set.kind === 'drop'
        ? colors.protein
        : set.kind === 'failure'
          ? colors.danger
          : colors.text;
  const isRecord = set.prs.length > 0;

  const input = (
    value: string,
    placeholder: string,
    onText: (t: string) => void,
    width: number,
    decimal: boolean,
    label: string,
  ) => (
    <TextInput
      value={value}
      onChangeText={(t) => onText(t.replace(decimal ? /[^0-9.,]/g : /[^0-9]/g, ''))}
      placeholder={placeholder}
      placeholderTextColor={colors.textTertiary}
      keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      inputAccessoryViewID={Platform.OS === 'ios' ? DONE_ACCESSORY_ID : undefined}
      selectTextOnFocus
      accessibilityLabel={`${label} Satz ${index + 1}`}
      style={[
        styles.input,
        noOutline,
        {
          width,
          color: colors.text,
          backgroundColor: set.done ? withAlpha(colors.success, 0.12) : colors.surfaceAlt,
        },
      ]}
    />
  );

  return (
    <View style={[styles.row, set.done && { backgroundColor: withAlpha(colors.success, 0.08) }]}>
      <Pressable
        onPress={onMenu}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={`Satz ${index + 1} Optionen`}
        style={[styles.setCell, { width: COLUMN.set }]}
      >
        {isRecord ? (
          <Icon name="trophy" size={18} color={colors.gold} />
        ) : (
          <Txt variant="headline" color={kindLabel ? kindColor : 'textSecondary'} weight="700">
            {kindLabel || index + 1}
          </Txt>
        )}
      </Pressable>
      {unilateral ? (
        <Pressable
          onPress={() => onChange({ side: set.side === 'left' ? 'right' : set.side === 'right' ? null : 'left' })}
          accessibilityRole="button"
          accessibilityLabel="Seite wechseln"
          style={[
            styles.side,
            { width: COLUMN.side, backgroundColor: set.side ? withAlpha(colors.weight, 0.16) : colors.surfaceAlt },
          ]}
        >
          <Txt variant="caption" weight="800" color={set.side ? 'weight' : 'textTertiary'}>
            {set.side ? SIDE_SHORT[set.side] : 'L/R'}
          </Txt>
        </Pressable>
      ) : null}
      <Pressable
        onPress={onCopyPrevious}
        disabled={!previous}
        style={styles.previous}
        accessibilityRole="button"
        accessibilityLabel="Werte vom letzten Mal übernehmen"
      >
        <Txt variant="footnote" color="textTertiary" numberOfLines={1} tabular>
          {formatPrevious(previous, tracking)}
        </Txt>
      </Pressable>
      {tracking === 'weight_reps'
        ? input(set.weight, hintText(set.hint.weight), (t) => onChange({ weight: t }), COLUMN.weight, true, 'Gewicht')
        : null}
      {tracking === 'time'
        ? input(
            set.duration,
            hintText(set.hint.durationSec, 0),
            (t) => onChange({ duration: t }),
            COLUMN.weight,
            false,
            'Sekunden',
          )
        : input(
            set.reps,
            hintText(set.hint.reps, 0),
            (t) => onChange({ reps: t }),
            tracking === 'reps' ? COLUMN.weight : COLUMN.reps,
            false,
            'Wiederholungen',
          )}
      <Pressable
        onPress={onToggle}
        hitSlop={6}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: set.done }}
        accessibilityLabel={`Satz ${index + 1} abhaken`}
        style={({ pressed }) => [
          styles.check,
          {
            backgroundColor: set.done ? colors.success : colors.surfaceAlt,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Icon name="check-bold" size={20} color={set.done ? '#FFFFFF' : colors.textTertiary} />
      </Pressable>
    </View>
  );
}

export const SetRow = memo(SetRowComponent);

export function SetTableHeader({ tracking, unilateral }: { tracking: TrackingType; unilateral: boolean }) {
  return (
    <View style={[styles.row, styles.headerRow]}>
      <Txt variant="overline" color="textTertiary" align="center" style={{ width: COLUMN.set }}>
        Satz
      </Txt>
      {unilateral ? (
        <Txt variant="overline" color="textTertiary" align="center" style={{ width: COLUMN.side }}>
          Seite
        </Txt>
      ) : null}
      <Txt variant="overline" color="textTertiary" style={styles.previous}>
        Vorher
      </Txt>
      {tracking === 'weight_reps' ? (
        <Txt variant="overline" color="textTertiary" align="center" style={{ width: COLUMN.weight }}>
          kg
        </Txt>
      ) : null}
      <Txt
        variant="overline"
        color="textTertiary"
        align="center"
        style={{ width: tracking === 'weight_reps' ? COLUMN.reps : COLUMN.weight }}
      >
        {tracking === 'time' ? 'Sek.' : 'Wdh.'}
      </Txt>
      <View style={{ width: COLUMN.check }} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 5,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
  },
  headerRow: { paddingVertical: 2 },
  setCell: { alignItems: 'center', justifyContent: 'center', height: 36 },
  side: { height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  previous: { flex: 1, minWidth: 40 },
  input: {
    height: 38,
    borderRadius: radius.sm,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    paddingHorizontal: 4,
    paddingVertical: 0,
  },
  check: {
    width: COLUMN.check,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
