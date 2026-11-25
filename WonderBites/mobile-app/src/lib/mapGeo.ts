// Shared map rules for the search map (concept 6: real map + Doha landmarks).
// - Stamps change size with the zoom: small when zoomed out, regular, big when zoomed in.
// - Landmark badges show only while the map is zoomed out (at most 5).
// - After sunset in Doha the map switches to the plum night colours.

export type LatLng = { lat: number; lng: number };
export type ZoomTier = 'small' | 'regular' | 'big';

/** Where the map opens when we don't know where the customer is. */
export const DOHA: LatLng = { lat: 25.302, lng: 51.51 };

/** Kilometres per degree around Doha. */
export const KM_LAT = 110.9;
export const KM_LNG = 100.6;

/** Stamp size for each zoom level (the selected stamp still "stamps down" on top). */
export const STAMP_SIZE: Record<ZoomTier, number> = { small: 50, regular: 74, big: 96 };

/** Zoom level from how many kilometres the map shows across the screen. */
export function tierFor(widthKm: number): ZoomTier {
  'worklet';
  return widthKm > 7.5 ? 'small' : widthKm < 2.6 ? 'big' : 'regular';
}

/** Landmarks only while zoomed out: hidden once the map shows less than ~4 km across. */
export const landmarksVisible = (widthKm: number) => {
  'worklet';
  return widthKm >= 4;
};

/** The landmarks shown on the map (max 5, so it never looks like a tourist map). */
export type LandmarkIcon = 'museum' | 'dhow' | 'arches' | 'lantern' | 'pearl';
export const LANDMARKS: (LatLng & { id: string; name: string; icon: LandmarkIcon })[] = [
  { id: 'mia', name: 'Museum of Islamic Art', icon: 'museum', lat: 25.2955, lng: 51.5392 },
  { id: 'dhows', name: 'Corniche dhows', icon: 'dhow', lat: 25.3, lng: 51.528 },
  { id: 'souq', name: 'Souq Waqif', icon: 'lantern', lat: 25.2867, lng: 51.5330 },
  { id: 'katara', name: 'Katara', icon: 'arches', lat: 25.3600, lng: 51.5250 },
  { id: 'pearl', name: 'The Pearl', icon: 'pearl', lat: 25.3712, lng: 51.5510 },
];

/** Sunrise and sunset in Doha for a day, in ms (NOAA's short formula, within a few minutes). */
export function sunTimes(day: Date, lat = 25.2854, lng = 51.531): { rise: number; set: number } {
  const rad = Math.PI / 180;
  const start = Date.UTC(day.getUTCFullYear(), 0, 0);
  const n = Math.floor((day.getTime() - start) / 86400000);
  const g = (2 * Math.PI / 365) * (n - 1);
  const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const ha = Math.acos(Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(decl)) - Math.tan(lat * rad) * Math.tan(decl)) / rad;
  const noon = 720 - 4 * lng - eqt; // minutes after UTC midnight
  const mid = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
  return { rise: mid + (noon - 4 * ha) * 60000, set: mid + (noon + 4 * ha) * 60000 };
}

/** True between sunset and sunrise in Doha. */
export function isNight(now = Date.now()) {
  const { rise, set } = sunTimes(new Date(now + 3 * 3600000)); // the Doha calendar day
  return now < rise || now >= set;
}

/** Google map styles (Android, and iOS when a Google key is set). Labels stay, shop icons go. */
const common = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
];
export const CREAM_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#FEFAF7' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#806B7E' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FEFAF7' }, { weight: 3 }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#F7ECEF' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#E3F0E8' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#EBD9E4' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#E6B8C0' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6B4A68' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#F9DDE6' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#B8124D' }] },
  ...common,
];
export const NIGHT_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#2A1128' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#E6B8C0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#2A1128' }, { weight: 3 }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#331631' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#123A2B' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#4A1C45' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#331631' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#6E1A4C' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#EBD9E4' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#1A0918' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#E2A9B8' }] },
  ...common,
];
