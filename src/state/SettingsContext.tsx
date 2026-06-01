import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Localization from 'expo-localization';
import i18n from '@/src/i18n';
import { loadJSON, saveJSON, KEYS } from '@/src/lib/storage';
import { Lang, Locale, resolveLocale } from './locale';

export type { Lang, Locale } from './locale';

interface SettingsValue {
  lang: Lang;
  locale: Locale;
  setLang: (l: Lang) => void;
}

const Ctx = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const deviceTag = Localization.getLocales()[0]?.languageTag ?? 'en';
  const [lang, setLangState] = useState<Lang>('auto');

  useEffect(() => {
    loadJSON<Lang>(KEYS.lang, 'auto').then(setLangState);
  }, []);

  const locale = resolveLocale(lang, deviceTag);

  useEffect(() => {
    i18n.changeLanguage(locale);
  }, [locale]);

  const setLang = (l: Lang) => {
    setLangState(l);
    saveJSON(KEYS.lang, l);
  };

  return <Ctx.Provider value={{ lang, locale, setLang }}>{children}</Ctx.Provider>;
}

export const useSettings = (): SettingsValue => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSettings must be used within SettingsProvider');
  return v;
};
