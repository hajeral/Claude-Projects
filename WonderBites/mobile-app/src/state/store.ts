// Local demo storage shared by every screen. Everything the customer changes
// (favourites, profile, preferences, orders, vouchers, support records, filters)
// is kept here and saved on the phone so it survives closing the app.
// Passwords and card details are NEVER stored here. In live mode the same
// records come from the server and this store only caches UI choices.
import { DEMO } from '../config';
import { getLang } from '../i18n';
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Order, Ticket, User, Voucher } from '../api/types';
import * as mock from '../api/mock';

export type Filters = {
  /** only shops that deliver */
  delivery?: boolean;
  available: boolean;                 // only bags with bags left
  day: 'today' | 'tomorrow' | 'any' | 'date';
  date?: string;                      // 'YYYY-MM-DD' (Doha) when day === 'date'
  times: string[];                    // 'morning' | 'afternoon' | 'evening' | 'night'
  areas: string[];                    // area names, empty = anywhere
  km: number;                         // max distance
  bagTypes: string[];
  shopTypes: string[];
  diet: string[];
  price: [number, number];
  minRating: number;                  // 0 = any
  sort: 'nearest' | 'cheapest' | 'discount' | 'soonest' | 'rating';
  category: string;                   // 'All' | 'Pastries' | 'Groceries' | 'Meals'
};
export const DEFAULT_FILTERS: Filters = { delivery: false, available: false, day: 'any', times: [], areas: [], km: 5, bagTypes: [], shopTypes: [], diet: [], price: [5, 60], minRating: 0, sort: 'nearest', category: 'All' };

/** What a saved place is. The first place in the list is the customer's default. */
export type PlaceKind = 'home' | 'work' | 'gym' | 'family' | 'study' | 'other';
export type Place = { id: string; label: string; area: string; detail: string; kind?: PlaceKind };
export const PLACE_KINDS: { kind: PlaceKind; label: string }[] = [
  { kind: 'home', label: 'Home' }, { kind: 'work', label: 'Work' }, { kind: 'gym', label: 'Gym' },
  { kind: 'family', label: 'Family' }, { kind: 'study', label: 'University' }, { kind: 'other', label: 'Other' },
];
/** Shows a place type's name in the app's language ("Home" is المنزل here, not the Home tab). */
const PLACE_AR: Record<string, string> = { Home: 'المنزل', Work: 'العمل', Gym: 'النادي الرياضي', Family: 'العائلة', University: 'الجامعة', Other: 'أخرى' };
export const placeLabel = (label: string) => (getLang() === 'ar' && PLACE_AR[label] ? PLACE_AR[label] : label);
export const isPlaceKindLabel = (label: string) => PLACE_KINDS.some((k) => k.label === label || PLACE_AR[k.label] === label);
export const placeIcon = (p: Place) => (p.kind === 'home' || p.id === 'home' ? 'home' : p.kind === 'work' || p.id === 'work' ? 'work' : p.kind === 'family' ? 'heart' : 'pin') as 'home' | 'work' | 'heart' | 'pin';
export type Feedback = { id: string; at: string; kind: 'feedback' | 'recommend'; stars?: number; about?: string; text: string; photo?: string };
export type Session = { signedIn: boolean; guest: boolean; phone?: string; email?: string };

export type State = {
  v: 1;
  session: Session;
  profile: Pick<User, 'firstName' | 'lastName' | 'email' | 'phone'> & { photo?: string; birthday?: string };
  favBranches: string[];
  notifyBags: string[];
  prefs: Record<string, boolean>;
  quietHours: { on: boolean; from: string; to: string };
  orders: Order[];                    // demo orders created in the app (newest first)
  orderPatches: Record<string, Partial<Order>>; // changes to sample orders (collected, rating)
  stock: Record<string, number>;      // bags left after demo reservations
  addedVouchers: Voucher[];
  usedVouchers: string[];
  appliedVoucher?: string;            // voucher chosen for the current checkout
  tickets: Ticket[];
  feedback: Feedback[];
  helpful: Record<string, boolean>;
  places: Place[];
  recent: string[];
  filters: Filters;
  location: { area: string; km: number; lat?: number; lng?: number; source: 'manual' | 'gps' };
  /** ISO code of the dialling country the customer picked; null = detect from the phone */
  phoneCountry: string | null;
  /** vouchers the customer has already seen in Vouchers (no more "New" tag) */
  seenVouchers: string[];
  /** bell messages already read ("<voucherId>:new" / "<voucherId>:exp") */
  bellSeen: string[];
  nextOrderNo: number;
};

