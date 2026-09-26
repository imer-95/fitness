import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatRest } from '@/domain/dates';
import { formatNumber } from '@/domain/format';
import { MUSCLE_LABELS } from '@/domain/labels';
import type { PrEvent } from '@/domain/stats';
import { formatSet, PR_LABELS, weightAnnotation } from '@/domain/strength';
import type { Exercise, Workout } from '@/domain/types';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/Icon';
import { Txt } from '@/ui/Text';
import { radius, spacing, useTheme, withAlpha } from '@/ui/theme';

export function prValueText(pr: PrEvent): string {
  switch (pr.type) {
    case 'weight':
      return `${formatNumber(pr.weight ?? 0, 2)} kg × ${pr.reps ?? 0}`;
    case 'e1rm':
      return `${formatNumber(pr.value, 1)} kg 1RM (${formatNumber(pr.weight ?? 0, 2)} × ${pr.reps ?? 0})`;
    case 'reps':
      return `${pr.reps} Wiederholungen`;
    case 'duration':
      return `${pr.durationSec} Sekunden`;
    default:
      return formatNumber(pr.value, 1);
  }
}

const PR_PRIORITY: PrEvent['type'][] = ['weight', 'e1rm', 'reps', 'duration', 'volume'];

/** One record per exercise (the most meaningful type). */
export function uniqueRecords(prs: readonly PrEvent[]): PrEvent[] {
  const best = new Map<string, PrEvent>();
  for (const pr of prs) {
    const current = best.get(pr.exerciseId);
    if (!current || PR_PRIORITY.indexOf(pr.type) < PR_PRIORITY.indexOf(current.type)) best.set(pr.exerciseId, pr);
  }
  return [...best.values()];
}

export function RecordsCard({ prs: allPrs, exercises }: { prs: PrEvent[]; exercises: ReadonlyMap<string, Exercise> }) {
  const { colors } = useTheme();
  const prs = uniqueRecords(allPrs);
  if (prs.length === 0) return null;
  return (
    <Card tint={withAlpha(colors.gold, 0.12)} style={styles.gap}>
      <View style={styles.row}>
        <Icon name="trophy" size={22} color={colors.gold} />
        <Txt variant="headline">
          {prs.length === 1 ? 'Neuer persönlicher Rekord' : `${prs.length} neue persönliche Rekorde`}
        </Txt>
      </View>
      {prs.map((pr, i) => (
        <View key={i} style={styles.prRow}>
          <Txt variant="callout" weight="600" style={styles.flex} numberOfLines={2}>
            {exercises.get(pr.exerciseId)?.name ?? 'Übung'}
          </Txt>
          <View style={styles.prValue}>
            <Txt variant="footnote" weight="700" tabular>
              {prValueText(pr)}
            </Txt>
            <Txt variant="caption" color="textSecondary">
              {PR_LABELS[pr.type]}
            </Txt>
          </View>
        </View>
      ))}
    </Card>
  );
}

export function WorkoutExerciseList({
  workout,
  exercises,
  prs,
}: {
  workout: Workout;
  exercises: ReadonlyMap<string, Exercise>;
  prs: PrEvent[];
}) {
  const { colors } = useTheme();
  return (
    <>
      {workout.exercises.map((we, index) => {
        const ex = exercises.get(we.exerciseId);
        const annotation = ex ? weightAnnotation(ex) : '';
        const record = uniqueRecords(prs).find((p) => p.exerciseId === we.exerciseId) ?? null;
        // Mark only the first set that produced the record.
        const recordSetId = record
          ? (we.sets.find(
              (s) => s.reps === record.reps && s.weight === record.weight && s.durationSec === record.durationSec,
            )?.id ?? null)
          : null;
        return (
          <Card key={we.id} style={styles.gapSm}>
            <Pressable
              onPress={() => router.push({ pathname: '/exercises/[id]', params: { id: we.exerciseId } })}
              accessibilityRole="button"
              style={styles.header}
            >
              <View style={[styles.number, { backgroundColor: withAlpha(colors.primary, 0.14) }]}>
                <Txt variant="subhead" color="primary" weight="800">
                  {index + 1}
                </Txt>
              </View>
              <View style={styles.flex}>
                <Txt variant="headline" numberOfLines={2}>
                  {ex?.name ?? 'Unbekannte Übung'}
                </Txt>
                <Txt variant="caption" color="textSecondary">
                  {ex ? MUSCLE_LABELS[ex.muscle] : ''}
                  {annotation ? ` · ${annotation}` : ''}
                  {we.restSeconds ? ` · Pause ${formatRest(we.restSeconds)}` : ''}
                </Txt>
              </View>
              {record ? <Icon name="trophy" size={18} color={colors.gold} /> : null}
              <Icon name="chevron-right" size={18} color={colors.textTertiary} />
            </Pressable>
            {we.sets.map((set, i) => {
              const isRecord = set.id === recordSetId;
              return (
                <View key={set.id} style={styles.setRow}>
                  <Txt
                    variant="footnote"
                    color={set.kind === 'warmup' ? 'warning' : 'textTertiary'}
                    style={styles.setIndex}
                    weight="700"
                  >
                    {set.kind === 'warmup' ? 'W' : set.kind === 'drop' ? 'D' : set.kind === 'failure' ? 'V' : i + 1}
                  </Txt>
                  <Txt variant="callout" tabular style={styles.flex}>
                    {formatSet(set, ex?.tracking ?? 'weight_reps')}
                  </Txt>
                  {isRecord ? <Icon name="trophy" size={15} color={colors.gold} /> : null}
                </View>
              );
            })}
            {we.notes ? (
              <View style={[styles.note, { backgroundColor: colors.surfaceAlt }]}>
                <Txt variant="footnote" color="textSecondary">
                  {we.notes}
                </Txt>
              </View>
            ) : null}
          </Card>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: spacing.sm },
  gapSm: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  prRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  prValue: { alignItems: 'flex-end' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  number: { width: 30, height: 30, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.xs },
  setIndex: { width: 24, textAlign: 'center' },
  note: { borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.xs },
});
