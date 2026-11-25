import React from 'react';
import { SvgXml } from 'react-native-svg';
import markDark from '../../assets/svg/mark_dark';
import markLight from '../../assets/svg/mark_light';
import lockupDark from '../../assets/svg/lockup_dark';
import lockupLight from '../../assets/svg/lockup_light';

// The WonderBites mark is the W, the arch and the dot only (never a circle badge).
// "onDark" = light-coloured artwork for plum backgrounds.
export function Mark({ size = 64, onDark = true, color }: { size?: number; onDark?: boolean; color?: string }) {
  let xml = onDark ? markDark : markLight;
  if (color) xml = xml.replace(/#FFFFFF/g, color).replace(/#331631/g, color);
  return <SvgXml xml={xml} width={size} height={size * 1.13} />;
}

/** Mark + WonderBites wordmark + "GOOD FINDS. CLOSE BY." */
export function Lockup({ width = 220, onDark = true }: { width?: number; onDark?: boolean }) {
  return <SvgXml xml={onDark ? lockupDark : lockupLight} width={width} height={width * (698.6 / 2589.5)} />;
}
