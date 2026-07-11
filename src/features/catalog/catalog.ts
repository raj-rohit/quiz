import { Catalog, Pack } from './types';

// Baked-in offline catalog (SPEC §4): default content shipped with the app.
// Supabase overrides this at runtime; this is the offline fallback.
export const OFFLINE_CATALOG: Catalog = {
  // Launch shape (2026-07-11 spec): retro is the only paid pack; food/sport are
  // free with dormant SKUs; eighties lives only in Supabase (hidden) until it
  // returns as a decade pack.
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
      isFree: true,
      freeQuestionCount: 3,
      storeProductId: 'sku_food',
      sample: true,
      sortOrder: 1,
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
      isFree: true,
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
      nl: 'Alle packs — nu én in de toekomst. Eénmalig.',
      en: 'Every pack, now and in the future. One-time.',
      fr: 'Tous les packs, actuels et futurs. Une fois.',
      de: 'Alle Packs, jetzt und künftig. Einmalig.',
    },
    icon: 'workspace_premium',
    storeProductId: 'sku_allaccess',
  },
};

export const paidIds = (catalog: Catalog): string[] =>
  catalog.packs.filter((p) => !p.isFree).map((p) => p.id);

export const PAID_IDS = paidIds(OFFLINE_CATALOG);
