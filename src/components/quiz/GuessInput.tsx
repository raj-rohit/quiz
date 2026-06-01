import React, { useEffect, useState } from 'react';
import { TextInput, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/src/theme/ThemeProvider';
import { fonts, palette } from '@/src/theme/tokens';

export type GuessState = 'idle' | 'wrong';

interface Props {
  value: string;
  onChangeText: (s: string) => void;
  onSubmit: () => void;
  state: GuessState;
  placeholder: string;
  inputRef?: React.RefObject<TextInput | null>;
}

/** Underline-only input; turns primary on focus, flashes red + shakes on a wrong guess. */
export function GuessInput({ value, onChangeText, onSubmit, state, placeholder, inputRef }: Props) {
  const { colors, dark } = useTheme();
  const [focused, setFocused] = useState(false);
  const tx = useSharedValue(0);
  const wrong = state === 'wrong';

  useEffect(() => {
    if (wrong) {
      tx.value = withSequence(
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(-6, { duration: 60 }),
        withTiming(6, { duration: 60 }),
        withTiming(0, { duration: 60 })
      );
    }
  }, [wrong, tx]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));

  const idleBorder = dark ? 'rgba(255,255,255,0.15)' : 'rgba(26,28,28,0.15)';
  const borderBottomColor = wrong ? palette.red : focused ? colors.primary : idleBorder;

  return (
    <Animated.View style={animStyle}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={dark ? 'rgba(255,255,255,0.3)' : 'rgba(26,28,28,0.3)'}
        autoCapitalize="words"
        autoCorrect={false}
        spellCheck={false}
        returnKeyType="done"
        style={[styles.input, { borderBottomColor, color: wrong ? palette.red : colors.text }]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  input: {
    width: '100%',
    backgroundColor: 'transparent',
    borderBottomWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 8,
    fontSize: 20,
    fontFamily: fonts.medium,
    textAlign: 'center',
  },
});
