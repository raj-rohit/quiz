// The ONLY module allowed to import react-native-purchases.
// Requires a dev/production build (native module) — never runs in Expo Go/web;
// adapter selection in index.ts guarantees that.
import Purchases, { PRODUCT_CATEGORY, PurchasesStoreProduct } from 'react-native-purchases';
import type { PurchaseResult, StoreAdapter, StoreProduct } from './adapter';

/**
 * RevenueCat entitlement identifiers are configured to equal pack ids
 * (food, eighties, sport, retro); sku_allaccess activates all four.
 */
export function ownedFromCustomerInfo(info: {
  entitlements: { active: Record<string, unknown> };
}): string[] {
  return Object.keys(info.entitlements.active);
}

const toStoreProduct = (p: PurchasesStoreProduct): StoreProduct => ({
  sku: p.identifier,
  priceString: p.priceString,
  price: p.price,
  currencyCode: p.currencyCode,
});

export class RevenueCatAdapter implements StoreAdapter {
  private cache = new Map<string, PurchasesStoreProduct>();

  constructor(private apiKey: string) {}

  async init(): Promise<void> {
    Purchases.configure({ apiKey: this.apiKey });
  }

  async getProducts(skus: string[]): Promise<StoreProduct[]> {
    const list = await Purchases.getProducts(skus, PRODUCT_CATEGORY.NON_SUBSCRIPTION);
    list.forEach((p) => this.cache.set(p.identifier, p));
    return list.map(toStoreProduct);
  }

  async purchase(sku: string): Promise<PurchaseResult> {
    let product = this.cache.get(sku);
    if (!product) {
      try {
        const [fetched] = await Purchases.getProducts([sku], PRODUCT_CATEGORY.NON_SUBSCRIPTION);
        product = fetched;
      } catch (e) {
        return { outcome: 'failed' };
      }
    }
    if (!product) return { outcome: 'failed' };
    try {
      const { customerInfo } = await Purchases.purchaseStoreProduct(product);
      return { outcome: 'success', ownedPackIds: ownedFromCustomerInfo(customerInfo) };
    } catch (e) {
      if ((e as { userCancelled?: boolean }).userCancelled) return { outcome: 'cancelled' };
      return { outcome: 'failed' };
    }
  }

  async restore(): Promise<string[]> {
    return ownedFromCustomerInfo(await Purchases.restorePurchases());
  }

  async getOwnedPackIds(): Promise<string[]> {
    return ownedFromCustomerInfo(await Purchases.getCustomerInfo());
  }
}
