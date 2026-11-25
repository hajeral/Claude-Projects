// Language + right-to-left support.
//
// How translation works: English text is the key (gettext style). Every <Text> and
// <TextInput placeholder> from components/AppText passes its string children through tr(),
// which looks the string up in ./ar.ts (exact strings first, then patterns for strings
// with numbers or names in them). Values from the backend (shop names, areas…) should
// come localized from the API; the sample ones are in the dictionary too.
//
// Direction rules for layout code:
//   start / end, marginStart / paddingEnd …  → logical: flip in Arabic
//   left / right                              → physical: never flip (maps, illustrations)
import { useSyncExternalStore } from 'react';
import { I18nManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { AR_PATTERNS, AR_STRINGS } from './ar';

export type Lang = 'en' | 'ar';
const KEY = 'wb.lang';

function initial(): Lang {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q === 'ar' || q === 'en') return q;
    try { const s = window.localStorage.getItem(KEY); if (s === 'ar' || s === 'en') return s; } catch { /* storage blocked */ }
  }
  return getLocales()[0]?.languageCode === 'ar' ? 'ar' : 'en';
}

let lang: Lang = initial();
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());

// Mirroring is done by the app itself (root `direction` style + atStart/atEnd helpers), the same
// on iOS, Android and web, so the language switches instantly with no restart. The system RTL
// flag is kept OFF: forcing it needs a full native restart, and in Expo Go a reload never applies
// it, which made earlier builds restart in a loop. This also clears that flag for anyone affected.
if (Platform.OS !== 'web') {
  try {
    I18nManager.swapLeftAndRightInRTL(false);
    if (I18nManager.isRTL) I18nManager.forceRTL(false);
    I18nManager.allowRTL(false);
  } catch { /* ignore */ }
}

export const getLang = () => lang;
export const isRTL = () => lang === 'ar';
export function useLang(): Lang {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => lang, () => lang);
}

/** Switch language instantly on every platform and remember the choice. */
export async function setLanguage(next: Lang) {
  if (next === lang) return;
  lang = next;
  if (Platform.OS === 'web') {
    try { window.localStorage.setItem(KEY, next); } catch { /* ignore */ }
    if (typeof document !== 'undefined') { document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr'; document.documentElement.lang = next; }
  } else {
    try { await AsyncStorage.setItem(KEY, next); } catch { /* ignore */ }
  }
  notify();
}

/** At launch, apply the saved language (or the phone's language on first launch). Never reloads. */
export async function restoreLanguage() {
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    return;
  }
  let s: string | null = null;
  try { s = await AsyncStorage.getItem(KEY); } catch { /* ignore */ }
  const want: Lang = s === 'ar' || s === 'en' ? s : lang;
  if (want !== lang) { lang = want; notify(); }
}

const missing = new Set<string>();
/** Translate an English UI string into the current language. */
export function tr(s: string): string {
  if (lang === 'en' || !s) return s;
  const lead = s.match(/^\s*/)![0];
  const tail = s.match(/\s*$/)![0];
  const core = s.trim();
  if (!core || !/[A-Za-z]/.test(core)) return s;
  const hit = AR_STRINGS[core];
  if (hit !== undefined) return lead + hit + tail;
  for (const [re, fn] of AR_PATTERNS) {
    const m = core.match(re);
    if (m) return lead + fn(m, tr) + tail;
  }
  // Bullets, trailing separators and "a · b · c" lists translate piece by piece.
  if (core.startsWith('• ')) return lead + '•  ' + tr(core.replace(/^•\s+/, '')) + tail;
  if (core.startsWith('· ')) return lead + '· ' + tr(core.slice(2)) + tail;
  if (core.endsWith(' ·')) return lead + tr(core.slice(0, -2)) + ' ·' + tail;
  if (core.includes(' · ')) return lead + core.split(' · ').map(tr).join(' · ') + tail;
  if (__DEV__ || (globalThis as { __wbCollect?: boolean }).__wbCollect) { missing.add(core); (globalThis as { __wbMissing?: string[] }).__wbMissing = [...missing]; }
  return s;
}

/** Translate React children: plain strings and numbers inside arrays. */
/**
 * Keeps left-to-right runs readable inside Arabic text: phone numbers, times like 0:46,
 * order numbers like 0974-1118, emails and URLs are wrapped in Unicode LTR isolates
 * (U+2066 … U+2069), so "+974 5512 3456" never shows as "3456 5512 974+".
 */
const LTR_RUN = /(\+?\d[\d\s\-:]*\d|[\w.+-]+@[\w-]+\.[\w.]+|https?:\/\/\S+)/g;
export const isolateLtr = (s: string) => s.replace(LTR_RUN, (m) => (/[\s\-:@+/]/.test(m) ? `\u2066${m}\u2069` : m));
const trI = (s: string) => isolateLtr(tr(s));

export function trChildren(c: unknown): unknown {
  if (lang === 'en') return c;
  if (typeof c === 'string') return trI(c);
  if (Array.isArray(c)) {
    // Join adjacent strings so "Pay " + "QAR 17.00" translate as one phrase.
    const out: unknown[] = [];
    for (const x of c) {
      if ((typeof x === 'string' || typeof x === 'number') && typeof out[out.length - 1] === 'string') out[out.length - 1] = (out[out.length - 1] as string) + String(x);
      else out.push(typeof x === 'number' ? String(x) : x);
    }
    return out.map((x) => (typeof x === 'string' ? trI(x) : x));
  }
  return c;
}

/**
 * Logical absolute positions that work the same on iOS, Android and web:
 * atStart(12) = 12 from the reading-start edge (left in English, right in Arabic).
 * Call inside a component that uses useLang() so it updates when the language changes.
 */
export const atStart = (v: number) => (lang === 'ar' ? { right: v } : { left: v });
export const atEnd = (v: number) => (lang === 'ar' ? { left: v } : { right: v });

/** Physical padding / margin on the reading-start or reading-end side (web-safe). */
export const padStart = (v: number) => (lang === 'ar' ? { paddingRight: v } : { paddingLeft: v });
export const padEnd = (v: number) => (lang === 'ar' ? { paddingLeft: v } : { paddingRight: v });
export const marStart = (v: number) => (lang === 'ar' ? { marginRight: v } : { marginLeft: v });
export const marEnd = (v: number) => (lang === 'ar' ? { marginLeft: v } : { marginRight: v });
export const borderEnd = (w: number, color: string) => (lang === 'ar' ? { borderLeftWidth: w, borderLeftColor: color } : { borderRightWidth: w, borderRightColor: color });
