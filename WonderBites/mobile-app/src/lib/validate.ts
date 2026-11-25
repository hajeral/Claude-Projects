// Form checks shared by sign-up, log-in and profile screens. The server repeats every
// check; these only give the customer instant feedback.
export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
/** Qatar mobile numbers: 8 digits, starting 3, 5, 6 or 7. */
export const isQatarMobile = (s: string) => /^[3567]\d{7}$/.test(s.replace(/\D/g, ''));
export const formatQatar = (s: string) => { const d = s.replace(/\D/g, ''); return `+974 ${d.slice(0, 4)} ${d.slice(4, 8)}`; };
/** Any country: Qatar keeps its own rule; elsewhere 6–14 digits (the server checks the real format). */
export const isMobile = (s: string, dial: string) => (dial === '+974' ? isQatarMobile(s) : /^\d{6,14}$/.test(s.replace(/\D/g, '')));
export const formatPhone = (s: string, dial: string) => (dial === '+974' ? formatQatar(s) : `${dial} ${s.replace(/\D/g, '')}`);
export const mobileError = (dial: string) => (dial === '+974' ? 'Enter an 8-digit Qatar mobile number' : 'Enter a valid mobile number');

export function passwordRules(pw: string): [string, boolean][] {
  return [
    ['At least 8 characters', pw.length >= 8],
    ['One number', /\d/.test(pw)],
    ['Upper and lower case', /[a-z]/.test(pw) && /[A-Z]/.test(pw)],
    ['One symbol (recommended)', /[^A-Za-z0-9]/.test(pw)],
  ];
}
export const isStrongPassword = (pw: string) => passwordRules(pw).slice(0, 3).every(([, ok]) => ok);
/** 0–3 for the strength meter. */
export const passwordLevel = (pw: string) => (pw ? Math.max(1, passwordRules(pw).filter(([, ok]) => ok).length - 1) : 0);

/** Sign-up details kept in memory only while the customer moves between steps. Never saved. */
export const signupDraft: { phone?: string; email?: string; channel?: 'sms' | 'whatsapp' | 'email'; purpose?: 'signup' | 'reset'; code?: string } = {};
