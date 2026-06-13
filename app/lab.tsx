import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MeshBackground } from '@/src/components/ui/MeshBackground';
import { GlassSurface } from '@/src/components/ui/GlassSurface';
import { MaterialIcon } from '@/src/components/ui/MaterialIcon';
import { RevealStage } from '@/src/components/quiz/RevealStage';
import { useTheme } from '@/src/theme/ThemeProvider';
import { fonts, radii } from '@/src/theme/tokens';
import { REVEAL_MODES, RevealModeId } from '@/src/features/quiz/reveal';
import { logoUrl } from '@/src/features/quiz/logo';
import { loadJSON, KEYS } from '@/src/lib/storage';
import { supabase } from '@/src/lib/supabase';

interface LabBrand {
  id: string;
  brand_name: string;
  image_url: string;
  brand_color?: string | null;
}

// Fallback sample logos so the lab is never empty (e.g. fresh install, offline).
const FALLBACK: LabBrand[] = [
  { id: 'fb-spotify', brand_name: 'Spotify', image_url: 'https://unavatar.io/spotify.com', brand_color: '#1DB954' },
  { id: 'fb-airbnb', brand_name: 'Airbnb', image_url: 'https://unavatar.io/airbnb.com', brand_color: '#FF5A5F' },
  { id: 'fb-slack', brand_name: 'Slack', image_url: 'https://unavatar.io/slack.com', brand_color: '#611f69' },
  { id: 'fb-figma', brand_name: 'Figma', image_url: 'https://unavatar.io/figma.com', brand_color: '#0ACF83' },
];

export default function LogoLabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, dark } = useTheme();
  const [mode, setMode] = useState<RevealModeId>('blur');
  const [brands, setBrands] = useState<LabBrand[]>([]);

  // Brand source: cached quiz deck first (instant, offline), then Supabase.
  useEffect(() => {
    let active = true;
    loadJSON<LabBrand[]>(KEYS.deck, []).then((cached) => {
      if (active && cached.length) setBrands(cached.slice(0, 6));
    });
    (async () => {
      try {
        const { data } = await supabase
          .from('quiz_brands')
          .select('id, brand_name, image_url, brand_color')
          .eq('is_active', true)
          .limit(6);
        if (active && data && data.length) setBrands(data as LabBrand[]);
      } catch {
        /* keep cache / fallback */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const list = brands.length ? brands : FALLBACK;
  const active = REVEAL_MODES.find((m) => m.id === mode)!;

  return (
    <View style={styles.fill}>
      <MeshBackground />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
            <MaterialIcon name="arrow_back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.h1, { color: colors.text }]}>Logo reveal modes</Text>
        </View>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          Pick one of the 10 obfuscation modes to preview it on real brands. Save the chosen mode per brand in Supabase
          as <Text style={{ color: colors.primary }}>obfuscation_type</Text>; the quiz obscures the logo with it and
          reveals the full answer on a correct guess.
        </Text>

        {/* Mode picker */}
        <GlassSurface radius={radii.cardSm} contentStyle={styles.controls}>
          <Text style={[styles.ctlLabel, { color: colors.textFaint }]}>Mode</Text>
          <View style={styles.seg}>
            {REVEAL_MODES.map((m) => {
              const on = mode === m.id;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => setMode(m.id)}
                  style={[
                    styles.segBtn,
                    { borderColor: dark ? 'rgba(255,255,255,0.14)' : 'rgba(26,28,28,0.14)' },
                    on && { backgroundColor: colors.primary, borderColor: 'transparent' },
                  ]}
                >
                  <Text style={[styles.segText, { color: on ? '#fff' : colors.textMuted }]}>{m.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.snippet, { color: colors.textMuted }]}>
            obfuscation_type = <Text style={{ color: colors.primary, fontFamily: fonts.bold }}>"{mode}"</Text>
          </Text>
        </GlassSurface>

        {/* Brand grid */}
        <View style={styles.grid}>
          {list.map((b) => (
            <GlassSurface key={b.id} radius={radii.cardSm} style={styles.card} contentStyle={styles.cardInner}>
              <RevealStage imageUrl={logoUrl(b.image_url)} mode={mode} dominantColor={b.brand_color} radius={14} />
              <Text numberOfLines={1} style={[styles.brandName, { color: colors.textMuted }]}>
                {b.brand_name}
              </Text>
            </GlassSurface>
          ))}
        </View>

        {/* Selected-mode blurb */}
        <GlassSurface radius={16} contentStyle={styles.li} style={{ marginTop: 18 }}>
          <Text style={[styles.liTitle, { color: colors.text }]}>{active.label}</Text>
          <Text style={[styles.liBody, { color: colors.textMuted }]}>{active.blurb}</Text>
        </GlassSurface>

        {/* Legend */}
        <Text style={[styles.ctlLabel, { color: colors.textFaint, marginTop: 26, marginBottom: 8 }]}>All engines</Text>
        <View style={styles.legend}>
          {REVEAL_MODES.map((m) => (
            <Pressable key={m.id} onPress={() => setMode(m.id)}>
              <GlassSurface radius={16} contentStyle={styles.li}>
                <Text style={[styles.liTitle, { color: mode === m.id ? colors.primary : colors.text }]}>{m.label}</Text>
                <Text style={[styles.liBody, { color: colors.textMuted }]}>{m.blurb}</Text>
              </GlassSurface>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  h1: { fontFamily: fonts.extrabold, fontSize: 26, letterSpacing: -0.6 },
  sub: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, marginBottom: 18 },

  controls: { padding: 16 },
  ctlLabel: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 },
  seg: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  segBtn: { borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 7 },
  segText: { fontFamily: fonts.bold, fontSize: 12 },
  snippet: { fontFamily: fonts.medium, fontSize: 12, marginTop: 14 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 18 },
  card: { width: '48%' },
  cardInner: { padding: 10 },
  brandName: { fontFamily: fonts.bold, fontSize: 13, marginTop: 10, textAlign: 'center' },

  legend: { gap: 10 },
  li: { paddingHorizontal: 16, paddingVertical: 14 },
  liTitle: { fontFamily: fonts.extrabold, fontSize: 14, marginBottom: 4 },
  liBody: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 18 },
});
