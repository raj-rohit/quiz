import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/src/components/app/Screen';
import { Toast } from '@/src/components/ui/Toast';
import { MaterialIcon } from '@/src/components/ui/MaterialIcon';
import { BundleCard } from '@/src/components/store/BundleCard';
import { PackCard } from '@/src/components/store/PackCard';
import { PurchaseSheet, PurchaseTarget } from '@/src/components/store/PurchaseSheet';
import { CategoryTile } from '@/src/components/quiz/CategoryTile';
import { useCatalog } from '@/src/features/catalog/useCatalog';
import { paidIds } from '@/src/features/catalog/catalog';
import { useProducts } from '@/src/state/ProductsContext';
import { useEntitlements } from '@/src/state/EntitlementsContext';
import { useProgress } from '@/src/state/ProgressContext';
import { useTheme } from '@/src/theme/ThemeProvider';
import { loadJSON, saveJSON, KEYS } from '@/src/lib/storage';
import { fonts } from '@/src/theme/tokens';

type StoreView = 'grid' | 'list';

export default function ExploreScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { catalog } = useCatalog();
  const { owned, buy, restore } = useEntitlements();
  const { progress } = useProgress();
  const { getPrice } = useProducts();
  const [target, setTarget] = useState<PurchaseTarget | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [view, setView] = useState<StoreView>('list');

  // Restore the tester's preferred presentation (beta A/B: grid vs list).
  useEffect(() => {
    loadJSON<StoreView>(KEYS.storeView, 'list').then(setView);
  }, []);

  const toggleView = () => {
    const next: StoreView = view === 'grid' ? 'list' : 'grid';
    setView(next);
    saveJSON(KEYS.storeView, next);
  };

  const paid = paidIds(catalog);
  const allOwned = paid.length > 0 && paid.every((id) => owned.includes(id));
  const goArena = () => router.navigate('/');
  const playPack = (packId: string) => router.navigate({ pathname: '/', params: { pack: packId } });

  const doRestore = async () => {
    const ok = await restore();
    setToast(ok ? t('sheet.restored') : t('sheet.restoreEmpty'));
    setTimeout(() => setToast(null), 1800);
  };

  const onConfirm = (tg: PurchaseTarget) =>
    buy(tg.kind === 'bundle' ? tg.bundle.storeProductId : tg.pack.storeProductId);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.kicker, { color: colors.textFaint }]}>{t('store.kicker')}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{t('store.title')}</Text>
        </View>
        <Pressable
          onPress={toggleView}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t(view === 'grid' ? 'store.viewList' : 'store.viewGrid')}
          style={[styles.toggle, { borderColor: colors.border }]}
        >
          <MaterialIcon name={view === 'grid' ? 'view_list' : 'grid_view'} size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={{ marginBottom: 12 }}>
        <BundleCard bundle={catalog.bundle} allOwned={allOwned} onBuy={(b) => setTarget({ kind: 'bundle', bundle: b })} />
      </View>

      {view === 'grid' ? (
        <View style={styles.grid}>
          {catalog.packs.map((p) => {
            const isOwned = owned.includes(p.id) || p.isFree;
            return (
              <CategoryTile
                key={p.id}
                pack={p}
                playable={isOwned}
                solved={progress.byPack[p.id] ?? 0}
                price={getPrice(p.storeProductId)}
                onPress={() => (isOwned ? playPack(p.id) : setTarget({ kind: 'pack', pack: p }))}
              />
            );
          })}
        </View>
      ) : (
        catalog.packs.map((p) => (
          <View key={p.id} style={{ marginBottom: 12 }}>
            <PackCard
              pack={p}
              owned={owned.includes(p.id)}
              solved={progress.byPack[p.id] ?? 0}
              onPlay={(pk) => playPack(pk.id)}
              onBuy={(pk) => setTarget({ kind: 'pack', pack: pk })}
            />
          </View>
        ))
      )}

      <PurchaseSheet
        target={target}
        onConfirm={onConfirm}
        onClose={() => setTarget(null)}
        onStart={() => {
          const justBought = target?.kind === 'pack' ? target.pack.id : null;
          setTarget(null);
          if (justBought) playPack(justBought);
          else goArena();
        }}
        onRestore={() => {
          // The toast renders behind the Modal sheet, so close the sheet first.
          setTarget(null);
          doRestore();
        }}
      />
      <Toast message={toast} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 },
  headerText: { flex: 1 },
  kicker: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 2.4, textTransform: 'uppercase' },
  title: { fontFamily: fonts.extrabold, fontSize: 26, letterSpacing: -0.5, marginTop: 2 },
  toggle: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginBottom: 12 },
});
