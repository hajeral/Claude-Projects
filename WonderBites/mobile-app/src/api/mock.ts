// Sample data standing in for the merchant platform until the API is connected.
// Times are built relative to the demo clock so labels like "Opens in 2h 10m" stay live.
import type { Bag, Branch, Order, Ticket, User, Voucher } from './types';
import { at } from '../lib/clock';

export const user: User = {
  firstName: 'Sarah',
  lastName: 'Al-Kuwari',
  email: 'sarah@email.com',
  phone: '+974 5512 3456',
  rescuerSince: 2025,
  impact: { meals: 24, saved: 420, co2Kg: 18 },
  monthImpact: { bags: 6, saved: 132, co2Kg: 4.5 },
};

const b = (x: Partial<Branch> & Pick<Branch, 'id' | 'storeName' | 'branchName' | 'area' | 'initials'>): Branch => ({
  storeId: x.id.split('-')[0],
  address: x.area,
  phone: '+974 4412 3456',
  logoColor: '#D9175C',
  shopType: 'Bakery',
  rating: 4.6,
  reviewCount: 420,
  distanceKm: 1.5,
  lat: 25.286,
  lng: 51.526,
  openingHours: '07:00 – 22:00',
  mealsRescued: 120,
  about: '',
  ...x,
});

export const branches: Branch[] = [
  b({ id: 'lp-msheireb', storeName: 'La Patisserie Doha', branchName: 'Msheireb branch', area: 'Msheireb', address: 'Sikkat Wadi Msheireb', initials: 'LP', shopType: 'Patisserie', rating: 4.7, reviewCount: 1200, distanceKm: 1.2, walkMinutes: 15, lat: 25.2867, lng: 51.5262, dailyDropTime: '17:00', mealsRescued: 380,
    about: 'French patisserie in Msheireb Downtown: croissants, viennoiserie and sourdough baked every morning.',
    ratings: { quality: 4.8, value: 4.9, freshness: 4.6, pickup: 4.5 } }),
  b({ id: 'gc-lusail', storeName: 'Glaze & Co Donuts', branchName: 'Lusail Boulevard branch', area: 'Lusail', address: 'Al Wasl Square, Lusail', initials: 'GC', shopType: 'Donuts', rating: 4.6, reviewCount: 860, distanceKm: 14, driveMinutes: 20, lat: 25.42, lng: 51.49, dailyDropTime: '20:30', mealsRescued: 210,
    about: 'Hand-glazed donuts made fresh every day on Lusail Boulevard.' }),
  b({ id: 'karak-westbay', storeName: 'Karak & Co', branchName: 'West Bay branch', area: 'West Bay', initials: 'KC', shopType: 'Café', rating: 4.8, distanceKm: 0.8, dailyDropTime: '16:00', lat: 25.3275, lng: 51.53 }),
  b({ id: 'karak-alsadd', storeName: 'Karak & Co', branchName: 'Al Sadd branch', area: 'Al Sadd', initials: 'KC', shopType: 'Café', rating: 4.6, distanceKm: 0.5, dailyDropTime: '16:00', lat: 25.284, lng: 51.4975 }),
  b({ id: 'gf-alsadd', storeName: 'The Green Fork', branchName: 'Al Sadd branch', area: 'Al Sadd', initials: 'GF', shopType: 'Healthy & salads', rating: 4.6, distanceKm: 1.9, lat: 25.277, lng: 51.506 }),
  b({ id: 'sufra-katara', storeName: 'Al Sufra Kitchen', branchName: 'Katara branch', area: 'Katara', initials: 'AS', shopType: 'Restaurant', rating: 4.5, distanceKm: 2.4, lat: 25.361, lng: 51.5262 }),
  b({ id: 'bloom-pearl', storeName: 'Bloom Bakehouse', branchName: 'The Pearl branch', area: 'The Pearl', initials: 'BB', rating: 4.9, distanceKm: 2.8, lat: 25.3708, lng: 51.5503 }),
  b({ id: 'sidra-lusail', storeName: 'Sidra Bakery', branchName: 'Lusail branch', area: 'Lusail', initials: 'SB', rating: 4.6, distanceKm: 2.9, lat: 25.4135, lng: 51.4968 }),
  b({ id: 'olive-katara', storeName: 'Olive & Thyme', branchName: 'Katara branch', area: 'Katara', initials: 'OT', shopType: 'Restaurant', rating: 4.5, distanceKm: 2.4 , delivery: { fee: 12 }, lat: 25.354, lng: 51.521 }),
  b({ id: 'mama-alwaab', storeName: 'Mama’s Table', branchName: 'Al Waab branch', area: 'Al Waab', initials: 'MT', shopType: 'Restaurant', rating: 4.6, distanceKm: 2.1, delivery: { fee: 10 }, lat: 25.2622, lng: 51.4612 }),
  b({ id: 'corniche-westbay', storeName: 'Corniche Hotel', branchName: 'West Bay', area: 'West Bay', initials: 'CG', shopType: 'Hotel buffet', rating: 4.7, distanceKm: 1.6, openingHours: '06:30 – 23:30', dailyDropTime: '21:30', delivery: { fee: 15 }, lat: 25.312, lng: 51.525 }),
  b({ id: 'souq-alsadd', storeName: 'Souq Fresh Market', branchName: 'Al Sadd branch', area: 'Al Sadd', initials: 'SF', shopType: 'Supermarket', rating: 4.5, distanceKm: 1.1, dailyDropTime: '20:00', lat: 25.2905, lng: 51.488 }),
];

