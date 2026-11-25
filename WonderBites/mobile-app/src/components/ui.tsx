import { DEMO } from '../config';
import { usePhoneCountry } from '../lib/region';
import React, { useEffect, useState } from 'react';
import Svg, { Path } from 'react-native-svg';
import Animated, { Easing, interpolate, interpolateColor, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { EASE_RISE, FocusGlow } from './motion';
import { slopFor } from '../lib/platform';
import { Pressable, StyleSheet, useWindowDimensions, View, type PressableProps, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import { Text, TextInput } from './AppText';
import { SvgXml } from 'react-native-svg';
import { colors, fonts, radius, shadow, type as T } from '../theme';
import { ICONS, type IconName } from './icons';
import { atStart, borderEnd, marEnd, padEnd, useLang } from '../i18n';

/* ---------- Text ---------- */
type Variant = keyof typeof T;
export function Txt({ v = 'body', color, style, ...p }: TextProps & { v?: Variant; color?: string }) {
  return <Text {...p} style={[{ color: colors.plum }, T[v] as TextStyle, color ? { color } : null, style]} />;
}
export const W = (w: keyof typeof fonts) => ({ fontFamily: fonts[w] });

/* ---------- Icon ---------- */
// Icons that point a direction mirror in Arabic.
const DIRECTIONAL = new Set<IconName>(['back', 'chev', 'chevsR', 'out', 'chat', 'sms']);
export function Icon({ name, size = 20, color = colors.plum, stroke = 1.75, fill = 'none' }: { name: IconName; size?: number; color?: string; stroke?: number; fill?: string }) {
  const lang = useLang();
  const flip = lang === 'ar' && DIRECTIONAL.has(name);
  const xml = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name].replace(/currentColor/g, color)}</svg>`;
  const svg = <SvgXml xml={xml} width={size} height={size} />;
  return flip ? <View style={{ transform: [{ scaleX: -1 }] }}>{svg}</View> : svg;
}

/* ---------- Buttons ---------- */
type BtnProps = PressableProps & { title: string; icon?: IconName; kind?: 'primary' | 'secondary' | 'ghost' | 'text'; style?: StyleProp<ViewStyle>; small?: boolean };
export function Button({ title, icon, kind = 'primary', style, small, ...p }: BtnProps) {
  const base = kind === 'primary' ? s.btnP : kind === 'secondary' ? s.btnS : kind === 'ghost' ? s.btnG : s.btnT;
  const tc = kind === 'primary' ? colors.white : kind === 'secondary' ? colors.rubyDark : kind === 'ghost' ? colors.cream : colors.ruby;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!p.disabled }} {...p} style={({ pressed }) => [s.btn, small && { height: 44 }, base, p.disabled && kind === 'primary' && { backgroundColor: colors.muted2, shadowOpacity: 0, elevation: 0 }, p.disabled && kind !== 'primary' && { opacity: 0.5 }, pressed && !p.disabled && { transform: [{ scale: 0.98 }], opacity: kind === 'primary' ? 0.92 : 0.8 }, style]}>
      {icon ? <Icon name={icon} size={20} color={tc} /> : null}
      <Text style={[s.btnTx, small && { fontSize: 15 }, { color: tc }, kind === 'text' && { fontSize: 15, ...W('bold') }]}>{title}</Text>
    </Pressable>
  );
}

export function IconBtn({ name, onPress, variant = 'white', size = 44, color, label, filled }: { name: IconName; onPress?: () => void; variant?: 'white' | 'glass' | 'soft'; size?: number; color?: string; label?: string; filled?: boolean }) {
  const st = variant === 'white' ? s.icbW : variant === 'glass' ? s.icbG : s.icbS;
  const c = color ?? (variant === 'glass' ? colors.white : variant === 'soft' ? colors.ruby : colors.plum);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label ?? name} onPress={onPress} hitSlop={slopFor(size)} style={({ pressed }) => [s.icb, { width: size, height: size, borderRadius: size / 2 }, st, pressed && { opacity: 0.75 }]}>
      <Icon name={name} size={20} color={c} fill={filled ? c : 'none'} />
    </Pressable>
  );
}

/* ---------- Surfaces ---------- */
export function Card({ style, children, ...p }: { style?: StyleProp<ViewStyle>; children?: React.ReactNode; onPress?: () => void }) {
  if (p.onPress) return <Pressable onPress={p.onPress} style={({ pressed }) => [s.card, style, pressed && { opacity: 0.9 }]}>{children}</Pressable>;
  return <View style={[s.card, style]}>{children}</View>;
}
export const Hair = ({ style }: { style?: StyleProp<ViewStyle> }) => <View style={[{ height: 1, backgroundColor: colors.line }, style]} />;

export function SectionLabel({ children, style }: { children: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.sec, style]}>{children.toUpperCase()}</Text>;
}

/* ---------- Chips ---------- */
export function Chip({ label, on, icon, onPress, style }: { label: string; on?: boolean; icon?: IconName; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={onPress} hitSlop={{ top: 6, bottom: 6 }} accessibilityRole="button" accessibilityState={{ selected: !!on }} style={[s.chip, on && s.chipOn, style]}>
      {icon ? <Icon name={icon} size={18} color={on ? colors.white : colors.ruby} /> : null}
      <Text style={[s.chipTx, on && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}
/** Filter / option chip (dark when selected), as on Refine, Feedback, Tickets. */
export function OptChip({ label, on, onPress }: { label: string; on?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={{ top: 6, bottom: 6 }} style={[s.opt, on && s.optOn]} accessibilityRole="button" accessibilityState={{ selected: !!on }}>
      <Text style={[s.optTx, on && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}
export function Pill({ label, tone = 'green', icon, solid, style }: { label: string; tone?: 'green' | 'pink' | 'grey' | 'ruby'; icon?: IconName; solid?: boolean; style?: StyleProp<ViewStyle> }) {
  const bg = solid ? (tone === 'green' ? colors.emerald : tone === 'grey' ? colors.muted2 : colors.ruby) : tone === 'green' ? colors.emeraldSoft : tone === 'grey' ? '#F1E8EC' : colors.rubySoft;
  const fg = solid ? colors.white : tone === 'green' ? colors.emerald : tone === 'grey' ? colors.muted : colors.rubyDark;
  return (
    <View style={[s.pill, { backgroundColor: bg }, solid && tone !== 'ruby' && { borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)' }, style]}>
      {icon ? <Icon name={icon} size={14} color={fg} /> : null}
      <Text style={[s.pillTx, { color: fg }]}>{label}</Text>
    </View>
  );
}
export const Badge = ({ n }: { n: number | string }) => (
  <View style={s.badge}><Text style={s.badgeTx}>{n}</Text></View>
);

/* ---------- Lists ---------- */
export function Group({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const kids = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[s.grp, style]}>
      {kids.map((c, i) => (
        <React.Fragment key={i}>{i > 0 ? <View style={{ height: 1, backgroundColor: '#F6ECF0' }} /> : null}{c}</React.Fragment>
      ))}
    </View>
  );
}
export function ListRow({ icon, title, titleNode, sub, end, actions, onPress, chevron = true, danger, iconTone = 'pink' }: { icon?: IconName; title: string; titleNode?: React.ReactNode; sub?: string; end?: React.ReactNode; actions?: React.ReactNode; onPress?: () => void; chevron?: boolean; danger?: boolean; iconTone?: 'pink' | 'green' }) {
  // `actions` are their own buttons (edit, remove…), so they sit beside the row's button, not inside it
  if (actions) return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: 1, minWidth: 0 }}><ListRow icon={icon} title={title} titleNode={titleNode} sub={sub} end={end} onPress={onPress} chevron={chevron} danger={danger} iconTone={iconTone} /></View>
      <View style={[s.rowEnd, { gap: 14 }, padEnd(14)]}>{actions}</View>
    </View>
  );
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.row, pressed && !!onPress && { backgroundColor: '#FBF4F7' }]} accessibilityRole={onPress ? 'button' : undefined}>
      {icon ? (
        <View style={[s.rowIb, iconTone === 'green' && { backgroundColor: colors.emeraldSoft }]}><Icon name={icon} size={20} color={iconTone === 'green' ? colors.emerald : colors.ruby} /></View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        {titleNode ?? <Text style={[s.rowT1, danger && { color: colors.ruby }]} numberOfLines={1}>{title}</Text>}
        {sub ? <Text style={s.rowT2} numberOfLines={2}>{sub}</Text> : null}
      </View>
      <View style={s.rowEnd}>
        {end}
        {chevron && onPress ? <Icon name="chev" size={18} color={colors.muted} /> : null}
      </View>
    </Pressable>
  );
}

/* ---------- Form ---------- */
export function Label({ children, extra }: { children: string; extra?: string }) {
  return (
    <Text style={s.lab}>
      {children}
      {extra ? <Text style={{ color: colors.muted, ...W('medium') }}> {extra}</Text> : null}
    </Text>
  );
}
export function Field({ icon, value, placeholder, secure, right, left, multiline, onChangeText, keyboardType, style, focused, maxLength, controlled, onSubmitEditing, autoCapitalize, error, autofill }: {
  icon?: IconName; value?: string; placeholder?: string; secure?: boolean; right?: React.ReactNode; left?: React.ReactNode; multiline?: boolean;
  onChangeText?: (t: string) => void; keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'number-pad'; style?: StyleProp<ViewStyle>; focused?: boolean; maxLength?: number;
  /** true: `value` is the live value (clears when set to ''); otherwise it is the starting text */ controlled?: boolean;
  onSubmitEditing?: () => void; autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'; error?: boolean;
  /** Android/iOS autofill: 'off' stops the password-manager popup from covering the form */ autofill?: 'off' | 'password' | 'password-new';
}) {
  // Focused field: ruby border + a soft focus glow that breathes (design: focusGlow 2.4s).
  const [f, setF] = useState(!!focused);
  return (
    <View style={[s.inp, multiline && { height: undefined, minHeight: 120, alignItems: 'flex-start', paddingVertical: 12 }, f && s.inpFocus, error && { borderColor: colors.ruby }, style]}>
      <FocusGlow radius={16} on={f} delay={600} />
      {left}
      {icon ? <Icon name={icon} size={18} color={colors.muted} /> : null}
      <TextInput
        style={[s.inpTx, multiline && { minHeight: 96, textAlignVertical: 'top' }]}
        {...(controlled ? { value } : { defaultValue: value })}
        onSubmitEditing={onSubmitEditing}
        autoCapitalize={autoCapitalize}
        placeholder={placeholder}
        placeholderTextColor={colors.muted2}
        secureTextEntry={secure}
        autoCorrect={secure ? false : undefined}
        spellCheck={secure ? false : undefined}
        {...(autofill ? { autoComplete: autofill, importantForAutofill: autofill === 'off' ? 'no' : 'yes', textContentType: autofill === 'off' ? 'none' : autofill === 'password' ? 'password' : 'newPassword' } as const : {})}
        multiline={multiline}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        maxLength={maxLength}
        onFocus={() => setF(true)}
        onBlur={() => setF(false)}
      />
      {right}
    </View>
  );
}
/** Password input with a working show/hide eye. Never pre-filled, never saved. */
export function PasswordField({ value, onChangeText, placeholder, error, ok, kind = 'new' }: { value: string; onChangeText: (t: string) => void; placeholder?: string; error?: boolean; ok?: boolean; kind?: 'new' | 'current' }) {
  const [show, setShow] = useState(false);
  return (
    <Field icon="lock" value={value} controlled onChangeText={onChangeText} placeholder={placeholder} secure={!show} error={error} autoCapitalize="none" autofill={DEMO ? 'off' : kind === 'current' ? 'password' : 'password-new'}
      right={ok ? <Icon name="check" size={20} color={colors.emerald} stroke={2} /> : (
        <Pressable onPress={() => setShow(!show)} hitSlop={14} accessibilityRole="button" accessibilityLabel={show ? 'Hide password' : 'Show password'}>
          <Icon name="eye" size={20} color={show ? colors.ruby : colors.muted} />
        </Pressable>
      )} />
  );
}

export function PhoneField({ value = DEMO ? '5512 3456' : '', onCountry, onChangeText, error }: { value?: string; onCountry?: () => void; onChangeText?: (t: string) => void; error?: boolean }) {
  const c = usePhoneCountry();
  return (
    <Field
      value={value}
      onChangeText={onChangeText}
      error={error}
      maxLength={c.dial === '+974' ? 9 : 16}
      keyboardType="phone-pad"
      left={
        <Pressable onPress={onCountry} hitSlop={{ top: 10, bottom: 10 }} style={[s.cc, padEnd(10), marEnd(2), borderEnd(1, colors.line)]} accessibilityLabel="Country code">
          <Text style={{ ...W('bold'), fontSize: 15, color: colors.plum }}>{`${c.iso} ${c.dial}`}</Text>
          <Icon name="down" size={14} color={colors.muted} />
        </Pressable>
      }
    />
  );
}

export function Toggle({ on, onChange, locked, onColor = colors.ruby }: { on: boolean; onChange?: (v: boolean) => void; locked?: boolean; onColor?: string }) {
  const lang = useLang();
  // the knob glides across while the track fades to its "on" colour (180ms)
  const k = useSharedValue(on ? 1 : 0);
  useEffect(() => { k.value = withTiming(on ? 1 : 0, { duration: 180, easing: EASE_RISE }); }, [on, k]);
  const dir = lang === 'ar' ? -20 : 20;
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(k.value, [0, 1], ['#E9D8E0', onColor]) }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: k.value * dir }] }));
  return (
    <Pressable hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }} accessibilityRole="switch" accessibilityState={{ checked: on, disabled: locked }} onPress={() => !locked && onChange?.(!on)} style={locked ? { opacity: 0.55 } : undefined}>
      <Animated.View style={[s.sw, track]}>
        <Animated.View style={[s.swK, knob]} />
      </Animated.View>
    </Pressable>
  );
}
export const Radio = ({ on }: { on: boolean }) => (
  <View style={[s.rdo, on && { borderColor: colors.ruby }]}>{on ? <View style={s.rdoIn} /> : null}</View>
);
const APath = Animated.createAnimatedComponent(Path);
/** Checkbox: pops when ticked and the tick draws itself (design: popIn .4s, tick .45s). */
export function Check({ on, delay = 0 }: { on: boolean; delay?: number }) {
  const reduce = useReducedMotion();
  const k = useSharedValue(on ? (reduce ? 1 : 0) : 0);
  const t = useSharedValue(on && reduce ? 1 : 0);
  const first = React.useRef(true);
  useEffect(() => {
    const d = first.current ? delay : 0;
    first.current = false;
    if (!on) { k.value = 0; t.value = 0; return; }
    if (reduce) { k.value = 1; t.value = 1; return; }
    k.value = withDelay(d, withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }));
    t.value = withDelay(d + 300, withTiming(1, { duration: 450, easing: Easing.out(Easing.quad) }));
  }, [on, k, t, delay, reduce]);
  const box = useAnimatedStyle(() => ({ opacity: interpolate(k.value, [0, 0.6, 1], [0, 1, 1]), transform: [{ scale: interpolate(k.value, [0, 0.6, 1], [0.6, 1.12, 1]) }] }));
  const tick = useAnimatedProps(() => ({ strokeDashoffset: 24 * (1 - t.value) }));
  return (
    <View style={s.chk}>
      {on ? (
        <Animated.View style={[StyleSheet.absoluteFill, { margin: -2, borderRadius: 6, backgroundColor: colors.ruby, alignItems: 'center', justifyContent: 'center' }, box]}>
          <Svg width={14} height={14} viewBox="0 0 24 24"><APath d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="24" animatedProps={tick} /></Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}

export function Segmented({ items, value, onChange, style, dark }: { items: string[]; value: string; onChange: (v: string) => void; style?: StyleProp<ViewStyle>; dark?: boolean }) {
  const narrow = useWindowDimensions().width < 385 && items.length > 3; // iPhone SE / mini
  const lang = useLang();
  // the white pill slides to the chosen item (220ms) instead of jumping
  const [w, setW] = useState(0);
  const idx = Math.max(0, items.indexOf(value));
  const seg = w > 0 ? (w - 8 - 6 * (items.length - 1)) / items.length : 0;
  const x = useSharedValue(idx);
  useEffect(() => { x.value = withTiming(idx, { duration: 220, easing: EASE_RISE }); }, [idx, x]);
  const pill = useAnimatedStyle(() => ({ width: seg, transform: [{ translateX: x.value * (seg + 6) * (lang === 'ar' ? -1 : 1) }] }));
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={[s.tabs, dark && { backgroundColor: 'rgba(255,255,255,0.12)' }, style]}>
      {seg > 0 ? <Animated.View pointerEvents="none" style={[s.tabPill, atStart(4), dark && { backgroundColor: 'rgba(255,255,255,0.18)', shadowOpacity: 0 }, pill]} /> : null}
      {items.map((it) => {
        const on = it === value;
        return (
          <Pressable key={it} onPress={() => onChange(it)} hitSlop={{ top: 6, bottom: 6 }} style={[s.tab, on && seg === 0 && s.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <Text adjustsFontSizeToFit minimumFontScale={0.8} style={[s.tabTx, narrow && { fontSize: 12.5 }, dark && { color: 'rgba(255,255,255,0.8)' }, on && { color: colors.ruby }]} numberOfLines={1}>{it}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Impact({ items, style }: { items: [string, string][]; style?: StyleProp<ViewStyle> }) {
  const narrow = useWindowDimensions().width < 385;
  return (
    <View style={[{ flexDirection: 'row', gap: 8 }, style]}>
      {items.map(([v, l]) => (
        <View key={l} style={s.imp}>
          <Text style={[s.impV, narrow && { fontSize: 19 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{v}</Text>
          <Text style={s.impL}>{l}</Text>
        </View>
      ))}
    </View>
  );
}

export function MerchantLogo({ initials, size = 44, ring = true }: { initials: string; size?: number; ring?: boolean }) {
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }, ring && { borderWidth: 2, borderColor: '#E6B8C0' }]}>
      <Text style={{ fontFamily: fonts.serif, fontSize: size * 0.4, color: colors.ruby }}>{initials}</Text>
    </View>
  );
}

export const Stars = ({ value = 0, size = 16, color = colors.emerald }: { value?: number; size?: number; color?: string }) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    {[1, 2, 3, 4, 5].map((i) => <Icon key={i} name="star" size={size} color={color} fill={i <= Math.round(value) ? color : 'none'} />)}
  </View>
);

const s = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 56, borderRadius: radius.button, alignSelf: 'stretch' },
  btnP: { backgroundColor: colors.ruby, ...shadow.button },
  btnS: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.ruby },
  btnG: { borderWidth: 2, borderColor: 'rgba(235,217,228,0.7)' },
  btnT: { height: 44 },
  btnTx: { fontSize: 17, ...W('semibold') },
  icb: { alignItems: 'center', justifyContent: 'center' },
  icbW: { backgroundColor: 'rgba(255,255,255,0.96)', ...shadow.float },
  icbG: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)' },
  icbS: { backgroundColor: colors.rubySoft },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.card, ...shadow.card },
  sec: { fontSize: 12, ...W('extrabold'), letterSpacing: 1.3, color: colors.muted, marginTop: 28, marginBottom: 10, marginHorizontal: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.ruby, borderColor: colors.ruby, ...shadow.button },
  chipTx: { fontSize: 14, ...W('semibold'), color: colors.plum },
  opt: { height: 38, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, borderColor: colors.field, backgroundColor: colors.white, justifyContent: 'center' },
  optOn: { backgroundColor: colors.plum, borderColor: colors.plum },
  optTx: { fontSize: 14, ...W('semibold'), color: colors.plum },
  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, height: 28, paddingHorizontal: 10, borderRadius: 999 },
  pillTx: { fontSize: 13, ...W('bold') },
  badge: { height: 22, minWidth: 22, paddingHorizontal: 7, borderRadius: 999, backgroundColor: colors.ruby, alignItems: 'center', justifyContent: 'center' },
  badgeTx: { color: colors.white, fontSize: 12, ...W('extrabold') },
  grp: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 20, overflow: 'hidden', ...shadow.card, shadowOpacity: 0.1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 10 },
  rowIb: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.rubySoft, alignItems: 'center', justifyContent: 'center' },
  rowT1: { fontSize: 15, ...W('semibold'), color: colors.plum },
  rowT2: { fontSize: 13, ...W('regular'), color: colors.muted, marginTop: 1 },
  rowEnd: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lab: { fontSize: 13, ...W('bold'), color: colors.plum, marginBottom: 8 },
  inp: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.field },
  inpFocus: { borderColor: colors.ruby, shadowColor: colors.ruby, shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
  inpTx: { flex: 1, minWidth: 0, fontSize: 16, ...W('medium'), color: colors.plum, paddingVertical: 0, outlineWidth: 0 } as TextStyle,
  cc: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 28 },
  sw: { width: 48, height: 28, borderRadius: 999, backgroundColor: '#E9D8E0', padding: 3 },
  swK: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white, ...shadow.float, shadowOpacity: 0.3 },
  rdo: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#D8BFCB', alignItems: 'center', justifyContent: 'center' },
  rdoIn: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.ruby },
  chk: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#D8BFCB', alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', gap: 6, padding: 4, borderRadius: 999, backgroundColor: '#F6EDF1' },
  tab: { flex: 1, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabOn: { backgroundColor: colors.white, ...shadow.float, shadowOpacity: 0.15 },
  tabPill: { position: 'absolute', top: 4, bottom: 4, borderRadius: 999, backgroundColor: colors.white, ...shadow.float, shadowOpacity: 0.15 },
  tabTx: { fontSize: 14, ...W('bold'), color: colors.muted },
  imp: { flex: 1, backgroundColor: colors.emeraldSoft, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center' },
  impV: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 25, color: colors.emerald },
  impL: { fontSize: 12, ...W('semibold'), color: '#0B4A2C' },
});
