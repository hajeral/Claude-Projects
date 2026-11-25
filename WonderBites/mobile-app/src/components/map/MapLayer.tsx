// The search map in the web preview (react-native-maps doesn't run in a browser).
// The same concept-6 look drawn from real Doha coordinates: cream & rose by day, plum at
// night, drag / pinch / mouse-wheel to move and zoom. Stamps, names and landmarks keep
// their size on screen; stamps switch small / regular / big with the zoom.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Svg, { ClipPath, Defs, Ellipse, G, Path, Pattern, Rect } from 'react-native-svg';
import Animated, { FadeIn, FadeOut, useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures } from 'react-native-gesture-handler';
import { Text } from '../AppText';
import { W } from '../ui';
import { DOHA, KM_LAT, KM_LNG, LANDMARKS, STAMP_SIZE, landmarksVisible, tierFor, type LatLng, type ZoomTier } from '../../lib/mapGeo';
import { Landmark, Stamp, YouDot, stampBox, type MapLayerProps } from './parts';

// ---- the drawn world: 45 px per km, from 25.44N 51.43E (top left) ----
const PX = 45, LAT0 = 25.44, LNG0 = 51.43;
const WW = Math.round((51.6 - LNG0) * KM_LNG * PX); // 770
const WH = Math.round((LAT0 - 25.24) * KM_LAT * PX); // 998
const wx = (lng: number) => (lng - LNG0) * KM_LNG * PX;
const wy = (lat: number) => (LAT0 - lat) * KM_LAT * PX;
type P = [number, number]; // [lat, lng]
const pts = (a: P[]) => a.map(([la, ln]) => [wx(ln), wy(la)] as [number, number]);
/** Smooth line through points (Catmull-Rom as cubic curves). */
function smooth(a: P[], close = false) {
  const p = pts(a);
  if (close) p.push(p[0], p[1]);
  let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return close ? d + 'Z' : d;
}
const COAST: P[] = [[25.44, 51.512], [25.425, 51.515], [25.41, 51.522], [25.398, 51.528], [25.388, 51.527], [25.378, 51.531], [25.368, 51.53], [25.36, 51.532], [25.352, 51.53], [25.345, 51.533], [25.336, 51.535], [25.328, 51.54], [25.322, 51.539], [25.317, 51.533], [25.312, 51.527], [25.305, 51.522], [25.298, 51.52], [25.292, 51.523], [25.291, 51.531], [25.293, 51.538], [25.297, 51.541], [25.294, 51.546], [25.29, 51.552], [25.282, 51.56], [25.27, 51.572], [25.255, 51.585], [25.24, 51.6]];
const LAND = `${smooth(COAST)}L${wx(51.6)},${WH}L0,${WH}L0,0Z`;
const PEARL = smooth([[25.382, 51.548], [25.38, 51.556], [25.372, 51.561], [25.362, 51.557], [25.36, 51.548], [25.367, 51.542], [25.376, 51.543]], true);
const ROADS: { d: string; major: boolean }[] = [
  [[25.326, 51.534], [25.318, 51.53], [25.312, 51.524], [25.305, 51.518], [25.297, 51.516], [25.29, 51.52], [25.288, 51.53], [25.29, 51.545], [25.282, 51.556]], // Corniche
  [[25.316, 51.527], [25.33, 51.522], [25.35, 51.522], [25.37, 51.521], [25.39, 51.517], [25.42, 51.505], [25.44, 51.5]], // Lusail Expressway
  [[25.31, 51.5], [25.34, 51.49], [25.37, 51.478], [25.4, 51.468], [25.44, 51.455]], // Al Shamal
  [[25.293, 51.522], [25.295, 51.5], [25.3, 51.475], [25.305, 51.45], [25.31, 51.43]], // Al Rayyan
  [[25.305, 51.508], [25.285, 51.502], [25.27, 51.513], [25.265, 51.535], [25.272, 51.556]], // C Ring
  [[25.31, 51.49], [25.285, 51.483], [25.26, 51.495], [25.25, 51.53], [25.256, 51.568]], // D Ring
  [[25.283, 51.515], [25.275, 51.49], [25.262, 51.465], [25.25, 51.44], [25.245, 51.43]], // Salwa
].map((a) => ({ d: smooth(a as P[]), major: true })).concat([
  [[25.272, 51.5], [25.265, 51.475], [25.262, 51.445], [25.262, 51.43]], // Al Waab St
  [[25.296, 51.497], [25.32, 51.492], [25.34, 51.49], [25.36, 51.505], [25.365, 51.52]], // 22 February
  [[25.368, 51.531], [25.368, 51.542]], // Pearl bridge
  [[25.33, 51.51], [25.345, 51.505], [25.36, 51.495], [25.385, 51.49]],
  [[25.28, 51.53], [25.27, 51.545], [25.258, 51.556]],
].map((a) => ({ d: smooth(a as P[]), major: false })));
const PARKS: [number, number, number, number][] = [[25.2635, 51.444, 1.1, 0.8], [25.3, 51.514, 0.45, 0.3], [25.296, 51.544, 0.35, 0.25], [25.335, 51.497, 0.5, 0.35], [25.355, 51.515, 0.4, 0.3]];
const PLACES: (LatLng & { name: string; water?: boolean })[] = [
  { name: 'West Bay', lat: 25.327, lng: 51.524 }, { name: 'Al Sadd', lat: 25.279, lng: 51.492 }, { name: 'Msheireb', lat: 25.2835, lng: 51.524 },
  { name: 'Katara', lat: 25.352, lng: 51.513 }, { name: 'Lusail', lat: 25.418, lng: 51.5 }, { name: 'Al Waab', lat: 25.255, lng: 51.462 },
  { name: 'Doha Bay', lat: 25.307, lng: 51.548, water: true }, { name: 'Arabian Gulf', lat: 25.35, lng: 51.585, water: true },
];
const PAL = {
  day: { water: '#F9DDE6', coast: '#EBC7D2', land: '#FEFAF7', block: '#F7ECEF', minor: '#FFFFFF', park: '#E3F0E8', road: '#FFFFFF', roadCase: '#EBD9E4', label: '#806B7E', waterLabel: '#B8124D', halo: '#FEFAF7' },
  night: { water: '#1A0918', coast: '#4A1C45', land: '#2A1128', block: '#331631', minor: '#3A1636', park: '#123A2B', road: '#4A1C45', roadCase: '#6E1A4C', label: '#E6B8C0', waterLabel: '#E2A9B8', halo: '#2A1128' },
};

