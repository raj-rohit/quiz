import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialIcon } from '@/src/components/ui/MaterialIcon';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { PackCover } from './PackCover';
import { useTheme } from '@/src/theme/ThemeProvider';
import { useSettings } from '@/src/state/SettingsContext';
import { fonts, radii, rgb, palette } from '@/src/theme/tokens';
import { Pack, Bundle } from '@/src/features/catalog/types';
import { useProducts } from '@/src/state/ProductsContext';
import type { PurchaseOutcome } from '@/src/features/store/adapter';

export type PurchaseTarget = { kind: 'pack'; pack: Pack } | { kind: 'bundle'; bundle: Bundle };

interface Props {
  target: PurchaseTarget | null;
  onConfirm: (target: PurchaseTarget) => Promise<PurchaseOutcome>;
  onClose: () => void;
  onStart: () => void;
  onRestore: () => void;
}

type Phase = 'confirm' | 'processing' | 'done';

export function PurchaseSheet({ target, onConfirm, onClose, onStart, onRestore }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, dark, accent } = useTheme();
  const { locale } = useSettings();
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('confirm');
  const [error, setError] = useState<string | null>(null);
  const { getPrice } = useProducts();

  if (!target) return null;

  const isBundle = target.kind === 'bundle';
  const meta = isBundle ? target.bundle : target.pack;
  const title = meta.title[locale] ?? meta.title.en ?? '';
  const price = getPrice(meta.storeProductId);

  const go = async () => {
    if (!price) return; // no price loaded → purchasing is disabled
    setError(null);
    setPhase('processing');
    const outcome = await onConfirm(target);
    if (outcome === 'success') {
      setPhase('done');
    } else {
      setPhase('confirm');
      if (outcome === 'failed') setError(t('sheet.failed'));
    }
  };

  const dismiss = () => {
    setPhase('confirm');
    setError(null);
    onClose();
  };
  const start = () => {
    setPhase('confirm');
    onStart();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={phase === 'confirm' ? dismiss : undefined} statusBarTranslucent>
      <View style={styles.fill}>
        <Pressable style={styles.backdrop} onPress={phase === 'confirm' ? dismiss : undefined} />
        <Animated.View
          entering={SlideInDown.duration(260)}
          style={[styles.panel, { backgroundColor: dark ? palette.night : palette.cream, paddingBottom: insets.bottom + 28 }]}
        >
          <View style={[styles.grabber, { backgroundColor: dark ? 'rgba(255,255,255,0.2)' : 'rgba(26,28,28,0.15)' }]} />

          {phase === 'done' ? (
            <View style={styles.doneWrap}>
              <View style={[styles.doneCircle, { backgroundColor: rgb(accent.rgb, 0.15) }]}>
                <MaterialIcon name="check_circle" size={48} color={colors.primary} />
              </View>
              <Text style={[styles.doneTitle, { color: colors.text }]}>{t('sheet.done')}</Text>
              <Text style={[styles.doneSub, { color: colors.textMuted }]}>{title}</Text>
              <View style={styles.cta}>
                <PrimaryButton label={t('sheet.continue')} iconRight={null} onPress={start} />
              </View>
            </View>
          ) : (
            <>
              <View style={styles.head}>
                {isBundle ? (
                  <LinearGradient
                    colors={[rgb(accent.rgb), rgb(accent.deep)]}
                    style={styles.bundleTile}
                  >
                    <MaterialIcon name={target.bundle.icon} size={34} color="#ffffff" />
                  </LinearGradient>
                ) : (
                  <PackCover cover={target.pack.cover} icon={target.pack.icon} size={64} />
                )}
                <View style={styles.headText}>
                  <Text style={[styles.kicker, { color: colors.textFaint }]}>{t('sheet.title')}</Text>
                  <Text numberOfLines={1} style={[styles.packTitle, { color: colors.text }]}>{title}</Text>
                </View>
                <Text style={[styles.price, { color: colors.text }]}>{price}</Text>
              </View>

              <View style={styles.cta}>
                <Pressable
                  testID="confirm-purchase"
                  onPress={phase === 'confirm' ? go : undefined}
                  disabled={phase === 'processing' || !price}
                  style={{ borderRadius: radii.pill, opacity: price ? 1 : 0.5 }}
                >
                  <LinearGradient colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.confirmBtn}>
                    {phase === 'processing' ? (
                      <>
                        <ActivityIndicator color="#ffffff" />
                        <Text style={styles.confirmText}>{t('sheet.processing')}</Text>
                      </>
                    ) : (
                      <>
                        <MaterialIcon name="lock" size={18} color="#ffffff" />
                        <Text style={styles.confirmText}>{t('sheet.confirm')}{price ? ` · ${price}` : ''}</Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>

              {error && (
                <View style={styles.hintRow}>
                  <MaterialIcon name="info" size={14} color={colors.secondary} />
                  <Text style={[styles.hint, { color: colors.secondary }]}>{error}</Text>
                </View>
              )}
              {!price && (
                <View style={styles.hintRow}>
                  <MaterialIcon name="info" size={14} color={colors.textMuted} />
                  <Text style={[styles.hint, { color: colors.textMuted }]}>{t('sheet.noPrice')}</Text>
                </View>
              )}

              <View style={styles.hintRow}>
                <MaterialIcon name="fingerprint" size={14} color={colors.textMuted} />
                <Text style={[styles.hint, { color: colors.textMuted }]}>{t('sheet.faceid')}</Text>
              </View>

              <Pressable onPress={dismiss} disabled={phase === 'processing'} style={styles.cancel}>
                <Text style={[styles.cancelText, { color: colors.textFaint }]}>{t('sheet.cancel')}</Text>
              </Pressable>

              <Pressable
                testID="restore-purchases"
                onPress={phase === 'confirm' ? onRestore : undefined}
                disabled={phase === 'processing'}
                hitSlop={6}
                style={styles.hintRow}
              >
                <MaterialIcon name="lock_open" size={12} color={colors.secondary} />
                <Text style={[styles.restoreText, { color: colors.secondary }]}>{t('store.restore')}</Text>
              </Pressable>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  panel: { borderTopLeftRadius: radii.sheet, borderTopRightRadius: radii.sheet, paddingHorizontal: 24, paddingTop: 12 },
  grabber: { alignSelf: 'center', width: 48, height: 6, borderRadius: 9999, marginBottom: 20 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  bundleTile: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headText: { flex: 1, minWidth: 0 },
  kicker: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },
  packTitle: { fontFamily: fonts.extrabold, fontSize: 18, letterSpacing: -0.3, marginTop: 2 },
  price: { fontFamily: fonts.extrabold, fontSize: 22, letterSpacing: -0.5 },
  cta: { width: '100%' },
  confirmBtn: { minHeight: 56, borderRadius: radii.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  confirmText: { color: '#ffffff', fontFamily: fonts.extrabold, fontSize: 16, letterSpacing: 1, textTransform: 'uppercase' },
  hintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  hint: { fontFamily: fonts.medium, fontSize: 11 },
  cancel: { alignItems: 'center', paddingVertical: 8, marginTop: 4 },
  cancelText: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  restoreText: { fontFamily: fonts.bold, fontSize: 11 },
  doneWrap: { alignItems: 'center', paddingVertical: 8 },
  doneCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  doneTitle: { fontFamily: fonts.extrabold, fontSize: 22, letterSpacing: -0.3 },
  doneSub: { fontFamily: fonts.medium, fontSize: 13, marginTop: 4, marginBottom: 24 },
});
