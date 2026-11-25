import React from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps, type TextStyle } from 'react-native';
import { tr, trChildren, useLang } from '../i18n';

// App-wide text:
// - follows the phone's text-size setting up to 130%,
// - translates its strings (see src/i18n),
// - in Arabic swaps to the Arabic type pair (Noto Naskh Arabic headings, IBM Plex Sans Arabic body),
//   drops letter-spacing / capitals (they break Arabic joining) and gives lines more room.
export const MAX_FONT_SCALE = 1.3;

const AR_FONT: Record<string, string> = {
  DMSerifDisplay_400Regular: 'NotoNaskhArabic_700Bold',
  Figtree_400Regular: 'IBMPlexSansArabic_400Regular',
  Figtree_500Medium: 'IBMPlexSansArabic_500Medium',
  Figtree_600SemiBold: 'IBMPlexSansArabic_600SemiBold',
  Figtree_700Bold: 'IBMPlexSansArabic_700Bold',
  Figtree_800ExtraBold: 'IBMPlexSansArabic_700Bold',
};

export function arabicStyle(style: TextProps['style']): TextStyle {
  const f = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const fam = f.fontFamily ? AR_FONT[f.fontFamily] ?? f.fontFamily : 'IBMPlexSansArabic_400Regular';
  const serif = fam.startsWith('NotoNaskh');
  const size = f.fontSize ?? 14;
  const out: { -readonly [K in keyof TextStyle]: TextStyle[K] } = { fontFamily: fam, letterSpacing: 0, textTransform: 'none', writingDirection: 'rtl', fontStyle: 'normal' };
  if (serif) out.fontSize = size * 0.92; // Naskh runs large next to Latin sizes
  if (f.lineHeight) out.lineHeight = Math.max(f.lineHeight, (out.fontSize ?? size) * 1.55);
  if (!f.textAlign || f.textAlign === 'left') out.textAlign = 'right';
  else if (f.textAlign === 'right') out.textAlign = 'left';
  return out;
}

export function Text({ children, style, ...props }: TextProps & { ref?: React.Ref<React.ComponentRef<typeof RNText>> }) {
  const lang = useLang();
  const ar = lang === 'ar';
  return (
    <RNText maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} style={ar ? [style, arabicStyle(style)] : style}>
      {ar ? (trChildren(children) as React.ReactNode) : children}
    </RNText>
  );
}

export function TextInput({ placeholder, style, defaultValue, ...props }: TextInputProps & { ref?: React.Ref<React.ComponentRef<typeof RNTextInput>> }) {
  const lang = useLang();
  const ar = lang === 'ar';
  return <RNTextInput maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} placeholder={ar && placeholder ? tr(placeholder) : placeholder} defaultValue={ar && defaultValue && !props.secureTextEntry ? tr(defaultValue) : defaultValue} style={ar ? [style, arabicStyle(style)] : style} />;
}
