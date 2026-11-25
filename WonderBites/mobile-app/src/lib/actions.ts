// Real device actions for shop buttons: call, directions, share.
import { Linking, Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';

export const callShop = (phone: string) => Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`).catch(() => {});

/** Opens Apple Maps on iPhone, the default maps app on Android, Google Maps on the web. */
export function openDirections(lat: number, lng: number, label: string) {
  const q = encodeURIComponent(label);
  const url = Platform.select({
    ios: `maps:?daddr=${lat},${lng}&q=${q}`,
    android: `geo:${lat},${lng}?q=${lat},${lng}(${q})`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
  });
  return Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`));
}

import { toast } from '../components/Toast';
/** Opens the store review page once the app is published (IDs set in app.json → extra). */
export function rateApp() {
  const iosId = process.env.EXPO_PUBLIC_APPSTORE_ID, android = 'qa.wonderbites.app';
  if (Platform.OS === 'ios' && iosId) return Linking.openURL(`itms-apps://itunes.apple.com/app/id${iosId}?action=write-review`).catch(() => {});
  if (Platform.OS === 'android') return Linking.openURL(`market://details?id=${android}`).catch(() => toast('Google Play isn’t available on this phone', 'info'));
  toast('Rating opens once WonderBites is in the App Store', 'info');
}
export const shareText = (message: string) => Share.share({ message }).catch(() => {});

export const copyText = (t: string) => Clipboard.setStringAsync(t).catch(() => false);
