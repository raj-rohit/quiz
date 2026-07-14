import { OFFLINE_CATALOG, PAID_IDS } from '@/src/features/catalog/catalog';
import { computeOwnedAfterBuy, PASS_ID } from '@/src/state/entitlements';
import { loadJSON, saveJSON, KEYS } from '@/src/lib/storage';
import type { PurchaseResult, StoreAdapter, StoreProduct } from './adapter';

// Stand-in price book. Real builds fetch localized prices from the store;
// these exist so web / Expo Go / tests render a realistic store.
const MOCK_PRODUCTS: StoreProduct[] = [
  { sku: 'sku_food', priceString: '€2,99', price: 2.99, currencyCode: 'EUR' },
  { sku: 'sku_eighties', priceString: '€2,99', price: 2.99, currencyCode: 'EUR' },
  { sku: 'sku_sport', priceString: '€1,99', price: 1.99, currencyCode: 'EUR' },
  { sku: 'sku_retro', priceString: '€2,99', price: 2.99, currencyCode: 'EUR' },
  { sku: 'sku_allaccess', priceString: '€4,99', price: 4.99, currencyCode: 'EUR' },
];

/** Maps a purchased sku to the resulting owned pack-id list; null for unknown skus. */
export function ownedAfterMockPurchase(sku: string, current: string[]): string[] | null {
  if (sku === OFFLINE_CATALOG.bundle.storeProductId) {
    // Mirror RevenueCat: the bundle grants every paid pack AND the pass flag.
    return computeOwnedAfterBuy(current, OFFLINE_CATALOG.bundle.id, [...PAID_IDS, PASS_ID], true);
  }
  const pack = OFFLINE_CATALOG.packs.find((p) => p.storeProductId === sku);
  if (!pack) return null;
  return computeOwnedAfterBuy(current, pack.id, PAID_IDS, false);
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class MockStoreAdapter implements StoreAdapter {
  constructor(private delayMs = 600) {}

  async init(): Promise<void> {}

  async getProducts(skus: string[]): Promise<StoreProduct[]> {
    return MOCK_PRODUCTS.filter((p) => skus.includes(p.sku));
  }

  async purchase(sku: string): Promise<PurchaseResult> {
    if (this.delayMs > 0) await sleep(this.delayMs); // keep the "processing" state visible in dev
    const current = await this.getOwnedPackIds();
    const next = ownedAfterMockPurchase(sku, current);
    if (!next) return { outcome: 'failed' };
    await saveJSON(KEYS.owned, next);
    return { outcome: 'success', ownedPackIds: next };
  }

  async restore(): Promise<string[]> {
    return this.getOwnedPackIds();
  }

  async getOwnedPackIds(): Promise<string[]> {
    return loadJSON<string[]>(KEYS.owned, []);
  }
}
