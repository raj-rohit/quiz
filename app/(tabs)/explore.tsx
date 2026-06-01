import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/src/components/app/Screen';
import { useTheme } from '@/src/theme/ThemeProvider';
import { fonts } from '@/src/theme/tokens';

// Placeholder Store — the full Explore screen is built in Phase 3.
export default function ExploreScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Screen center>
      <Text style={[styles.title, { color: colors.text }]}>{t('store.title')}</Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>{t('store.kicker')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.extrabold, fontSize: 26, textAlign: 'center' },
  sub: { fontFamily: fonts.medium, fontSize: 14, marginTop: 8, textTransform: 'uppercase', letterSpacing: 2 },
});
