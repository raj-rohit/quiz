import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@/src/theme/ThemeProvider';
import { fonts } from '@/src/theme/tokens';

/** Centered quiz title only — the "Chapter 01" pill was intentionally removed. */
export function SectionHeader({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.primary }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 8 },
  title: { fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 33, letterSpacing: -0.5, textAlign: 'center' },
});