const World = React.memo(function World({ night }: { night: boolean }) {
  const c = night ? PAL.night : PAL.day;
  return (
    <Svg width={WW} height={WH} viewBox={`0 0 ${WW} ${WH}`}>
      <Defs>
        <ClipPath id="wbLand"><Path d={LAND} /><Path d={PEARL} /></ClipPath>
        <Pattern id={night ? 'wbBlkN' : 'wbBlk'} width={26} height={22} patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
          <Rect x={2} y={2} width={20} height={15} rx={3} fill={c.block} />
        </Pattern>
      </Defs>
      <Rect width={WW} height={WH} fill={c.water} />
      <Path d={LAND} fill={c.land} stroke={c.coast} strokeWidth={2} />
      <Path d={PEARL} fill={c.land} stroke={c.coast} strokeWidth={2} />
      <G clipPath="url(#wbLand)">
        <Rect width={WW} height={WH} fill={`url(#${night ? 'wbBlkN' : 'wbBlk'})`} />
        {PARKS.map(([la, ln, rx, ry], i) => <Ellipse key={i} cx={wx(ln)} cy={wy(la)} rx={rx * PX} ry={ry * PX} fill={c.park} />)}
        {ROADS.filter((r) => !r.major).map((r, i) => <Path key={`m${i}`} d={r.d} stroke={c.road} strokeWidth={4} fill="none" strokeLinecap="round" />)}
        {ROADS.filter((r) => r.major).map((r, i) => <Path key={`c${i}`} d={r.d} stroke={c.roadCase} strokeWidth={10} fill="none" strokeLinecap="round" />)}
        {ROADS.filter((r) => r.major).map((r, i) => <Path key={`r${i}`} d={r.d} stroke={c.road} strokeWidth={7} fill="none" strokeLinecap="round" />)}
      </G>
    </Svg>
  );
});

