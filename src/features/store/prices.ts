// MOCK store price book — stands in for StoreKit / Play Billing / RevenueCat.
// In the real app these localized price strings are fetched from the store per
// SKU at runtime. They are intentionally NOT stored in Supabase.

const MOCK_PRICES: Record<string, string> = {
  sku_food: '€2,99',
  sku_eighties: '€2,99',
  sku_sport: '€1,99',
  sku_retro: '€3,99',
  sku_allaccess: '€7,99',
};

export const getPrice = (sku?: string): string => (sku ? MOCK_PRICES[sku] ?? '' : '');

/** Marketing reference (sum of individual packs) shown struck-through on the bundle. */
export const BUNDLE_REGULAR = '€11,96';
export const BUNDLE_SAVE_PCT = 33;
