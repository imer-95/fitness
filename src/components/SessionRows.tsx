import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatDateMedium, formatDuration, formatTime, toDateKey } from '@/domain/dates';
import { formatDistance, formatNumber, formatVolume } from '@/domain/format';
import { CARDIO_LABELS } from '@/domain/labels';
import type { CardioSession, WorkoutSummary } from '@/domain/types';
import { Icon } from '@/ui/Icon';
import { CARDIO_ICONS } from '@/ui/icons';
import { Txt } from '@/ui/Text';
import { radius, spacing, useTheme, withAlpha } from '@/ui/theme';

export type Session =
  | { kind: 'workout'; at: number; workout: WorkoutSummary }
  | { kind: 'cardio'; at: number; cardio: CardioSession };

export function mergeSessions(workouts: WorkoutSummary[], cardio: CardioSession[], limit?: number): Session[] {
  const all: Session[] = [
    ...workouts.map((w) => ({ kind: 'workout' as const, at: w.startedAt, workout: w })),
    ...cardio.map((c) => ({ kind: 'cardio' as const, at: c.startedAt, cardio: c })),
  ].sort((a, b) => b.at - a.at);
  return limit != null ? all.slice(0, limit) : all;
}

function DateBadge({ at, color }: { at: number; color: string }) {
  const key = toDateKey(at);
  const [, , day] = key.split('-');
  return (
    <View style={[styles.dateBadge, { backgroundColor: withAlpha(color, 0.13) }]}>
      <Txt variant="caption" color={color} weight="800">
        {formatDateMedium(key).split(',')[0]}
      </Txt>
      <Txt variant="title3" color={color} style={styles.dateDay}>
        {Number(day)}
      </Txt>
    </View>
  );
}

export function WorkoutSessionRow({ workout }: { workout: WorkoutSummary }) {
  const { colors } = useTheme();
  const duration = workout.endedAt ? formatDuration((workout.endedAt - workout.startedAt) / 1000) : null;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/workout/[id]', params: { id: workout.id } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.surfaceAlt : 'transparent' }]}
    >
      <DateBadge at={workout.startedAt} color={colors.strength} />
      <View style={styles.flex}>
        <Txt variant="headline" numberOfLines={1}>
          {workout.title || 'Training'}
        </Txt>
        <Txt variant="footnote" color="textSecondary" numberOfLines={1}>
          {[duration, `${workout.setCount} Sätze`, workout.volume > 0 ? formatVolume(workout.volume) : null]
            .filter(Boolean)
            .join(' · ')}
        </Txt>
        <Txt variant="caption" color="textTertiary" numberOfLines={1}>
          {workout.exerciseNames.join(', ')}
        </Txt>
      </View>
      <Icon name="chevron-right" size={20} color={colors.textTertiary} />
    </Pressable>
  );
}

export function CardioSessionRow({ cardio }: { cardio: CardioSession }) {
  const { colors } = useTheme();
  const parts = [
    formatDuration(cardio.durationSec),
    cardio.distanceKm ? formatDistance(cardio.distanceKm) : null,
    cardio.kcal ? `${formatNumber(cardio.kcal, 0)} kcal` : null,
  ].filter(Boolean);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/cardio/edit', params: { id: cardio.id } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.surfaceAlt : 'transparent' }]}
    >
      <DateBadge at={cardio.startedAt} color={colors.cardio} />
      <View style={styles.flex}>
        <View style={styles.titleRow}>
          <Icon name={CARDIO_ICONS[cardio.type]} size={17} color={colors.cardio} />
          <Txt variant="headline" numberOfLines={1}>
            {CARDIO_LABELS[cardio.type]}
          </Txt>
        </View>
        <Txt variant="footnote" color="textSecondary" numberOfLines={1}>
          {parts.join(' · ')}
        </Txt>
        <Txt variant="caption" color="textTertiary">
          {formatTime(cardio.startedAt)} Uhr
        </Txt>
      </View>
      <Icon name="chevron-right" size={20} color={colors.textTertiary} />
    </Pressable>
  );
}

export function SessionRow({ session }: { session: Session }) {
  return session.kind === 'workout' ? (
    <WorkoutSessionRow workout={session.workout} />
  ) : (
    <CardioSessionRow cardio={session.cardio} />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dateBadge: {
    width: 48,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDay: { marginTop: -2 },
});
