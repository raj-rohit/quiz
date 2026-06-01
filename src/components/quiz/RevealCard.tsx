import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/theme/ThemeProvider';
import { fonts, motion, radii, rgb } from '@/src/theme/tokens';
import { Chip } from '@/src/components/ui/Chip';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';

const FADE_EASING = Easing.bezier(motion.fadeup.easing[0], motion.fadeup.easing[1], motion.fadeup.easing[2], motion.fadeup.easing[3]);
const POP_EASING = Easing.bezier(motion.pop.easing[0], motion.pop.easing[1], motion.pop.easing[2], motion.pop.easing[3]);

/** Staggered enter (translateY 8 + opacity) on mount. */
function FadeUp({ delay, children, style }: { delay: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const opacity = useSharedValue(0);
  const ty = useSharedValue(motion.fadeup.translateY);
  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: motion.fadeup.duration, easing: FADE_EASING }));
    ty.value = withDelay(delay, withTiming(0, { duration: motion.fadeup.duration, easing: FADE_EASING }));
  }, [delay, opacity, ty]);
  const s = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: ty.value }] }));
  return <Animated.View style={[s, style]}>{children}</Animated.View>;
}

interface Props {
  imageUrl?: string | null;
  brandName: string;
  founded?: string;
  scorePct: number;
  timeSec: number;
  celebrate: boolean;
  onNext: () => void;
}

export function RevealCard({ imageUrl, brandName, founded, scorePct, timeSec, celebrate, onNext }: Props) {
  const { t } = useTranslation();
  const { colors, accent } = useTheme();

  const scale = useSharedValue(celebrate ? 0.4 : 1);
  const opacity = useSharedValue(0);
  const ringScale = useSharedValue(0.5);
  const ringOpacity = useSharedValue(celebrate ? 0.7 : 0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: celebrate ? 200 : motion.fadeup.duration });
    if (celebrate) {
      scale.value = withSequence(
        withTiming(1.12, { duration: 330, easing: POP_EASING }),
        withTiming(1, { duration: 220, easing: POP_EASING })
      );
      ringScale.value = withTiming(2.5, { duration: motion.ring.duration, easing: Easing.out(Easing.ease) });
      ringOpacity.value = withTiming(0, { duration: motion.ring.duration });
    }
  }, [celebrate, opacity, scale, ringScale, ringOpacity]);

  const tileStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: ringOpacity.value, transform: [{ scale: ringScale.value }] }));

  return (
    <View style={styles.wrap}>
      <View style={styles.tileWrap}>
        {celebrate && (
          <Animated.View
            pointerEvents="none"
            style={[styles.ring, ringStyle, { backgroundColor: rgb(accent.rgb, 0.45) }]}
          />
        )}
        <Animated.View style={[styles.tile, tileStyle]}>
          {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.logo} resizeMode="contain" /> : null}
        </Animated.View>
      </View>

      <FadeUp delay={motion.stagger[0]}>
        <Text style={[styles.brand, { color: colors.text }]}>{brandName}</Text>
      </FadeUp>
      {!!founded && (
        <FadeUp delay={motion.stagger[1]}>
          <Text style={[styles.founded, { color: colors.textMuted }]}>{founded}</Text>
        </FadeUp>
      )}

      <View style={styles.chips}>
        <FadeUp delay={motion.stagger[2]}>
          <Chip tone="primary" icon="stars" glow label={`${t('quiz.score')} ${scorePct}%`} />
        </FadeUp>
        <FadeUp delay={motion.stagger[3]}>
          <Chip tone="secondary" icon="schedule" glow label={`${timeSec}s`} />
        </FadeUp>
      </View>

      <FadeUp delay={motion.stagger[4]} style={styles.nextWrap}>
        <PrimaryButton label={t('quiz.next')} onPress={onNext} iconRight="arrow_forward" />
      </FadeUp>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  tileWrap: { width: 96, height: 96, marginBottom: 20, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 96, height: 96, borderRadius: 48 },
  tile: {
    width: 96,
    height: 96,
    borderRadius: radii.tile,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#0cb6fd',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  logo: { width: 68, height: 68 },
  brand: { fontFamily: fonts.extrabold, fontSize: 30, letterSpacing: -0.5, textAlign: 'center', marginBottom: 4 },
  founded: { fontFamily: fonts.medium, fontSize: 13, textAlign: 'center', marginBottom: 20 },
  chips: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  nextWrap: { width: '100%' },
});
