import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/src/components/app/Screen';
import { Toast } from '@/src/components/ui/Toast';
import { MaterialIcon } from '@/src/components/ui/MaterialIcon';
import { BundleCard } from '@/src/components/store/BundleCard';
import { PackCard } from '@/src/components/store/PackCard';
import { PurchaseSheet, PurchaseTarget } from '@/src/components/store/PurchaseSheet';
import { useCatalog } from '@/src/features/catalog/useCatalog';
import { paidIds } from '@/src/features/catalog/catalog';
import { useEntitlements } from '@/src/state/EntitlementsContext';
import { useProgress } from '@/src/state/ProgressContext';
import { useTheme } from '@/src/theme/ThemeProvider';
import { fonts } from '@/src/theme/tokens';

export default function ExploreScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { catalog } = useCatalog();
  const { owned, buy, restore } = useEntitlements();
  const { progress } = useProgress();
  const [target, setTarget] = useState<PurchaseTarget | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const paid = paidIds(catalog);
  const allOwned = paid.length > 0 && paid.every((id) => owned.includes(id));
  const goArena = () => router.navigate('/');
  const playPack = (packId: string) => router.navigate({ pathname: '/', params: { pack: packId } });

  const doRestore = () => {
    const ok = restore();
    setToast(ok ? t('sheet.restored') : t('sheet.restoreEmpty'));
    setTimeout(() => setToast(null), 1800);
  };

  const onConfirm = (tg: PurchaseTarget) => {
    if (tg.kind === 'bundle') buy(tg.bundle.id, paid, true);
    else buy(tg.pack.id, paid, false);
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={[styles.kicker, { color: colors.textFaint }]}>{t('store.kicker')}</Text>
        <Text style={[styles.title, { color: colors.text }]}>{t('store.title')}</Text>
      </View>

      <View style={{ marginBottom: 12 }}>
        <BundleCard bundle={catalog.bundle} allOwned={allOwned} onBuy={(b) => setTarget({ kind: 'bundle', bundle: b })} />
      </View>

      {catalog.packs.map((p) => (
        <View key={p.id} style={{ marginBottom: 12 }}>
          <PackCard
            pack={p}
            owned={owned.includes(p.id)}
            solved={progress.byPack[p.id] ?? 0}
            onPlay={(pk) => playPack(pk.id)}
            onTry={goArena}
            onBuy={(pk) => setTarget({ kind: 'pack', pack: pk })}
          />
        </View>
      ))}

      <View style={styles.footer}>
        <Pressable onPress={doRestore} hitSlop={6}>
          <Text style={[styles.restore, { color: colors.secondary }]}>{t('store.restore')}</Text>
        </Pressable>
        <View style={styles.footRow}>
          <MaterialIcon name="lock_open" size={13} color={colors.textFaint} />
          <Text style={[styles.noAccount, { color: colors.textFaint }]}>{t('store.noAccount')}</Text>
        </View>
        <Text style={[styles.disclaimer, { color: colors.textFaint }]}>{t('disclaimer')}</Text>
      </View>

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
      />
      <Toast message={toast} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 16 },
  kicker: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 2.4, textTransform: 'uppercase' },
  title: { fontFamily: fonts.extrabold, fontSize: 26, letterSpacing: -0.5, marginTop: 2 },
  footer: { alignItems: 'center', gap: 8, marginTop: 24 },
  restore: { fontFamily: fonts.bold, fontSize: 12 },
  footRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noAccount: { fontFamily: fonts.medium, fontSize: 10 },
  disclaimer: { fontFamily: fonts.regular, fontSize: 9, lineHeight: 14, textAlign: 'center', maxWidth: 300, marginTop: 4 },
});
