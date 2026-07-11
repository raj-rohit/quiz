import type { StoreProduct } from './adapter';

export function formatAmount(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

/**
 * "Usually €11,96 · save 33%" for the bundle card, computed from real store
 * prices so it stays truthful in every country. Null hides the pill.
 */
export function computeBundleSavings(
  products: StoreProduct[],
  packSkus: string[],
  bundleSku: string | undefined
): { regular: string; savePct: number } | null {
  if (!bundleSku || packSkus.length === 0) return null;
  const bySku = new Map(products.map((p) => [p.sku, p]));
  const bundle = bySku.get(bundleSku);
  if (!bundle) return null;
  const packs = packSkus.map((sku) => bySku.get(sku));
  if (packs.some((p) => p === undefined)) return null;
  const regularSum = packs.reduce((sum, p) => sum + (p as StoreProduct).price, 0);
  if (regularSum <= bundle.price) return null;
  return {
    regular: formatAmount(regularSum, bundle.currencyCode),
    savePct: Math.round((1 - bundle.price / regularSum) * 100),
  };
}
