import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/src/components/app/Screen';
import { useTheme } from '@/src/theme/ThemeProvider';
import { fonts } from '@/src/theme/tokens';

// Placeholder Arena — the full quiz is built in Phase 2.
export default function ArenaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Screen center>
      <Text style={[styles.title, { color: colors.primary }]}>{t('deck.nl')}</Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>Arena</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.extrabold, fontSize: 30, textAlign: 'center' },
  sub: { fontFamily: fonts.medium, fontSize: 14, marginTop: 8 },
});
