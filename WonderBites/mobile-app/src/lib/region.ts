// Which country's dialling code to show first. The customer's own choice always wins;
// otherwise the phone's time zone (where the phone is), then its region setting, then Qatar.
import * as Localization from 'expo-localization';
import { COUNTRIES, findCountry, TZ_COUNTRY, type Country } from './countries';
import { useStore } from '../state/store';

let detected: string | undefined;
export function detectCountry(): string {
  if (detected) return detected;
  let iso = '';
  try {
    const tz = Localization.getCalendars?.()[0]?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TZ_COUNTRY[tz] && findCountry(TZ_COUNTRY[tz])) iso = TZ_COUNTRY[tz];
  } catch { /* fall through */ }
  if (!iso) {
    try { const r = Localization.getLocales?.()[0]?.regionCode; if (r && findCountry(r)) iso = r; } catch { /* fall through */ }
  }
  detected = iso || 'QA';
  return detected;
}

/** The country for phone numbers: the one the customer picked, or the detected one. */
export function usePhoneCountry(): Country {
  const picked = useStore((x) => x.phoneCountry);
  return findCountry(picked) ?? findCountry(detectCountry()) ?? COUNTRIES.find((c) => c.iso === 'QA')!;
}

/** Splits "+971 50 123 4567" into its country and the local number. */
export function splitPhone(full: string): { country?: Country; local: string } {
  const t = full.trim();
  const match = COUNTRIES.filter((c) => t.startsWith(c.dial)).sort((a, b) => b.dial.length - a.dial.length)[0];
  return match ? { country: match, local: t.slice(match.dial.length).trim() } : { local: t };
}
