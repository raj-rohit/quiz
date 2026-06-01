import React, { useRef, useState } from 'react';
import { View, TextInput, Keyboard, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassSurface } from '@/src/components/ui/GlassSurface';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { GhostButton } from '@/src/components/ui/GhostButton';
import { LogoStage } from './LogoStage';
import { GuessInput } from './GuessInput';
import { RevealCard } from './RevealCard';
import { useQuiz } from '@/src/hooks/useQuiz';
import { computeScore, normalizeAnswer } from '@/src/features/quiz/score';
import { radii } from '@/src/theme/tokens';

type State = 'idle' | 'wrong' | 'revealed';

export interface QuizCardProps {
  imageUrl?: string | null;
  answer: string;
  founded?: string;
  dominantColor?: string | null;
  onComplete: (result: { correct: boolean; timeSec: number }) => void;
}

/** The glass quiz card. Fixed min-height + centered content prevents layout shift
 *  between guess and reveal states (REQUIRED). Keyed by question by the screen. */
export function QuizCard({ imageUrl, answer, founded, dominantColor, onComplete }: QuizCardProps) {
  const { t } = useTranslation();
  const { submitGuess } = useQuiz(answer);
  const [guess, setGuess] = useState('');
  const [state, setState] = useState<State>('idle');
  const [scorePct, setScorePct] = useState(0);
  const [timeSec, setTimeSec] = useState(0);
  const [revealedBy, setRevealedBy] = useState<'guess' | 'give-up'>('guess');
  const startedAt = useRef(Date.now());
  const inputRef = useRef<TextInput | null>(null);

  const submit = () => {
    if (state !== 'idle' || !guess.trim()) return;
    Keyboard.dismiss();
    const elapsed = Math.round((Date.now() - startedAt.current) / 1000);
    const correct = submitGuess(guess).success || normalizeAnswer(guess) === normalizeAnswer(answer);
    if (correct) {
      setTimeSec(elapsed);
      setScorePct(computeScore(elapsed));
      setRevealedBy('guess');
      setState('revealed');
    } else {
      setState('wrong');
      setTimeout(() => {
        setState('idle');
        setGuess('');
        inputRef.current?.focus();
      }, 600);
    }
  };

  const giveUp = () => {
    if (state !== 'idle') return;
    Keyboard.dismiss();
    const elapsed = Math.round((Date.now() - startedAt.current) / 1000);
    setTimeSec(elapsed);
    setScorePct(0);
    setRevealedBy('give-up');
    setState('revealed');
  };

  return (
    <GlassSurface radius={radii.card} contentStyle={styles.content}>
      {state === 'revealed' ? (
        <RevealCard
          imageUrl={imageUrl}
          brandName={answer}
          founded={founded}
          scorePct={scorePct}
          timeSec={timeSec}
          celebrate={revealedBy === 'guess'}
          onNext={() => onComplete({ correct: revealedBy === 'guess', timeSec })}
        />
      ) : (
        <View>
          <LogoStage imageUrl={imageUrl} dominantColor={dominantColor} />
          <View style={styles.controls}>
            <GuessInput
              value={guess}
              onChangeText={setGuess}
              onSubmit={submit}
              state={state === 'wrong' ? 'wrong' : 'idle'}
              placeholder={t('quiz.placeholder')}
              inputRef={inputRef}
            />
            <View style={styles.buttons}>
              <PrimaryButton label={t('quiz.check')} onPress={submit} disabled={!guess.trim()} iconRight={null} />
              <GhostButton label={t('quiz.giveUp')} onPress={giveUp} />
            </View>
          </View>
        </View>
      )}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, minHeight: 432, justifyContent: 'center' },
  controls: { marginTop: 20, gap: 16 },
  buttons: { gap: 8 },
});
