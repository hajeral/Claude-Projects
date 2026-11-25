// HTTP client for the live API: JSON, timeouts, login token on every request,
// automatic token renewal, and an Idempotency-Key on writes so a double tap or a
// retry never books or charges twice.
import { API_URL, REQUEST_TIMEOUT_MS } from '../config';
import { getTokens, setTokens, type Tokens } from '../lib/secure';
import { getLang } from '../i18n';

/** Called once when the session can't be renewed (set by live.ts: clears the account and signs out). */
let onSignedOut: () => void = () => undefined;
export const setOnSignedOut = (f: () => void) => { onSignedOut = f; };

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) { super(message); }
}

const newKey = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
let refreshing: Promise<Tokens | null> | null = null;

async function refresh(): Promise<Tokens | null> {
  const t = await getTokens();
  if (!t) return null;
  refreshing ??= (async () => {
    try {
      const r = await raw('POST', '/auth/refresh', { refreshToken: t.refresh }, false);
      const next = r as Tokens;
      await setTokens(next);
      return next;
    } catch { await setTokens(null); onSignedOut(); return null; } finally { refreshing = null; }
  })();
  return refreshing;
}

// `renewed` makes sure a request renews the login at most once: if the renewed token is
// still refused, the person is signed out instead of renewing again and again.
async function raw(method: string, path: string, body?: unknown, auth = true, idem?: string, renewed = false): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  const headers: Record<string, string> = { Accept: 'application/json', 'Accept-Language': getLang() };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (idem) headers['Idempotency-Key'] = idem;
  if (auth) {
    let t = await getTokens();
    if (t && !renewed && t.expiresAt - Date.now() < 30_000) { t = await refresh(); renewed = true; }
    if (t) headers.Authorization = `Bearer ${t.access}`;
  }
  try {
    const res = await fetch(`${API_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: ctrl.signal });
    const text = await res.text();
    const json = text ? JSON.parse(text) : undefined;
    if (res.status === 401 && auth && path !== '/auth/refresh') {
      if (!renewed && await refresh()) return raw(method, path, body, auth, idem, true);
      if (renewed) { await setTokens(null); onSignedOut(); }
    }
    if (!res.ok) throw new ApiError(res.status, json?.code ?? 'http_error', json?.message ?? `Request failed (${res.status})`, json?.details);
    return json;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if ((e as Error).name === 'AbortError') throw new ApiError(0, 'timeout', 'The connection timed out. Please try again.');
    throw new ApiError(0, 'network', 'No connection. Check your internet and try again.');
  } finally { clearTimeout(timer); }
}

export const http = {
  get: <T,>(path: string) => raw('GET', path) as Promise<T>,
  post: <T,>(path: string, body?: unknown, opts: { auth?: boolean; idempotent?: boolean } = {}) =>
    raw('POST', path, body ?? {}, opts.auth ?? true, opts.idempotent ? newKey() : undefined) as Promise<T>,
  patch: <T,>(path: string, body: unknown) => raw('PATCH', path, body) as Promise<T>,
  put: <T,>(path: string, body: unknown) => raw('PUT', path, body) as Promise<T>,
  del: <T,>(path: string) => raw('DELETE', path) as Promise<T>,
};
