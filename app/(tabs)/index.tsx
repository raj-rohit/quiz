import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import ImageColors from 'react-native-image-colors';
import { Screen } from '@/src/components/app/Screen';
import { SectionHeader } from '@/src/components/quiz/SectionHeader';
import { QuizCard } from '@/src/components/quiz/QuizCard';
import { ProgressStrip } from '@/src/components/quiz/ProgressStrip';
import { supabase } from '@/src/lib/supabase';
import { useProgress } from '@/src/state/ProgressContext';
import { useTheme } from '@/src/theme/ThemeProvider';
import { ACTIVE_BUILD, BUILDS } from '@/src/theme/builds';

interface Brand {
  id: string;
  brand_name: string;
  image_url: string;
  description: string;
  brand_color?: string | null;
  pack_id?: string | null;
}

export default function ArenaScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { record } = useProgress();
  const [deck, setDeck] = useState<Brand[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dominant, setDominant] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.from('quiz_brands').select('*').eq('is_active', true);
      if (!active) return;
      if (data) setDeck(data as Brand[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const current = deck[qIndex];

  useEffect(() => {
    if (!current?.image_url) {
      setDominant(null);
      return;
    }
    setDominant(null);
    ImageColors.getColors(current.image_url, { fallback: current.brand_color ?? '#262626', cache: true, key: current.image_url })
      .then((c) => {
        const color =
          c.platform === 'android' ? c.dominant ?? c.vibrant ?? c.muted :
          c.platform === 'ios' ? c.background :
          c.platform === 'web' ? c.dominant :
          null;
        if (color) setDominant(color);
      })
      .catch(() => {});
  }, [current?.image_url, current?.brand_color]);

  const deckTitle = t(BUILDS[ACTIVE_BUILD].titleKey);

  const onComplete = ({ correct, timeSec }: { correct: boolean; timeSec: number }) => {
    record({ packId: current?.pack_id ?? 'classics', correct, timeSec });
    setQIndex((i) => (deck.length ? (i + 1) % deck.length : 0));
  };

  if (loading) {
    return (
      <Screen center>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (!current) {
    return (
      <Screen center>
        <SectionHeader title={deckTitle} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <SectionHeader title={deckTitle} />
      <View style={{ height: 24 }} />
      <QuizCard
        key={current.id}
        imageUrl={current.image_url}
        answer={current.brand_name}
        founded={current.description}
        dominantColor={dominant ?? current.brand_color}
        onComplete={onComplete}
      />
      <View style={{ height: 20 }} />
      <ProgressStrip current={qIndex + 1} total={deck.length} label={t('quiz.progress')} />
    </Screen>
  );
}
