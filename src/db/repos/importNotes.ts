import { dateKeyWithTime, endOfDayMs, startOfDayMs } from '@/domain/dates';
import { createId } from '@/domain/id';
import {
  guessEquipment,
  guessMuscle,
  matchExercise,
  normalizeName,
  titleFromMuscles,
  type ParsedExercise,
  type ParseResult,
} from '@/domain/notes';
import type { DateKey, Equipment, Exercise, MuscleGroup, Workout, WorkoutSummary } from '@/domain/types';

import { addExerciseAlias, createExercise, getExercisesByIds, listExercises, updateExercise } from './exercises';
import { listWorkoutSummaries, saveWorkout } from './workouts';

export interface NewExerciseDraft {
  name: string;
  muscle: MuscleGroup;
  equipment: Equipment;
}

export interface ImportExercisePlan {
  parsed: ParsedExercise;
  /** Library exercise, or `null` to create `newExercise`. */
  exerciseId: string | null;
  /** How the match was found — shown in the preview. */
  match: 'exact' | 'fuzzy' | 'manual' | 'new';
  newExercise: NewExerciseDraft;
}

export interface ImportWorkoutPlan {
  key: string;
  date: DateKey;
  title: string;
  notes: string | null;
  exercises: ImportExercisePlan[];
  /** Workouts that already exist on that day (possible duplicate). */
  existing: WorkoutSummary[];
}

/** Matches all parsed exercises against the library and prepares the preview. */
export async function buildImportPlan(result: ParseResult, fallbackDate: DateKey): Promise<ImportWorkoutPlan[]> {
  const library = await listExercises();
  const byId = new Map(library.map((e) => [e.id, e]));
  const plans: ImportWorkoutPlan[] = [];
  for (const w of result.workouts) {
    const date = w.date ?? fallbackDate;
    const exercises: ImportExercisePlan[] = w.exercises.map((parsed) => {
      const match = matchExercise(parsed.name, library);
      return {
        parsed,
        exerciseId: match?.id ?? null,
        match: match ? (match.exact ? 'exact' : 'fuzzy') : 'new',
        newExercise: {
          name: parsed.name,
          muscle: guessMuscle(parsed.name),
          equipment: guessEquipment(parsed.name),
        },
      };
    });
    const muscles = exercises.map((e) =>
      e.exerciseId ? (byId.get(e.exerciseId)?.muscle ?? 'other') : e.newExercise.muscle,
    );
    const existing = await listWorkoutSummaries({ fromMs: startOfDayMs(date), toMs: endOfDayMs(date) });
    plans.push({
      key: createId(),
      date,
      title: w.title ?? titleFromMuscles(muscles),
      notes: w.notes,
      exercises,
      existing,
    });
  }
  return plans;
}

/** Aligns the exercise settings with what the notes say (only upgrades defaults). */
function settingsPatch(exercise: Exercise, parsed: ParsedExercise): Partial<Exercise> {
  const patch: Partial<Exercise> = {};
  if (parsed.weightMode === 'per_side' && exercise.weightMode === 'total') patch.weightMode = 'per_side';
  if (parsed.barMode !== 'none' && exercise.barMode === 'none') patch.barMode = parsed.barMode;
  if (parsed.unilateral && !exercise.unilateral) patch.unilateral = true;
  if (parsed.tracking === 'weight_reps' && exercise.tracking === 'reps') patch.tracking = 'weight_reps';
  return patch;
}

/**
 * Saves the planned workouts. New exercises are created once per name,
 * imported names are remembered as aliases for the next import.
 */
export async function importWorkouts(
  plans: readonly ImportWorkoutPlan[],
  options: { rememberAliases?: boolean; hour?: number } = {},
): Promise<string[]> {
  const rememberAliases = options.rememberAliases ?? true;
  const created = new Map<string, Exercise>();
  const ids: string[] = [];

  for (const plan of plans) {
    const resolved: { plan: ImportExercisePlan; exercise: Exercise }[] = [];
    const existingIds = plan.exercises.map((e) => e.exerciseId).filter((id): id is string => id != null);
    const existing = await getExercisesByIds(existingIds);

    for (const e of plan.exercises) {
      let exercise = e.exerciseId ? existing.get(e.exerciseId) : undefined;
      if (!exercise) {
        const key = normalizeName(e.newExercise.name);
        exercise = created.get(key);
        if (!exercise) {
          exercise = await createExercise({
            name: e.newExercise.name,
            muscle: e.newExercise.muscle,
            equipment: e.newExercise.equipment,
            tracking: e.parsed.tracking,
            weightMode: e.parsed.weightMode,
            barMode: e.parsed.barMode,
            unilateral: e.parsed.unilateral,
            restSeconds: e.parsed.restSec ?? 90,
            isCustom: true,
          });
          created.set(key, exercise);
        }
      } else {
        const patch = settingsPatch(exercise, e.parsed);
        if (Object.keys(patch).length > 0) {
          await updateExercise(exercise.id, patch);
          exercise = { ...exercise, ...patch };
          existing.set(exercise.id, exercise);
        }
        if (rememberAliases) await addExerciseAlias(exercise.id, e.parsed.name);
      }
      resolved.push({ plan: e, exercise });
    }

    const workout: Workout = {
      id: createId(),
      title: plan.title.trim() || 'Training',
      startedAt: dateKeyWithTime(plan.date, options.hour ?? 18, 0),
      endedAt: null,
      notes: plan.notes,
      templateId: null,
      source: 'import',
      exercises: resolved.map(({ plan: e, exercise }) => ({
        id: createId(),
        exerciseId: exercise.id,
        restSeconds: e.parsed.restSec,
        notes: e.parsed.notes,
        sets: e.parsed.sets.map((s) => ({
          id: createId(),
          reps: s.reps,
          weight: s.weight,
          durationSec: s.durationSec,
          side: s.side,
          kind: 'normal' as const,
          rpe: null,
          restSec: s.restSec,
          note: s.note,
        })),
      })),
    };
    await saveWorkout(workout);
    ids.push(workout.id);
  }
  return ids;
}
