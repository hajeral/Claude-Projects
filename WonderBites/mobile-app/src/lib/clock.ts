// App clock: the device's real time, always read in Doha time (Asia/Qatar, UTC+3, no
// daylight saving) so pickup windows and dates look the same on any phone, wherever
// its time zone is set.
export const DOHA_OFFSET_MS = 3 * 3600_000;

export const now = (): number => Date.now();

/** Calendar parts of an instant in Doha time. */
export function doha(ms: number = now()) {
  const d = new Date(ms + DOHA_OFFSET_MS);
  return { y: d.getUTCFullYear(), mo: d.getUTCMonth(), d: d.getUTCDate(), dow: d.getUTCDay(), h: d.getUTCHours(), mi: d.getUTCMinutes() };
}

/** Instant (ms) of a Doha wall-clock time. Day/month overflow is handled. */
export const dohaTime = (y: number, mo: number, d: number, h = 0, mi = 0) => Date.UTC(y, mo, d, h, mi) - DOHA_OFFSET_MS;

/** Doha midnight that starts the day of `ms`. */
export const dohaDayStart = (ms: number = now()) => { const p = doha(ms); return dohaTime(p.y, p.mo, p.d); };

/** "YYYY-MM-DD" of an instant, in Doha. */
export const dohaKey = (ms: number = now()) => { const p = doha(ms); return `${p.y}-${String(p.mo + 1).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`; };

/** ISO string for a Doha clock time `dayOffset` days from today, e.g. at(0,'18:00'). */
export function at(dayOffset: number, hhmm: string, from: number = now()): string {
  const [h, m] = hhmm.split(':').map(Number);
  const p = doha(from);
  return new Date(dohaTime(p.y, p.mo, p.d + dayOffset, h, m)).toISOString();
}
