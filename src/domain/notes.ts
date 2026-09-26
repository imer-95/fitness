/**
 * Import and export of workouts in the free-text format of a notes app, e.g.
 *
 *   Training 25.09.
 *   Brust, Bizeps, Bauch
 *
 *   Schräg-Brustmaschine
 *   10x40kg inkl. Stange
 *   120sek Pause
 *   10x50kg inkl. Stange
 *
 *   Rudern
 *   10x links
 *   60sek Pause
 *   15xrechts
 *
 * The parser is intentionally forgiving: unknown lines are kept as notes or
 * reported as issues instead of aborting the import.
 */
import { daysInMonth, formatDateShort, makeKey, splitKey, todayKey } from './dates';
import { formatNumber } from './format';
import { MUSCLE_SHORT } from './labels';
import { SIDE_LABELS, weightAnnotation } from './strength';
import type {
  BarMode,
  DateKey,
  Equipment,
  MuscleGroup,
  Side,
  TrackingType,
  WeightMode,
} from './types';

export interface ParsedSet {
  reps: number | null;
  weight: number | null;
  durationSec: number | null;
  side: Side | null;
  restSec: number | null;
  note: string | null;
}

export interface ParsedExercise {
  name: string;
  sets: ParsedSet[];
  weightMode: WeightMode;
  barMode: BarMode;
  /** Most frequently used rest time between the sets. */
  restSec: number | null;
  unilateral: boolean;
  tracking: TrackingType;
  notes: string | null;
  line: number;
}

export interface ParsedWorkout {
  date: DateKey | null;
  title: string | null;
  notes: string | null;
  exercises: ParsedExercise[];
  line: number;
}

export interface ParseIssue {
  line: number;
  text: string;
  reason: string;
}

export interface ParseResult {
  workouts: ParsedWorkout[];
  issues: ParseIssue[];
}

// ---------------------------------------------------------------------------
// Line classification
// ---------------------------------------------------------------------------

const LBS_TO_KG = 0.45359237;
const NUM = String.raw`\d+(?:[.,]\d+)?`;
const WEEKDAY = String.raw`(?:mo|di|mi|do|fr|sa|so|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\.?,?\s*`;
const HEADER_KEYWORD = String.raw`(?:training|workout|trainingstag|trainingseinheit|einheit|gym|session|fitness)`;

const HEADER_WITH_KEYWORD = new RegExp(
  String.raw`^${HEADER_KEYWORD}\b\s*[:\-–]?\s*(?:vom|am)?\s*(?:${WEEKDAY})?(\d{1,2})\.\s?(\d{1,2})\.?(?:(\d{4}|\d{2})(?!\d))?\.?(.*)$`,
  'i',
);
const HEADER_DATE_ONLY = new RegExp(
  String.raw`^(?:${WEEKDAY})?(\d{1,2})\.\s?(\d{1,2})\.(?:(\d{4}|\d{2})(?!\d))?\.?(.*)$`,
  'i',
);
const HEADER_ISO = new RegExp(
  String.raw`^(?:${HEADER_KEYWORD}\b\s*[:\-–]?\s*(?:vom|am)?\s*)?(\d{4})-(\d{2})-(\d{2})(.*)$`,
  'i',
);

const SETS_REPS_WEIGHT = new RegExp(
  String.raw`^(\d{1,2})\s*x\s*(\d{1,3})\s*x\s*(${NUM})\s*(kg|kilo|lbs?)?\.?(.*)$`,
  'i',
);
const WEIGHT_FIRST = new RegExp(String.raw`^(${NUM})\s*(kg|kilo|lbs?)\s*x\s*(\d{1,3})(?!\d)(.*)$`, 'i');
const REPS_FIRST = new RegExp(
  String.raw`^(\d{1,3})\s*(?:x|wdh\.?|wiederholungen|reps?)(?:\s*(?:à|a|@|mit|bei|je)\s+|\s*)(?:(${NUM})\s*(kg|kilo|lbs?)?(?![a-z]))?(.*)$`,
  'i',
);
const DURATION = new RegExp(
  String.raw`(${NUM})\s*(sekunden|sekunde|sek|sec|seconds|s|minuten|minute|min|m)\.?(?![a-zäöü])`,
  'i',
);
const CLOCK = /(\d{1,2}):(\d{2})/;
const REST_WORD = /\b(pause|rest|ruhe|erholung|satzpause)\b/i;

