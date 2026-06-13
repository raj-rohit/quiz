import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/theme/ThemeProvider';
import { ACTIVE_BUILD } from '@/src/theme/builds';
import { fonts } from '@/src/theme/tokens';
import { usePlayer } from '@/src/state/PlayerContext';
import { initials } from '@/src/features/profile/initials';
import { FlagChip } from './FlagChip';
import { Avatar } from './Avatar';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NamePrompt } from './NamePrompt';

/** Content height below the status-bar inset. */
export const TOP_BAR_CONTENT = 56;

export function TopAppBar() {
  const insets = useSafeAreaInsets();
  const { colors, dark } = useTheme();
  const { name } = usePlayer();
  const [editing, setEditing] = useState(false);
  const barHeight = insets.top + TOP_BAR_CONTENT;

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 6, height: barHeight }]} pointerEvents="box-none">
      {/* Scrim: hides content scrolling beneath the floating bar, fading out at the bottom edge. */}
      <LinearGradient
        colors={[colors.bg, colors.bg, `${colors.bg}00`]}
        locations={[0, 0.82, 1]}
        style={[styles.scrim, { height: barHeight + 24 }]}
        pointerEvents="none"
      />
      <View style={styles.side}>
        <Text style={[styles.wordmark, { color: colors.text }]}>LOCAL LOGO</Text>
        <FlagChip code={ACTIVE_BUILD} dark={dark} />
      </View>
      <View style={styles.side}>
        <LanguageSwitcher />
        <Pressable onPress={() => setEditing(true)} hitSlop={6}>
          <Avatar initials={initials(name)} />
        </Pressable>
      </View>
      <NamePrompt visible={editing} onClose={() => setEditing(false)} />
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
  scrim: { position: 'absolute', top: 0, left: 0, right: 0 },
  side: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wordmark: { fontFamily: fonts.extrabold, fontSize: 18, letterSpacing: -0.4 },
});