const bag = (x: Partial<Bag> & Pick<Bag, 'id' | 'branchId' | 'title' | 'photo' | 'price' | 'originalPrice' | 'discountPercent' | 'bagsLeft' | 'pickupStart' | 'pickupEnd'>): Bag => ({
  bagType: 'Bread & pastries',
  category: 'Pastries',
  description: 'A handpicked selection from today’s picks. Every bag is a surprise.',
  allergens: 'Wheat flour, butter, eggs, milk, nuts and sesame. Contents vary with what’s available each day.',
  dietary: [],
  ...x,
});

export const bags: Bag[] = [
  bag({ id: 'lp-bakery', branchId: 'lp-msheireb', title: 'Bakery bag', photo: 'store_shelves', price: 15, originalPrice: 50, discountPercent: 70, bagsLeft: 2, pickupStart: at(0, '18:00'), pickupEnd: at(0, '20:00'),
    description: 'A tasty mix of today’s bakes: croissants, viennoiserie, a loaf of sourdough and a sweet or two. Every bag is a little different.', dietary: ['Vegetarian'] }),
  bag({ id: 'karak-cafe', branchId: 'karak-westbay', title: 'Café bag', photo: 'cafe_pastries', price: 20, originalPrice: 50, discountPercent: 60, bagsLeft: 3, pickupStart: at(0, '17:00'), pickupEnd: at(0, '18:30') }),
  bag({ id: 'gf-salad', branchId: 'gf-alsadd', title: 'Salad bag', photo: 'salad_pink', bagType: 'Meals', category: 'Meals', price: 35, originalPrice: 70, discountPercent: 50, bagsLeft: 2, pickupStart: at(0, '19:00'), pickupEnd: at(0, '20:30'), dietary: ['Vegetarian', 'Vegan'] }),
  bag({ id: 'sufra-grill', branchId: 'sufra-katara', title: 'Grill box', photo: 'grill_spread', bagType: 'Meals', category: 'Meals', price: 20, originalPrice: 50, discountPercent: 60, bagsLeft: 1, pickupStart: at(0, '20:00'), pickupEnd: at(0, '21:30') }),
  bag({ id: 'bloom-bakery', branchId: 'bloom-pearl', title: 'Bakery bag', photo: 'box_light', price: 15, originalPrice: 50, discountPercent: 70, bagsLeft: 1, pickupStart: at(1, '16:30'), pickupEnd: at(1, '18:00') }),
  bag({ id: 'sidra-bread', branchId: 'sidra-lusail', title: 'Bread bag', photo: 'done_bag', price: 20, originalPrice: 50, discountPercent: 60, bagsLeft: 5, pickupStart: at(1, '18:30'), pickupEnd: at(1, '20:00') }),
  bag({ id: 'olive-grill', branchId: 'olive-katara', title: 'Grill box', photo: 'salmon_plate', bagType: 'Meals', category: 'Meals', price: 20, originalPrice: 50, discountPercent: 60, bagsLeft: 4, pickupStart: at(0, '20:00'), pickupEnd: at(0, '21:30') }),
  bag({ id: 'mama-meal', branchId: 'mama-alwaab', title: 'Meal bag', photo: 'fish_plate', bagType: 'Meals', category: 'Meals', price: 25, originalPrice: 60, discountPercent: 58, bagsLeft: 0, pickupStart: at(0, '19:00'), pickupEnd: at(0, '20:30') }),
  bag({ id: 'hotel-buffet', branchId: 'corniche-westbay', title: 'Buffet box', photo: 'salad_juice', bagType: 'Meals', category: 'Meals', price: 30, originalPrice: 90, discountPercent: 67, bagsLeft: 3, pickupStart: at(0, '21:30'), pickupEnd: at(0, '22:30'),
    description: 'A selection from tonight’s buffet: mains, sides and a dessert or two. Every box is a surprise.', allergens: 'May contain wheat, milk, eggs, fish, nuts and sesame. Contents vary with what’s available each day.' }),
  bag({ id: 'souq-grocery', branchId: 'souq-alsadd', title: 'Grocery bag', photo: 'groceries', bagType: 'Groceries', category: 'Groceries', price: 25, originalPrice: 60, discountPercent: 58, bagsLeft: 4, pickupStart: at(0, '20:00'), pickupEnd: at(0, '21:30'),
    description: 'Fresh fruit, vegetables, dairy and pantry favourites from today’s shelves. Every bag is a surprise.', allergens: 'May contain milk, eggs, wheat and nuts. Contents vary with what’s available each day.', dietary: ['Vegetarian'] }),
  bag({ id: 'gc-donut', branchId: 'gc-lusail', title: 'Donut box', photo: 'donut_interim', bagType: 'Sweets & desserts', price: 18, originalPrice: 60, discountPercent: 70, bagsLeft: 4, pickupStart: at(0, '21:00'), pickupEnd: at(0, '22:30'),
    description: 'A mix of today’s donuts and sweet treats: glazed, filled and sprinkled, plus a muffin or brownie when there is one. Every box is a surprise.',
    allergens: 'Wheat flour, eggs, milk, soy and nuts. Contents vary with what’s available each day.' }),
];

