import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts, radii, rgb } from '@/src/theme/tokens';

const GREEN = '34 197 94'; // grace window: full points still attainable
const AMBER = '245 158 11'; // decaying: score is ticking down

/** Live "answer now for N pts" pill overlaid on the quiz logo stage. */
export function PointsChip({ pts, suffix, decaying }: { pts: number; suffix: string; decaying: boolean }) {
  const triplet = decaying ? AMBER : GREEN;
  return (
    <View style={[styles.chip, { borderColor: rgb(triplet, 0.35) }]}>
      <Text style={[styles.label, { color: rgb(triplet) }]}>{`${pts} ${suffix}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    backgroundColor: 'rgba(10,10,10,0.55)',
  },
  label: { fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 0.5 },
});
