import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { RecordsCard, WorkoutExerciseList } from '@/components/workout/WorkoutDetails';
import { listExercises } from '@/db/repos/exercises';
import { analyzeTrainingHistory } from '@/db/repos/stats';
import { nextTemplatePosition, saveTemplate, templateFromWorkout } from '@/db/repos/templates';
import { deleteWorkout, getWorkout } from '@/db/repos/workouts';
import { useQuery } from '@/db/useQuery';
import { formatDateLong, formatDuration, formatTime, toDateKey } from '@/domain/dates';
import { formatVolume } from '@/domain/format';
import { setVolume } from '@/domain/strength';
import { editWorkout, repeatWorkout } from '@/features/workoutActions';
import { copyWorkout, shareWorkout } from '@/features/shareWorkout';
import { toast } from '@/state/ui';
import { Button, IconButton } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { confirm } from '@/ui/dialogs';
import { Badge, EmptyState, Loading, StatGrid, StatTile } from '@/ui/Feedback';
import { Screen } from '@/ui/Screen';
import { SelectSheet } from '@/ui/Sheet';
import { Txt } from '@/ui/Text';
import { spacing, useTheme } from '@/ui/theme';

type Action = 'edit' | 'repeat' | 'template' | 'share' | 'copy' | 'delete';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [menu, setMenu] = useState(false);
  const workout = useQuery(() => getWorkout(id), [id], ['workouts']);
  const exercises = useQuery(() => listExercises({ includeArchived: true }), [], ['exercises']);
  const prs = useQuery(
    async () => (await analyzeTrainingHistory()).prs.filter((p) => p.workoutId === id),
    [id],
    ['workouts'],
  );
  const exerciseMap = useMemo(() => new Map((exercises.data ?? []).map((e) => [e.id, e])), [exercises.data]);

  const w = workout.data;
  if (workout.loading && !w) return <Loading />;
  if (!w) {
    return (
      <Screen>
        <EmptyState
          icon="alert-circle-outline"
          title="Training nicht gefunden"
          message="Es wurde vermutlich gelöscht."
        />
      </Screen>
    );
  }

  const sets = w.exercises.reduce((n, e) => n + e.sets.length, 0);
  const volume = w.exercises.reduce(
    (sum, we) =>
      sum +
      we.sets.reduce(
        (s, set) => s + (exerciseMap.get(we.exerciseId) ? setVolume(set, exerciseMap.get(we.exerciseId)!) : 0),
        0,
      ),
    0,
  );
  const duration = w.endedAt ? (w.endedAt - w.startedAt) / 1000 : null;

  const onAction = async (action: Action) => {
    switch (action) {
      case 'edit':
        await editWorkout(w.id);
        break;
      case 'repeat':
        await repeatWorkout(w);
        break;
      case 'template': {
        const template = templateFromWorkout(w, w.title || 'Mein Plan', await nextTemplatePosition());
        await saveTemplate(template);
        toast('Als Plan gespeichert', { message: 'Du findest ihn im Tab „Training“.' });
        router.push({ pathname: '/templates/edit', params: { id: template.id } });
        break;
      }
      case 'share':
        await shareWorkout(w);
        break;
      case 'copy':
        await copyWorkout(w);
        break;
      case 'delete':
        if (
          await confirm('Training löschen?', 'Das Training und alle Sätze werden endgültig gelöscht.', {
            confirmLabel: 'Löschen',
            destructive: true,
          })
        ) {
          await deleteWorkout(w.id);
          toast('Training gelöscht');
          router.back();
        }
        break;
    }
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: w.title || 'Training',
          headerRight: () => (
            <IconButton icon="dots-horizontal" size={34} accessibilityLabel="Aktionen" onPress={() => setMenu(true)} />
          ),
        }}
      />
      <View style={styles.header}>
        <Txt variant="title2">{w.title || 'Training'}</Txt>
        <Txt variant="subhead" color="textSecondary">
          {formatDateLong(toDateKey(w.startedAt))}
          {w.source === 'import'
            ? ''
            : ` · ${formatTime(w.startedAt)}${w.endedAt ? `–${formatTime(w.endedAt)}` : ''} Uhr`}
        </Txt>
        {w.source === 'import' ? (
          <Badge label="Aus Notizen importiert" icon="clipboard-text-outline" color={colors.weight} />
        ) : null}
      </View>

      <StatGrid>
        <StatTile label="Dauer" value={duration ? formatDuration(duration) : '–'} icon="timer-outline" />
        <StatTile label="Übungen" value={String(w.exercises.length)} icon="dumbbell" />
        <StatTile label="Sätze" value={String(sets)} icon="format-list-numbered" />
        <StatTile label="Volumen" value={formatVolume(volume).replace(' kg', '')} unit="kg" icon="weight" />
      </StatGrid>

      <RecordsCard prs={prs.data ?? []} exercises={exerciseMap} />
      <WorkoutExerciseList workout={w} exercises={exerciseMap} prs={prs.data ?? []} />

      {w.notes ? (
        <Card style={styles.gap}>
          <Txt variant="headline">Notizen</Txt>
          <Txt variant="callout">{w.notes}</Txt>
        </Card>
      ) : null}

      <View style={styles.actions}>
        <Button
          label="Wiederholen"
          icon="repeat"
          variant="tinted"
          style={styles.flex}
          onPress={() => onAction('repeat')}
        />
        <Button
          label="Teilen"
          icon="share-variant"
          variant="secondary"
          style={styles.flex}
          onPress={() => onAction('share')}
        />
      </View>

      <SelectSheet<Action>
        visible={menu}
        onClose={() => setMenu(false)}
        title="Training"
        options={[
          { value: 'edit', label: 'Bearbeiten', icon: 'pencil-outline' },
          { value: 'repeat', label: 'Erneut trainieren', icon: 'repeat' },
          { value: 'template', label: 'Als Plan speichern', icon: 'clipboard-list-outline' },
          { value: 'share', label: 'Als Text teilen', description: 'Im Format deiner Notizen', icon: 'share-variant' },
          { value: 'copy', label: 'Text kopieren', icon: 'content-copy' },
          { value: 'delete', label: 'Löschen', icon: 'delete-outline', destructive: true },
        ]}
        onSelect={(a) => void onAction(a)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: spacing.xs },
  gap: { gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.md },
});
