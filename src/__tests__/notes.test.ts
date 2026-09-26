import {
  formatWorkoutNotes,
  guessEquipment,
  guessMuscle,
  matchExercise,
  normalizeName,
  parseWorkoutNotes,
  similarity,
  titleFromMuscles,
} from '@/domain/notes';

import { USER_NOTES } from './fixtures/userNotes';



describe('parseWorkoutNotes – user notes', () => {
  const result = parseWorkoutNotes(USER_NOTES, { today: '2026-09-26' });
  const workout = result.workouts[0];
  const byName = (name: string) => workout.exercises.find((e) => e.name === name)!;

  test('finds one workout with date, title and 9 exercises', () => {
    expect(result.workouts).toHaveLength(1);
    expect(result.issues).toEqual([]);
    expect(workout.date).toBe('2026-09-25');
    expect(workout.title).toBe('Brust, Bizeps, Bauch');
    expect(workout.exercises.map((e) => e.name)).toEqual([
      'Schräg-Brustmaschine',
      'Brustmaschine',
      'Butterfly',
      'Kabel Crossover von unten',
      'Bizeps beidhängig im Sitzen',
      'Hammercurls am Kabel mit Seil',
      'Bauchmaschine Crunch',
      'Dipbarren Bauchmuskel',
      'Rudern',
    ]);
  });

  test('parses reps, weights and "inkl. Stange"', () => {
    const ex = byName('Schräg-Brustmaschine');
    expect(ex.sets.map((s) => [s.reps, s.weight])).toEqual([
      [10, 40],
      [10, 40],
      [10, 50],
      [10, 40],
    ]);
    expect(ex.barMode).toBe('included');
    expect(ex.weightMode).toBe('total');
    expect(ex.restSec).toBe(120);
    expect(ex.sets.map((s) => s.restSec)).toEqual([120, 120, 120, null]);
    expect(ex.sets.every((s) => s.note === null)).toBe(true);
  });

  test('parses rest of 90 seconds for Butterfly', () => {
    const ex = byName('Butterfly');
    expect(ex.sets.map((s) => [s.reps, s.weight])).toEqual([
      [8, 55],
      [8, 45],
      [10, 35],
    ]);
    expect(ex.restSec).toBe(90);
    expect(ex.barMode).toBe('none');
  });

  test('parses "pro Seite" and decimal comma with "exkl. Stange"', () => {
    const crossover = byName('Kabel Crossover von unten');
    expect(crossover.weightMode).toBe('per_side');
    expect(crossover.sets.map((s) => [s.reps, s.weight])).toEqual([
      [10, 15],
      [12, 15],
      [8, 20],
    ]);
    const biceps = byName('Bizeps beidhängig im Sitzen');
    expect(biceps.weightMode).toBe('per_side');
    expect(biceps.barMode).toBe('excluded');
    expect(biceps.sets.map((s) => s.weight)).toEqual([10, 12.5, 15]);
  });

  test('parses bodyweight sets without weight', () => {
    const ex = byName('Dipbarren Bauchmuskel');
    expect(ex.tracking).toBe('reps');
    expect(ex.sets.map((s) => [s.reps, s.weight])).toEqual([
      [12, null],
      [12, null],
      [12, null],
    ]);
    expect(ex.sets[2].restSec).toBe(60);
  });

  test('parses unilateral sets including "15xrechts" without space', () => {
    const ex = byName('Rudern');
    expect(ex.unilateral).toBe(true);
    expect(ex.sets.map((s) => [s.reps, s.side])).toEqual([
      [10, 'left'],
      [12, 'left'],
      [15, 'left'],
      [10, 'right'],
      [12, 'right'],
      [15, 'right'],
    ]);
    expect(ex.sets.every((s) => s.note === null)).toBe(true);
  });

  test('counts all sets', () => {
    const total = workout.exercises.reduce((n, e) => n + e.sets.length, 0);
    expect(total).toBe(4 + 4 + 3 + 3 + 3 + 3 + 3 + 3 + 6);
  });
});