/** Keeps a child at a world point while the map moves, at a fixed size on screen. */
function At({ x, y, w, h, ax = 0.5, ay = 0.5, s, tx, ty, z = 1, children }: { x: number; y: number; w: number; h: number; ax?: number; ay?: number; s: SharedValue<number>; tx: SharedValue<number>; ty: SharedValue<number>; z?: number; children: React.ReactNode }) {
  const a = useAnimatedStyle(() => ({ transform: [{ translateX: x * s.value + tx.value - w * ax }, { translateY: y * s.value + ty.value - h * ay }] }));
  return <Animated.View pointerEvents="box-none" style={[{ position: 'absolute', left: 0, top: 0, width: w, height: h, zIndex: z }, a]}>{children}</Animated.View>;
}

export function MapLayer({ pins, selected, onSelect, you, start, focus, insets, night }: MapLayerProps) {
  const [vw, setVw] = useState(0);
  const [vh, setVh] = useState(0);
  const s = useSharedValue(1.45);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const minS = useSharedValue(0.8);
  const vwS = useSharedValue(390);
  const vhS = useSharedValue(844);
  const [zoom, setZoom] = useState<{ tier: ZoomTier; lm: boolean }>({ tier: 'regular', lm: true });
  const box = useRef<React.ComponentRef<typeof View>>(null);
  const started = useRef(false);

  // where the visible map's middle is (between the header and the shop card)
  const midY = (h: number) => insets.top + (h - insets.top - insets.bottom) / 2;
  const centerOn = (p: LatLng, animate: boolean) => {
    const W0 = vwS.value, H0 = vhS.value;
    const k = s.value;
    let nx = W0 / 2 - wx(p.lng) * k, ny = midY(H0) - wy(p.lat) * k;
    nx = Math.min(0, Math.max(W0 - WW * k, nx));
    ny = Math.min(0, Math.max(H0 - WH * k, ny));
    if (animate) { tx.value = withTiming(nx, { duration: 450 }); ty.value = withTiming(ny, { duration: 450 }); } else { tx.value = nx; ty.value = ny; }
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setVw(width); setVh(height);
    vwS.value = width; vhS.value = height;
    minS.value = Math.max(width / WW, height / WH);
    if (!started.current) { started.current = true; s.value = Math.max(minS.value, 1.45); centerOn(you ?? start ?? DOHA, false); }
  };

  useEffect(() => { if (focus && started.current) centerOn(focus, true); }, [focus?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const report = (tier: ZoomTier, lm: boolean) => setZoom((z) => (z.tier === tier && z.lm === lm ? z : { tier, lm }));
  useAnimatedReaction(() => {
    const km = vwS.value / (PX * s.value) * 1;
    return { tier: tierFor(km), lm: landmarksVisible(km) };
  }, (v, prev) => { if (!prev || v.tier !== prev.tier || v.lm !== prev.lm) scheduleOnRN(report, v.tier, v.lm); });

  const clamp = () => {
    'worklet';
    tx.value = Math.min(0, Math.max(vwS.value - WW * s.value, tx.value));
    ty.value = Math.min(0, Math.max(vhS.value - WH * s.value, ty.value));
  };
  const zoomAt = (fx: number, fy: number, f: number) => {
    'worklet';
    const ns = Math.min(4, Math.max(minS.value, s.value * f));
    const r = ns / s.value;
    tx.value = fx - (fx - tx.value) * r;
    ty.value = fy - (fy - ty.value) * r;
    s.value = ns;
    clamp();
  };
  const pan = usePanGesture({ onUpdate: (e) => { 'worklet'; tx.value += e.changeX; ty.value += e.changeY; clamp(); } });
  const pinch = usePinchGesture({ onUpdate: (e) => { 'worklet'; zoomAt(e.focalX, e.focalY, e.scaleChange); } });
  const gesture = useSimultaneousGestures(pan, pinch);

  // in the browser: two-finger scroll / mouse wheel moves the map, pinch (or Ctrl + wheel) zooms
  useEffect(() => {
    const el = box.current as unknown as HTMLElement | null;
    if (!el || typeof el.addEventListener !== 'function') return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      if (ev.ctrlKey || ev.metaKey) {
        const r = el.getBoundingClientRect();
        zoomAt(ev.clientX - r.left, ev.clientY - r.top, Math.exp(Math.max(-40, Math.min(40, -ev.deltaY)) * 0.01));
      } else {
        tx.value -= ev.shiftKey && !ev.deltaX ? ev.deltaY : ev.deltaX;
        ty.value -= ev.shiftKey && !ev.deltaX ? 0 : ev.deltaY;
        clamp();
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [vw]); // eslint-disable-line react-hooks/exhaustive-deps

  const worldStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: s.value }] }));
  const size = STAMP_SIZE[zoom.tier];
  const sb = stampBox(size);
  const placeLabels = useMemo(() => PLACES.map((p) => ({ ...p, x: wx(p.lng), y: wy(p.lat) })), []);
  const c = night ? PAL.night : PAL.day;

  return (
    <GestureDetector gesture={gesture}>
      <View ref={box} onLayout={onLayout} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, overflow: 'hidden', backgroundColor: c.water }}>
        {vw > 0 ? (
          <>
            <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: WW, height: WH, transformOrigin: '0px 0px' }, worldStyle]}>
              <World night={night} />
            </Animated.View>
            {placeLabels.map((p) => (
              <At key={p.name} x={p.x} y={p.y} w={140} h={20} s={s} tx={tx} ty={ty}>
                <Text pointerEvents="none" numberOfLines={1} style={p.water
                  ? { textAlign: 'center', fontSize: 14, color: c.waterLabel, fontFamily: 'DMSerifDisplay_400Regular', fontStyle: 'italic' }
                  : { textAlign: 'center', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: c.label, textShadowColor: c.halo, textShadowRadius: 3, ...W('semibold') }}>{p.name}</Text>
              </At>
            ))}
            {zoom.lm ? LANDMARKS.map((l) => (
              <At key={l.id} x={wx(l.lng)} y={wy(l.lat)} w={120} h={70} ay={0.26} s={s} tx={tx} ty={ty} z={2}>
                <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(200)}><Landmark name={l.name} icon={l.icon} night={night} /></Animated.View>
              </At>
            )) : null}
            {you ? <At x={wx(you.lng)} y={wy(you.lat)} w={64} h={64} s={s} tx={tx} ty={ty} z={3}><YouDot /></At> : null}
            {pins.map((p) => (
              <At key={p.id} x={wx(p.lng)} y={wy(p.lat)} w={sb} h={sb} s={s} tx={tx} ty={ty} z={selected === p.id ? 20 : 10}>
                <Stamp pin={p} size={size} selected={selected === p.id} onPress={() => onSelect(p.id)} />
              </At>
            ))}
          </>
        ) : null}
        <View style={{ position: 'absolute', right: 16, bottom: insets.bottom + 14, zIndex: 30, borderRadius: 16, overflow: 'hidden', backgroundColor: night ? '#4A1C45' : '#FFFFFF', boxShadow: '0 6px 18px rgba(51,22,49,0.18)' }}>
          <ZoomBtn label="Zoom in" plus night={night} onPress={() => zoomAt(vwS.value / 2, midY(vhS.value), 1.6)} />
          <View style={{ height: 1, backgroundColor: night ? '#6E1A4C' : '#F3E4EA' }} />
          <ZoomBtn label="Zoom out" night={night} onPress={() => zoomAt(vwS.value / 2, midY(vhS.value), 1 / 1.6)} />
        </View>
      </View>
    </GestureDetector>
  );
}

function ZoomBtn({ label, plus, night, onPress }: { label: string; plus?: boolean; night: boolean; onPress: () => void }) {
  const ink = night ? '#FEFAF7' : '#331631';
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={20} height={20} viewBox="0 0 24 24"><Path d={plus ? 'M12 5v14M5 12h14' : 'M5 12h14'} stroke={ink} strokeWidth={2} strokeLinecap="round" /></Svg>
    </Pressable>
  );
}
