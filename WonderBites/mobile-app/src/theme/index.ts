// WonderBites design tokens — taken 1:1 from the final design canvas.
export const colors = {
  plum: '#331631',        // brand ink + dark surfaces
  plum2: '#4A1C45',
  plum3: '#6E1A4C',
  ruby: '#D9175C',        // primary action, prices
  rubyDark: '#B8124D',
  rubySoft: '#FCEAF1',
  blush: '#F4C3CD',
  rose: '#E2A9B8',
  pale: '#EBD9E4',
  cream: '#FEFAF7',       // app background
  white: '#FFFFFF',
  muted: '#6B4A68',       // secondary text
  muted2: '#806B7E',     // placeholders, sold-out (darkened from #8F7A8C for WCAG AA 4.5:1)
  line: '#F3E4EA',        // hairlines, card borders
  field: '#EAD6DF',       // input borders
  emerald: '#006B3C',     // "rescued", left counts, success
  emeraldSoft: '#E6F2EC',
  overlay: 'rgba(51,22,49,0.55)',
} as const;

export const fonts = {
  serif: 'DMSerifDisplay_400Regular',
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
  extrabold: 'Figtree_800ExtraBold',
} as const;

// Type scale (size / lineHeight) from the design
export const type = {
  display: { fontFamily: fonts.serif, fontSize: 40, lineHeight: 44 },
  title: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 37 },
  section: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 27 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  cardTitle: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  price: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 22, color: colors.ruby },
} as const;

export const radius = { field: 16, card: 20, pill: 999, button: 28 } as const;
export const space = { screen: 20, gap: 12 } as const;

export const shadow = {
  card: { shadowColor: colors.plum, shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  button: { shadowColor: colors.ruby, shadowOpacity: 0.45, shadowRadius: 13, shadowOffset: { width: 0, height: 10 }, elevation: 5 },
  float: { shadowColor: colors.plum, shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
} as const;

import { Platform, type ViewStyle } from 'react-native';
/** Shadow that follows the shape of SVG/transparent content (CSS drop-shadow on web, layer shadow on iOS). */
export const dropShadow = (css: string, ios: ViewStyle): ViewStyle =>
  (Platform.select({ web: { filter: css } as ViewStyle, ios, default: {} }) as ViewStyle);
