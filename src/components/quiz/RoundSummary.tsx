import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassSurface } from '@/src/components/ui/GlassSurface';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { GhostButton } from '@/src/components/ui/GhostButton';
import { Chip } from '@/src/components/ui/Chip';
import { useTheme } from '@/src/theme/ThemeProvider';
import { fonts, radii } from '@/src/theme/tokens';

interface Props {
  correct: number;
  total: number;
  scorePct: number;
  onExit: () => void;
  onPlayAgain: () => void;
}

/** End-of-round card shown in place of the quiz card: final score + exit/replay.
 *  Mirrors QuizCard's glass sizing so the swap causes no layout shift. */
export function RoundSummary({ correct, total, scorePct, onExit, onPlayAgain }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <GlassSurface radius={radii.card} contentStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>{t('quiz.roundComplete')}</Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>
        {t('quiz.roundCorrect', { correct, total })}
      </Text>
      <View style={styles.chips}>
        <Chip tone="primary" icon="stars" glow label={`${t('quiz.score')} ${scorePct}%`} />
      </View>
      <View style={styles.buttons}>
        <PrimaryButton label={t('quiz.backToExplore')} onPress={onExit} />
        <GhostButton label={t('quiz.playAgain')} onPress={onPlayAgain} />
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, minHeight: 432, justifyContent: 'center', alignItems: 'center' },
  title: { fontFamily: fonts.extrabold, fontSize: 30, letterSpacing: -0.5, textAlign: 'center', marginBottom: 4 },
  sub: { fontFamily: fonts.medium, fontSize: 13, textAlign: 'center', marginBottom: 20 },
  chips: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  buttons: { width: '100%', gap: 8 },
});
