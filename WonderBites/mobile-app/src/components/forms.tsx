import React, { useEffect, useRef, useState } from 'react';
import { atEnd, atStart, marStart, useLang } from '../i18n';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, type TextInputInstance, useWindowDimensions, View } from 'react-native';
import { Text, TextInput } from './AppText';
import { StatusBar } from 'expo-status-bar';
import { colors, fonts } from '../theme';
import Animated, { Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { EASE_RISE, FocusGlow, InkRing, Rise, RollDigit } from './motion';

function Caret() {
  const o = useSharedValue(1);
  useEffect(() => { o.value = withRepeat(withSequence(withTiming(0, { duration: 450 }), withTiming(1, { duration: 450 })), -1); }, [o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[st.caret, a]} />;
}
import { Halo } from './Halo';
import { back, useBottomInset, useTopInset } from './layout';
import { Icon, IconBtn, W } from './ui';

/** Sign-up step header: back, "Step n of 3", progress bars. */
export function StepHeader({ step, total = 3 }: { step: number; total?: number }) {
  const top = useTopInset();
  return (
    <Halo style={{ paddingTop: top + 4, paddingHorizontal: 20 }} curve={30}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <IconBtn name="back" variant="glass" onPress={back} label="Back" />
        <Text style={[{ flex: 1, color: '#fff', fontSize: 14, ...W('semibold') }, marStart(50)]}>Step {step} of {total}</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {Array.from({ length: total }).map((_, i) => (
            <ProgSeg key={i} state={i < step - 1 ? 'done' : i === step - 1 ? 'fill' : 'off'} />
          ))}
        </View>
      </View>
      <View style={{ height: 14 }} />
    </Halo>
  );
}

/** pfill: the current step's segment fills from the start side with a glowing tip (1.1s at .3s). */
function ProgSeg({ state }: { state: 'done' | 'fill' | 'off' }) {
  useLang();
  const reduce = useReducedMotion();
  const k = useSharedValue(state === 'fill' && !reduce ? 0 : 1);
  useEffect(() => { if (state === 'fill' && !reduce) k.value = withDelay(300, withTiming(1, { duration: 1100, easing: EASE_RISE })); }, [k, state, reduce]);
  const fill = useAnimatedStyle(() => ({ width: 36 * k.value }));
  const tip = useAnimatedStyle(() => ({ opacity: interpolate(k.value, [0, 0.05, 0.9, 1], [0, 1, 1, 0.35]) }));
  return (
    <View style={st.prog}>
      {state === 'off' ? null : (
        <Animated.View style={[st.progFill, atStart(0), fill]}>
          {state === 'fill' ? <Animated.View style={[st.tip, atEnd(-3), tip]} /> : null}
        </Animated.View>
      )}
    </View>
  );
}

/** Form screen: header, serif title + intro, fields, pinned bottom action. */
export function FormPage({ header, title, intro, children, footer }: { header: React.ReactNode; title: string; intro?: React.ReactNode; children?: React.ReactNode; footer?: React.ReactNode }) {
  const bottom = useBottomInset();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.cream }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      {header}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <Rise delay={150}><Text style={st.title}>{title}</Text></Rise>
        {intro ? <Rise delay={250}>{typeof intro === 'string' ? <Text style={st.intro}>{intro}</Text> : intro}</Rise> : null}
        <Rise delay={350} style={{ marginTop: 22 }}>{children}</Rise>
      </ScrollView>
      {footer ? <Rise delay={550} style={{ paddingHorizontal: 20, paddingBottom: bottom + 8, paddingTop: 8 }}>{footer}</Rise> : null}
    </KeyboardAvoidingView>
  );
}

/**
 * 4-digit code entry. Each digit stamps into its box (scale 1.6 → .92 → 1) with a small
 * ruby ink ring; the current empty box breathes its focus glow. Pre-filled digits
 * (from SMS autofill) stamp in one by one.
 */
export function OtpInput({ length = 4, initial = '' , onDone, onChange }: { length?: number; initial?: string; onDone?: (code: string) => void; onChange?: (code: string) => void }) {
  const [v, setV] = useState(initial);
  const first = useRef(initial.length);
  const ref = useRef<TextInputInstance>(null);
  // Boxes are 72 pt as designed, and shrink on narrow phones (iPhone SE: 320 pt) so all four fit.
  const { width } = useWindowDimensions();
  const B = Math.min(72, Math.floor((width - 40 - 8 * (length - 1) - 8 * length) / length));
  return (
    <Pressable onPress={() => ref.current?.focus()} style={{ flexDirection: 'row', gap: 8, marginTop: 6 }} accessibilityLabel="Verification code">
      {Array.from({ length }).map((_, i) => {
        const ch = v[i];
        const active = i === v.length;
        return (
          <View key={i} style={st.otpRing}>
            <FocusGlow radius={16} on={active} delay={i < first.current ? 0 : 1400} />
            <View style={[st.otp, { width: B, height: B }, ch ? st.otpFilled : null, active && st.otpOn]}>
              {ch ? <Digit key={`${i}${ch}`} ch={ch} size={B} delay={i < first.current ? 500 + i * 200 : 0} /> : active ? <Caret /> : null}
            </View>
          </View>
        );
      })}
      <TextInput ref={ref} value={v} onChangeText={(t) => { const c = t.replace(/\D/g, '').slice(0, length); first.current = 0; setV(c); onChange?.(c); if (c.length === length) onDone?.(c); }} keyboardType="number-pad" style={st.hidden} maxLength={length} />
    </Pressable>
  );
}

