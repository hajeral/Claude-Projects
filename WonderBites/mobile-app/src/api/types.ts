// Shapes the app expects from the WonderBites merchant platform API.
// Every number a merchant sets (price, original value, discount, bags left,
// pickup window) comes from here; the UI never hard-codes them.

export type ShopType = 'Bakery' | 'Patisserie' | 'Café' | 'Restaurant' | 'Hotel buffet' | 'Supermarket' | 'Healthy & salads' | 'Donuts';
export type BagType = 'Meals' | 'Bread & pastries' | 'Sweets & desserts' | 'Groceries';
export type Category = 'All' | 'Pastries' | 'Groceries' | 'Meals';

export interface Branch {
  id: string;
  storeId: string;
  storeName: string;           // "La Patisserie Doha"
  branchName: string;          // "Msheireb branch"
  area: string;                // "Msheireb"
  address: string;             // "Sikkat Wadi Msheireb"
  phone: string;               // "+974 4412 3456"
  initials: string;            // merchant logo fallback, "LP"
  logoColor: string;
  shopType: ShopType;
  rating: number;              // 4.7
  reviewCount: number;         // 1200
  distanceKm: number;          // computed by backend from user location
  walkMinutes?: number;
  driveMinutes?: number;
  lat: number;
  lng: number;
  openingHours: string;        // "07:00 – 22:00"
  dailyDropTime?: string;      // "17:00"
  mealsRescued: number;
  about: string;
  ratings?: { quality: number; value: number; freshness: number; pickup: number };
  /** Set by the shop in the Merchant Portal. Missing = the shop does not deliver. */
  delivery?: { fee: number; minSpend?: number };
}

export interface Bag {
  id: string;
  branchId: string;
  title: string;               // "Bakery bag"
  bagType: BagType;
  category: Category;
  photo: PhotoKey;             // product photo, never the shop logo
  price: number;               // QAR, set by merchant
  originalPrice: number;       // QAR, set by merchant
  discountPercent: number;     // 50–70, set by merchant
  bagsLeft: number;
  pickupStart: string;         // ISO
  pickupEnd: string;           // ISO
  description: string;
  allergens: string;
  dietary: string[];
}

export type OrderStatus = 'paid' | 'reserved' | 'collected' | 'delivered' | 'cancelled';
export type Fulfilment = 'pickup' | 'delivery';
export type DeliveryAddress = { label: string; area: string; detail: string };
export interface Order {
  id: string;                  // "0974-1118"
  ref: string;                 // "#WB-2094"
  bagId: string;
  branchId: string;
  quantity: number;
  status: OrderStatus;
  price: number;
  originalPrice: number;
  serviceFee: number;
  total: number;
  paidWith: 'Apple Pay' | 'Google Pay' | 'Card';
  pin: string;                 // 4 digits
  qrPayload: string;
  pickupStart: string;
  pickupEnd: string;
  collectedAt?: string;
  cancelledBy?: 'shop' | 'you';
  refund?: number;
  rating?: number;
  freeCancelUntil?: string;
  /** Pickup (default) or delivery by the shop during the same window */
  fulfilment?: Fulfilment;
  deliveryFee?: number;
  deliverTo?: DeliveryAddress;
  /** Who confirmed the hand-over, when and how (the server records these) */
  confirmedAt?: string;
  confirmedBy?: 'customer' | 'merchant';
  confirmMethod?: 'slider' | 'pin' | 'qr';
}

// Voucher types mirror the merchant platform.
export type VoucherKind = 'amount' | 'percent' | 'percentDelivery' | 'freeDelivery' | 'freeServiceFee';
export interface Voucher {
  id: string;
  kind: VoucherKind;
  value: number;               // QAR or %
  code: string;
  minSpend?: number;
  maxDiscount?: number;
  issuer: string;              // "WonderBites" or a shop
  scope: string;               // "all branches", "Msheireb branch"
  expires: string;             // ISO
  state: 'available' | 'used' | 'expired';
  /** Welcome or free gift vouchers get the "New" tag and are offered at checkout */
  tag?: 'welcome' | 'gift';
  addedAt?: string;
}

export interface Ticket {
  id: string;
  title: string;
  status: 'open' | 'resolved';
  statusText: string;
  meta: string;
  // filled for tickets the customer creates
  orderId?: string;
  details?: string;
  reach?: string;
  photos?: string[];
  createdAt?: string;
}

export interface User {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  rescuerSince: number;
  impact: { meals: number; saved: number; co2Kg: number };
  monthImpact: { bags: number; saved: number; co2Kg: number };
}

export type PhotoKey =
  | 'cafe_pastries' | 'salad_pink' | 'salmon_plate' | 'groceries' | 'store_shelves' | 'donut_interim'
  | 'fish_plate' | 'grill_spread' | 'salad_juice' | 'croissant' | 'basket' | 'bowl' | 'drink' | 'pinkbox'
  | 'box_light' | 'ob1_box' | 'ob2_baker' | 'ob2_shelves' | 'ob3_covered' | 'ob3_joy' | 'welcome_cafe'
  | 'done_bag' | 'collect_qr' | 'unbox_tissue' | 'dn_full';
