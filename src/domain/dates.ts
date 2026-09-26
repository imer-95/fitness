import type { DateKey } from './types';

/**
 * Date helpers. Calendar days are represented as `YYYY-MM-DD` keys in local
 * time. Arithmetic on keys is done in UTC so that daylight-saving changes
 * never shift a day.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

export const WEEKDAYS_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'] as const;
export const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const;
/** Monday-first order used in calendars and week strips. */
export const WEEKDAYS_MONDAY_FIRST = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;
export const MONTHS_LONG = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
] as const;
export const MONTHS_SHORT = [
  'Jan.',
  'Feb.',
  'März',
  'Apr.',
  'Mai',
  'Juni',
  'Juli',
  'Aug.',
  'Sept.',
  'Okt.',
  'Nov.',
  'Dez.',
] as const;

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Local calendar day of a timestamp or date. */
export function toDateKey(value: Date | number = Date.now()): DateKey {
  const d = typeof value === 'number' ? new Date(value) : value;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayKey(): DateKey {
  return toDateKey(new Date());
}

export function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = splitKey(value);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

export function splitKey(key: DateKey): [number, number, number] {
  const [y, m, d] = key.split('-').map(Number);
  return [y, m, d];
}

export function makeKey(year: number, month: number, day: number): DateKey {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function keyToUtc(key: DateKey): number {
  const [y, m, d] = splitKey(key);
  return Date.UTC(y, m - 1, d);
}

function utcToKey(ms: number): DateKey {
  const d = new Date(ms);
  return makeKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function addDays(key: DateKey, days: number): DateKey {
  return utcToKey(keyToUtc(key) + days * DAY_MS);
}

/** Number of days from `b` to `a` (a - b). */
export function diffDays(a: DateKey, b: DateKey): number {
  return Math.round((keyToUtc(a) - keyToUtc(b)) / DAY_MS);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(key: DateKey): number {
  return new Date(keyToUtc(key)).getUTCDay();
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayMondayFirst(key: DateKey): number {
  return (weekday(key) + 6) % 7;
}

/** Monday of the week containing `key`. */
export function startOfWeek(key: DateKey): DateKey {
  return addDays(key, -weekdayMondayFirst(key));
}

export function startOfMonth(key: DateKey): DateKey {
  return `${key.slice(0, 8)}01`;
}

export function addMonths(key: DateKey, months: number): DateKey {
  const [y, m, d] = splitKey(key);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return makeKey(ny, nm, Math.min(d, daysInMonth(ny, nm)));
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Local midnight of the given day as timestamp. */
export function startOfDayMs(key: DateKey): number {
  const [y, m, d] = splitKey(key);
  return new Date(y, m - 1, d).getTime();
}

export function endOfDayMs(key: DateKey): number {
  return startOfDayMs(addDays(key, 1)) - 1;
}

/** Combine a day with a local time. */
export function dateKeyWithTime(key: DateKey, hours: number, minutes: number): number {
  const [y, m, d] = splitKey(key);
  return new Date(y, m - 1, d, hours, minutes).getTime();
}

/** Inclusive list of day keys. */
export function eachDay(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = [];
  const n = diffDays(to, from);
  for (let i = 0; i <= n; i++) out.push(addDays(from, i));
  return out;
}

export function formatDateLong(key: DateKey): string {
  const [y, m, d] = splitKey(key);
  return `${WEEKDAYS_LONG[weekday(key)]}, ${d}. ${MONTHS_LONG[m - 1]} ${y}`;
}

/** "Sa, 26. Sept." — the year is appended when it differs from `referenceYear`. */
export function formatDateMedium(key: DateKey, referenceYear = new Date().getFullYear()): string {
  const [y, m, d] = splitKey(key);
  const base = `${WEEKDAYS_SHORT[weekday(key)]}, ${d}. ${MONTHS_SHORT[m - 1]}`;
  return y === referenceYear ? base : `${base} ${y}`;
}

/** "26.09." or "26.09.2025" when the year differs from `referenceYear`. */
export function formatDateShort(key: DateKey, referenceYear = new Date().getFullYear()): string {
  const [y, m, d] = splitKey(key);
  const base = `${pad2(d)}.${pad2(m)}.`;
  return y === referenceYear ? base : `${base}${y}`;
}

export function formatDayMonth(key: DateKey): string {
  const [, m, d] = splitKey(key);
  return `${d}. ${MONTHS_SHORT[m - 1]}`;
}

export function formatMonthYear(key: DateKey): string {
  const [y, m] = splitKey(key);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

/** "Heute", "Gestern", "Morgen" or a medium date. */
export function formatDayRelative(key: DateKey, today: DateKey = todayKey()): string {
  const diff = diffDays(key, today);
  if (diff === 0) return 'Heute';
  if (diff === -1) return 'Gestern';
  if (diff === 1) return 'Morgen';
  return formatDateMedium(key, splitKey(today)[0]);
}

export function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Clock style: "4:05", "12:30", "1:02:03". */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(sec)}` : `${m}:${pad2(sec)}`;
}

/** Human readable duration: "45 Min.", "1 Std. 5 Min.", "30 Sek.". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s} Sek.`;
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  if (h === 0) return `${m} Min.`;
  if (m === 0) return `${h} Std.`;
  if (m === 60) return `${h + 1} Std.`;
  return `${h} Std. ${m} Min.`;
}

/** Compact rest time: "90 s", "2:00 min". */
export function formatRest(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  return `${formatClock(seconds)} min`;
}

/** "heute", "gestern", "vor 3 Tagen", "vor 2 Wochen", "vor 5 Monaten". */
export function formatAgo(key: DateKey, today: DateKey = todayKey()): string {
  const days = diffDays(today, key);
  if (days <= 0) return 'heute';
  if (days === 1) return 'gestern';
  if (days < 7) return `vor ${days} Tagen`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return w === 1 ? 'vor 1 Woche' : `vor ${w} Wochen`;
  }
  if (days < 365) {
    const mo = Math.floor(days / 30);
    return mo === 1 ? 'vor 1 Monat' : `vor ${mo} Monaten`;
  }
  const y = Math.floor(days / 365);
  return y === 1 ? 'vor 1 Jahr' : `vor ${y} Jahren`;
}

export function greeting(hour: number = new Date().getHours()): string {
  if (hour < 5) return 'Gute Nacht';
  if (hour < 11) return 'Guten Morgen';
  if (hour < 14) return 'Mahlzeit';
  if (hour < 18) return 'Guten Tag';
  return 'Guten Abend';
}

/** Age in full years for a birth year (approximation, birthday unknown). */
export function ageFromBirthYear(birthYear: number, today: DateKey = todayKey()): number {
  return splitKey(today)[0] - birthYear;
}
