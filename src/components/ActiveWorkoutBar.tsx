import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatClock } from '@/domain/dates';
import { useNow } from '@/hooks/useNow';
import { draftStats, useActiveWorkout } from '@/state/activeWorkout';
import { useRestTimer } from '@/state/restTimer';
import { Icon } from '@/ui/Icon';
import { Txt } from '@/ui/Text';
import { radius, spacing, useTheme } from '@/ui/theme';

/** Compact bar above the tab bar while a workout is running. */
export function ActiveWorkoutBar() {
  const draft = useActiveWorkout((s) => s.draft);
  const restEnd = useRestTimer((s) => s.endAt);
  const now = useNow(1000, !!draft);
  const { colors } = useTheme();
  if (!draft) return null;
  const stats = draftStats(draft);
  const rest = restEnd ? Math.max(0, Math.ceil((restEnd - now) / 1000)) : 0;
  const editing = !!draft.editingId;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.tabBar }]}>
      <Pressable
        onPress={() => router.push('/workout/active')}
        accessibilityRole="button"
        accessibilityLabel="Laufendes Training öffnen"
        style={({ pressed }) => [styles.bar, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}
      >
        <View style={styles.pulse}>
          <Icon name={editing ? 'pencil' : 'dumbbell'} size={20} color={colors.onPrimary} />
        </View>
        <View style={styles.flex}>
          <Txt variant="headline" color="onPrimary" numberOfLines={1}>
            {editing ? 'Bearbeitung: ' : ''}
            {draft.title}
          </Txt>
          <Txt variant="caption" color="onPrimary" style={styles.sub} numberOfLines={1}>
            {editing
              ? `${stats.done} Sätze`
              : `${formatClock((now - draft.startedAt) / 1000)} · ${stats.done}/${stats.total} Sätze`}
            {rest > 0 ? ` · Pause ${formatClock(rest)}` : ''}
          </Txt>
        </View>
        <Txt variant="subhead" color="onPrimary" weight="700">
          Fortsetzen
        </Txt>
        <Icon name="chevron-right" size={20} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  pulse: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sub: { opacity: 0.9 },
});
