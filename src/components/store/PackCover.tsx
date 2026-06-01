import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/src/theme/ThemeProvider';
import { rgb, fonts } from '@/src/theme/tokens';
import { MaterialIcon, IconName } from '@/src/components/ui/MaterialIcon';
import { Cover } from '@/src/features/catalog/types';

/** On-brand gradient square: preset gradient + filled icon + italic "LL" monogram. */
export function PackCover({ cover, icon, size = 64 }: { cover: Cover; icon: IconName; size?: number }) {
  const { accent } = useTheme();
  const presets: Record<Cover, { colors: [string, string]; fg: string }> = {
    accent: { colors: [rgb(accent.rgb), rgb(accent.deep)], fg: '#ffffff' },
    cyan: { colors: ['#0cb6fd', '#0784c9'], fg: '#ffffff' },
    ink: { colors: ['#2C2622', '#0e0e0e'], fg: '#f9f6ee' },
    cream: { colors: ['#FBF7EC', '#EFE7D4'], fg: '#1A1714' },
  };
  const p = presets[cover] ?? presets.accent;
  return (
    <LinearGradient
      colors={p.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.cover, { width: size, height: size, borderRadius: size * 0.28 }]}
    >
      <MaterialIcon name={icon} size={size * 0.46} color={p.fg} />
      <Text style={[styles.mono, { color: p.fg, fontSize: size * 0.17 }]}>LL</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  cover: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  mono: {
    position: 'absolute',
    bottom: 4,
    right: 6,
    fontFamily: fonts.extrabold,
    fontStyle: 'italic',
    opacity: 0.55,
    letterSpacing: -0.5,
  },
});
