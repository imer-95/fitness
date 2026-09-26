import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { formatRest } from '@/domain/dates';
import { formatNumber, toInputValue } from '@/domain/format';
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from '@/domain/labels';
import { weightAnnotation } from '@/domain/strength';
import type { Exercise } from '@/domain/types';
import type { DraftExercise, DraftSet } from '@/state/activeWorkout';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/Icon';
import { Txt } from '@/ui/Text';
import { noOutline, radius, spacing, useTheme, withAlpha } from '@/ui/theme';

import { SetRow, SetTableHeader } from './SetRow';

export interface ExerciseCardProps {
  item: DraftExercise;
  /** Live exercise data (name may have changed), falls back to the snapshot. */
  exercise?: Exercise;
  showNotes: boolean;
  /** Progression tip ("Zeit für 52,5 kg?"), hidden when editing old workouts. */
  showSuggestion?: boolean;
  onMenu: () => void;
  onOpenRest: () => void;
  onChangeSet: (setId: string, patch: Partial<Pick<DraftSet, 'weight' | 'reps' | 'duration' | 'side'>>) => void;
  onToggleSet: (setId: string) => void;
  onSetMenu: (setId: string) => void;
  onAddSet: () => void;
  onNotes: (text: string) => void;
}

export function ExerciseCard({
  item,
  exercise,
  showNotes,
  showSuggestion = true,
  onMenu,
  onOpenRest,
  onChangeSet,
  onToggleSet,
  onSetMenu,
  onAddSet,
  onNotes,
}: ExerciseCardProps) {
  const { colors } = useTheme();
  const ex = exercise ?? item.exercise;
  const annotation = weightAnnotation(ex);
  const done = item.sets.filter((s) => s.done).length;
  const allDone = done === item.sets.length && item.sets.length > 0;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Txt variant="title3" numberOfLines={2}>
            {ex.name}
          </Txt>
          <View style={styles.meta}>
            <Txt variant="footnote" color="textSecondary">
              {MUSCLE_LABELS[ex.muscle]} · {EQUIPMENT_LABELS[ex.equipment]}
              {annotation ? ` · ${annotation}` : ''}
            </Txt>
          </View>
        </View>
        {allDone ? <Icon name="check-circle" size={22} color={colors.success} /> : null}
        <IconButton icon="dots-horizontal" size={36} accessibilityLabel="Übungsoptionen" onPress={onMenu} />
      </View>

      <View style={styles.chips}>
        <Pressable
          onPress={onOpenRest}
          accessibilityRole="button"
          accessibilityLabel="Pausenzeit ändern"
          style={({ pressed }) => [styles.pill, { backgroundColor: colors.surfaceAlt, opacity: pressed ? 0.7 : 1 }]}
        >
          <Icon name="timer-outline" size={14} color={colors.textSecondary} />
          <Txt variant="caption" color="textSecondary">
            Pause {formatRest(item.restSec)}
          </Txt>
        </Pressable>
        {showSuggestion && item.suggestion ? (
          <View style={[styles.pill, { backgroundColor: withAlpha(colors.gold, 0.16) }]}>
            <Icon name="lightbulb-on-outline" size={14} color={colors.gold} />
            <Txt variant="caption" color={colors.gold} weight="700">
              Zeit für {formatNumber(item.suggestion.weight, 2)} kg?
            </Txt>
          </View>
        ) : null}
      </View>

      {showNotes ? (
        <TextInput
          value={item.notes}
          onChangeText={onNotes}
          placeholder="Notiz zur Übung (z. B. Sitzhöhe 4)"
          placeholderTextColor={colors.textTertiary}
          multiline
          style={[styles.notes, noOutline, { color: colors.text, backgroundColor: colors.surfaceAlt }]}
        />
      ) : null}

      <SetTableHeader tracking={ex.tracking} unilateral={ex.unilateral} />
      {item.sets.map((set, index) => (
        <SetRow
          key={set.id}
          set={set}
          index={index}
          tracking={ex.tracking}
          unilateral={ex.unilateral}
          previous={item.previous[index]}
          onChange={(patch) => onChangeSet(set.id, patch)}
          onToggle={() => onToggleSet(set.id)}
          onMenu={() => onSetMenu(set.id)}
          onCopyPrevious={() => {
            const prev = item.previous[index];
            if (!prev) return;
            onChangeSet(set.id, {
              weight: toInputValue(prev.weight),
              reps: prev.reps != null ? String(prev.reps) : '',
              duration: prev.durationSec != null ? String(prev.durationSec) : '',
            });
          }}
        />
      ))}
      <Button
        label="Satz hinzufügen"
        icon="plus"
        variant="secondary"
        size="sm"
        onPress={onAddSet}
        style={styles.addSet}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: spacing.sm, paddingHorizontal: spacing.md },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  meta: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  notes: {
    borderRadius: radius.sm,
    padding: spacing.sm,
    minHeight: 40,
    fontSize: 14,
  },
  addSet: { marginTop: spacing.xs },
});