const KEY = 'wb.demo.v1';
const initial = (): State => ({
  v: 1,
  session: { signedIn: false, guest: false },
  // the sample customer only in demo mode; live mode starts empty and fills from GET /me
  profile: DEMO ? { firstName: mock.user.firstName, lastName: mock.user.lastName, email: mock.user.email, phone: mock.user.phone } : { firstName: '', lastName: '', email: '', phone: '' },
  favBranches: DEMO ? [...mock.favouriteBranchIds] : [],
  notifyBags: [],
  prefs: { pick: true, upd: true, last: false, fav: true, drop: false, offers: true, mail: false },
  quietHours: { on: false, from: '22:00', to: '08:00' },
  orders: [],
  orderPatches: {},
  stock: {},
  addedVouchers: [],
  usedVouchers: [],
  tickets: [],
  feedback: [],
  helpful: {},
  places: [
    { id: 'home', label: 'Home', area: 'Msheireb', detail: 'Msheireb Downtown, Doha', kind: 'home' },
    { id: 'work', label: 'Work', area: 'West Bay', detail: 'West Bay, Doha', kind: 'work' },
    { id: 'gym', label: 'Gym', area: 'Al Sadd', detail: 'Al Sadd, Doha', kind: 'gym' },
  ],
  recent: ['Croissant', 'Donuts', 'Salad'],
  filters: { ...DEFAULT_FILTERS },
  location: { area: 'Msheireb', km: 5, source: 'manual' },
  phoneCountry: null,
  seenVouchers: ['v1', 'v2', 'v3'],
  bellSeen: ['v1:new', 'v2:new', 'v3:new'],
  nextOrderNo: 1121,
});

let state: State = initial();
let ready = false;
let saveError: string | undefined;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
let timer: ReturnType<typeof setTimeout> | undefined;

function persist() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    AsyncStorage.setItem(KEY, JSON.stringify(state)).then(
      () => { if (saveError) { saveError = undefined; emit(); } },
      (e: unknown) => { saveError = e instanceof Error ? e.message : String(e); emit(); },
    );
  }, 150);
}

/** Load saved data once at launch (called from the root layout). */
export async function restoreStore() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<State>;
      if (saved.v === 1) state = { ...initial(), ...saved, filters: { ...DEFAULT_FILTERS, ...(saved.filters ?? {}) } };
    }
  } catch (e) {
    saveError = e instanceof Error ? e.message : String(e);
  }
  ready = true;
  emit();
}

export const getState = () => state;
export const storeReady = () => ready;
export const storeError = () => saveError;

/** Change the store: setStore((s) => ({ ...s, favBranches: [...] })). */
export function setStore(fn: (s: State) => State) {
  state = fn(state);
  emit();
  persist();
}

/** Sign-out / account deletion: remove everything that belongs to the person (profile, orders,
 *  vouchers, favourites, places, tickets, searches…). Phone-level choices stay: language,
 *  map area and filters, dialling country. */
export function clearAccountData() {
  const d = initial();
  state = {
    ...d, filters: state.filters, location: state.location, phoneCountry: state.phoneCountry, stock: state.stock, nextOrderNo: state.nextOrderNo,
    session: { signedIn: false, guest: false },
    // nothing of the previous person, and none of the demo's sample account either
    profile: { firstName: '', lastName: '', email: '', phone: '' }, favBranches: [], notifyBags: [], places: [], recent: [],
    orders: [], orderPatches: {}, addedVouchers: [], usedVouchers: [], appliedVoucher: undefined, tickets: [], feedback: [], helpful: {}, seenVouchers: [], bellSeen: [],
  };
  emit();
  void AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => undefined);
}

/** Clear all demo data (asks for confirmation in the UI first). */
export async function resetStore() {
  state = initial();
  emit();
  try { await AsyncStorage.removeItem(KEY); } catch { /* shown via storeError on next save */ }
}

const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
/** Read part of the store; the component re-renders when it changes. */
export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => select(state), () => select(state));
}
export const useStoreError = () => useSyncExternalStore(subscribe, () => saveError, () => saveError);

// Small helpers used across screens
export const toggleIn = (list: string[], x: string) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);
export const isFav = (branchId: string) => state.favBranches.includes(branchId);
export const toggleFav = (branchId: string) => setStore((s) => ({ ...s, favBranches: toggleIn(s.favBranches, branchId) }));
