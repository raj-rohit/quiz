// Store-agnostic purchase contract. Two implementations exist:
// revenuecat.ts (real iPhone/Android builds) and mock.ts (web, Expo Go, Jest).

export interface StoreProduct {
  sku: string;
  /** Localized, ready-to-display price from the store, e.g. "€2,99" / "₹99". */
  priceString: string;
  /** Numeric amount, for bundle-savings math only — never displayed raw. */
  price: number;
  currencyCode: string;
}

export type PurchaseOutcome = 'success' | 'cancelled' | 'failed';

export type PurchaseResult =
  | { outcome: 'success'; ownedPackIds: string[] }
  | { outcome: 'cancelled' }
  | { outcome: 'failed' };

export interface StoreAdapter {
  init(): Promise<void>;
  getProducts(skus: string[]): Promise<StoreProduct[]>;
  purchase(sku: string): Promise<PurchaseResult>;
  /** Returns the full owned pack-id list after restoring. */
  restore(): Promise<string[]>;
  /** Current entitlements, used to reconcile local cache at launch. */
  getOwnedPackIds(): Promise<string[]>;
}