describe('parseWorkoutNotes – variants', () => {
  test('infers previous year for dates in the future', () => {
    const r = parseWorkoutNotes('Training 28.12.\n\nKniebeugen\n5x100kg', { today: '2026-01-05' });
    expect(r.workouts[0].date).toBe('2025-12-28');
  });

  test('supports explicit years, weekdays and titles on the header line', () => {
    const r = parseWorkoutNotes('Do, 25.09.2025 Beine\nBeinpresse\n12x120kg', { today: '2026-09-26' });
    expect(r.workouts[0].date).toBe('2025-09-25');
    expect(r.workouts[0].title).toBe('Beine');
    expect(r.workouts[0].exercises[0].sets[0]).toMatchObject({ reps: 12, weight: 120 });
  });

  test('supports two-digit years and several workouts', () => {
    const text = `Training 01.09.25\nBankdrücken\n8x80kg\n\nTraining 03.09.25\nKreuzheben\n5x120kg`;
    const r = parseWorkoutNotes(text, { today: '2026-09-26' });
    expect(r.workouts.map((w) => w.date)).toEqual(['2025-09-01', '2025-09-03']);
    expect(r.workouts[1].exercises[0].name).toBe('Kreuzheben');
  });

  test('supports sets x reps x weight, weight-first and minutes', () => {
    const text = `Training 10.09.\nBankdrücken\n3x10x60kg\n2min Pause\n\nCurls\n20kg x 12\n1:30 Pause\n20 kg x 10`;
    const r = parseWorkoutNotes(text, { today: '2026-09-26' });
    const [bench, curls] = r.workouts[0].exercises;
    expect(bench.sets).toHaveLength(3);
    expect(bench.sets.every((s) => s.reps === 10 && s.weight === 60)).toBe(true);
    expect(bench.sets[2].restSec).toBe(120);
    expect(curls.sets.map((s) => [s.reps, s.weight])).toEqual([
      [12, 20],
      [10, 20],
    ]);
    expect(curls.restSec).toBe(90);
  });

  test('parses timed sets and Wdh. notation', () => {
    const text = `Training 10.09.\nPlank\n60sek\n60sek Pause\n45 Sek.\n\nKlimmzüge\n8 Wdh.\n6 Wdh`;
    const r = parseWorkoutNotes(text, { today: '2026-09-26' });
    const [plank, pullups] = r.workouts[0].exercises;
    expect(plank.tracking).toBe('time');
    expect(plank.sets.map((s) => s.durationSec)).toEqual([60, 45]);
    expect(plank.sets[0].restSec).toBe(60);
    expect(pullups.tracking).toBe('reps');
    expect(pullups.sets.map((s) => s.reps)).toEqual([8, 6]);
  });

  test('keeps free text as notes; sets after a blank line continue the last exercise', () => {
    const text = `Training 10.09.\nPush\n\nBankdrücken\n10x60kg\nfühlte sich leicht an\n\nHeute war es voll\n\n10x20kg`;
    const r = parseWorkoutNotes(text, { today: '2026-09-26' });
    const w = r.workouts[0];
    expect(w.title).toBe('Push');
    expect(w.exercises[0].notes).toBe('fühlte sich leicht an');
    expect(w.notes).toBe('Heute war es voll');
    // after a blank line a set without a name continues the last exercise
    expect(w.exercises[0].sets).toHaveLength(2);
  });

  test('handles bullets, unicode multiply sign and pound conversion', () => {
    const r = parseWorkoutNotes('Training 10.09.\n- Curls\n• 10×45lbs', { today: '2026-09-26' });
    const set = r.workouts[0].exercises[0].sets[0];
    expect(set.reps).toBe(10);
    expect(set.weight).toBeCloseTo(20.41, 2);
  });

  test('creates an undated workout when no header is present', () => {
    const r = parseWorkoutNotes('Latzug\n12x50kg\n12x55kg', { today: '2026-09-26' });
    expect(r.workouts).toHaveLength(1);
    expect(r.workouts[0].date).toBeNull();
    expect(r.workouts[0].exercises[0].sets).toHaveLength(2);
  });

  test('reports sets before any exercise', () => {
    const r = parseWorkoutNotes('Training 10.09.\n\n10x40kg', { today: '2026-09-26' });
    expect(r.workouts).toHaveLength(0);
    expect(r.issues).toHaveLength(1);
    expect(r.issues[0].line).toBe(3);
  });

  test('keeps unknown suffix text as set note', () => {
    const r = parseWorkoutNotes('Training 10.09.\nDips\n10x10kg mit Gürtel', { today: '2026-09-26' });
    expect(r.workouts[0].exercises[0].sets[0].note).toBe('mit Gürtel');
  });

  test('does not treat a weight like 12.5 as a date', () => {
    const r = parseWorkoutNotes('Training 10.09.\nCurls\n10x12.5kg', { today: '2026-09-26' });
    expect(r.workouts[0].exercises[0].sets[0].weight).toBe(12.5);
  });
});

