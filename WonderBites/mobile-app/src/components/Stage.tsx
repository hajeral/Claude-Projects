import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Lays out children in the design's fixed 390-wide space (illustrated maps, pins, cards)
 * and scales the whole stage to fit, so positions stay correct on every phone size.
 */
export function Stage({ scale, width = 390, height, offsetX = 0, offsetY = 0, children, style }: { scale: number; width?: number; height: number; offsetX?: number; offsetY?: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ width: width * scale, height: height * scale, overflow: 'hidden' }, style]}>
      <View style={{ position: 'absolute', left: offsetX, top: offsetY, width, height, transform: [{ scale }], transformOrigin: '0px 0px' } as ViewStyle}>
        {children}
      </View>
    </View>
  );
}
