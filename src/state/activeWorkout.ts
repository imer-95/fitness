import { create } from 'zustand';

import { getExercise, getExercisesByIds } from '@/db/repos/exercises';
import { kvGetRaw, kvSetRaw } from '@/db/repos/kv';
import { markTemplateUsed } from '@/db/repos/templates';
import { getExerciseContext, saveWorkout, type ExerciseSession } from '@/db/repos/workouts';
import { db } from '@/db/sql';
import { parseDecimal, parseInteger, toInputValue } from '@/domain/format';
import { createId } from '@/domain/id';
import { titleFromMuscles } from '@/domain/notes';
import {
  detectPrs,
  EMPTY_BESTS,
  hasBests,
  mergeBests,
  progressionHint,
  setVolume,
  type SetValues,
} from '@/domain/strength';
import type {
  Exercise,
  ExerciseBests,
  PrType,
  SetKind,
  Side,
  Template,
  TemplateSet,
  Workout,
  WorkoutSource,
} from '@/domain/types';

import { useRestTimer } from './restTimer';
import { getSettings } from './settings';

export interface SetHint {
  weight: number | null;
  reps: number | null;
  durationSec: number | null;
}

export interface DraftSet {
  id: string;
  kind: SetKind;
  side: Side | null;
  /** Raw input text (German decimal comma allowed). */
  weight: string;
  reps: string;
  duration: string;
  done: boolean;
  doneAt: number | null;
  prs: PrType[];
  /** Placeholder shown for empty inputs and used when the set is checked off. */
  hint: SetHint;
}

export interface PreviousSet {
  reps: number | null;
  weight: number | null;
  durationSec: number | null;
  side: Side | null;
}

export interface DraftExercise {
  id: string;
  exerciseId: string;
  /** Snapshot of the exercise configuration when it was added. */
  exercise: Exercise;
  restSec: number;
  notes: string;
  sets: DraftSet[];
  previous: PreviousSet[];
  previousAt: number | null;
  bests: ExerciseBests;
  suggestion: { weight: number; reps: number } | null;
}

export interface DraftWorkout {
  id: string;
  title: string;
  titleEdited: boolean;
  startedAt: number;
  endedAt: number | null;
  templateId: string | null;
  notes: string;
  /** Set when an existing workout is edited. */
  editingId: string | null;
  source: WorkoutSource;
  exercises: DraftExercise[];
}

type SetPatch = Partial<Pick<DraftSet, 'weight' | 'reps' | 'duration' | 'kind' | 'side'>>;

interface ActiveWorkoutState {
  draft: DraftWorkout | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  startEmpty: () => void;
  startFromTemplate: (template: Template) => Promise<void>;
  /** Repeat a past workout (`edit: false`) or edit it in place (`edit: true`). */
  startFromWorkout: (workout: Workout, options: { edit: boolean }) => Promise<void>;
  addExercises: (exerciseIds: string[]) => Promise<void>;
  replaceExercise: (draftExerciseId: string, exerciseId: string) => Promise<void>;
  removeExercise: (draftExerciseId: string) => void;
  moveExercise: (draftExerciseId: string, direction: -1 | 1) => void;
  addSet: (draftExerciseId: string) => void;
  removeSet: (draftExerciseId: string, setId: string) => void;
  updateSet: (draftExerciseId: string, setId: string, patch: SetPatch) => void;
  /** Fills empty inputs from the hint, validates and checks the set off. */
  completeSet: (draftExerciseId: string, setId: string) => { ok: true; prs: PrType[] } | { ok: false; error: string };
  uncompleteSet: (draftExerciseId: string, setId: string) => void;
  setExerciseRest: (draftExerciseId: string, seconds: number) => void;
  setExerciseNotes: (draftExerciseId: string, notes: string) => void;
  setTitle: (title: string) => void;
  setNotes: (notes: string) => void;
  setStartedAt: (ms: number) => void;
  setEndedAt: (ms: number | null) => void;
  discard: () => void;
  /** Saves the workout. `includeUnchecked` also keeps filled-in sets that were not checked off. */
  finish: (options: { includeUnchecked: boolean }) => Promise<string>;
}

