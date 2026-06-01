import React from 'react';
import { View } from 'react-native';
import { BuildCode } from '@/src/theme/builds';

// Tricolor flags drawn as stripes — horizontal (h) or vertical (v).
const FLAGS: Record<BuildCode, { dir: 'h' | 'v'; colors: [string, string, string] }> = {
  NL: { dir: 'h', colors: ['#AE1C28', '#FFFFFF', '#21468B'] },
  FR: { dir: 'v', colors: ['#0055A4', '#FFFFFF', '#EF4135'] },
  BE: { dir: 'v', colors: ['#000000', '#FAE042', '#ED2939'] },
  DE: { dir: 'h', colors: ['#000000', '#DD0000', '#FFCE00'] },
};

export function FlagChip({ code, width = 28, height = 19, dark }: { code: BuildCode; width?: number; height?: number; dark?: boolean }) {
  const flag = FLAGS[code] ?? FLAGS.NL;
  return (
    <View
      style={{
        width,
        height,
        borderRadius: 3,
        overflow: 'hidden',
        flexDirection: flag.dir === 'h' ? 'column' : 'row',
        shadowColor: '#000',
        shadowOpacity: dark ? 0.4 : 0.08,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
        borderWidth: 1,
        borderColor: dark ? 'rgba(255,255,255,0.25)' : 'rgba(26,28,28,0.12)',
      }}
    >
      {flag.colors.map((c, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: c }} />
      ))}
    </View>
  );
}
