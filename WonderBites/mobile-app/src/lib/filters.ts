// One filter engine used by the map, the results list, Home "See all" and the Filters
// screen, so counts always match what is shown. In live mode the same Filters object
// is sent to GET /bags/search (see INTEGRATION.md) and the server applies it.
import type { Bag, Branch } from '../api/types';
import type { Filters } from '../state/store';
import { DEFAULT_FILTERS } from '../state/store';
import { doha, dohaKey } from './clock';
import { dayDiff } from './format';

export const TIME_SLOTS = [
  { key: 'morning', label: 'Morning · before 12', from: 0, to: 12 },
  { key: 'afternoon', label: 'Afternoon · 12–17', from: 12, to: 17 },
  { key: 'evening', label: 'Evening · 17–21', from: 17, to: 21 },
  { key: 'late', label: 'Late · after 21', from: 21, to: 24 },
] as const;
export const SORTS = [
  { key: 'nearest', label: 'Nearest' },
  { key: 'soonest', label: 'Pickup soonest' },
  { key: 'discount', label: 'Biggest discount' },
  { key: 'cheapest', label: 'Lowest price' },
  { key: 'rating', label: 'Top rated' },
] as const;
export const CATEGORIES = ['All', 'Pastries', 'Groceries', 'Meals'] as const;

export function matches(b: Bag, br: Branch | undefined, f: Filters): boolean {
  if (!br) return false;
  if (f.available && b.bagsLeft <= 0) return false;
  if (f.delivery && !br?.delivery) return false;
  if (f.category !== 'All' && b.category !== f.category) return false;
  const dd = dayDiff(b.pickupStart);
  if (f.day === 'today' && dd !== 0) return false;
  if (f.day === 'tomorrow' && dd !== 1) return false;
  if (f.day === 'date' && f.date && dohaKey(new Date(b.pickupStart).getTime()) !== f.date) return false;
  if (f.times.length) {
    const h = doha(new Date(b.pickupStart).getTime()).h;
    if (!TIME_SLOTS.some((t) => f.times.includes(t.key) && h >= t.from && h < t.to)) return false;
  }
  const named = f.areas.filter((a) => a !== 'Near me');
  if (named.length && !named.includes(br.area)) return false;
  if (f.km < 20 && br.distanceKm > f.km) return false;
  if (f.bagTypes.length && !f.bagTypes.includes(b.bagType)) return false;
  if (f.shopTypes.length && !f.shopTypes.includes(br.shopType)) return false;
  if (f.diet.length && !f.diet.every((d) => b.dietary.includes(d))) return false;
  if (b.price < f.price[0] || b.price > f.price[1]) return false;
  if (f.minRating && br.rating < f.minRating) return false;
  return true;
}

export function applyFilters(bags: Bag[], branch: (id: string) => Branch | undefined, f: Filters): Bag[] {
  const list = bags.filter((b) => matches(b, branch(b.branchId), f));
  const key = (b: Bag) => {
    const br = branch(b.branchId)!;
    switch (f.sort) {
      case 'soonest': return new Date(b.pickupStart).getTime();
      case 'discount': return -b.discountPercent;
      case 'cheapest': return b.price;
      case 'rating': return -br.rating;
      default: return br.distanceKm;
    }
  };
  // sold-out bags always go last
  return list.sort((a, b) => (a.bagsLeft <= 0 ? 1 : 0) - (b.bagsLeft <= 0 ? 1 : 0) || key(a) - key(b));
}

/** How many filters differ from the defaults (shown as "3 filters on"). */
export function activeCount(f: Filters): number {
  const d = DEFAULT_FILTERS;
  return [f.available !== d.available, f.day !== 'any', f.times.length > 0, f.areas.length > 0, f.km !== d.km, !!f.delivery, f.bagTypes.length > 0,
    f.shopTypes.length > 0, f.diet.length > 0, f.price[0] !== d.price[0] || f.price[1] !== d.price[1], f.minRating > 0, f.category !== 'All'].filter(Boolean).length;
}