const STORAGE_KEY = 'activeWorkout';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function emptyHint(): SetHint {
  return { weight: null, reps: null, durationSec: null };
}

function makeSet(hint: SetHint, side: Side | null = null, kind: SetKind = 'normal'): DraftSet {
  return {
    id: createId(),
    kind,
    side,
    weight: '',
    reps: '',
    duration: '',
    done: false,
    doneAt: null,
    prs: [],
    hint,
  };
}

function previousFrom(session: ExerciseSession | null): PreviousSet[] {
  return (session?.sets ?? []).map((s) => ({
    reps: s.reps,
    weight: s.weight,
    durationSec: s.durationSec,
    side: s.side,
  }));
}

/** Values of a set: typed input first, otherwise the hint. */
export function effectiveValues(set: DraftSet): SetValues {
  return {
    reps: parseInteger(set.reps) ?? set.hint.reps,
    weight: parseDecimal(set.weight) ?? set.hint.weight,
    durationSec: parseInteger(set.duration) ?? set.hint.durationSec,
    kind: set.kind,
    side: set.side,
  };
}

/** Only what the user actually typed (used for unchecked sets). */
function typedValues(set: DraftSet): SetValues | null {
  const reps = parseInteger(set.reps);
  const weight = parseDecimal(set.weight);
  const durationSec = parseInteger(set.duration);
  if (reps == null && durationSec == null) return null;
  return { reps, weight, durationSec, kind: set.kind, side: set.side };
}

function hasTypedValues(set: DraftSet): boolean {
  return typedValues(set) != null;
}

interface BuildOptions {
  template?: TemplateSet[];
  fromWorkout?: PreviousSet[];
  fill?: boolean;
}

async function buildDraftExercise(
  exercise: Exercise,
  beforeMs: number,
  options: BuildOptions = {},
): Promise<DraftExercise> {
  const context = await getExerciseContext(exercise.id, exercise, beforeMs);
  const previous = previousFrom(context.last);
  const step = getSettings().prefs.weightStep;
  const hint = progressionHint(context.recent, step);

  // Structure of the sets: template > explicit workout > last session > empty sets
  let structure: (PreviousSet & { kind?: SetKind })[];
  if (options.template && options.template.length > 0) structure = options.template;
  else if (options.fromWorkout && options.fromWorkout.length > 0) structure = options.fromWorkout;
  else if (previous.length > 0) structure = previous;
  else {
    const sides: (Side | null)[] = exercise.unilateral
      ? ['left', 'left', 'left', 'right', 'right', 'right']
      : [null, null, null];
    structure = sides.map((side) => ({ reps: null, weight: null, durationSec: null, side }));
  }

  const sets = structure.map((s, i) => {
    // Placeholder: last performance at the same position, otherwise the plan values
    const prev = previous[i];
    const source = options.fromWorkout ? s : (prev ?? s);
    const draftSet = makeSet(
      { weight: source.weight, reps: source.reps, durationSec: source.durationSec },
      s.side ?? null,
      s.kind ?? 'normal',
    );
    if (options.fill) {
      draftSet.weight = toInputValue(s.weight);
      draftSet.reps = s.reps != null ? String(s.reps) : '';
      draftSet.duration = s.durationSec != null ? String(s.durationSec) : '';
      draftSet.done = true;
      draftSet.doneAt = beforeMs;
    }
    return draftSet;
  });

  return {
    id: createId(),
    exerciseId: exercise.id,
    exercise,
    restSec: exercise.restSeconds || getSettings().prefs.defaultRestSec,
    notes: '',
    sets,
    previous,
    previousAt: context.last?.startedAt ?? null,
    bests: context.bests,
    suggestion: hint ? { weight: hint.weight, reps: hint.basedOn.reps } : null,
  };
}