export const homeRails: { title: string; bagIds: string[] }[] = [
  { title: 'Recommended for you', bagIds: ['lp-bakery', 'karak-cafe', 'souq-grocery'] },
  { title: 'Save before it’s too late', bagIds: ['gf-salad', 'sufra-grill'] },
  { title: 'Collect tomorrow', bagIds: ['bloom-bakery', 'sidra-bread'] },
  { title: 'Meals ready to go', bagIds: ['olive-grill', 'hotel-buffet', 'mama-meal'] },
  { title: 'Sweet treats', bagIds: ['gc-donut'] },
];

export const orders: Order[] = [
  { id: '0974-1118', ref: '#WB-2101', bagId: 'lp-bakery', branchId: 'lp-msheireb', quantity: 1, status: 'paid', price: 15, originalPrice: 50, serviceFee: 2, total: 17, paidWith: 'Apple Pay', pin: '4821', qrPayload: 'WB-0974-1118', pickupStart: at(0, '18:00'), pickupEnd: at(0, '20:00') },
  { id: '0974-1119', ref: '#WB-2094', bagId: 'gc-donut', branchId: 'gc-lusail', quantity: 1, status: 'reserved', price: 18, originalPrice: 60, serviceFee: 2, total: 20, paidWith: 'Apple Pay', pin: '3307', qrPayload: 'WB-0974-1119', pickupStart: at(1, '21:00'), pickupEnd: at(1, '22:30'), freeCancelUntil: at(1, '19:00') },
  { id: '0974-1120', ref: '#WB-2110', bagId: 'gf-salad', branchId: 'gf-alsadd', quantity: 1, status: 'reserved', price: 35, originalPrice: 70, serviceFee: 2, total: 37, paidWith: 'Card', pin: '5512', qrPayload: 'WB-0974-1120', pickupStart: at(3, '19:00'), pickupEnd: at(3, '20:30'), freeCancelUntil: at(3, '17:00') },
  { id: '0974-1001', ref: '#WB-1990', bagId: 'gf-salad', branchId: 'gf-alsadd', quantity: 1, status: 'collected', price: 35, originalPrice: 70, serviceFee: 2, total: 37, paidWith: 'Apple Pay', pin: '1111', qrPayload: '', pickupStart: at(-5, '19:00'), pickupEnd: at(-5, '20:30'), collectedAt: at(-5, '19:42') },
  { id: '0974-0990', ref: '#WB-1977', bagId: 'lp-bakery', branchId: 'lp-msheireb', quantity: 1, status: 'collected', price: 15, originalPrice: 50, serviceFee: 2, total: 17, paidWith: 'Apple Pay', pin: '2222', qrPayload: '', pickupStart: at(-7, '18:00'), pickupEnd: at(-7, '20:00'), collectedAt: at(-7, '18:20'), rating: 5 },
  { id: '0974-0970', ref: '#WB-1950', bagId: 'karak-cafe', branchId: 'karak-alsadd', quantity: 1, status: 'collected', price: 20, originalPrice: 50, serviceFee: 2, total: 22, paidWith: 'Card', pin: '3333', qrPayload: '', pickupStart: at(-10, '17:00'), pickupEnd: at(-10, '18:30'), collectedAt: at(-10, '17:10') },
  { id: '0974-1102', ref: '#WB-2081', bagId: 'gc-donut', branchId: 'gc-lusail', quantity: 1, status: 'cancelled', price: 18, originalPrice: 60, serviceFee: 2, total: 20, paidWith: 'Apple Pay', pin: '', qrPayload: '', pickupStart: at(0, '21:00'), pickupEnd: at(0, '22:30'), cancelledBy: 'shop', refund: 20 },
  { id: '0974-0950', ref: '#WB-1931', bagId: 'lp-bakery', branchId: 'lp-msheireb', quantity: 1, status: 'cancelled', price: 15, originalPrice: 50, serviceFee: 2, total: 17, paidWith: 'Apple Pay', pin: '', qrPayload: '', pickupStart: at(-14, '18:00'), pickupEnd: at(-14, '20:00'), cancelledBy: 'you', refund: 17 },
];

