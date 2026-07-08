import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/src/components/app/Screen';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { PackCover } from '@/src/components/store/PackCover';
import { useCatalog } from '@/src/features/catalog/useCatalog';
import { resolveLastPack, isPackPlayable } from '@/src/features/catalog/selection';
import { Pack } from '@/src/features/catalog/types';
import { useEntitlements } from '@/src/state/EntitlementsContext';
import { useSettings } from '@/src/state/SettingsContext';
import { useTheme } from '@/src/theme/ThemeProvider';
import { loadJSON, KEYS } from '@/src/lib/storage';
import { fonts } from '@/src/theme/tokens';

interface Props {
  onStart: (pack: Pack) => void;
  onBrowse: () => void;
}

/** Arena idle state: one-tap resume of the last-played (or default) pack. */
export function ContinueCard({ onStart, onBrowse }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { locale } = useSettings();
  const { catalog } = useCatalog();
  const { owned } = useEntitlements();
  const [lastId, setLastId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Gate on storage hydration so the remembered pack never flickers.
  useEffect(() => {
    loadJSON<string | null>(KEYS.lastPack, null).then((v) => {
      setLastId(v);
      setHydrated(true);
    });
  }, []);

  const resolvedId = hydrated ? resolveLastPack(lastId, catalog.packs) : null;
  const pack = catalog.packs.find((p) => p.id === resolvedId) ?? null;
  const playable = pack ? isPackPlayable(pack, owned) : false;
  const title = pack ? pack.title[locale] ?? pack.title.en ?? '' : '';

  return (
    <Screen center>
      {pack && (
        <View style={styles.coverWrap}>
          <PackCover cover={pack.cover} icon={pack.icon} size={72} />
        </View>
      )}
      <Text style={[styles.kicker, { color: colors.textFaint }]}>{t('arena.continueKicker')}</Text>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <PrimaryButton
        label={t('category.continue')}
        iconRight="play_arrow"
        disabled={!pack || !playable || pack.questions === 0}
        onPress={() => pack && onStart(pack)}
        style={styles.cta}
      />
      <Pressable onPress={onBrowse} hitSlop={8}>
        <Text style={[styles.browse, { color: colors.secondary }]}>{t('arena.browse')}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  coverWrap: { marginBottom: 16 },
  kicker: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 2.4, textTransform: 'uppercase' },
  title: { fontFamily: fonts.extrabold, fontSize: 26, letterSpacing: -0.5, marginTop: 2, textAlign: 'center' },
  cta: { marginTop: 20, alignSelf: 'stretch', marginHorizontal: 24 },
  browse: { fontFamily: fonts.bold, fontSize: 12, marginTop: 16 },
});
