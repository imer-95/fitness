import type { SqlDatabase } from './sql';
import { createSqlJsDatabase } from './sqljs';

/**
 * Web preview: SQLite runs in the browser via sql.js and the database file is
 * persisted in IndexedDB. The mobile apps use expo-sqlite instead (open.ts).
 */
const DB_NAME = 'formkurve';
const STORE = 'files';
const KEY = 'database';

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function load(): Promise<Uint8Array | null> {
  try {
    const idb = await openIdb();
    return await new Promise((resolve, reject) => {
      const request = idb.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve((request.result as Uint8Array | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

async function save(bytes: Uint8Array): Promise<void> {
  const idb = await openIdb();
  await new Promise<void>((resolve, reject) => {
    const tx = idb.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(bytes, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function openDatabase(): Promise<SqlDatabase> {
  const data = typeof indexedDB === 'undefined' ? null : await load();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const adapter = await createSqlJsDatabase({
    data,
    onWrite: () => {
      if (typeof indexedDB === 'undefined') return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        try {
          void save(adapter.exportBytes());
        } catch {
          // A transaction is still running; the next write triggers another save.
        }
      }, 500);
    },
  });
  return adapter;
}
