import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { mergeSessions, SessionRow } from '@/components/SessionRows';
import { listCardio } from '@/db/repos/cardio';
import { listWorkoutSummaries } from '@/db/repos/workouts';
import { useQuery } from '@/db/useQuery';
import {
  addDays,
  addMonths,
  daysInMonth,
  endOfDayMs,
  formatDateMedium,
  formatMonthYear,
  splitKey,
  startOfDayMs,
  startOfMonth,
  toDateKey,
  todayKey,
} from '@/domain/dates';
import { formatVolume } from '@/domain/format';
import type { DateKey } from '@/domain/types';
import { IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { CalendarMonth } from '@/ui/DatePicker';
import { EmptyState, StatGrid, StatTile } from '@/ui/Feedback';
import { ListGroup } from '@/ui/List';
import { Screen } from '@/ui/Screen';
import { Txt } from '@/ui/Text';
import { spacing, useTheme } from '@/ui/theme';

export default function HistoryScreen() {
  const { colors } = useTheme();
  const [month, setMonth] = useState(startOfMonth(todayKey()));
  const [day, setDay] = useState<DateKey | null>(null);
  const [year, m] = splitKey(month);
  const lastDay = addDays(month, daysInMonth(year, m) - 1);

  const sessions = useQuery(
    async () => {
      const range = { fromMs: startOfDayMs(month), toMs: endOfDayMs(lastDay) };
      return mergeSessions(await listWorkoutSummaries(range), await listCardio(range));
    },
    [month],
    ['workouts', 'cardio', 'exercises'],
  );

  const marked = useMemo(() => {
    const map = new Map<DateKey, string>();
    for (const s of sessions.data ?? []) {
      const key = toDateKey(s.at);
      if (s.kind === 'workout') map.set(key, colors.strength);
      else if (!map.has(key)) map.set(key, colors.cardio);
    }
    return map;
  }, [sessions.data, colors]);

  const all = sessions.data ?? [];
  const visible = day ? all.filter((s) => toDateKey(s.at) === day) : all;
  const workouts = all.filter((s) => s.kind === 'workout');
  const volume = workouts.reduce((sum, s) => sum + (s.kind === 'workout' ? s.workout.volume : 0), 0);

  return (
    <Screen>
      <Card style={styles.gap}>
        <View style={styles.monthHeader}>
          <IconButton
            icon="chevron-left"
            accessibilityLabel="Vorheriger Monat"
            onPress={() => {
              setMonth(addMonths(month, -1));
              setDay(null);
            }}
          />
          <Txt variant="headline" align="center" style={styles.flex}>
            {formatMonthYear(month)}
          </Txt>
          <IconButton
            icon="chevron-right"
            accessibilityLabel="Nächster Monat"
            disabled={addMonths(month, 1) > todayKey()}
            onPress={() => {
              setMonth(addMonths(month, 1));
              setDay(null);
            }}
          />
        </View>
        <CalendarMonth month={month} selected={day} marked={marked} onSelect={(d) => setDay(day === d ? null : d)} />
        <View style={styles.legend}>
          <LegendDot color={colors.strength} label="Krafttraining" />
          <LegendDot color={colors.cardio} label="Cardio" />
        </View>
      </Card>

      <StatGrid>
        <StatTile label="Krafttrainings" value={String(workouts.length)} icon="dumbbell" color={colors.strength} />
        <StatTile label="Cardio" value={String(all.length - workouts.length)} icon="run" color={colors.cardio} />
        <StatTile label="Volumen" value={formatVolume(volume).replace(' kg', '')} unit="kg" icon="weight" />
      </StatGrid>

      <Txt variant="title3">
        {day ? formatDateMedium(day) : `Alle Einheiten im ${formatMonthYear(month).split(' ')[0]}`}
      </Txt>
      {visible.length === 0 ? (
        <Card>
          <EmptyState
            compact
            icon="calendar-blank"
            title="Keine Einheiten"
            message={day ? 'An diesem Tag wurde nichts eingetragen.' : 'In diesem Monat wurde noch nichts eingetragen.'}
          />
        </Card>
      ) : (
        <ListGroup>
          {visible.map((s) => (
            <SessionRow key={`${s.kind}-${s.kind === 'workout' ? s.workout.id : s.cardio.id}`} session={s} />
          ))}
        </ListGroup>
      )}
    </Screen>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Txt variant="caption" color="textSecondary">
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: spacing.md },
  monthHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
