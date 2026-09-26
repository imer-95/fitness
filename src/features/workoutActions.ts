import { router } from 'expo-router';

import { getWorkout } from '@/db/repos/workouts';
import type { Template, Workout } from '@/domain/types';
import { useActiveWorkout } from '@/state/activeWorkout';
import { choose } from '@/ui/dialogs';

/**
 * Makes sure no other workout is running. Returns false if the user wants to
 * keep (and was sent to) the running workout.
 */
async function canStartNew(): Promise<boolean> {
  const draft = useActiveWorkout.getState().draft;
  if (!draft) return true;
  const choice = await choose(
    draft.editingId ? 'Bearbeitung offen' : 'Training läuft bereits',
    draft.editingId
      ? 'Du bearbeitest gerade ein Training. Möchtest du die Änderungen verwerfen?'
      : `„${draft.title}“ ist noch nicht beendet.`,
    [
      { label: 'Fortsetzen', value: 'resume' as const },
      { label: 'Verwerfen & neu starten', value: 'discard' as const, style: 'destructive' },
      { label: 'Abbrechen', value: 'cancel' as const, style: 'cancel' },
    ],
  );
  if (choice === 'resume') {
    router.push('/workout/active');
    return false;
  }
  if (choice === 'discard') {
    useActiveWorkout.getState().discard();
    return true;
  }
  return false;
}

export async function startEmptyWorkout(): Promise<void> {
  if (!(await canStartNew())) return;
  useActiveWorkout.getState().startEmpty();
  router.push('/workout/active');
}

export async function startTemplateWorkout(template: Template): Promise<void> {
  if (!(await canStartNew())) return;
  await useActiveWorkout.getState().startFromTemplate(template);
  router.push('/workout/active');
}

export async function repeatWorkout(workout: Workout): Promise<void> {
  if (!(await canStartNew())) return;
  await useActiveWorkout.getState().startFromWorkout(workout, { edit: false });
  router.push('/workout/active');
}

export async function editWorkout(workoutId: string): Promise<void> {
  const workout = await getWorkout(workoutId);
  if (!workout) return;
  if (!(await canStartNew())) return;
  await useActiveWorkout.getState().startFromWorkout(workout, { edit: true });
  router.push('/workout/active');
}