function Digit({ ch, delay, size = 72 }: { ch: string; delay: number; size?: number }) {
  const reduce = useReducedMotion();
  const k = useSharedValue(reduce ? 1 : 0);
  useEffect(() => { if (!reduce) k.value = withDelay(delay, withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) })); }, [k, delay, reduce]);
  const a = useAnimatedStyle(() => ({
    opacity: interpolate(k.value, [0, 0.6, 1], [0, 1, 1]),
    transform: [{ scale: interpolate(k.value, [0, 0.6, 1], [1.6, 0.92, 1]) }],
  }));
  return (
    <>
      <InkRing size={size} radius={16} delay={delay + 120} to={1.25} width={2} style={{ left: -1.5, top: -1.5 }} />
      <Animated.View style={a}><Text style={st.otpTx}>{ch}</Text></Animated.View>
    </>
  );
}

/** "Resend code in 0:48" countdown. */
export function ResendTimer({ from = 48, label = 'Resend code in', onResend }: { from?: number; label?: string; onResend?: () => void }) {
  const [s, setS] = useState(from);
  useEffect(() => { const i = setInterval(() => setS((x) => Math.max(0, x - 1)), 1000); return () => clearInterval(i); }, []);
  // The seconds roll like a counter (design: CSS digit strips). Digits stay left-to-right in Arabic.
  const dg = (v: string) => <Text style={st.tDig}>{v}</Text>;
  return s > 0 ? (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} accessibilityLabel={`${label} 0:${String(s).padStart(2, '0')}`}>
      <Text style={{ fontSize: 14, color: colors.muted, ...W('regular') }}>{label}</Text>
      <View style={{ flexDirection: 'row', direction: 'ltr' }}>
        {dg('0')}{dg(':')}
        <RollDigit value={String(Math.floor(s / 10))} height={20}>{dg}</RollDigit>
        <RollDigit value={String(s % 10)} height={20}>{dg}</RollDigit>
      </View>
    </View>
  ) : (
    <Pressable onPress={() => { setS(from); onResend?.(); }} hitSlop={12} accessibilityRole="button"><Text style={{ fontSize: 14, color: colors.ruby, ...W('bold') }}>Resend code</Text></Pressable>
  );
}

export function PasswordStrength({ level = 3, hidden }: { level?: 1 | 2 | 3; hidden?: boolean }) {
  const label = ['Weak', 'Okay', 'Strong'][level - 1];
  const c = level === 3 ? colors.emerald : level === 2 ? '#C77700' : colors.ruby;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, opacity: hidden ? 0 : 1 }} pointerEvents="none">
      {[1, 2, 3].map((i) => <MeterSeg key={i} on={i <= level} color={c} delay={700 + (i - 1) * 180} />)}
      <Text style={{ color: c, fontSize: 13, ...W('bold') }}>{label}</Text>
    </View>
  );
}

/** The strength meter fills segment by segment (pfill .7s, staggered). */
function MeterSeg({ on, color, delay }: { on: boolean; color: string; delay: number }) {
  const reduce = useReducedMotion();
  const [w, setW] = useState(0);
  const k = useSharedValue(reduce ? 1 : 0);
  useEffect(() => { if (!reduce) k.value = withDelay(delay, withTiming(1, { duration: 700, easing: EASE_RISE })); }, [k, delay, reduce]);
  const a = useAnimatedStyle(() => ({ width: w * k.value }));
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden' }}>
      {on ? <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, borderRadius: 2, backgroundColor: color }, atStart(0), a]} /> : null}
    </View>
  );
}

export function Rules({ items }: { items: [string, boolean][] }) {
  return (
    <View style={st.rules}>
      {items.map(([t, ok]) => (
        <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 }}>
          <Icon name="check" size={14} color={ok ? colors.emerald : colors.muted2} stroke={2.2} />
          <Text style={{ fontSize: 13, color: ok ? colors.emerald : colors.muted, ...W('semibold') }}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

export const LinkText = ({ children, onPress }: { children: string; onPress?: () => void }) => (
  <Text onPress={onPress} style={{ color: colors.ruby, ...W('bold') }}>{children}</Text>
);

const st = StyleSheet.create({
  prog: { width: 36, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' },
  progFill: { position: 'absolute', top: 0, bottom: 0, borderRadius: 2, backgroundColor: '#FFE3EC', shadowColor: '#FFE3EC', shadowOpacity: 0.9, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
  tip: { position: 'absolute', top: -1.5, width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff', shadowColor: '#FFE3EC', shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  title: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 37, color: colors.plum },
  intro: { fontSize: 16, lineHeight: 24, color: colors.muted, marginTop: 6, ...W('regular') },
  otpRing: { padding: 4, borderRadius: 20 },
  otp: { width: 72, height: 72, borderRadius: 16, borderWidth: 1.5, borderColor: colors.field, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  otpFilled: { borderColor: '#E0507F' },
  otpOn: { borderColor: colors.ruby, borderWidth: 2 },
  tDig: { fontSize: 14, lineHeight: 20, color: colors.ruby, ...W('bold') },
  otpTx: { fontSize: 28, color: colors.plum, ...W('extrabold') },
  caret: { width: 2, height: 30, backgroundColor: colors.ruby, borderRadius: 1 },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  rules: { marginTop: 14, padding: 12, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line },
});

/** Error under a field, in words (never colour alone). */
export function FieldError({ text }: { text?: string }) {
  return text ? <Text style={{ fontSize: 13, color: colors.rubyDark, marginTop: 6, ...W('semibold') }} accessibilityLiveRegion="polite">{text}</Text> : null;
}
