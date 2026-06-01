import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/src/theme/ThemeProvider';
import { radii, fonts } from '@/src/theme/tokens';
import { MaterialIcon, IconName } from './MaterialIcon';

interface Props {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  iconRight?: IconName | null;
  style?: StyleProp<ViewStyle>;
}

/** ".btn-origin": 135° accent→accent-deep gradient pill, uppercase white label. */
export function PrimaryButton({ label, onPress, disabled, iconRight = 'arrow_forward', style }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          borderRadius: radii.pill,
          opacity: disabled ? 0.5 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
          shadowColor: colors.primary,
          shadowOpacity: 0.3,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 8 },
          elevation: 6,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={[colors.primary, colors.primaryDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.grad}
      >
        <Text style={styles.label}>{label.toUpperCase()}</Text>
        {iconRight && <MaterialIcon name={iconRight} size={20} color="#ffffff" />}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grad: {
    minHeight: 56,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  label: {
    color: '#ffffff',
    fontFamily: fonts.extrabold,
    fontSize: 16,
    letterSpacing: 1.3,
  },
});
