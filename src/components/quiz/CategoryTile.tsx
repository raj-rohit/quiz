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
  selected?: boolean;
  /** Localized price string; shown on locked tiles. */
  price?: string;
  onPress: () => void;
}

/** Compact category tile for pack grids (Explore grid view). */
export function CategoryTile({ pack, playable, solved, selected = false, price, onPress }: Props) {
  const { colors, dark } = useTheme();
  const { locale } = useSettings();
  const title = pack.title[locale] ?? pack.title.en ?? '';
  const empty = pack.questions === 0;

  return (
    <Pressable
      onPress={onPress}
      disabled={empty}
      accessibilityState={{ selected }}
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
        {!playable && (
          <View style={[styles.pricePill, { backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(26,28,28,0.07)' }]}>
            <MaterialIcon name="lock" size={12} color={colors.textFaint} />
            {!!price && <Text style={[styles.priceText, { color: colors.text }]}>{price}</Text>}
          </View>
        )}
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
  pricePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999 },
  priceText: { fontFamily: fonts.extrabold, fontSize: 10 },
  name: { fontFamily: fonts.bold, fontSize: 14, marginTop: 10 },
  meta: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 2 },
});
