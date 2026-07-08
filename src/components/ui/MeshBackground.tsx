import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '@/src/theme/ThemeProvider';
import { palette, rgb } from '@/src/theme/tokens';
import { MESH_ACCENT_ALPHA } from '@/src/theme/mesh';

/**
 * Mesh-gradient backdrop (SPEC §5). RN has no radial gradient, so we approximate
 * with two very large, low-opacity blobs: accent at top-left, cyan at bottom-right.
 */
export function MeshBackground() {
  const { dark, accent } = useTheme();
  const { width, height } = useWindowDimensions();
  const blob = Math.max(width, height) * 1.4;

  const accentColor = dark ? rgb(accent.glow, MESH_ACCENT_ALPHA.dark) : rgb(accent.rgb, MESH_ACCENT_ALPHA.light);
  const cyanColor = dark ? rgb('12 182 253', 0.12) : rgb('12 182 253', 0.07);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? palette.night : palette.cream }]} pointerEvents="none">
      <View
        style={{
          position: 'absolute',
          width: blob,
          height: blob,
          borderRadius: blob / 2,
          backgroundColor: accentColor,
          top: -blob * 0.55,
          left: -blob * 0.4,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: blob,
          height: blob,
          borderRadius: blob / 2,
          backgroundColor: cyanColor,
          bottom: -blob * 0.55,
          right: -blob * 0.4,
        }}
      />
    </View>
  );
}
