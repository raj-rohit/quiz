import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { radii } from '@/src/theme/tokens';

/**
 * 16:10 logo area. The real brand logo (Supabase) sits on its own dominant-color
 * tile and is contained full-bleed — no black box (per the client's feedback).
 */
export function LogoStage({
  imageUrl,
  dominantColor,
}: {
  imageUrl?: string | null;
  dominantColor?: string | null;
}) {
  return (
    <View style={[styles.stage, { backgroundColor: dominantColor ?? 'transparent' }]}>
      {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.img} resizeMode="contain" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: radii.stage,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  img: { width: '100%', height: '100%' },
});
