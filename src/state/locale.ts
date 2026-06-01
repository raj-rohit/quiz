// Pure language/locale resolution — no RN/expo imports (keeps tests fast).

export type Lang = 'auto' | 'nl' | 'en' | 'fr' | 'de';
export type Locale = 'nl' | 'en' | 'fr' | 'de';

export const UI_LANGS: Locale[] = ['nl', 'en', 'fr', 'de'];
export const LANG_NAMES: Record<Locale, string> = {
  nl: 'Nederlands',
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
};

/**
 * Resolve the active UI locale. `auto` follows the phone: Dutch if the device
 * language is Dutch, otherwise English. An explicit choice always wins.
 */
export function resolveLocale(lang: Lang, deviceTag: string): Locale {
  if (lang !== 'auto') return lang;
  return (deviceTag || 'en').toLowerCase().startsWith('nl') ? 'nl' : 'en';
}
