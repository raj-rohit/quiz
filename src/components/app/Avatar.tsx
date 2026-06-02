import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/src/theme/ThemeProvider';
import { fonts, rgb } from '@/src/theme/tokens';
import { MaterialIcon } from '@/src/components/ui/MaterialIcon';

/** Gradient circle with the player's initials, or a neutral person icon if no name set. */
export function Avatar({ initials = '', size = 36 }: { initials?: string; size?: number }) {
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
      {initials ? (
        <Text style={{ color: colors.primary, fontFamily: fonts.extrabold, fontSize: size * 0.36 }}>{initials}</Text>
      ) : (
        <MaterialIcon name="person" size={size * 0.5} color={colors.primary} />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
});
