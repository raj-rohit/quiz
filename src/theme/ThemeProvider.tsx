import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { palette, rgb } from './tokens';
import { ACTIVE_BUILD, resolveAccent } from './builds';
import { loadJSON, saveJSON, KEYS } from '@/src/lib/storage';

type Override = 'light' | 'dark' | null;

export interface ThemeColors {
  bg: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  primaryDeep: string;
  primaryGlow: string;
  secondary: string;
  border: string;
}

export interface ThemeValue {
  dark: boolean;
  toggleDark: () => void;
  accent: { rgb: string; deep: string; glow: string };
  colors: ThemeColors;
  glass: { backgroundColor: string; borderColor: string; blurTint: 'light' | 'dark'; blurIntensity: number };
}

const Ctx = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [override, setOverride] = useState<Override>(null);

  useEffect(() => {
    loadJSON<Override>(KEYS.dark, null).then(setOverride);
  }, []);

  const dark = (override ?? system ?? 'light') === 'dark';
  const accent = resolveAccent(ACTIVE_BUILD).accent;

  const toggleDark = () => {
    const next: Override = dark ? 'light' : 'dark';
    setOverride(next);
    saveJSON(KEYS.dark, next);
  };

  const value = useMemo<ThemeValue>(
    () => ({
      dark,
      toggleDark,
      accent,
      colors: {
        bg: dark ? palette.night : palette.cream,
        text: dark ? '#ffffff' : palette.ink,
        textMuted: dark ? 'rgba(255,255,255,0.55)' : 'rgba(26,28,28,0.55)',
        textFaint: dark ? 'rgba(255,255,255,0.4)' : 'rgba(26,28,28,0.4)',
        primary: rgb(accent.rgb),
        primaryDeep: rgb(accent.deep),
        primaryGlow: rgb(accent.glow),
        secondary: palette.secondary,
        border: dark ? rgb(accent.glow, 0.22) : rgb(accent.rgb, 0.3),
      },
      glass: dark
        ? { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: rgb(accent.glow, 0.22), blurTint: 'dark', blurIntensity: 28 }
        : { backgroundColor: 'rgba(255,255,255,0.7)', borderColor: rgb(accent.rgb, 0.3), blurTint: 'light', blurIntensity: 20 },
    }),
    [dark, accent.rgb, accent.deep, accent.glow]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = (): ThemeValue => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTheme must be used within ThemeProvider');
  return v;
};
