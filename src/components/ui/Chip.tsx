import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/src/theme/ThemeProvider';
import { fonts, rgb } from '@/src/theme/tokens';
import { MaterialIcon, IconName } from './MaterialIcon';

/** Small pill: tinted bg + border + optional icon. Used for score/time chips. */
export function Chip({
  label,
  icon,
  tone = 'primary',
  glow,
}: {
  label: string;
  icon?: IconName;
  tone?: 'primary' | 'secondary';
  glow?: boolean;
}) {
  const { accent } = useTheme();
  const triplet = tone === 'primary' ? accent.rgb : '12 182 253';
  const color = rgb(triplet);
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: rgb(triplet, 0.1), borderColor: rgb(triplet, 0.25) },
        glow && { shadowColor: color, shadowOpacity: 0.15, shadowRadius: 15, shadowOffset: { width: 0, height: 0 }, elevation: 3 },
      ]}
    >
      {icon && <MaterialIcon name={icon} size={14} color={color} />}
      <Text style={[styles.label, { color }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
  },
  label: {
    fontFamily: fonts.extrabold,
    fontSize: 11,
    letterSpacing: 1,
  },
});
