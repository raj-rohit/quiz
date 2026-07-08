import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/src/theme/ThemeProvider';
import { useSettings } from '@/src/state/SettingsContext';
import { fonts, radii } from '@/src/theme/tokens';
import { PackCover } from '@/src/components/store/PackCover';
import { MaterialIcon } from '@/src/components/ui/MaterialIcon';
import { Pack } from '@/src/features/catalog/types';

interface Props {
  pack: Pack;
  playable: boolean;
  solved: number;
  selected: boolean;
  onPress: () => void;
}

/** Compact category tile for the opening picker grid. */
export function CategoryTile({ pack, playable, solved, selected, onPress }: Props) {
  const { colors, dark } = useTheme();
  const { locale } = useSettings();
  const title = pack.title[locale] ?? pack.title.en ?? '';
  const empty = pack.questions === 0;

  return (
    <Pressable
      onPress={onPress}
      disabled={empty}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)',
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: selected ? 2 : 1,
          opacity: empty ? 0.4 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.topRow}>
        <PackCover cover={pack.cover} icon={pack.icon} size={40} />
        {!playable && <MaterialIcon name="lock" size={16} color={colors.textFaint} />}
      </View>
      <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.meta, { color: colors.textFaint }]}>
        {solved > 0 ? `${Math.min(solved, pack.questions)}/${pack.questions}` : `${pack.questions}`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { width: '48%', borderRadius: radii.tile, padding: 12, minHeight: 96, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  name: { fontFamily: fonts.bold, fontSize: 14, marginTop: 10 },
  meta: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 2 },
});