const PER_SIDE = /\b(?:pro|je)\s+(?:seite|hand|arm|bein)\b/i;
const BAR_INCLUDED = /\b(?:inkl\.?|inklusive|incl\.?|mit)\s*(?:der\s+)?(?:stange|langhantel|sz-?stange|bar)\b/i;
const BAR_EXCLUDED = /\b(?:exkl\.?|exklusive|excl\.?|ohne|zzgl\.?|plus)\s*(?:der\s+)?(?:stange|langhantel|sz-?stange|bar)\b/i;
const SIDE_LEFT = /(?:^|\s|\()(?:links|li\.?|l)(?=$|\s|\)|,)/i;
const SIDE_RIGHT = /(?:^|\s|\()(?:rechts|re\.?|r)(?=$|\s|\)|,)/i;

type Classified =
  | { kind: 'blank' }
  | { kind: 'header'; date: DateKey | null; title: string | null }
  | { kind: 'sets'; sets: ParsedSet[]; perSide: boolean; bar: BarMode }
  | { kind: 'rest'; seconds: number }
  | { kind: 'text'; text: string };

function toNumber(raw: string): number {
  return Number(raw.replace(',', '.'));
}

function normalizeLine(raw: string): string {
  return raw
    .replace(/[\u00A0\u2007\u202F\t]/g, ' ')
    .replace(/[×✕✖]/g, 'x')
    .replace(/^\s*(?:[-•*–·▪◦]\s+)/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferDate(dayRaw: string, monthRaw: string, yearRaw: string | undefined, today: DateKey): DateKey | null {
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  if (month < 1 || month > 12 || day < 1) return null;
  let year: number;
  if (yearRaw) {
    year = Number(yearRaw);
    if (yearRaw.length === 2) year += 2000;
  } else {
    year = splitKey(today)[0];
    if (day <= daysInMonth(year, month) && makeKey(year, month, day) > today) year -= 1;
  }
  if (day > daysInMonth(year, month)) return null;
  return makeKey(year, month, day);
}

function cleanTitle(rest: string): string | null {
  const t = rest.replace(/^[\s:\-–|,.]+/, '').replace(/[\s:\-–|,]+$/, '').trim();
  return t ? t : null;
}

function parseDurationSeconds(text: string): number | null {
  const clock = CLOCK.exec(text);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const d = DURATION.exec(text);
  if (d) {
    const value = toNumber(d[1]);
    const unit = d[2].toLowerCase();
    return Math.round(unit.startsWith('m') ? value * 60 : value);
  }
  const bare = /(\d+(?:[.,]\d+)?)/.exec(text);
  if (bare) {
    const value = toNumber(bare[1]);
    return Math.round(value >= 10 ? value : value * 60);
  }
  return null;
}

interface SuffixInfo {
  side: Side | null;
  perSide: boolean;
  bar: BarMode;
  note: string | null;
}

function parseSuffix(raw: string): SuffixInfo {
  let rest = ` ${raw} `;
  let perSide = false;
  let bar: BarMode = 'none';
  let side: Side | null = null;
  if (PER_SIDE.test(rest)) {
    perSide = true;
    rest = rest.replace(PER_SIDE, ' ');
  }
  if (BAR_EXCLUDED.test(rest)) {
    bar = 'excluded';
    rest = rest.replace(BAR_EXCLUDED, ' ');
  } else if (BAR_INCLUDED.test(rest)) {
    bar = 'included';
    rest = rest.replace(BAR_INCLUDED, ' ');
  }
  if (SIDE_LEFT.test(rest)) {
    side = 'left';
    rest = rest.replace(SIDE_LEFT, ' ');
  } else if (SIDE_RIGHT.test(rest)) {
    side = 'right';
    rest = rest.replace(SIDE_RIGHT, ' ');
  }
  const note = rest
    .replace(/[()]/g, ' ')
    .replace(/^[\s,;:\-–.]+|[\s,;:\-–]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return { side, perSide, bar, note: note ? note : null };
}

function toKg(value: number, unit: string | undefined): number {
  if (unit && unit.toLowerCase().startsWith('lb')) return Math.round(value * LBS_TO_KG * 100) / 100;
  return value;
}

function makeSet(reps: number | null, weight: number | null, suffix: SuffixInfo): ParsedSet {
  return {
    reps,
    weight,
    durationSec: null,
    side: suffix.side,
    restSec: null,
    note: suffix.note,
  };
}

function classify(line: string, today: DateKey): Classified {
  if (!line) return { kind: 'blank' };

  let m = HEADER_WITH_KEYWORD.exec(line) ?? HEADER_DATE_ONLY.exec(line);
  if (m) {
    const date = inferDate(m[1], m[2], m[3], today);
    if (date && !/^\s*(kg|kilo|lbs?|x)\b/i.test(m[4] ?? '')) {
      return { kind: 'header', date, title: cleanTitle(m[4] ?? '') };
    }
  }
  m = HEADER_ISO.exec(line);
  if (m) {
    const date = inferDate(m[3], m[2], m[1], today);
    if (date) return { kind: 'header', date, title: cleanTitle(m[4] ?? '') };
  }

  if (REST_WORD.test(line) && /\d/.test(line)) {
    const seconds = parseDurationSeconds(line);
    if (seconds != null) return { kind: 'rest', seconds };
  }

  m = SETS_REPS_WEIGHT.exec(line);
  if (m) {
    const count = Number(m[1]);
    if (count >= 1 && count <= 20) {
      const suffix = parseSuffix(m[5] ?? '');
      const reps = Number(m[2]);
      const weight = toKg(toNumber(m[3]), m[4]);
      const sets = Array.from({ length: count }, () => makeSet(reps, weight, suffix));
      return { kind: 'sets', sets, perSide: suffix.perSide, bar: suffix.bar };
    }
  }

  m = WEIGHT_FIRST.exec(line);
  if (m) {
    const suffix = parseSuffix(m[4] ?? '');
    const set = makeSet(Number(m[3]), toKg(toNumber(m[1]), m[2]), suffix);
    return { kind: 'sets', sets: [set], perSide: suffix.perSide, bar: suffix.bar };
  }

  m = REPS_FIRST.exec(line);
  if (m) {
    const suffix = parseSuffix(m[4] ?? '');
    const weight = m[2] != null ? toKg(toNumber(m[2]), m[3]) : null;
    const set = makeSet(Number(m[1]), weight && weight > 0 ? weight : null, suffix);
    return { kind: 'sets', sets: [set], perSide: suffix.perSide, bar: suffix.bar };
  }

  const duration = new RegExp(`^${DURATION.source}(.*)$`, 'i').exec(line);
  if (duration) {
    const value = toNumber(duration[1]);
    const unit = duration[2].toLowerCase();
    const seconds = Math.round(unit.startsWith('m') ? value * 60 : value);
    const suffix = parseSuffix(duration[3] ?? '');
    const set: ParsedSet = { ...makeSet(null, null, suffix), durationSec: seconds };
    return { kind: 'sets', sets: [set], perSide: suffix.perSide, bar: suffix.bar };
  }

  return { kind: 'text', text: line };
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function mostCommon(values: number[]): number | null {
  if (values.length === 0) return null;
  const counts = new Map<number, number>();
  let best = values[0];
  for (const v of values) {
    const c = (counts.get(v) ?? 0) + 1;
    counts.set(v, c);
    if (c > (counts.get(best) ?? 0)) best = v;
  }
  return best;
}

function appendNote(existing: string | null, text: string): string {
  return existing ? `${existing}\n${text}` : text;
}

export function parseWorkoutNotes(input: string, options: { today?: DateKey } = {}): ParseResult {
  const today = options.today ?? todayKey();
  const workouts: ParsedWorkout[] = [];
  const issues: ParseIssue[] = [];
  const flags = new Map<ParsedExercise, { perSide: boolean; bar: BarMode }>();

  let workout: ParsedWorkout | null = null;
  let exercise: ParsedExercise | null = null;
  /** A text line whose meaning (exercise name, title or note) depends on the next line. */
  let pending: { text: string; line: number; afterSets: boolean } | null = null;
  let lastKind: Classified['kind'] | null = null;

  const resolvePending = () => {
    if (!pending) return;
    const { text, line, afterSets } = pending;
    pending = null;
    if (!workout) {
      issues.push({ line, text, reason: 'Text vor dem ersten Training ignoriert' });
    } else if (workout.title == null && workout.exercises.length === 0) {
      workout.title = text;
    } else if (afterSets && exercise) {
      exercise.notes = appendNote(exercise.notes, text);
    } else {
      workout.notes = appendNote(workout.notes, text);
    }
  };

  const lines = input.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const line = normalizeLine(lines[i]);
    const c = classify(line, today);

    if (c.kind === 'blank') {
      resolvePending();
    } else if (c.kind === 'header') {
      resolvePending();
      workout = { date: c.date, title: c.title, notes: null, exercises: [], line: lineNo };
      workouts.push(workout);
      exercise = null;
    } else if (c.kind === 'text') {
      resolvePending();
      pending = { text: c.text, line: lineNo, afterSets: lastKind === 'sets' || lastKind === 'rest' };
    } else if (c.kind === 'sets') {
      if (!workout) {
        workout = { date: null, title: null, notes: null, exercises: [], line: lineNo };
        workouts.push(workout);
      }
      if (pending) {
        exercise = {
          name: pending.text,
          sets: [],
          weightMode: 'total',
          barMode: 'none',
          restSec: null,
          unilateral: false,
          tracking: 'weight_reps',
          notes: null,
          line: pending.line,
        };
        workout.exercises.push(exercise);
        flags.set(exercise, { perSide: false, bar: 'none' });
        pending = null;
      }
      if (!exercise) {
        issues.push({ line: lineNo, text: line, reason: 'Satz ohne Übungsnamen' });
      } else {
        exercise.sets.push(...c.sets);
        const f = flags.get(exercise)!;
        if (c.perSide) f.perSide = true;
        if (c.bar !== 'none') f.bar = c.bar;
      }
    } else if (c.kind === 'rest') {
      if (exercise && exercise.sets.length > 0 && !pending) {
        exercise.sets[exercise.sets.length - 1].restSec = c.seconds;
      } else if (!exercise) {
        issues.push({ line: lineNo, text: line, reason: 'Pause ohne vorherigen Satz' });
      }
    }
    lastKind = c.kind;
  }
  resolvePending();

  for (const w of workouts) {
    for (const ex of w.exercises) {
      const f = flags.get(ex);
      ex.weightMode = f?.perSide ? 'per_side' : 'total';
      ex.barMode = f?.bar ?? 'none';
      ex.restSec = mostCommon(ex.sets.map((s) => s.restSec).filter((r): r is number => r != null));
      ex.unilateral = ex.sets.some((s) => s.side != null);
      const hasWeight = ex.sets.some((s) => s.weight != null);
      const onlyDuration = ex.sets.every((s) => s.durationSec != null && s.reps == null);
      ex.tracking = hasWeight ? 'weight_reps' : onlyDuration ? 'time' : 'reps';
    }
  }

  return { workouts: workouts.filter((w) => w.exercises.length > 0), issues };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export interface NotesExportExercise {
  name: string;
  tracking: TrackingType;
  weightMode: WeightMode;
  barMode: BarMode;
  restSeconds: number | null;
  sets: {
    reps: number | null;
    weight: number | null;
    durationSec: number | null;
    side: Side | null;
    restSec: number | null;
  }[];
}

export interface NotesExportWorkout {
  date: DateKey;
  title: string;
  exercises: NotesExportExercise[];
}

function formatSetLine(set: NotesExportExercise['sets'][number], ex: NotesExportExercise): string {
  const side = set.side ? ` ${SIDE_LABELS[set.side]}` : '';
  if (ex.tracking === 'time' && set.durationSec != null) {
    const w = set.weight ? ` ${formatNumber(set.weight, 2)}kg` : '';
    return `${set.durationSec}sek${w}${side}`;
  }
  if (set.weight != null && set.weight > 0) {
    const note = weightAnnotation(ex);
    return `${set.reps ?? 0}x${formatNumber(set.weight, 2).replace(/\./g, '')}kg${note ? ` ${note}` : ''}${side}`;
  }
  return `${set.reps ?? 0}x${side}`;
}

/** Formats workouts in the notes style so they can be shared or pasted back. */
export function formatWorkoutNotes(
  workout: NotesExportWorkout,
  options: { referenceYear?: number; includeRest?: boolean } = {},
): string {
  const includeRest = options.includeRest ?? true;
  const referenceYear = options.referenceYear ?? new Date().getFullYear();
  const lines: string[] = [`Training ${formatDateShort(workout.date, referenceYear)}`];
  if (workout.title) lines.push(workout.title);
  for (const ex of workout.exercises) {
    if (ex.sets.length === 0) continue;
    lines.push('', ex.name);
    ex.sets.forEach((set, i) => {
      lines.push(formatSetLine(set, ex));
      const rest = set.restSec ?? ex.restSeconds;
      if (includeRest && rest && i < ex.sets.length - 1) lines.push(`${rest}sek Pause`);
    });
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Matching helpers
// ---------------------------------------------------------------------------

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
}

function bigrams(s: string): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) {
    const g = s.slice(i, i + 2);
    map.set(g, (map.get(g) ?? 0) + 1);
  }
  return map;
}

/** Sørensen–Dice coefficient on character bigrams (0..1). */
export function similarity(a: string, b: string): number {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.length < 2 || y.length < 2) return 0;
  const bx = bigrams(x);
  const by = bigrams(y);
  let overlap = 0;
  for (const [g, count] of bx) overlap += Math.min(count, by.get(g) ?? 0);
  return (2 * overlap) / (x.length - 1 + (y.length - 1));
}

export interface MatchCandidate {
  id: string;
  name: string;
  aliases: string[];
}

export interface MatchResult {
  id: string;
  score: number;
  exact: boolean;
}

/** Finds the library exercise for an imported name (exact name/alias first, then fuzzy). */
export function matchExercise(
  name: string,
  candidates: readonly MatchCandidate[],
  minScore = 0.82,
): MatchResult | null {
  const key = normalizeName(name);
  if (!key) return null;
  for (const c of candidates) {
    if (normalizeName(c.name) === key || c.aliases.some((a) => normalizeName(a) === key)) {
      return { id: c.id, score: 1, exact: true };
    }
  }
  let best: MatchResult | null = null;
  for (const c of candidates) {
    for (const n of [c.name, ...c.aliases]) {
      const score = similarity(name, n);
      if (score >= minScore && (!best || score > best.score)) best = { id: c.id, score, exact: false };
    }
  }
  return best;
}

const MUSCLE_KEYWORDS: [RegExp, MuscleGroup][] = [
  [/beinbeuger|leg ?curl|beincurl|hamstring/, 'hamstrings'],
  [/wade|calf|calves/, 'calves'],
  [/hip ?thrust|gesaess|glute|abduktor|kickback am kabel/, 'glutes'],
  [/bauch|crunch|situp|sit-up|plank|unterarmstuetz|beinheben|leg ?raise|ab ?roll|russian twist|dipbarren bauch/, 'abs'],
  [/trizeps|triceps|french ?press|skull|pushdown|kickback|dips? am|dips?$/, 'triceps'],
  [/bizeps|biceps|curl|hammer/, 'biceps'],
  [/unterarm|wrist|handgelenk/, 'forearms'],
  [/brust|bankdr|butterfly|fly|flys|crossover|chest|pec|liegestuetz|push ?up/, 'chest'],
  [/schulter|seitheben|frontheben|military|overhead|arnold|shoulder|face ?pull|reverse ?fly|nacken/, 'shoulders'],
  [/ruecken|rudern|row|latzug|lat |klimmz|pull ?up|kreuzheben|deadlift|hyperext|rueckenstrecker|pullover/, 'back'],
  [/bein|kniebeug|squat|ausfall|lunge|beinstreck|leg ?press|step ?up|quad/, 'quads'],
];

/** Guesses the primary muscle group from a (German or English) exercise name. */
export function guessMuscle(name: string): MuscleGroup {
  const n = name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
  for (const [re, muscle] of MUSCLE_KEYWORDS) {
    if (re.test(n)) return muscle;
  }
  return 'other';
}

export function guessEquipment(name: string): Equipment {
  const n = name.toLowerCase();
  if (/multipresse|smith/.test(n)) return 'smith';
  if (/kabel|seil|cable|crossover|latzug/.test(n)) return 'cable';
  if (/kurzhantel|dumbbell|kh\b/.test(n)) return 'dumbbell';
  if (/langhantel|barbell|\bsz\b|sz-|\blh\b|stange/.test(n)) return 'barbell';
  if (/kettlebell/.test(n)) return 'kettlebell';
  if (/band/.test(n)) return 'band';
  if (/maschine|machine|presse|butterfly/.test(n)) return 'machine';
  if (/dip|klimmz|liegestuetz|liegestütz|plank|beinheben|push ?up|pull ?up/.test(n)) return 'bodyweight';
  return 'other';
}

/** Workout title from the trained muscle groups, e.g. "Brust, Bizeps, Bauch". */
export function titleFromMuscles(muscles: readonly MuscleGroup[], max = 3): string {
  const seen: string[] = [];
  for (const m of muscles) {
    if (m === 'other' || m === 'full_body') continue;
    const label = MUSCLE_SHORT[m];
    if (!seen.includes(label)) seen.push(label);
  }
  if (seen.length === 0) return muscles.includes('full_body') ? 'Ganzkörper' : 'Training';
  return seen.slice(0, max).join(', ');
}
