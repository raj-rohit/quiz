import React, { useState } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/src/theme/ThemeProvider';
import { fonts } from '@/src/theme/tokens';

/** Text-only secondary action, e.g. "I don't know" (uppercase, wide tracking). */
export function GhostButton({ label, onPress }: { label: string; onPress?: () => void }) {
  const { colors } = useTheme();
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      hitSlop={8}
      style={styles.hit}
    >
      <Text style={[styles.label, { color: pressed ? colors.secondary : colors.textFaint }]}>
        {label.toUpperCase()}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { paddingVertical: 8, alignItems: 'center' },
  label: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 2.6,
  },
});
