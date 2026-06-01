import { Catalog, Pack } from './types';

// Baked-in offline catalog (SPEC §4): default content shipped with the app.
// Supabase overrides this at runtime; this is the offline fallback.
export const OFFLINE_CATALOG: Catalog = {
  packs: [
    {
      id: 'classics',
      title: { nl: 'Klassiekers', en: 'Classics', fr: 'Classiques', de: 'Klassiker' },
      blurb: {
        nl: 'De bekendste merken — gratis om te starten.',
        en: 'The most famous marks — free to start.',
        fr: 'Les marques les plus connues — gratuit.',
        de: 'Die bekanntesten Marken — gratis.',
      },
      cover: 'accent',
      icon: 'star',
      questions: 5,
      isFree: true,
      freeQuestionCount: 5,
      sample: false,
      sortOrder: 0,
      visible: true,
    },
    {
      id: 'food',
      title: { nl: 'Eten & Drinken', en: 'Food & Drink', fr: 'Gastronomie', de: 'Essen & Trinken' },
      blurb: {
        nl: 'Supermarkt-iconen en huismerken.',
        en: 'Supermarket icons and house brands.',
        fr: 'Icônes de supermarché et marques maison.',
        de: 'Supermarkt-Ikonen und Hausmarken.',
      },
      cover: 'cyan',
      icon: 'restaurant',
      questions: 12,
      isFree: false,
      freeQuestionCount: 3,
      storeProductId: 'sku_food',
      sample: true,
      sortOrder: 1,
      visible: true,
    },
    {
      id: 'eighties',
      title: { nl: 'Jaren ’80', en: 'The 80s', fr: 'Années 80', de: 'Die 80er' },
      blurb: {
        nl: 'Retro merken uit een ander tijdperk.',
        en: 'Retro brands from another era.',
        fr: 'Marques rétro d’une autre époque.',
        de: 'Retro-Marken aus einer anderen Zeit.',
      },
      cover: 'ink',
      icon: 'graphic_eq',
      questions: 10,
      isFree: false,
      freeQuestionCount: 3,
      storeProductId: 'sku_eighties',
      sample: true,
      sortOrder: 2,
      visible: true,
    },
    {
      id: 'sport',
      title: { nl: 'Sport', en: 'Sport', fr: 'Sport', de: 'Sport' },
      blurb: {
        nl: 'Clubs, merken en toernooien.',
        en: 'Clubs, brands and tournaments.',
        fr: 'Clubs, marques et tournois.',
        de: 'Vereine, Marken und Turniere.',
      },
      cover: 'cream',
      icon: 'sports_soccer',
      questions: 8,
      isFree: false,
      freeQuestionCount: 3,
      storeProductId: 'sku_sport',
      sample: true,
      sortOrder: 3,
      visible: true,
    },
    {
      id: 'retro',
      title: { nl: 'Retro Arcade', en: 'Retro Arcade', fr: 'Rétro Arcade', de: 'Retro-Arcade' },
      blurb: {
        nl: 'Games en gadgets, pixel-stijl.',
        en: 'Games and gadgets, pixel-style.',
        fr: 'Jeux et gadgets, style pixel.',
        de: 'Spiele und Gadgets im Pixel-Stil.',
      },
      cover: 'accent',
      icon: 'sports_esports',
      questions: 14,
      isFree: false,
      freeQuestionCount: 3,
      storeProductId: 'sku_retro',
      sample: true,
      sortOrder: 4,
      visible: true,
    },
  ],
  bundle: {
    id: 'allaccess',
    title: { nl: 'Alles ontgrendelen', en: 'Unlock Everything', fr: 'Tout débloquer', de: 'Alles freischalten' },
    blurb: {
      nl: 'Alle 4 betaalde packs. Eénmalig.',
      en: 'All 4 paid packs. One-time.',
      fr: 'Les 4 packs payants. Une fois.',
      de: 'Alle 4 Bezahl-Packs. Einmalig.',
    },
    icon: 'workspace_premium',
    storeProductId: 'sku_allaccess',
  },
};

export const paidIds = (catalog: Catalog): string[] =>
  catalog.packs.filter((p) => !p.isFree).map((p) => p.id);

export const PAID_IDS = paidIds(OFFLINE_CATALOG);
