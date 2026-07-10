import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { MaterialIcon } from '@/src/components/ui/MaterialIcon';
import { useTheme } from '@/src/theme/ThemeProvider';
import { useSettings } from '@/src/state/SettingsContext';
import { fonts, radii, rgb } from '@/src/theme/tokens';
import { Bundle } from '@/src/features/catalog/types';
import { useProducts } from '@/src/state/ProductsContext';

/** Featured "Unlock Everything" card. Hidden once all paid packs are owned. */
export function BundleCard({ bundle, allOwned, onBuy }: { bundle: Bundle; allOwned: boolean; onBuy: (b: Bundle) => void }) {
  const { accent } = useTheme();
  const { locale } = useSettings();
  const { t } = useTranslation();
  const { getPrice, bundleSavings } = useProducts();

  if (allOwned) return null;

  const title = bundle.title[locale] ?? bundle.title.en ?? '';
  const blurb = bundle.blurb[locale] ?? bundle.blurb.en ?? '';
  const price = getPrice(bundle.storeProductId);

  return (
    <Pressable onPress={() => onBuy(bundle)} style={{ shadowColor: rgb(accent.rgb), shadowOpacity: 0.32, shadowRadius: 30, shadowOffset: { width: 0, height: 16 }, elevation: 8 }}>
      <LinearGradient
        colors={[rgb(accent.rgb), rgb(accent.deep), '#2C2622']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.iconBg} pointerEvents="none">
          <MaterialIcon name={bundle.icon} size={130} color="rgba(255,255,255,0.18)" />
        </View>
        <View>
          {bundleSavings && (
            <View style={styles.pill}>
              <Text style={styles.pillText}>
                {t('store.save')} {bundleSavings.savePct}% · {t('store.regular')} {bundleSavings.regular}
              </Text>
            </View>
          )}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.blurb}>{blurb}</Text>
          <View style={styles.bottom}>
            <Text style={styles.price}>{price}</Text>
            <View style={styles.cta}>
              <Text style={styles.ctaText}>{t('store.bundleCta')}</Text>
              <MaterialIcon name="arrow_forward" size={16} color="#1A1C1C" />
            </View>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.cardLg, padding: 20, overflow: 'hidden' },
  iconBg: { position: 'absolute', right: -6, top: -6 },
  pill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { color: '#ffffff', fontFamily: fonts.extrabold, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { color: '#ffffff', fontFamily: fonts.extrabold, fontSize: 22, letterSpacing: -0.4, marginTop: 12 },
  blurb: { color: 'rgba(255,255,255,0.75)', fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  price: { color: '#ffffff', fontFamily: fonts.extrabold, fontSize: 26, letterSpacing: -0.5 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ffffff', borderRadius: 9999, paddingHorizontal: 16, paddingVertical: 8 },
  ctaText: { color: '#1A1C1C', fontFamily: fonts.extrabold, fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase' },
});