describe('formatWorkoutNotes', () => {
  test('round-trips the user notes', () => {
    const parsed = parseWorkoutNotes(USER_NOTES, { today: '2026-09-26' }).workouts[0];
    const text = formatWorkoutNotes(
      {
        date: parsed.date!,
        title: parsed.title!,
        exercises: parsed.exercises.map((e) => ({
          name: e.name,
          tracking: e.tracking,
          weightMode: e.weightMode,
          barMode: e.barMode,
          restSeconds: e.restSec,
          sets: e.sets,
        })),
      },
      { referenceYear: 2026 },
    );
    // Identical except the trailing pause after the last set of "Dipbarren"
    // and the missing space in "15xrechts" in the original.
    const normalizedOriginal = USER_NOTES.replace('12x\n60sek Pause\n\nRudern', '12x\n\nRudern').replace(
      '15xrechts',
      '15x rechts',
    );
    expect(text).toBe(normalizedOriginal);
    const reparsed = parseWorkoutNotes(text, { today: '2026-09-26' }).workouts[0];
    expect(reparsed.exercises).toHaveLength(parsed.exercises.length);
  });

  test('adds the year for other years and omits rest if requested', () => {
    const text = formatWorkoutNotes(
      {
        date: '2025-01-03',
        title: '',
        exercises: [
          {
            name: 'Plank',
            tracking: 'time',
            weightMode: 'total',
            barMode: 'none',
            restSeconds: 60,
            sets: [
              { reps: null, weight: null, durationSec: 60, side: null, restSec: null },
              { reps: null, weight: null, durationSec: 45, side: null, restSec: null },
            ],
          },
        ],
      },
      { referenceYear: 2026, includeRest: false },
    );
    expect(text).toBe('Training 03.01.2025\n\nPlank\n60sek\n45sek');
  });
});

describe('matching helpers', () => {
  const library = [
    { id: 'a', name: 'Brustpresse (Maschine)', aliases: ['Brustmaschine'] },
    { id: 'b', name: 'Butterfly (Maschine)', aliases: ['Butterfly'] },
    { id: 'c', name: 'Latzug breit', aliases: [] },
  ];

  test('normalizes umlauts and punctuation', () => {
    expect(normalizeName('Schräg-Brustmaschine')).toBe('schraegbrustmaschine');
    expect(normalizeName('Klimmzüge (Ober­griff)')).toBe('klimmzuegeobergriff');
  });

  test('matches aliases exactly', () => {
    expect(matchExercise('brustmaschine', library)).toEqual({ id: 'a', score: 1, exact: true });
    expect(matchExercise('Butterfly', library)?.id).toBe('b');
  });

  test('fuzzy matches small typos only', () => {
    expect(matchExercise('Latzug breiit', library)?.id).toBe('c');
    expect(matchExercise('Kniebeugen', library)).toBeNull();
    expect(similarity('abc', 'abc')).toBe(1);
  });

  test('guesses muscles and equipment', () => {
    expect(guessMuscle('Schräg-Brustmaschine')).toBe('chest');
    expect(guessMuscle('Hammercurls am Kabel mit Seil')).toBe('biceps');
    expect(guessMuscle('Bauchmaschine Crunch')).toBe('abs');
    expect(guessMuscle('Dipbarren Bauchmuskel')).toBe('abs');
    expect(guessMuscle('Rudern')).toBe('back');
    expect(guessMuscle('Beinbeuger liegend')).toBe('hamstrings');
    expect(guessMuscle('Kabel Crossover von unten')).toBe('chest');
    expect(guessEquipment('Hammercurls am Kabel mit Seil')).toBe('cable');
    expect(guessEquipment('Brustmaschine')).toBe('machine');
  });

  test('builds titles from muscles', () => {
    expect(titleFromMuscles(['chest', 'chest', 'biceps', 'abs', 'back'])).toBe('Brust, Bizeps, Bauch');
    expect(titleFromMuscles(['other'])).toBe('Training');
  });
});
