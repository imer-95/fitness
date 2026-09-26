import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RecordsCard } from '@/components/workout/WorkoutDetails';
import { listExercises } from '@/db/repos/exercises';
import { analyzeTrainingHistory } from '@/db/repos/stats';
import { nextTemplatePosition, saveTemplate, templateFromWorkout } from '@/db/repos/templates';
import { getWorkout } from '@/db/repos/workouts';
import { useQuery } from '@/db/useQuery';
import { formatDateLong, formatDuration, toDateKey } from '@/domain/dates';
import { formatVolume } from '@/domain/format';
import { setVolume } from '@/domain/strength';
import { shareWorkout } from '@/features/shareWorkout';
import { toast } from '@/state/ui';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Loading, StatGrid, StatTile } from '@/ui/Feedback';
import { Icon } from '@/ui/Icon';
import { Txt } from '@/ui/Text';
import { ToastHost } from '@/ui/Toast';
import { radius, spacing, useTheme, withAlpha } from '@/ui/theme';

export default function WorkoutSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const workout = useQuery(() => getWorkout(id), [id], ['workouts']);
  const exercises = useQuery(() => listExercises({ includeArchived: true }), [], ['exercises']);
  const prs = useQuery(
    async () => (await analyzeTrainingHistory()).prs.filter((p) => p.workoutId === id),
    [id],
    ['workouts'],
  );
  const exerciseMap = useMemo(() => new Map((exercises.data ?? []).map((e) => [e.id, e])), [exercises.data]);

  const w = workout.data;
  if (!w) return <Loading />;

  const sets = w.exercises.reduce((n, e) => n + e.sets.length, 0);
  const volume = w.exercises.reduce((sum, we) => {
    const ex = exerciseMap.get(we.exerciseId);
    return sum + (ex ? we.sets.reduce((s, set) => s + setVolume(set, ex), 0) : 0);
  }, 0);
  const duration = w.endedAt ? (w.endedAt - w.startedAt) / 1000 : 0;
  const records = prs.data ?? [];

  const saveAsTemplate = async () => {
    const template = templateFromWorkout(w, w.title || 'Mein Plan', await nextTemplatePosition());
    await saveTemplate(template);
    toast('Als Plan gespeichert', { message: 'Beim nächsten Mal mit einem Tipp starten.' });
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
        ]}
      >
        <View style={styles.hero}>
          <View
            style={[
              styles.heroIcon,
              { backgroundColor: withAlpha(records.length ? colors.gold : colors.success, 0.16) },
            ]}
          >
            <Icon
              name={records.length ? 'trophy' : 'check-decagram'}
              size={44}
              color={records.length ? colors.gold : colors.success}
            />
          </View>
          <Txt variant="title1" align="center">
            {records.length ? 'Rekordverdächtig! 🏆' : 'Stark gemacht! 💪'}
          </Txt>
          <Txt variant="callout" color="textSecondary" align="center">
            {w.title} · {formatDateLong(toDateKey(w.startedAt))}
          </Txt>
        </View>

        <StatGrid>
          <StatTile label="Dauer" value={duration ? formatDuration(duration) : '–'} icon="timer-outline" />
          <StatTile label="Übungen" value={String(w.exercises.length)} icon="dumbbell" />
          <StatTile label="Sätze" value={String(sets)} icon="format-list-numbered" />
          <StatTile
            label="Volumen"
            value={formatVolume(volume).replace(' kg', '')}
            unit="kg"
            icon="weight"
            color={colors.primary}
          />
        </StatGrid>

        <RecordsCard prs={records} exercises={exerciseMap} />

        <Card style={styles.gap}>
          <Txt variant="headline">Übersicht</Txt>
          {w.exercises.map((we) => (
            <View key={we.id} style={styles.row}>
              <Txt variant="callout" style={styles.flex} numberOfLines={1}>
                {exerciseMap.get(we.exerciseId)?.name ?? 'Übung'}
              </Txt>
              <Txt variant="footnote" color="textSecondary">
                {we.sets.length} {we.sets.length === 1 ? 'Satz' : 'Sätze'}
              </Txt>
            </View>
          ))}
        </Card>

        <View style={[styles.actionsBox, { borderColor: colors.border }]}>
          {!w.templateId ? (
            <Button
              label="Als Plan speichern"
              icon="clipboard-list-outline"
              variant="secondary"
              full
              onPress={saveAsTemplate}
            />
          ) : null}
          <Button
            label="Als Text teilen"
            icon="share-variant"
            variant="secondary"
            full
            onPress={() => shareWorkout(w)}
          />
          <Button label="Fertig" icon="check" size="lg" full onPress={() => router.back()} />
        </View>
      </ScrollView>
      <ToastHost />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  heroIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  gap: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  actionsBox: { gap: spacing.sm, borderRadius: radius.xl },
});
