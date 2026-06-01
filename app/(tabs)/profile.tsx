import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/src/components/app/Screen';
import { useTheme } from '@/src/theme/ThemeProvider';
import { fonts } from '@/src/theme/tokens';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';

// Placeholder Profile — the full screen is built in Phase 4.
// Exposes the dark-mode toggle so theming + persistence can be verified at Checkpoint 1.
export default function ProfileScreen() {
  const { t } = useTranslation();
  const { colors, dark, toggleDark } = useTheme();
  return (
    <Screen center>
      <Text style={[styles.title, { color: colors.text }]}>{t('nav.profile')}</Text>
      <View style={{ height: 16 }} />
      <PrimaryButton label={dark ? 'Light mode' : 'Dark mode'} iconRight={null} onPress={toggleDark} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.extrabold, fontSize: 26, textAlign: 'center' },
});
