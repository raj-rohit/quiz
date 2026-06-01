import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/src/theme/ThemeProvider';
import { radii, shadow } from '@/src/theme/tokens';

interface Props {
  children: React.ReactNode;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /** Disable the ambient shadow (e.g. for tightly-packed tiles). */
  flat?: boolean;
}

/**
 * Frosted-glass surface (SPEC §5): blurred backdrop + translucent tint + 1px
 * accent border. Replaces the old GlassCard.
 */
export function GlassSurface({ children, radius = radii.card, style, contentStyle, flat }: Props) {
  const { glass } = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: radius,
          borderWidth: 1,
          borderColor: glass.borderColor,
          overflow: 'hidden',
        },
        !flat && shadow.soft,
        style,
      ]}
    >
      <BlurView intensity={glass.blurIntensity} tint={glass.blurTint} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: glass.backgroundColor }]} />
      <View style={contentStyle}>{children}</View>
    </View>
  );
}
