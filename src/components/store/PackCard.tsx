import React from 'react';
import { View, Text, Pressable, StyleSheet, DimensionValue } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassSurface } from '@/src/components/ui/GlassSurface';
import { MaterialIcon } from '@/src/components/ui/MaterialIcon';
import { PackCover } from './PackCover';
import { useTheme } from '@/src/theme/ThemeProvider';
import { useSettings } from '@/src/state/SettingsContext';
import { fonts, radii } from '@/src/theme/tokens';
import { Pack } from '@/src/features/catalog/types';
import { useProducts } from '@/src/state/ProductsContext';

interface Props {
  pack: Pack;
  owned: boolean;
  solved: number;
  onPlay: (p: Pack) => void;
  onBuy: (p: Pack) => void;
  onTry?: (p: Pack) => void;
}

export function PackCard({ pack, owned, solved, onPlay, onBuy, onTry }: Props) {
  const { colors, dark } = useTheme();
  const { locale } = useSettings();
  const { t } = useTranslation();
  const { getPrice } = useProducts();

  const isOwned = owned || pack.isFree;
  const title = pack.title[locale] ?? pack.title.en ?? '';
  const blurb = pack.blurb[locale] ?? pack.blurb.en ?? '';
  const price = getPrice(pack.storeProductId);
  const showProgress = isOwned && solved > 0;
  const pct = Math.min(100, (solved / Math.max(1, pack.questions)) * 100);

  return (
    <Pressable onPress={() => (isOwned ? onPlay(pack) : onBuy(pack))}>
      <GlassSurface radius={radii.cardSm} contentStyle={styles.row}>
        <PackCover cover={pack.cover} icon={pack.icon} size={64} />

        <View style={styles.mid}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>{title}</Text>
            {isOwned && <MaterialIcon name="check_circle" size={14} color={colors.primary} />}
          </View>
          <Text numberOfLines={1} style={[styles.blurb, { color: colors.textMuted }]}>{blurb}</Text>

          {showProgress ? (
            <View style={styles.progressRow}>
              <View style={[styles.track, { backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(26,28,28,0.1)' }]}>
                <View style={[styles.fill, { width: `${pct}%` as DimensionValue, backgroundColor: colors.secondary }]} />
              </View>
              <Text style={[styles.meta, { color: colors.textFaint }]}>
                {Math.min(solved, pack.questions)}/{pack.questions}
              </Text>
            </View>
          ) : (
            <Text style={[styles.meta, { color: colors.textFaint, marginTop: 6 }]}>
              {pack.questions} {t('store.questions')}
            </Text>
          )}
        </View>

        <View style={styles.right}>
          {isOwned ? (
            <View style={[styles.playPill, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
              <MaterialIcon name="play_arrow" size={15} color="#ffffff" />
              <Text style={styles.playText}>{t('store.play')}</Text>
            </View>
          ) : (
            <>
              <View style={[styles.pricePill, { backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(26,28,28,0.07)' }]}>
                <Text style={[styles.priceText, { color: colors.text }]}>{price}</Text>
              </View>
              {pack.sample && onTry && (
                <Pressable onPress={() => onTry(pack)} hitSlop={6}>
                  <Text style={[styles.try, { color: colors.secondary }]}>{t('store.tryFree')}</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  mid: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontFamily: fonts.extrabold, fontSize: 15, letterSpacing: -0.3, flexShrink: 1 },
  blurb: { fontFamily: fonts.regular, fontSize: 11, marginTop: 2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  track: { height: 4, width: 80, borderRadius: 9999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 9999 },
  meta: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' },
  right: { alignItems: 'flex-end', gap: 6 },
  playPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  playText: { color: '#ffffff', fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  pricePill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 9999 },
  priceText: { fontFamily: fonts.extrabold, fontSize: 12 },
  try: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' },
});
