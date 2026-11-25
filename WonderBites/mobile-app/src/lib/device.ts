// Phone features used by buttons: current location and choosing a photo.
// Both ask for permission first and explain clearly if it isn't given.
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { setStore } from '../state/store';
import { toast } from '../components/Toast';
import { sync } from '../api/client';

const km = (a: [number, number], b: [number, number]) => {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b[0] - a[0]) * r, dLng = (b[1] - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/** Ask for location, then set the nearest Doha area. Returns the area or undefined. */
export async function locateMe(): Promise<string | undefined> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { toast('Location is off. Turn it on in Settings, or choose an area.', 'info'); return; }
    const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const me: [number, number] = [p.coords.latitude, p.coords.longitude];
    const branches = sync.branches();
    const near = branches.map((b) => ({ area: b.area, d: km(me, [b.lat, b.lng]) })).sort((a, b) => a.d - b.d)[0];
    if (!near || near.d > 60) {
      setStore((s) => ({ ...s, location: { ...s.location, area: 'Doha', lat: me[0], lng: me[1], source: 'gps' } }));
      toast('You’re outside Doha, so we’re showing bags across Doha', 'info');
      return 'Doha';
    }
    setStore((s) => ({ ...s, location: { ...s.location, area: near.area, lat: me[0], lng: me[1], source: 'gps' } }));
    toast(`Showing bags near ${near.area}`);
    return near.area;
  } catch {
    toast('Couldn’t get your location. Choose an area instead.', 'info');
  }
}

/** Let the customer choose a photo from their library. Returns its local uri. */
export async function pickPhoto(): Promise<string | undefined> {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { toast('Photo access is off. Turn it on in Settings to add a photo.', 'info'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true });
    if (r.canceled || !r.assets?.[0]) return;
    return r.assets[0].uri;
  } catch {
    toast('Couldn’t open your photos', 'error');
  }
}