function autoTitle(exercises: DraftExercise[]): string {
  if (exercises.length === 0) return 'Training';
  return titleFromMuscles(exercises.map((e) => e.exercise.muscle));
}

// ---------------------------------------------------------------------------
// store
// ---------------------------------------------------------------------------

export const useActiveWorkout = create<ActiveWorkoutState>((set, get) => {
  const updateDraft = (fn: (draft: DraftWorkout) => DraftWorkout) => {
    const draft = get().draft;
    if (!draft) return;
    const next = fn(draft);
    if (!next.titleEdited) next.title = autoTitle(next.exercises);
    set({ draft: next });
  };

  const updateExercise = (draftExerciseId: string, fn: (ex: DraftExercise) => DraftExercise) =>
    updateDraft((d) => ({ ...d, exercises: d.exercises.map((e) => (e.id === draftExerciseId ? fn(e) : e)) }));

  const updateSetIn = (draftExerciseId: string, setId: string, fn: (s: DraftSet) => DraftSet) =>
    updateExercise(draftExerciseId, (ex) => ({ ...ex, sets: ex.sets.map((s) => (s.id === setId ? fn(s) : s)) }));

  const newDraft = (partial: Partial<DraftWorkout> = {}): DraftWorkout => ({
    id: createId(),
    title: 'Training',
    titleEdited: false,
    startedAt: Date.now(),
    endedAt: null,
    templateId: null,
    notes: '',
    editingId: null,
    source: 'app',
    exercises: [],
    ...partial,
  });

  return {
    draft: null,
    hydrated: false,

    async hydrate() {
      const raw = await kvGetRaw(STORAGE_KEY);
      let draft: DraftWorkout | null = null;
      if (raw) {
        try {
          draft = JSON.parse(raw) as DraftWorkout;
        } catch {
          draft = null;
        }
      }
      set({ draft, hydrated: true });
    },

    startEmpty() {
      set({ draft: newDraft() });
    },

    async startFromTemplate(template) {
      const exercises = await getExercisesByIds(template.exercises.map((e) => e.exerciseId));
      const startedAt = Date.now();
      const drafts: DraftExercise[] = [];
      for (const te of template.exercises) {
        const exercise = exercises.get(te.exerciseId);
        if (!exercise) continue;
        const d = await buildDraftExercise(exercise, startedAt, { template: te.sets });
        if (te.restSeconds) d.restSec = te.restSeconds;
        if (te.notes) d.notes = te.notes;
        drafts.push(d);
      }
      set({
        draft: newDraft({
          title: template.name,
          titleEdited: true,
          templateId: template.id,
          startedAt,
          exercises: drafts,
        }),
      });
    },

    async startFromWorkout(workout, { edit }) {
      const exercises = await getExercisesByIds(workout.exercises.map((e) => e.exerciseId));
      const startedAt = edit ? workout.startedAt : Date.now();
      const drafts: DraftExercise[] = [];
      for (const we of workout.exercises) {
        const exercise = exercises.get(we.exerciseId);
        if (!exercise) continue;
        const sets = we.sets.map((s) => ({
          reps: s.reps,
          weight: s.weight,
          durationSec: s.durationSec,
          side: s.side,
          kind: s.kind,
        }));
        const d = await buildDraftExercise(exercise, startedAt, { fromWorkout: sets, fill: edit });
        if (we.restSeconds) d.restSec = we.restSeconds;
        if (edit) {
          d.id = we.id;
          d.notes = we.notes ?? '';
        }
        drafts.push(d);
      }
      set({
        draft: newDraft({
          id: edit ? workout.id : createId(),
          title: workout.title,
          titleEdited: true,
          startedAt,
          endedAt: edit ? workout.endedAt : null,
          templateId: edit ? workout.templateId : null,
          notes: edit ? (workout.notes ?? '') : '',
          editingId: edit ? workout.id : null,
          source: edit ? workout.source : 'app',
          exercises: drafts,
        }),
      });
    },

    async addExercises(exerciseIds) {
      const draft = get().draft;
      if (!draft) return;
      const map = await getExercisesByIds(exerciseIds);
      const added: DraftExercise[] = [];
      for (const id of exerciseIds) {
        const exercise = map.get(id);
        if (exercise) added.push(await buildDraftExercise(exercise, draft.startedAt));
      }
      updateDraft((d) => ({ ...d, exercises: [...d.exercises, ...added] }));
    },

    async replaceExercise(draftExerciseId, exerciseId) {
      const draft = get().draft;
      const exercise = await getExercise(exerciseId);
      if (!draft || !exercise) return;
      const replacement = await buildDraftExercise(exercise, draft.startedAt);
      updateDraft((d) => ({
        ...d,
        exercises: d.exercises.map((e) => (e.id === draftExerciseId ? { ...replacement, id: e.id } : e)),
      }));
    },

    removeExercise(draftExerciseId) {
      updateDraft((d) => ({ ...d, exercises: d.exercises.filter((e) => e.id !== draftExerciseId) }));
    },

    moveExercise(draftExerciseId, direction) {
      updateDraft((d) => {
        const index = d.exercises.findIndex((e) => e.id === draftExerciseId);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= d.exercises.length) return d;
        const exercises = [...d.exercises];
        [exercises[index], exercises[target]] = [exercises[target], exercises[index]];
        return { ...d, exercises };
      });
    },

    addSet(draftExerciseId) {
      updateExercise(draftExerciseId, (ex) => {
        const last = ex.sets[ex.sets.length - 1];
        const lastValues = last ? effectiveValues(last) : null;
        const prev = ex.previous[ex.sets.length];
        const hint: SetHint = prev
          ? { weight: prev.weight, reps: prev.reps, durationSec: prev.durationSec }
          : lastValues
            ? { weight: lastValues.weight, reps: lastValues.reps, durationSec: lastValues.durationSec }
            : emptyHint();
        const side = prev?.side ?? last?.side ?? null;
        return { ...ex, sets: [...ex.sets, makeSet(hint, side)] };
      });
    },

    removeSet(draftExerciseId, setId) {
      updateExercise(draftExerciseId, (ex) => ({ ...ex, sets: ex.sets.filter((s) => s.id !== setId) }));
    },

    updateSet(draftExerciseId, setId, patch) {
      updateSetIn(draftExerciseId, setId, (s) => ({ ...s, ...patch }));
    },

    completeSet(draftExerciseId, setId) {
      const ex = get().draft?.exercises.find((e) => e.id === draftExerciseId);
      const target = ex?.sets.find((s) => s.id === setId);
      if (!ex || !target) return { ok: false, error: 'Satz nicht gefunden' };
      const values = effectiveValues(target);
      const tracking = ex.exercise.tracking;
      if (tracking === 'time') {
        if (!values.durationSec || values.durationSec <= 0) return { ok: false, error: 'Bitte eine Dauer eintragen.' };
      } else if (!values.reps || values.reps <= 0) {
        return { ok: false, error: 'Bitte Wiederholungen eintragen.' };
      }
      if (values.weight != null && values.weight < 0) return { ok: false, error: 'Gewicht darf nicht negativ sein.' };

      // Records are measured against history plus the sets already done today.
      // Without history (first time this exercise) there is nothing to beat.
      const history = ex.bests ?? EMPTY_BESTS;
      let running = history;
      for (const s of ex.sets) {
        if (s.done && s.id !== setId) running = mergeBests(running, effectiveValues(s), ex.exercise);
      }
      const prs = hasBests(history) ? detectPrs(values, running, tracking) : [];
      updateSetIn(draftExerciseId, setId, (s) => ({
        ...s,
        weight: values.weight != null ? toInputValue(values.weight) : '',
        reps: values.reps != null ? String(values.reps) : '',
        duration: values.durationSec != null ? String(values.durationSec) : '',
        done: true,
        doneAt: Date.now(),
        prs,
      }));
      return { ok: true, prs };
    },

    uncompleteSet(draftExerciseId, setId) {
      updateSetIn(draftExerciseId, setId, (s) => ({ ...s, done: false, doneAt: null, prs: [] }));
    },

    setExerciseRest(draftExerciseId, seconds) {
      updateExercise(draftExerciseId, (ex) => ({ ...ex, restSec: Math.max(0, Math.round(seconds)) }));
    },

    setExerciseNotes(draftExerciseId, notes) {
      updateExercise(draftExerciseId, (ex) => ({ ...ex, notes }));
    },

    setTitle(title) {
      updateDraft((d) => ({ ...d, title, titleEdited: title.trim().length > 0 }));
    },

    setNotes(notes) {
      updateDraft((d) => ({ ...d, notes }));
    },

    setStartedAt(ms) {
      updateDraft((d) => {
        const duration = d.endedAt ? d.endedAt - d.startedAt : null;
        return { ...d, startedAt: ms, endedAt: duration != null ? ms + duration : d.endedAt };
      });
    },

    setEndedAt(ms) {
      updateDraft((d) => ({ ...d, endedAt: ms }));
    },

    discard() {
      useRestTimer.getState().stop();
      set({ draft: null });
    },

    async finish({ includeUnchecked }) {
      const draft = get().draft;
      if (!draft) throw new Error('Kein aktives Training.');
      const exercises = draft.exercises
        .map((ex) => {
          const kept = ex.sets.filter((s) => s.done || (includeUnchecked && hasTypedValues(s)));
          return {
            id: ex.id,
            exerciseId: ex.exerciseId,
            restSeconds: ex.restSec || null,
            notes: ex.notes.trim() || null,
            sets: kept.map((s, index) => {
              const v = s.done ? effectiveValues(s) : typedValues(s)!;
              return {
                id: s.id,
                reps: v.reps,
                weight: v.weight,
                durationSec: v.durationSec,
                side: s.side,
                kind: s.kind,
                rpe: null,
                restSec: index < kept.length - 1 ? ex.restSec || null : null,
                note: null,
              };
            }),
          };
        })
        .filter((ex) => ex.sets.length > 0);
      if (exercises.length === 0) throw new Error('Es gibt noch keine abgeschlossenen Sätze.');

      const workout: Workout = {
        id: draft.editingId ?? draft.id,
        title: draft.title.trim() || autoTitle(draft.exercises),
        startedAt: draft.startedAt,
        endedAt: draft.editingId ? draft.endedAt : Date.now(),
        notes: draft.notes.trim() || null,
        templateId: draft.templateId,
        source: draft.source,
        exercises,
      };
      await saveWorkout(workout);
      if (draft.templateId && !draft.editingId) await markTemplateUsed(draft.templateId);
      useRestTimer.getState().stop();
      set({ draft: null });
      return workout.id;
    },
  };
});

// Persist the draft (debounced) so an app restart does not lose the workout.
let persistTimer: ReturnType<typeof setTimeout> | null = null;
useActiveWorkout.subscribe((state, prev) => {
  if (!state.hydrated || state.draft === prev.draft) return;
  if (persistTimer) clearTimeout(persistTimer);
  const draft = state.draft;
  persistTimer = setTimeout(
    () => {
      persistTimer = null;
      try {
        db();
      } catch {
        return;
      }
      void kvSetRaw(STORAGE_KEY, draft ? JSON.stringify(draft) : '').catch(() => undefined);
    },
    draft ? 400 : 0,
  );
});

/** Summary numbers of a draft (for the header and the finish dialog). */
export function draftStats(draft: DraftWorkout): { done: number; total: number; unchecked: number; volume: number } {
  let done = 0;
  let total = 0;
  let unchecked = 0;
  let volume = 0;
  for (const ex of draft.exercises) {
    for (const s of ex.sets) {
      total++;
      if (s.done) {
        done++;
        volume += setVolume(effectiveValues(s), ex.exercise);
      } else if (hasTypedValues(s)) {
        unchecked++;
      }
    }
  }
  return { done, total, unchecked, volume };
}
