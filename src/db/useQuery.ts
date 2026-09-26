import { useCallback, useEffect, useRef, useState } from 'react';

import { subscribe, type Table } from './events';

export interface QueryResult<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Runs an async database query and re-runs it whenever one of `tables`
 * changes or one of `deps` changes. Previous data is kept while reloading.
 */
export function useQuery<T>(
  query: () => Promise<T>,
  deps: readonly unknown[],
  tables: readonly Table[],
): QueryResult<T> {
  const [state, setState] = useState<{ data: T | undefined; loading: boolean; error: Error | null }>({
    data: undefined,
    loading: true,
    error: null,
  });
  const queryRef = useRef(query);
  const requestRef = useRef(0);
  const mountedRef = useRef(true);

  const run = useCallback(() => {
    const request = ++requestRef.current;
    queryRef.current().then(
      (data) => {
        if (mountedRef.current && request === requestRef.current) setState({ data, loading: false, error: null });
      },
      (error: unknown) => {
        if (mountedRef.current && request === requestRef.current) {
          console.warn('Query failed', error);
          setState((s) => ({
            data: s.data,
            loading: false,
            error: error instanceof Error ? error : new Error(String(error)),
          }));
        }
      },
    );
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    queryRef.current = query;
    run();
    // The query closure is intentionally tracked through `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const tableKey = tables.join(',');
  useEffect(() => {
    const watched = new Set(tableKey.split(','));
    return subscribe((changed) => {
      for (const t of changed) {
        if (watched.has(t)) {
          run();
          return;
        }
      }
    });
  }, [tableKey, run]);

  return { ...state, refetch: run };
}
