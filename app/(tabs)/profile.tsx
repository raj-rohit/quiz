import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Screen } from '@/src/components/app/Screen';
import { GlassSurface } from '@/src/components/ui/GlassSurface';
import { Avatar } from '@/src/components/app/Avatar';
import { LanguageSwitcher } from '@/src/components/app/LanguageSwitcher';
import { NamePrompt } from '@/src/components/app/NamePrompt';
import { usePlayer } from '@/src/state/PlayerContext';
import { initials } from '@/src/features/profile/initials';
import { MaterialIcon, IconName } from '@/src/components/ui/MaterialIcon';
import { PackCover } from '@/src/components/store/PackCover';
import { Toast } from '@/src/components/ui/Toast';
import { useTheme } from '@/src/theme/ThemeProvider';
import { useSettings } from '@/src/state/SettingsContext';
import { useEntitlements } from '@/src/state/EntitlementsContext';
import { useProgress } from '@/src/state/ProgressContext';
import { useCatalog } from '@/src/features/catalog/useCatalog';
import { fonts } from '@/src/theme/tokens';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, dark, toggleDark } = useTheme();
  const { locale } = useSettings();
  const { owned, restore } = useEntitlements();
  const { progress } = useProgress();
  const { catalog } = useCatalog();
  const { name } = usePlayer();
  const [toast, setToast] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const ownedPacks = catalog.packs.filter((p) => p.isFree || owned.includes(p.id));
  const stats: { label: string; value: string; icon: IconName }[] = [
    { label: t('profile.solved'), value: String(progress.solved), icon: 'task_alt' },
    { label: t('profile.streak'), value: `${progress.streak}${t('profile.days')}`, icon: 'local_fire_department' },
    { label: t('profile.best'), value: progress.bestTimeSec != null ? `${progress.bestTimeSec}s` : '—', icon: 'bolt' },
  ];

  const doRestore = async () => {
    const ok = await restore();
    setToast(ok ? t('sheet.restored') : t('sheet.restoreEmpty'));
    setTimeout(() => setToast(null), 1800);
  };

  return (
    <Screen scroll>
      <Pressable style={styles.identity} onPress={() => setEditing(true)}>
        <Avatar size={72} initials={initials(name)} />
        <Text style={[styles.name, { color: colors.text }]}>{name ?? t('profile.name')}</Text>
        <View style={styles.subRow}>
          <MaterialIcon name="smartphone" size={13} color={colors.textMuted} />
          <Text style={[styles.sub, { color: colors.textMuted }]}>{t('profile.sub')}</Text>
        </View>
      </Pressable>

      <View style={styles.statsRow}>
        {stats.map((s) => (
          <GlassSurface key={s.label} radius={16} style={styles.statFlex} contentStyle={styles.statTile}>
            <MaterialIcon name={s.icon} size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.textFaint }]}>{s.label}</Text>
          </GlassSurface>
        ))}
      </View>

      <Text style={[styles.sectionLabel, { color: colors.textFaint }]}>{t('profile.myPacks')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.packsRow}>
        {ownedPacks.map((p) => (
          <View key={p.id} style={styles.packItem}>
            <PackCover cover={p.cover} icon={p.icon} size={56} />
            <Text numberOfLines={1} style={[styles.packTitle, { color: colors.textMuted }]}>
              {p.title[locale] ?? p.title.en ?? ''}
            </Text>
          </View>
        ))}
      </ScrollView>

      <Text style={[styles.sectionLabel, { color: colors.textFaint }]}>{t('profile.settings')}</Text>
      <GlassSurface radius={24}>
        <View style={[styles.settingRow, styles.divider, { borderBottomColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(26,28,28,0.06)' }]}>
          <View style={styles.settingLabel}>
            <MaterialIcon name="language" size={19} color={colors.primary} />
            <Text style={[styles.settingText, { color: colors.text }]}>{t('profile.language')}</Text>
          </View>
          <LanguageSwitcher />
        </View>
        <View style={[styles.settingRow, styles.divider, { borderBottomColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(26,28,28,0.06)' }]}>
          <View style={styles.settingLabel}>
            <MaterialIcon name="dark_mode" size={19} color={colors.primary} />
            <Text style={[styles.settingText, { color: colors.text }]}>{t('profile.darkMode')}</Text>
          </View>
          <Pressable onPress={toggleDark} style={[styles.track, { backgroundColor: dark ? colors.primary : 'rgba(26,28,28,0.15)' }]}>
            <View style={[styles.knob, { transform: [{ translateX: dark ? 20 : 0 }] }]} />
          </Pressable>
        </View>
        <Pressable style={styles.settingRow} onPress={() => router.push('/lab' as any)}>
          <View style={styles.settingLabel}>
            <MaterialIcon name="science" size={19} color={colors.primary} />
            <Text style={[styles.settingText, { color: colors.text }]}>Logo Lab</Text>
          </View>
          <MaterialIcon name="arrow_forward" size={18} color={colors.textFaint} />
        </Pressable>
      </GlassSurface>

      <View style={styles.footer}>
        <Pressable onPress={doRestore} hitSlop={6}>
          <Text style={[styles.restore, { color: colors.secondary }]}>{t('store.restore')}</Text>
        </Pressable>
        <View style={styles.footRow}>
          <MaterialIcon name="shield" size={13} color={colors.textFaint} />
          <Text style={[styles.privacy, { color: colors.textFaint }]}>{t('profile.privacy')}</Text>
        </View>
        <View style={styles.footRow}>
          <MaterialIcon name="info" size={13} color={colors.textFaint} />
          <Text style={[styles.disclaimer, { color: colors.textFaint }]}>{t('disclaimer')}</Text>
        </View>
      </View>
      <Toast message={toast} />
      <NamePrompt visible={editing} onClose={() => setEditing(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { alignItems: 'center', marginTop: 4, marginBottom: 14 },
  name: { fontFamily: fonts.extrabold, fontSize: 20, letterSpacing: -0.3, marginTop: 8 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  sub: { fontFamily: fonts.medium, fontSize: 11 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  statFlex: { flex: 1 },
  statTile: { alignItems: 'center', gap: 4, paddingVertical: 12 },
  statValue: { fontFamily: fonts.extrabold, fontSize: 18, letterSpacing: -0.3 },
  statLabel: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' },
  sectionLabel: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 2.2, textTransform: 'uppercase', marginTop: 14, marginBottom: 8 },
  packsRow: { gap: 10, paddingVertical: 2 },
  packItem: { width: 68, alignItems: 'center', gap: 6 },
  packTitle: { fontFamily: fonts.bold, fontSize: 9, textAlign: 'center', width: '100%' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 11 },
  divider: { borderBottomWidth: 1 },
  settingLabel: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingText: { fontFamily: fonts.bold, fontSize: 13 },
  track: { width: 48, height: 28, borderRadius: 9999, padding: 2, justifyContent: 'center' },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#ffffff' },
  footer: { alignItems: 'center', gap: 6, marginTop: 16 },
  restore: { fontFamily: fonts.bold, fontSize: 12 },
  footRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 6, maxWidth: 300 },
  privacy: { fontFamily: fonts.medium, fontSize: 10, flexShrink: 1 },
  disclaimer: { fontFamily: fonts.regular, fontSize: 9, lineHeight: 14, flexShrink: 1 },
});
