import { OFFLINE_CATALOG, PAID_IDS } from '../catalog';

test('launch catalog: retro is the only paid pack', () => {
  expect(PAID_IDS).toEqual(['retro']);
});

test('launch catalog: eighties is absent, food and sport are free with dormant SKUs', () => {
  expect(OFFLINE_CATALOG.packs.map((p) => p.id)).toEqual(['classics', 'food', 'sport', 'retro']);
  const food = OFFLINE_CATALOG.packs.find((p) => p.id === 'food')!;
  const sport = OFFLINE_CATALOG.packs.find((p) => p.id === 'sport')!;
  expect(food.isFree).toBe(true);
  expect(sport.isFree).toBe(true);
  expect(food.storeProductId).toBe('sku_food'); // dormant, revivable via Supabase
  expect(sport.storeProductId).toBe('sku_sport');
});

test('launch catalog: bundle blurb pitches future packs in all locales', () => {
  for (const loc of ['nl', 'en', 'fr', 'de'] as const) {
    expect(OFFLINE_CATALOG.bundle.blurb[loc]).toMatch(/toekomst|future|futurs|künftig/i);
  }
});
