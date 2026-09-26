/**
 * Tiny change bus. Repositories emit the tables they modified, `useQuery`
 * re-runs queries that depend on them.
 */

export type Table =
  | 'exercises'
  | 'workouts'
  | 'templates'
  | 'weights'
  | 'measurements'
  | 'cardio'
  | 'foods'
  | 'food_entries'
  | 'water'
  | 'kv';

export const ALL_TABLES: Table[] = [
  'exercises',
  'workouts',
  'templates',
  'weights',
  'measurements',
  'cardio',
  'foods',
  'food_entries',
  'water',
  'kv',
];

type Listener = (tables: ReadonlySet<Table>) => void;

const listeners = new Set<Listener>();
let pending: Set<Table> | null = null;

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Notifies listeners in a microtask so several writes cause only one refresh. */
export function emitChange(...tables: Table[]): void {
  if (!pending) {
    pending = new Set();
    queueMicrotask(() => {
      const changed = pending!;
      pending = null;
      for (const l of [...listeners]) l(changed);
    });
  }
  for (const t of tables) pending.add(t);
}
