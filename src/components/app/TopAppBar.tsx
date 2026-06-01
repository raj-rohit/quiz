import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/theme/ThemeProvider';
import { ACTIVE_BUILD } from '@/src/theme/builds';
import { fonts } from '@/src/theme/tokens';
import { FlagChip } from './FlagChip';
import { Avatar } from './Avatar';
import { LanguageSwitcher } from './LanguageSwitcher';

/** Content height below the status-bar inset. */
export const TOP_BAR_CONTENT = 56;

export function TopAppBar() {
  const insets = useSafeAreaInsets();
  const { colors, dark } = useTheme();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 6, height: insets.top + TOP_BAR_CONTENT }]} pointerEvents="box-none">
      <View style={styles.side}>
        <Text style={[styles.wordmark, { color: colors.text }]}>LOCAL LOGO</Text>
        <FlagChip code={ACTIVE_BUILD} dark={dark} />
      </View>
      <View style={styles.side}>
        <LanguageSwitcher />
        <Avatar />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  side: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wordmark: { fontFamily: fonts.extrabold, fontSize: 18, letterSpacing: -0.4 },
});
