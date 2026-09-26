import * as Clipboard from 'expo-clipboard';
import { Platform, Share } from 'react-native';

import { getExercisesByIds } from '@/db/repos/exercises';
import { toDateKey } from '@/domain/dates';
import { formatWorkoutNotes } from '@/domain/notes';
import type { Workout } from '@/domain/types';
import { toast } from '@/state/ui';

/** Workout as text in the familiar notes format ("10x40kg inkl. Stange" …). */
export async function workoutAsNotes(workout: Workout): Promise<string> {
  const exercises = await getExercisesByIds(workout.exercises.map((e) => e.exerciseId));
  return formatWorkoutNotes({
    date: toDateKey(workout.startedAt),
    title: workout.title,
    exercises: workout.exercises.map((we) => {
      const ex = exercises.get(we.exerciseId);
      return {
        name: ex?.name ?? 'Übung',
        tracking: ex?.tracking ?? 'weight_reps',
        weightMode: ex?.weightMode ?? 'total',
        barMode: ex?.barMode ?? 'none',
        restSeconds: we.restSeconds,
        sets: we.sets,
      };
    }),
  });
}

export async function shareWorkout(workout: Workout): Promise<void> {
  const text = await workoutAsNotes(workout);
  if (Platform.OS === 'web') {
    await Clipboard.setStringAsync(text);
    toast('In die Zwischenablage kopiert', { icon: 'content-copy' });
    return;
  }
  await Share.share({ message: text, title: workout.title });
}

export async function copyWorkout(workout: Workout): Promise<void> {
  await Clipboard.setStringAsync(await workoutAsNotes(workout));
  toast('In die Zwischenablage kopiert', { icon: 'content-copy' });
}
