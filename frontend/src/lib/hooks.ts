"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "@/lib/api";

/** Debounce a fast-changing value (e.g. a search box). */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/**
 * Load async data with loading / error state. `deps` re-trigger the load;
 * responses that arrive after a newer request started are discarded.
 */
export function useAsync<T>(loader: (() => Promise<T>) | null, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(loader));
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const loaderRef = useRef(loader);
  // Keep the latest loader without re-running; declared before the load effect so it runs first.
  useEffect(() => {
    loaderRef.current = loader;
  });

  const run = useCallback(async () => {
    const fn = loaderRef.current;
    if (!fn) return;
    const mine = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      if (mine === seq.current) setData(result);
    } catch (e) {
      if (mine === seq.current) setError(errorMessage(e));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, setData, loading, error, reload: run };
}

/**
 * Page number that automatically returns to 1 whenever `filterKey` changes
 * (new search, filter or sort), without an extra effect/render.
 */
export function usePageForFilters(filterKey: string) {
  const [state, setState] = useState({ key: filterKey, page: 1 });
  const page = state.key === filterKey ? state.page : 1;
  const setPage = useCallback((p: number) => setState({ key: filterKey, page: p }), [filterKey]);
  return [page, setPage] as const;
}
