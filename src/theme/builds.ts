// Per-country app builds: accent + default locale + deck title key (SPEC §5).
// Pure data — no RN imports.

export type BuildCode = 'NL' | 'FR' | 'BE' | 'DE';

export interface Build {
  code: BuildCode;
  country: string;
  defaultLocale: 'nl' | 'fr' | 'de';
  titleKey: string;
  accent: { rgb: string; deep: string; glow: string };
}

export const BUILDS: Record<BuildCode, Build> = {
  NL: { code: 'NL', country: 'Nederland',   defaultLocale: 'nl', titleKey: 'deck.nl', accent: { rgb: '245 158 11', deep: '180 83 9',  glow: '252 211 77' } },
  FR: { code: 'FR', country: 'France',       defaultLocale: 'fr', titleKey: 'deck.fr', accent: { rgb: '0 85 164',   deep: '0 59 122',  glow: '125 178 255' } },
  BE: { code: 'BE', country: 'België',       defaultLocale: 'nl', titleKey: 'deck.be', accent: { rgb: '237 41 57',  deep: '167 19 28', glow: '252 211 77' } },
  DE: { code: 'DE', country: 'Deutschland',  defaultLocale: 'de', titleKey: 'deck.de', accent: { rgb: '221 0 0',    deep: '165 0 0',   glow: '255 206 0' } },
};

/** Which country binary this app instance ships as. NL (orange) for now. */
export const ACTIVE_BUILD: BuildCode = 'NL';

export const resolveAccent = (code: BuildCode): Build => BUILDS[code] ?? BUILDS.NL;
