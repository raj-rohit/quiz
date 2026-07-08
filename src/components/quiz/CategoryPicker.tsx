import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/src/components/app/Screen';
import { CategoryTile } from './CategoryTile';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { useCatalog } from '@/src/features/catalog/useCatalog';
import { isPackPlayable, resolveLastPack } from '@/src/features/catalog/selection';
import { Pack } from '@/src/features/catalog/types';
import { useEntitlements } from '@/src/state/EntitlementsContext';
import { useProgress } from '@/src/state/ProgressContext';
import { useSettings } from '@/src/state/SettingsContext';
import { useTheme } from '@/src/theme/ThemeProvider';
import { loadJSON, KEYS } from '@/src/lib/storage';
import { fonts } from '@/src/theme/tokens';

interface Props {
  onStart: (pack: Pack) => void;
  onLocked: (pack: Pack) => void;
}

/** Opening screen: pick a category (pack). Last-played is pre-selected. */
export function CategoryPicker({ onStart, onLocked }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { locale } = useSettings();
  const { catalog } = useCatalog();
  const { owned } = useEntitlements();
  const { progress } = useProgress();

  const packs = catalog.packs;
  const [lastId, setLastId] = useState<string | null>(null);
  const [override, setOverride] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    loadJSON<string | null>(KEYS.lastPack, null).then((v) => {
      setLastId(v);
      setHydrated(true);
    });
  }, []);

  // No selection until storage has hydrated, so the remembered pack never flickers.
  const selectedId = hydrated ? override ?? resolveLastPack(lastId, packs) : null;
  const selectedPack = packs.find((p) => p.id === selectedId) ?? null;
  const selectedPlayable = selectedPack ? isPackPlayable(selectedPack, owned) : false;
  const selectedTitle = selectedPack ? selectedPack.title[locale] ?? selectedPack.title.en ?? '' : '';

  const handleTile = (pack: Pack) => {
    if (!isPackPlayable(pack, owned)) return onLocked(pack);
    if (pack.id === selectedId) return onStart(pack); // tap again to start
    setOverride(pack.id);
  };

  return (
    <Screen scroll>
      <Text style={[styles.kicker, { color: colors.textFaint }]}>{t('category.kicker')}</Text>
      <Text style={[styles.title, { color: colors.text }]}>{t('category.title')}</Text>

      <View style={styles.grid}>
        {packs.map((p) => (
          <CategoryTile
            key={p.id}
            pack={p}
            playable={isPackPlayable(p, owned)}
            solved={progress.byPack[p.id] ?? 0}
            selected={p.id === selectedId}
            onPress={() => handleTile(p)}
          />
        ))}
      </View>

      <PrimaryButton
        label={selectedTitle ? `${t('category.continue')} · ${selectedTitle}` : t('category.continue')}
        iconRight="play_arrow"
        disabled={!selectedPack || !selectedPlayable || selectedPack.questions === 0}
        onPress={() => selectedPack && onStart(selectedPack)}
        style={{ marginTop: 20 }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 2.4, textTransform: 'uppercase' },
  title: { fontFamily: fonts.extrabold, fontSize: 26, letterSpacing: -0.5, marginTop: 2, marginBottom: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
});
