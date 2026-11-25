import { Platform } from 'react-native';

/** The phone's wallet: Apple Pay on iOS (and the web preview), Google Pay on Android. */
export const WALLET = Platform.OS === 'android' ? 'Google Pay' : 'Apple Pay';

/** Minimum tap area: 44 pt (Apple) / 48 dp (Android). Use with hitSlop for small visuals. */
export const MIN_TAP = Platform.OS === 'android' ? 48 : 44;
export const slopFor = (size: number) => Math.max(0, Math.ceil((MIN_TAP - size) / 2));