export const vouchers: Voucher[] = [
  { id: 'v1', kind: 'amount', value: 5, code: 'WB5', issuer: 'WonderBites', scope: '', expires: at(2, '23:59'), state: 'available' },
  { id: 'v2', kind: 'percentDelivery', value: 35, code: 'GLAZE35', minSpend: 20, maxDiscount: 10, issuer: 'Glaze & Co Donuts', scope: 'all branches', expires: '2026-12-24T23:59:00+03:00', state: 'available' },
  { id: 'v3', kind: 'amount', value: 25, code: 'LPDOHA25', issuer: 'La Patisserie Doha', scope: 'Msheireb branch', expires: '2027-01-24T23:59:00+03:00', state: 'available' },
  { id: 'v4', kind: 'freeDelivery', value: 0, code: 'FREEDEL', minSpend: 15, issuer: 'WonderBites', scope: '', expires: '2027-01-15T23:59:00+03:00', state: 'available' },
  { id: 'v5', kind: 'freeServiceFee', value: 0, code: 'THANKYOU', issuer: 'WonderBites', scope: '', expires: '2027-02-28T23:59:00+03:00', state: 'available', tag: 'gift' },
];

export const tickets: Ticket[] = [
  { id: '#T-2081', title: 'Shop closed at pickup', status: 'open', statusText: 'Open · reply in ~2h', meta: 'Glaze & Co Donuts · Lusail · #T-2081 · today 21:10' },
  { id: '#T-1977', title: 'Missing item in bag', status: 'resolved', statusText: 'Resolved · QAR 15 refunded', meta: 'La Patisserie Doha · Msheireb · #T-1977 · 12 Nov' },
];

export const favouriteBranchIds = ['lp-msheireb', 'gc-lusail', 'karak-alsadd', 'bloom-pearl', 'sidra-lusail'];

export const reviews = [
  { text: '“Two croissants, a pain au chocolat and half a sourdough for QAR 15. Unreal.”', who: 'Noor · Msheireb · 2 days ago' },
  { text: '“Friendly staff, quick pickup, and the bag was generous.”', who: 'Fahad · Al Sadd · last week' },
];
