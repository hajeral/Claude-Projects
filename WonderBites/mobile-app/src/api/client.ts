// The single place screens get data from. Demo or live is chosen by EXPO_PUBLIC_API_URL
// (see src/config.ts); screens do not change between the two.
import { useEffect, useState } from 'react';
import { LIVE } from '../config';
import { demoApi, demoSync } from './demo';
import { liveApi, liveSync } from './live';
import type { Bag, Branch, Order } from './types';

export const api = LIVE ? liveApi : demoApi;
const src = LIVE ? liveSync : demoSync;

/** Synchronous reads. find* return undefined for an unknown id; the others assume it exists. */
export const sync = {
  ...src,
  branch: (id: string) => src.findBranch(id) as Branch,
  bag: (id: string) => src.findBag(id) as Bag,
  order: (id: string) => src.findOrder(id) as Order,
  branchOfBag: (bagId: string) => sync.branch(sync.bag(bagId).branchId),
};

/** Tiny data hook: const { data } = useApi(() => api.bag(id), [id]) */
export function useApi<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<Error | undefined>();
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    setError(undefined);
    fn().then((d) => alive && setData(d)).catch((e: unknown) => alive && setError(e instanceof Error ? e : new Error(String(e))));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n]);
  return { data, error, loading: data === undefined && !error, retry: () => setN((x) => x + 1) };
}

/** Re-render every `ms` so countdowns and "opens in" labels stay live. */
export function useTick(ms = 1000) {
  const [, set] = useState(0);
  useEffect(() => { const i = setInterval(() => set((x) => x + 1), ms); return () => clearInterval(i); }, [ms]);
}
