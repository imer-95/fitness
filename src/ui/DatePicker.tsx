import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  addDays,
  addMonths,
  daysInMonth,
  formatDayRelative,
  formatMonthYear,
  makeKey,
  pad2,
  splitKey,
  startOfMonth,
  todayKey,
  weekdayMondayFirst,
  WEEKDAYS_MONDAY_FIRST,
} from '@/domain/dates';
import type { DateKey } from '@/domain/types';
import { haptics } from '@/services/haptics';

import { Button, IconButton } from './Button';
import { PressableField } from './Fields';
import { BottomSheet } from './Sheet';
import { Txt } from './Text';
import { radius, spacing, useTheme, withAlpha } from './theme';

export function CalendarMonth({
  month,
  selected,
  onSelect,
  marked,
  maxDate,
  markColor,
}: {
  /** Any day of the month to show. */
  month: DateKey;
  selected?: DateKey | null;
  onSelect?: (day: DateKey) => void;
  /** Days with a dot (e.g. training days). */
  marked?: ReadonlyMap<DateKey, string> | ReadonlySet<DateKey>;
  maxDate?: DateKey;
  markColor?: string;
}) {
  const { colors } = useTheme();
  const first = startOfMonth(month);
  const [year, m] = splitKey(first);
  const offset = weekdayMondayFirst(first);
  const count = daysInMonth(year, m);
  const today = todayKey();
  const cells: (DateKey | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: count }, (_, i) => makeKey(year, m, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (DateKey | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <View style={styles.calendar}>
      <View style={styles.week}>
        {WEEKDAYS_MONDAY_FIRST.map((d) => (
          <Txt key={d} variant="caption" color="textTertiary" align="center" style={styles.cell}>
            {d}
          </Txt>
        ))}
      </View>
      {rows.map((row, r) => (
        <View key={r} style={styles.week}>
          {row.map((day, c) => {
            if (!day) return <View key={c} style={styles.cell} />;
            const disabled = maxDate != null && day > maxDate;
            const isSelected = day === selected;
            const isToday = day === today;
            const mark =
              marked instanceof Map
                ? (marked.get(day) ?? null)
                : marked?.has(day)
                  ? (markColor ?? colors.primary)
                  : null;
            return (
              <Pressable
                key={c}
                disabled={disabled || !onSelect}
                onPress={() => {
                  haptics.selection();
                  onSelect?.(day);
                }}
                accessibilityRole="button"
                accessibilityLabel={day}
                style={styles.cell}
              >
                <View
                  style={[
                    styles.day,
                    isSelected && { backgroundColor: colors.primary },
                    !isSelected && isToday && { borderWidth: 1.5, borderColor: colors.primary },
                    !isSelected && mark ? { backgroundColor: withAlpha(mark, 0.16) } : null,
                  ]}
                >
                  <Txt
                    variant="subhead"
                    weight={isSelected || isToday ? '700' : '500'}
                    color={isSelected ? 'onPrimary' : disabled ? 'textTertiary' : 'text'}
                  >
                    {Number(day.slice(8))}
                  </Txt>
                </View>
                {mark && !isSelected ? <View style={[styles.dot, { backgroundColor: mark }]} /> : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export function DatePickerSheet({
  visible,
  value,
  onChange,
  onClose,
  maxDate,
  title = 'Datum wählen',
}: {
  visible: boolean;
  value: DateKey;
  onChange: (day: DateKey) => void;
  onClose: () => void;
  maxDate?: DateKey;
  title?: string;
}) {
  const [month, setMonth] = useState(value);
  const today = todayKey();
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.monthHeader}>
        <IconButton
          icon="chevron-left"
          accessibilityLabel="Vorheriger Monat"
          onPress={() => setMonth(addMonths(month, -1))}
        />
        <Txt variant="headline" align="center" style={styles.flex}>
          {formatMonthYear(month)}
        </Txt>
        <IconButton
          icon="chevron-right"
          accessibilityLabel="Nächster Monat"
          disabled={maxDate != null && startOfMonth(addMonths(month, 1)) > maxDate}
          onPress={() => setMonth(addMonths(month, 1))}
        />
      </View>
      <CalendarMonth
        month={month}
        selected={value}
        maxDate={maxDate}
        onSelect={(d) => {
          onChange(d);
          onClose();
        }}
      />
      <View style={styles.quick}>
        <Button
          label="Heute"
          size="sm"
          variant="secondary"
          onPress={() => {
            onChange(today);
            onClose();
          }}
        />
        <Button
          label="Gestern"
          size="sm"
          variant="secondary"
          onPress={() => {
            onChange(addDays(today, -1));
            onClose();
          }}
        />
      </View>
    </BottomSheet>
  );
}

export function DateField({
  label,
  value,
  onChange,
  maxDate,
}: {
  label?: string;
  value: DateKey;
  onChange: (day: DateKey) => void;
  maxDate?: DateKey;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <PressableField label={label} value={formatDayRelative(value)} icon="calendar" onPress={() => setOpen(true)} />
      {open ? (
        <DatePickerSheet visible value={value} onChange={onChange} onClose={() => setOpen(false)} maxDate={maxDate} />
      ) : null}
    </>
  );
}

/** Hour/minute selection with steppers (works identically on all platforms). */
export function TimeField({
  label,
  hour,
  minute,
  onChange,
}: {
  label?: string;
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}) {
  const { colors } = useTheme();
  const shiftMinutes = (delta: number) => {
    const total = (((hour * 60 + minute + delta) % 1440) + 1440) % 1440;
    onChange(Math.floor(total / 60), total % 60);
  };
  return (
    <View style={styles.timeField}>
      {label ? (
        <Txt variant="subhead" color="textSecondary">
          {label}
        </Txt>
      ) : null}
      <View style={[styles.timeRow, { backgroundColor: colors.surfaceAlt }]}>
        <IconButton
          icon="minus"
          size={36}
          background={colors.surface}
          accessibilityLabel="15 Minuten früher"
          onPress={() => shiftMinutes(-15)}
        />
        <Pressable
          onPress={() => shiftMinutes(60)}
          accessibilityRole="button"
          accessibilityLabel="Eine Stunde später"
          style={styles.flex}
        >
          <Txt variant="title2" align="center" tabular>
            {pad2(hour)}:{pad2(minute)}
          </Txt>
        </Pressable>
        <IconButton
          icon="plus"
          size={36}
          background={colors.surface}
          accessibilityLabel="15 Minuten später"
          onPress={() => shiftMinutes(15)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  calendar: { gap: 2 },
  week: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 2, minHeight: 42 },
  day: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 1 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  quick: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  timeField: { gap: spacing.xs + 2 },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    padding: spacing.xs + 2,
    gap: spacing.sm,
  },
});
