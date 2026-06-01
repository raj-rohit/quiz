import React from 'react';
import { View, Text, StyleSheet, DimensionValue } from 'react-native';
import { useTheme } from '@/src/theme/ThemeProvider';
import { fonts, palette } from '@/src/theme/tokens';

const pad = (n: number) => String(n).padStart(2, '0');

export function ProgressStrip({ current, total, label }: { current: number; total: number; label: string }) {
  const { colors, dark } = useTheme();
  const pct = Math.min(100, (current / Math.max(1, total)) * 100);
  return (
    <View style={styles.row}>
      <View style={{ gap: 6 }}>
        <Text style={[styles.label, { color: colors.textFaint }]}>{label.toUpperCase()}</Text>
        <View style={[styles.track, { backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(26,28,28,0.1)' }]}>
          <View style={[styles.fill, { width: `${pct}%` as DimensionValue, backgroundColor: colors.secondary }]} />
        </View>
      </View>
      <Text style={[styles.count, { color: colors.primary }]}>
        {pad(current)}
        <Text style={[styles.total, { color: colors.textFaint }]}>/{pad(total)}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  label: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 2.2 },
  track: { height: 6, width: 128, borderRadius: 9999, overflow: 'hidden' },
  fill: {
    height: '100%',
    borderRadius: 9999,
    shadowColor: palette.secondary,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  count: { fontFamily: fonts.extrabold, fontSize: 36, letterSpacing: -1, lineHeight: 38 },
  total: { fontSize: 16, fontFamily: fonts.bold },
});
