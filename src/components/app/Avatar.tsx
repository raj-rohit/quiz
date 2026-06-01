import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/src/theme/ThemeProvider';
import { fonts, rgb } from '@/src/theme/tokens';

/** Gradient circle with initials + accent ring. */
export function Avatar({ initials = 'JV', size = 36 }: { initials?: string; size?: number }) {
  const { accent, colors } = useTheme();
  return (
    <LinearGradient
      colors={[rgb(accent.rgb, 0.3), rgb('12 182 253', 0.3)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: size >= 64 ? 4 : 2,
          borderColor: rgb(accent.rgb, size >= 64 ? 0.15 : 0.3),
        },
      ]}
    >
      <Text style={{ color: colors.primary, fontFamily: fonts.extrabold, fontSize: size * 0.36 }}>{initials}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
});
