import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import ImageColors from 'react-native-image-colors';
import { Screen } from '@/src/components/app/Screen';
import { SectionHeader } from '@/src/components/quiz/SectionHeader';
import { QuizCard } from '@/src/components/quiz/QuizCard';
import { ProgressStrip } from '@/src/components/quiz/ProgressStrip';
import { supabase } from '@/src/lib/supabase';
import { loadJSON, saveJSON, KEYS } from '@/src/lib/storage';
import { useProgress } from '@/src/state/ProgressContext';
import { useTheme } from '@/src/theme/ThemeProvider';
import { ACTIVE_BUILD, BUILDS } from '@/src/theme/builds';
import { logoUrl } from '@/src/features/quiz/logo';

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
    // Instant: render the last cached deck so the quiz appears immediately.
    loadJSON<Brand[]>(KEYS.deck, []).then((cached) => {
      if (active && cached.length) {
        setDeck(cached);
        setLoading(false);
      }
    });
    // Background: refresh from Supabase and update the cache.
    (async () => {
      const { data } = await supabase.from('quiz_brands').select('*').eq('is_active', true);
      if (!active) return;
      if (data && data.length) {
        setDeck(data as Brand[]);
        saveJSON(KEYS.deck, data);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const current = deck[qIndex];
  const imageUrl = current ? logoUrl(current.image_url) : undefined;

  useEffect(() => {
    if (!imageUrl) {
      setDominant(null);
      return;
    }
    setDominant(null);
    ImageColors.getColors(imageUrl, { fallback: current?.brand_color ?? '#262626', cache: true, key: imageUrl })
      .then((c) => {
        const color =
          c.platform === 'android' ? c.dominant ?? c.vibrant ?? c.muted :
          c.platform === 'ios' ? c.background :
          c.platform === 'web' ? c.dominant :
          null;
        if (color) setDominant(color);
      })
      .catch(() => {});
  }, [imageUrl, current?.brand_color]);

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
        imageUrl={imageUrl}
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
