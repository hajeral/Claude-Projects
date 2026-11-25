// P11 Share feedback
import { api } from '../api/client';
import { pickPhoto } from '../lib/device';
import { toast } from '../components/Toast';
import { FieldError } from '../components/forms';
import { Image } from 'expo-image';
import { LIVE } from '../config';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../components/AppText';
import { router } from 'expo-router';
import { Page, SubHeader } from '../components/layout';
import { Button, Card, Field, Icon, Label, OptChip, W } from '../components/ui';
import { colors, fonts } from '../theme';

const WORDS = ['', 'Not what I expected', 'Good, could be better', 'Okay', 'Really good', 'Loved it!'];

export default function Feedback() {
  const [stars, setStars] = useState(4);
  const [about, setAbout] = useState('The app');
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [err, setErr] = useState('');
  const send = async () => {
    if (text.trim().length < 3) { setErr('Tell us a little more first'); return; }
    await api.sendFeedback({ kind: 'feedback', stars, about, text: text.trim(), photo });
    toast(LIVE ? 'Thanks! Your feedback is on its way' : 'Saved on this phone (demo, not sent)');
    router.back();
  };
  return (
    <Page header={<SubHeader title="Share your experience" />} footer={<Button title="Send feedback" onPress={send} />}>
      <Card style={{ padding: 18, alignItems: 'center' }}>
        <Text style={{ fontFamily: fonts.serif, fontSize: 22, color: colors.plum }}>How’s your WonderBites experience?</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Pressable key={i} onPress={() => setStars(i)} hitSlop={8} accessibilityRole="button" accessibilityState={{ selected: i === stars }} accessibilityLabel={`${i} stars`}>
              <Icon name="star" size={32} color={colors.ruby} fill={i <= stars ? colors.ruby : 'none'} />
            </Pressable>
          ))}
        </View>
        <Text style={{ fontSize: 13, color: colors.muted, marginTop: 6, ...W('regular') }}>{WORDS[stars]}</Text>
      </Card>
      <View style={{ marginTop: 18 }}><Label>What would you like to rate?</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{['The app', 'A shop', 'A bag I ordered', 'Pickup', 'Other'].map((x) => <OptChip key={x} label={x} on={about === x} onPress={() => setAbout(x)} />)}</View>
      </View>
      <View style={{ marginTop: 18 }}><Label>We’d love the details</Label><Field multiline placeholder="What did you love, what could be better?" value={text} onChangeText={(t) => { setText(t); setErr(''); }} error={!!err} /><FieldError text={err} /></View>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, marginTop: 14 }} onPress={async () => { const u = await pickPhoto(); if (u) setPhoto(u); }}>
        {photo ? <Image source={{ uri: photo }} style={{ width: 40, height: 40, borderRadius: 10 }} contentFit="cover" /> : <Icon name="photo" size={18} color={colors.muted} />}
        <Text style={{ flex: 1, fontSize: 15, color: colors.plum, ...W('semibold') }}>{photo ? 'Photo added' : 'Add a photo'} <Text style={{ color: colors.muted, ...W('regular') }}>{photo ? '' : ' (optional)'}</Text></Text>
        {photo ? <Pressable onPress={() => setPhoto(undefined)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Remove photo"><Icon name="close" size={18} color={colors.muted} /></Pressable> : null}
      </Card>
    </Page>
  );
}
