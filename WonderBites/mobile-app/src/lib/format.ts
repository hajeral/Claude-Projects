import { doha, dohaDayStart, now } from './clock';
import { getLang } from '../i18n';

const ar = () => getLang() === 'ar';
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const qar = (n: number, decimals = false) => { const v = decimals ? n.toFixed(2) : String(Math.round(n)); return ar() ? `${v} ر.ق` : `QAR ${v}`; };

// All dates and times are shown in Doha time (see lib/clock.ts).
const P = (iso: string) => doha(new Date(iso).getTime());

export const hhmm = (iso: string) => {
  const d = P(iso);
  return `${String(d.h).padStart(2, '0')}:${String(d.mi).padStart(2, '0')}`;
};

export const dayDiff = (iso: string) => Math.round((dohaDayStart(new Date(iso).getTime()) - dohaDayStart(now())) / 86400000);

export const dayLabel = (iso: string) => {
  const diff = dayDiff(iso);
  const d = P(iso);
  if (ar()) {
    if (diff === 0) return 'اليوم';
    if (diff === 1) return 'غداً';
    if (diff === -1) return 'أمس';
    if (diff > 1 && diff < 7) return `${DAYS_AR[d.dow]} ${d.d} ${MONTHS_AR[d.mo]}`;
    return `${d.d} ${MONTHS_AR[d.mo]}`;
  }
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) return `${DAYS[d.dow]} ${d.d} ${MONTHS[d.mo]}`;
  return `${d.d} ${MONTHS[d.mo]}`;
};

export const shortDate = (iso: string) => { const d = P(iso); return `${d.d} ${(ar() ? MONTHS_AR : MONTHS)[d.mo]}`; };
export const longDate = (iso: string) => { const d = P(iso); return `${d.d} ${(ar() ? MONTHS_AR : MONTHS)[d.mo]} ${d.y}`; };
export const MONTH_NAMES = () => (ar() ? MONTHS_AR : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);
export const DAY_SHORT = () => (ar() ? ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'] : DAYS);

export const windowText = (start: string, end: string) => `${hhmm(start)} – ${hhmm(end)}`;
export const dayWindow = (start: string, end: string) => `${dayLabel(start)} ${windowText(start, end)}`;

export const duration = (ms: number) => {
  const m = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(m / 60);
  if (ar()) return h ? `${h} س ${m % 60} د` : `${m} د`;
  return h ? `${h}h ${m % 60}m` : `${m}m`;
};

export type PickupState =
  | { kind: 'soldout'; text: string }
  | { kind: 'later'; text: string }          // opens in …
  | { kind: 'now'; text: string; urgent: boolean }
  | { kind: 'ended'; text: string };

/** Live pickup status for a bag, computed from the backend window and bags left. */
export function pickupState(start: string, end: string, bagsLeft: number): PickupState {
  const A = ar();
  if (bagsLeft <= 0) return { kind: 'soldout', text: A ? 'نفدت الكمية · عد غداً' : 'Sold out · check back tomorrow' };
  const t = now();
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (t < s) {
    if (dayDiff(start) >= 1) return { kind: 'later', text: '' };
    return { kind: 'later', text: A ? `يفتح بعد ${duration(s - t)}` : `Opens in ${duration(s - t)}` };
  }
  if (t < e) {
    const left = e - t;
    return left < 30 * 60000
      ? { kind: 'now', text: A ? `أسرع · متبقٍ ${duration(left)}` : `Hurry · ${duration(left)} left`, urgent: true }
      : { kind: 'now', text: A ? `الاستلام الآن · متبقٍ ${duration(left)}` : `Pickup now · ${duration(left)} left`, urgent: false };
  }
  return { kind: 'ended', text: A ? 'انتهى وقت الاستلام' : 'Pickup ended' };
}

export const leftLabel = (n: number) => (ar() ? (n <= 0 ? 'نفدت' : n === 1 ? 'الأخير!' : `متبقٍ ${n}`) : n <= 0 ? 'Sold out' : n === 1 ? 'Last one!' : `${n} left`);

export const countdownParts = (target: string) => {
  const ms = Math.max(0, new Date(target).getTime() - now());
  const s = Math.floor(ms / 1000);
  return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
};

/** True when the ISO time falls on today (app clock). Use this, not dayLabel(), for logic. */
export const isToday = (iso: string) => dayDiff(iso) === 0;
