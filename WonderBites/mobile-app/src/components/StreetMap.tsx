import React from 'react';
import { mapLabel } from '../i18n/maps';
import { useLang } from '../i18n';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { fonts } from '../theme';

/**
 * Light illustrated street map (Select location, Shop profile). Placeholder for a live map:
 * swap for react-native-maps with a custom light style when the API keys are in place.
 */
export function StreetMap({ width, height, labels = true, bayX = 0.72, style, children }: { width: number; height: number; labels?: boolean; bayX?: number; style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  const lines: React.ReactNode[] = [];
  for (let x = 12; x < width; x += 34) lines.push(<Line key={`v${x}`} x1={x} y1={0} x2={x} y2={height} stroke="#EEDFE4" strokeWidth={1} />);
  for (let y = 10; y < height; y += 34) lines.push(<Line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} stroke="#EEDFE4" strokeWidth={1} />);
  const bx = width * bayX;
  const ar = useLang() === 'ar';
  const lf = ar ? { b: 'IBMPlexSansArabic_700Bold', s: 'NotoNaskhArabic_700Bold', ls: 0 } : { b: fonts.bold, s: fonts.serif, ls: 1.4 };
  return (
    <View style={[{ width, height, overflow: 'hidden', backgroundColor: '#FBF5F2' }, style]}>
      <Svg width={width} height={height}>
        <Rect width={width} height={height} fill="#FBF5F2" />
        <G>{lines}</G>
        <Path d={`M${width * 0.4} 0 V${height}`} stroke="#fff" strokeWidth={12} />
        <Path d={`M0 ${height * 0.62} L${width} ${height * 0.52}`} stroke="#fff" strokeWidth={14} />
        <Path d={`M${bx} 0 C${bx - 30} ${height * 0.2} ${bx + 10} ${height * 0.45} ${bx + 40} ${height * 0.6} S ${width} ${height * 0.8} ${width + 20} ${height * 0.85} V0Z`} fill="#F1D6E0" />
        {labels ? (
          <G>
            <SvgText x={Math.min(bx + 50, width - 78)} y={height * 0.24} fontFamily={lf.s} fontSize={15} fill="#8E6A86">{mapLabel('Doha Bay', ar)}</SvgText>
            <SvgText x={40} y={height * 0.36} fontFamily={lf.b} fontSize={11} letterSpacing={lf.ls} fill="#9E8396">{mapLabel('AL SADD', ar)}</SvgText>
            <SvgText x={width * 0.5} y={height * 0.82} fontFamily={lf.b} fontSize={11} letterSpacing={lf.ls} fill="#9E8396">{mapLabel('MSHEIREB', ar)}</SvgText>
          </G>
        ) : null}
      </Svg>
      {children}
    </View>
  );
}

