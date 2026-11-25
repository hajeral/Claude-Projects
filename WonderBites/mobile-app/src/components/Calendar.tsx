// Month calendar for choosing a pickup day. Uses the real date in Doha time, greys out
// past days, marks days that have bags with a dot, and follows the reading direction
// (in Arabic the week runs right to left).
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './AppText';
import { Icon, W } from './ui';
import { colors } from '../theme';
import { doha, dohaKey, dohaTime, now } from '../lib/clock';
import { DAY_SHORT, MONTH_NAMES } from '../lib/format';

export function Calendar({ value, onChange, marked = [], maxDays = 60 }: { value?: string; onChange: (key: string) => void; marked?: string[]; maxDays?: number }) {
  const t = doha(now());
  const todayKey = dohaKey();
  const [ym, setYm] = useState<[number, number]>([t.y, t.mo]);
  const [y, mo] = ym;
  const first = doha(dohaTime(y, mo, 1));
  const days = doha(dohaTime(y, mo + 1, 0)).d;
  const lastAllowed = dohaKey(now() + maxDays * 86400000);
  const cells: (number | null)[] = [...Array(first.dow).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const canPrev = y > t.y || (y === t.y && mo > t.mo);
  const canNext = dohaKey(dohaTime(y, mo + 1, 1)) <= lastAllowed;
  const key = (d: number) => `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const shift = (n: number) => { const p = doha(dohaTime(y, mo + n, 1)); setYm([p.y, p.mo]); };
  return (
    <View style={st.wrap}>
      <View style={st.head}>
        <Pressable onPress={() => canPrev && shift(-1)} disabled={!canPrev} hitSlop={12} accessibilityRole="button" accessibilityLabel="Previous month" style={{ opacity: canPrev ? 1 : 0.3 }}>
          <Icon name="back" size={20} color={colors.plum} />
        </Pressable>
        <Text style={st.month}>{`${MONTH_NAMES()[mo]} ${y}`}</Text>
        <Pressable onPress={() => canNext && shift(1)} disabled={!canNext} hitSlop={12} accessibilityRole="button" accessibilityLabel="Next month" style={{ opacity: canNext ? 1 : 0.3 }}>
          <Icon name="chev" size={20} color={colors.plum} />
        </Pressable>
      </View>
      <View style={st.row}>{DAY_SHORT().map((d) => <Text key={d} style={st.dow}>{d}</Text>)}</View>
      {Array.from({ length: cells.length / 7 }, (_, r) => (
        <View key={r} style={st.row}>
          {cells.slice(r * 7, r * 7 + 7).map((d, i) => {
            if (!d) return <View key={i} style={st.cell} />;
            const k = key(d);
            const past = k < todayKey || k > lastAllowed;
            const sel = k === value;
            const isToday = k === todayKey;
            return (
              <Pressable key={i} disabled={past} onPress={() => onChange(k)} style={st.cell} accessibilityRole="button" accessibilityState={{ selected: sel, disabled: past }} accessibilityLabel={`${d} ${MONTH_NAMES()[mo]}`}>
                <View style={[st.day, isToday && st.today, sel && st.sel]}>
                  <Text style={[st.dt, past && { color: '#CDBBC6' }, sel && { color: '#fff' }]}>{String(d)}</Text>
                </View>
                {marked.includes(k) && !past ? <View style={[st.dot, sel && { backgroundColor: colors.ruby }]} /> : <View style={{ height: 5 }} />}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { backgroundColor: '#fff', borderRadius: 20, padding: 12, borderWidth: 1, borderColor: colors.line },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, paddingBottom: 8 },
  month: { fontSize: 16, color: colors.plum, ...W('bold') },
  row: { flexDirection: 'row' },
  dow: { flex: 1, textAlign: 'center', fontSize: 12, color: colors.muted, paddingVertical: 4, ...W('semibold') },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 2, minHeight: 44 },
  day: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 1.5, borderColor: colors.ruby },
  sel: { backgroundColor: colors.ruby, borderColor: colors.ruby },
  dt: { fontSize: 15, color: colors.plum, ...W('semibold') },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.emerald, marginTop: 1 },
});
