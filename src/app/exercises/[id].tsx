import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProTeaser } from '@/components/pro/ProComponents';
import { getExercise } from '@/db/repos/exercises';
import { getExerciseHistory } from '@/db/repos/workouts';
import { useQuery } from '@/db/useQuery';
import { formatDateMedium, formatDayMonth, formatRest, toDateKey } from '@/domain/dates';
import { formatNumber, formatVolume } from '@/domain/format';
import { EQUIPMENT_LABELS, MUSCLE_LABELS, TRACKING_LABELS } from '@/domain/labels';
import {
  EMPTY_BESTS,
  detectPrs,
  estimate1RM,
  formatSet,
  hasBests,
  isWorkingSet,
  mergeBests,
  setVolume,
  weightAnnotation,
} from '@/domain/strength';
import { useIsPro } from '@/state/pro';
import { IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { LineChart } from '@/ui/charts/LineChart';
import { dayFromNumber, dayNumber } from '@/ui/charts/scale';
import { Segmented } from '@/ui/Chips';
import { Badge, EmptyState, Loading, StatGrid, StatTile } from '@/ui/Feedback';
import { Icon } from '@/ui/Icon';
import { Section } from '@/ui/List';
import { Screen } from '@/ui/Screen';
import { Txt } from '@/ui/Text';
import { spacing, useTheme } from '@/ui/theme';

type Metric = 'e1rm' | 'weight' | 'volume' | 'reps' | 'duration';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const isPro = useIsPro();
  const exercise = useQuery(() => getExercise(id), [id], ['exercises']);
  const history = useQuery(() => getExerciseHistory(id), [id], ['workouts']);
  const ex = exercise.data;
  const tracking = ex?.tracking ?? 'weight_reps';
  const [metric, setMetric] = useState<Metric>('e1rm');
  const activeMetric: Metric = tracking === 'reps' ? 'reps' : tracking === 'time' ? 'duration' : metric;

  const analysis = useMemo(() => {
    if (!ex || !history.data) return null;
    const chronological = [...history.data].reverse();
    let bests = EMPTY_BESTS;
    const prSets = new Set<string>();
    const series: Record<Metric, { x: number; y: number }[]> = {
      e1rm: [],
      weight: [],
      volume: [],
      reps: [],
      duration: [],
    };
    let totalVolume = 0;
    let totalSets = 0;
    for (const session of chronological) {
      const x = dayNumber(toDateKey(session.startedAt));
      let e1rm = 0;
      let weight = 0;
      let volume = 0;
      let reps = 0;
      let duration = 0;
      const canBreakRecords = hasBests(bests);
      for (const set of session.sets) {
        const values = { ...set };
        if (canBreakRecords && detectPrs(values, bests, ex.tracking).length > 0) prSets.add(set.id);
        bests = mergeBests(bests, values, ex);
        const v = setVolume(set, ex);
        volume += v;
        totalVolume += v;
        totalSets++;
        if (!isWorkingSet(set)) continue;
        if (set.weight && set.reps) {
          e1rm = Math.max(e1rm, estimate1RM(set.weight, set.reps));
          weight = Math.max(weight, set.weight);
        }
        reps = Math.max(reps, set.reps ?? 0);
        duration = Math.max(duration, set.durationSec ?? 0);
      }
      if (e1rm > 0) series.e1rm.push({ x, y: e1rm });
      if (weight > 0) series.weight.push({ x, y: weight });
      if (volume > 0) series.volume.push({ x, y: volume });
      if (reps > 0) series.reps.push({ x, y: reps });
      if (duration > 0) series.duration.push({ x, y: duration });
    }
    return { bests, prSets, series, totalVolume, totalSets };
  }, [ex, history.data]);

  if (exercise.loading && !ex) return <Loading />;
  if (!ex) {
    return (
      <Screen>
        <EmptyState icon="alert-circle-outline" title="Übung nicht gefunden" />
      </Screen>
    );
  }

  const annotation = weightAnnotation(ex);
  const sessions = history.data ?? [];
  const points = analysis?.series[activeMetric] ?? [];
  const unit = activeMetric === 'reps' ? 'Wdh.' : activeMetric === 'duration' ? 's' : 'kg';

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: ex.name,
          headerRight: () => (
            <IconButton
              icon="pencil-outline"
              size={34}
              accessibilityLabel="Übung bearbeiten"
              onPress={() => router.push({ pathname: '/exercises/edit', params: { id: ex.id } })}
            />
          ),
        }}
      />
      <View style={styles.badges}>
        <Badge label={MUSCLE_LABELS[ex.muscle]} icon="arm-flex" />
        <Badge label={EQUIPMENT_LABELS[ex.equipment]} color={colors.weight} />
        {annotation ? <Badge label={annotation} color={colors.protein} /> : null}
        {ex.unilateral ? <Badge label="Einseitig" color={colors.cardio} /> : null}
        <Badge label={`Pause ${formatRest(ex.restSeconds)}`} color={colors.textSecondary} icon="timer-outline" />
      </View>
      {ex.notes ? (
        <Card>
          <Txt variant="callout">{ex.notes}</Txt>
        </Card>
      ) : null}

      <StatGrid>
        {tracking === 'weight_reps' ? (
          <>
            <StatTile
              label="Höchstes Gewicht"
              value={formatNumber(analysis?.bests.maxWeight ?? 0, 2)}
              unit="kg"
              icon="trophy-outline"
              color={colors.gold}
            />
            <StatTile
              label="Bestes 1RM (geschätzt)"
              value={formatNumber(analysis?.bests.maxE1rm ?? 0, 1)}
              unit="kg"
              icon="chart-line"
            />
          </>
        ) : tracking === 'reps' ? (
          <StatTile
            label="Meiste Wiederholungen"
            value={formatNumber(analysis?.bests.maxReps ?? 0, 0)}
            icon="trophy-outline"
            color={colors.gold}
          />
        ) : (
          <StatTile
            label="Längste Dauer"
            value={formatNumber(analysis?.bests.maxDuration ?? 0, 0)}
            unit="s"
            icon="trophy-outline"
            color={colors.gold}
          />
        )}
        <StatTile label="Einheiten" value={String(sessions.length)} icon="calendar-check" />
        <StatTile
          label={tracking === 'weight_reps' ? 'Gesamtvolumen' : 'Sätze gesamt'}
          value={
            tracking === 'weight_reps'
              ? formatVolume(analysis?.totalVolume ?? 0).replace(' kg', '')
              : String(analysis?.totalSets ?? 0)
          }
          unit={tracking === 'weight_reps' ? 'kg' : undefined}
          icon="weight"
        />
      </StatGrid>

      {!isPro ? (
        <ProTeaser feature="exerciseCharts" />
      ) : (
        <Card style={styles.gap}>
          <Txt variant="headline">Entwicklung</Txt>
          {tracking === 'weight_reps' ? (
            <Segmented<Metric>
              options={[
                { value: 'e1rm', label: '1RM' },
                { value: 'weight', label: 'Gewicht' },
                { value: 'volume', label: 'Volumen' },
              ]}
              value={activeMetric}
              onChange={setMetric}
            />
          ) : null}
          {points.length > 0 ? (
            <LineChart
              series={[{ key: 'm', points, color: colors.primary, dots: true, area: true }]}
              formatY={(v) => formatNumber(v, v < 10 ? 1 : 0)}
              formatX={(x) => formatDayMonth(dayFromNumber(x))}
              formatTooltip={(p) => `${formatNumber(p.y, 1)} ${unit} · ${formatDayMonth(dayFromNumber(p.x))}`}
              minYRange={activeMetric === 'volume' ? 100 : 5}
            />
          ) : (
            <Txt variant="footnote" color="textSecondary">
              Noch keine Daten – absolviere diese Übung in einem Training.
            </Txt>
          )}
          <Txt variant="caption" color="textTertiary">
            {activeMetric === 'e1rm'
              ? 'Geschätztes Maximalgewicht für eine Wiederholung (Epley-Formel) – bester Satz je Training.'
              : activeMetric === 'volume'
                ? 'Wiederholungen × Gewicht aller Sätze je Training.'
                : `${TRACKING_LABELS[tracking]} – bester Satz je Training.`}
          </Txt>
        </Card>
      )}

      <Section title="Verlauf">
        {sessions.length === 0 ? (
          <Card>
            <EmptyState compact icon="history" title="Noch nicht trainiert" />
          </Card>
        ) : null}
        {sessions.map((s) => (
          <Card key={s.workoutExerciseId} style={styles.gapSm}>
            <Pressable
              onPress={() => router.push({ pathname: '/workout/[id]', params: { id: s.workoutId } })}
              accessibilityRole="button"
              style={styles.sessionHeader}
            >
              <Txt variant="headline" style={styles.flex}>
                {formatDateMedium(toDateKey(s.startedAt))}
              </Txt>
              <Txt variant="footnote" color="textSecondary" numberOfLines={1} style={styles.sessionTitle}>
                {s.title}
              </Txt>
              <Icon name="chevron-right" size={18} color={colors.textTertiary} />
            </Pressable>
            {s.sets.map((set, i) => (
              <View key={set.id} style={styles.setRow}>
                <Txt variant="footnote" color="textTertiary" style={styles.setIndex}>
                  {set.kind === 'warmup' ? 'W' : i + 1}
                </Txt>
                <Txt variant="callout" tabular style={styles.flex}>
                  {formatSet(set, ex.tracking)}
                </Txt>
                {set.weight && set.reps && ex.tracking === 'weight_reps' ? (
                  <Txt variant="caption" color="textTertiary">
                    1RM {formatNumber(estimate1RM(set.weight, set.reps), 1)}
                  </Txt>
                ) : null}
                {analysis?.prSets.has(set.id) ? <Icon name="trophy" size={16} color={colors.gold} /> : null}
              </View>
            ))}
            {s.notes ? (
              <Txt variant="footnote" color="textSecondary">
                📝 {s.notes}
              </Txt>
            ) : null}
          </Card>
        ))}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gap: { gap: spacing.md },
  gapSm: { gap: spacing.xs },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  sessionTitle: { maxWidth: '50%' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  setIndex: { width: 18, textAlign: 'center' },
});
