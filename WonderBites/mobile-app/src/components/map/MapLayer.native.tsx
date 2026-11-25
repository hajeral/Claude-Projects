// The real map on phones (react-native-maps). Google Maps on Android, and on iPhone when a
// Google Maps key is set (see INTEGRATION.md); otherwise Apple Maps on iPhone.
// Brand colours by day, plum colours after sunset. The animated stamps sit on the map
// and change size with the zoom; Doha landmarks show while zoomed out.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { CREAM_STYLE, DOHA, KM_LNG, LANDMARKS, NIGHT_STYLE, STAMP_SIZE, landmarksVisible, tierFor, type ZoomTier } from '../../lib/mapGeo';
import { Landmark, Stamp, YouDot, stampBox, type MapLayerProps } from './parts';

const googleOnIos = !!(Constants.expoConfig?.extra as { googleMapsIos?: boolean } | undefined)?.googleMapsIos;
const useGoogle = Platform.OS === 'android' || googleOnIos;

export function MapLayer({ pins, selected, onSelect, you, start: open, focus, insets, night }: MapLayerProps) {
  const map = useRef<MapView>(null);
  const start = you ?? open ?? DOHA;
  const initial = useMemo<Region>(() => ({ latitude: start.lat, longitude: start.lng, latitudeDelta: 0.065, longitudeDelta: 0.06 }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [widthKm, setWidthKm] = useState(initial.longitudeDelta * KM_LNG);
  const tier: ZoomTier = tierFor(widthKm);
  const size = STAMP_SIZE[tier];
  const showLandmarks = landmarksVisible(widthKm);

  // Stamps animate (ring turns, stamp-down), so their markers keep redrawing; landmarks draw once.
  const [lmTrack, setLmTrack] = useState(true);
  useEffect(() => { setLmTrack(true); const t = setTimeout(() => setLmTrack(false), 600); return () => clearTimeout(t); }, [showLandmarks, night]);

  useEffect(() => {
    if (!focus) return;
    map.current?.animateCamera({ center: { latitude: focus.lat, longitude: focus.lng } }, { duration: 450 });
  }, [focus?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MapView
      ref={map}
      style={StyleSheet.absoluteFill}
      provider={useGoogle ? PROVIDER_GOOGLE : undefined}
      customMapStyle={useGoogle ? (night ? NIGHT_STYLE : CREAM_STYLE) : undefined}
      userInterfaceStyle={night ? 'dark' : 'light'}
      initialRegion={initial}
      mapPadding={{ top: insets.top, bottom: insets.bottom, left: 0, right: 0 }}
      onRegionChangeComplete={(r) => setWidthKm(r.longitudeDelta * KM_LNG)}
      showsPointsOfInterests={false}
      showsCompass={false}
      showsBuildings={false}
      showsTraffic={false}
      showsIndoors={false}
      toolbarEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      moveOnMarkerPress={false}
    >
      {showLandmarks ? LANDMARKS.map((l) => (
        <Marker key={`lm-${l.id}-${night ? 'n' : 'd'}`} coordinate={{ latitude: l.lat, longitude: l.lng }} anchor={{ x: 0.5, y: 0.25 }} tracksViewChanges={lmTrack} tappable={false} zIndex={1}>
          <Landmark name={l.name} icon={l.icon} night={night} />
        </Marker>
      )) : null}
      {you ? (
        <Marker coordinate={{ latitude: you.lat, longitude: you.lng }} anchor={{ x: 0.5, y: 0.5 }} tappable={false} zIndex={2}>
          <YouDot />
        </Marker>
      ) : null}
      {pins.map((p) => (
        <Marker key={p.id} coordinate={{ latitude: p.lat, longitude: p.lng }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges
          zIndex={selected === p.id ? 20 : 10} onPress={() => onSelect(p.id)} accessibilityLabel={p.label}
          style={{ width: stampBox(size), height: stampBox(size) }}>
          <Stamp pin={p} size={size} selected={selected === p.id} />
        </Marker>
      ))}
    </MapView>
  );
}
