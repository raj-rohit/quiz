import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Keyboard, Platform, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Screen } from '@/src/components/app/Screen';
import { SectionHeader } from '@/src/components/quiz/SectionHeader';
import { QuizCard } from '@/src/components/quiz/QuizCard';
import { RoundSummary } from '@/src/components/quiz/RoundSummary';
import { ProgressStrip } from '@/src/components/quiz/ProgressStrip';
import { MaterialIcon } from '@/src/components/ui/MaterialIcon';
import { supabase } from '@/src/lib/supabase';
import { loadJSON, saveJSON, KEYS } from '@/src/lib/storage';
import { useProgress } from '@/src/state/ProgressContext';
import { useSettings } from '@/src/state/SettingsContext';
import { useTheme } from '@/src/theme/ThemeProvider';
import { logoUrl } from '@/src/features/quiz/logo';
import { filterDeckByPack } from '@/src/features/quiz/deck';
import { isLastQuestion, summarizeRound, RoundResult } from '@/src/features/quiz/round';
import { Pack } from '@/src/features/catalog/types';

const imageColorsAvailable = requireOptionalNativeModule('ImageColors') != null;

export interface Brand {
  id: string;
  brand_name: string;
  image_url: string;
  description: any;
  brand_color?: string | null;
  pack_id?: string | null;
  obfuscation_type?: string | null;
  start_reveal?: number | string | null;
}

interface Props {
  pack: Pack;
  onExit: () => void;
}

/** A quiz round scoped to a single pack. */
export function PackRound({ pack, onExit }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { locale } = useSettings();
  const { record } = useProgress();
  const [deck, setDeck] = useState<Brand[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dominant, setDominant] = useState<string | null>(null);
  const [kbHeight, setKbHeight] = useState(0);

  const cacheKey = `${KEYS.deck}.${pack.id}`;

  // Remember this pack as the last-played one.
  useEffect(() => {
    saveJSON(KEYS.lastPack, pack.id);
  }, [pack.id]);

  // Fresh round whenever the pack changes (parent may reuse this instance).
  useEffect(() => {
    setResults([]);
    setQIndex(0);
    setFinished(false);
  }, [pack.id]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => setKbHeight(e.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    // Instant: last cached deck for THIS pack.
    loadJSON<Brand[]>(cacheKey, []).then((cached) => {
      if (active && cached.length) {
        setDeck(cached);
        setLoading(false);
      }
    });
    // Background: refresh this pack's brands from Supabase.
    (async () => {
      const { data } = await supabase
        .from('quiz_brands')
        .select('*')
        .eq('is_active', true)
        .eq('pack_id', pack.id);
      if (!active) return;
      if (data && data.length) {
        const scoped = filterDeckByPack(data as Brand[], pack.id);
        setDeck(scoped);
        saveJSON(cacheKey, scoped);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [pack.id, cacheKey]);

  const current = deck[qIndex];
  const imageUrl = current ? logoUrl(current.image_url) : undefined;

  const resolvedDescription = (() => {
    if (!current) return undefined;
    const desc = current.description;
    if (!desc) return undefined;
    if (typeof desc === 'object') {
      return (desc as any)[locale] || (desc as any)['en'] || (desc as any)[Object.keys(desc)[0]] || '';
    }
    try {
      const parsed = JSON.parse(desc);
      if (parsed && typeof parsed === 'object') {
        return parsed[locale] || parsed['en'] || parsed[Object.keys(parsed)[0]] || '';
      }
    } catch (e) {
      // treat as plain string
    }
    return desc;
  })();

  useEffect(() => {
    if (!imageUrl || !imageColorsAvailable) {
      setDominant(null);
      return;
    }
    setDominant(null);
    let cancelled = false;
    (async () => {
      try {
        const ImageColors = require('react-native-image-colors').default;
        const c = await ImageColors.getColors(imageUrl, { fallback: current?.brand_color ?? '#262626', cache: true, key: imageUrl });
        if (cancelled) return;
        const color =
          c.platform === 'android' ? c.dominant ?? c.vibrant ?? c.muted :
          c.platform === 'ios' ? c.background :
          c.platform === 'web' ? c.dominant :
          null;
        if (color) setDominant(color);
      } catch {
        // native module unavailable → keep brand-color fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [imageUrl, current?.brand_color]);

  const packTitle = pack.title[locale] ?? pack.title.en ?? '';

  const onComplete = ({ correct, timeSec }: { correct: boolean; timeSec: number }) => {
    record({ packId: pack.id, correct, timeSec });
    setResults((r) => [...r, { correct, timeSec }]);
    if (isLastQuestion(qIndex, deck.length)) {
      setFinished(true);
    } else {
      setQIndex((i) => i + 1);
    }
  };

  const resetRound = () => {
    setResults([]);
    setQIndex(0);
    setFinished(false);
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
        <SectionHeader title={packTitle} />
        <Pressable onPress={onExit} style={styles.backLink} hitSlop={8}>
          <MaterialIcon name="arrow_back" size={18} color={colors.textMuted} />
        </Pressable>
      </Screen>
    );
  }

  return (
    <Screen scroll contentStyle={{ flexGrow: 1 }}>
      <Pressable onPress={onExit} style={styles.back} hitSlop={8}>
        <MaterialIcon name="arrow_back" size={22} color={colors.textMuted} />
      </Pressable>
      <View style={{ flexGrow: 1, justifyContent: 'center', paddingTop: 20, paddingBottom: 20 + kbHeight }}>
        {finished ? (
          <RoundSummary
            {...summarizeRound(results)}
            onExit={() => {
              resetRound();
              onExit();
            }}
            onPlayAgain={resetRound}
          />
        ) : (
          <QuizCard
            key={current.id}
            imageUrl={imageUrl}
            answer={current.brand_name}
            founded={resolvedDescription}
            dominantColor={dominant ?? current.brand_color}
            obfuscationType={current.obfuscation_type}
            startReveal={current.start_reveal}
            onComplete={onComplete}
          />
        )}
      </View>
      <ProgressStrip
        current={finished ? deck.length : qIndex + 1}
        total={deck.length}
        label={t('quiz.progress')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start', padding: 4, marginBottom: -8 },
  backLink: { marginTop: 16 },
});
