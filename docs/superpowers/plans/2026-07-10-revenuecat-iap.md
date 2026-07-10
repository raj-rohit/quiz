# RevenueCat IAP Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mocked purchase system with a real RevenueCat-backed store adapter (iOS-first), while the existing mock keeps powering web, Expo Go, and Jest.

**Architecture:** A `StoreAdapter` interface with two implementations (RevenueCat, mock) selected at startup. `EntitlementsContext` and a new `ProductsContext` consume the adapter; UI components read localized prices from `ProductsContext` and never hardcode amounts. Spec: `docs/superpowers/specs/2026-07-10-revenuecat-iap-design.md`.

**Tech Stack:** Expo SDK 54, React Native 0.81.5, React 19.1, TypeScript strict, expo-router, jest-expo, react-test-renderer, react-native-purchases, expo-dev-client.

## Global Constraints

- Path alias: `@/*` maps to repo root (e.g. `@/src/features/store/adapter`).
- TypeScript is `strict: true`; `npm run typecheck` must pass at the end of every task.
- Tests: jest-expo preset, files match `**/__tests__/**/*.test.ts?(x)`. Run all: `npm test`. Run one file: `npx jest src/path/__tests__/file.test.ts`.
- Product IDs (verbatim, never invent others): `sku_food`, `sku_eighties`, `sku_sport`, `sku_retro`, `sku_allaccess`.
- Pack ids: `food`, `eighties`, `sport`, `retro` (paid), `classics` (free). Bundle id: `allaccess`.
- App identifier (iOS and Android): `com.locallogo.app`.
- New dependencies ONLY via `npx expo install`, and only these two: `react-native-purchases`, `expo-dev-client`.
- Every new i18n key must be added to ALL FOUR locale files: `src/i18n/locales/{en,nl,fr,de}.json`.
- Only `src/features/store/revenuecat.ts` may import `react-native-purchases`. UI components never hardcode prices.
- Commit messages use conventional prefixes (`feat:`, `test:`, `chore:`) and end with the trailer line: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- The mock price book values are canonical for tests: sku_food €2,99 (2.99), sku_eighties €2,99 (2.99), sku_sport €1,99 (1.99), sku_retro €3,99 (3.99), sku_allaccess €7,99 (7.99), all `EUR`.

---

### Task 1: Dependencies + app identity config

**Files:**
- Modify: `package.json` (via `npx expo install`)
- Modify: `app.json`

**Interfaces:**
- Consumes: nothing.
- Produces: `react-native-purchases` and `expo-dev-client` installed; `Constants.expoConfig.extra.revenuecatIosApiKey` (empty string for now) readable by later tasks; bundle identifiers set.

- [ ] **Step 1: Install the two packages**

Run: `npx expo install react-native-purchases expo-dev-client`
Expected: both appear in `package.json` dependencies with Expo-compatible versions. If the command asks about modifying files, accept.

- [ ] **Step 2: Add identifiers and the API-key slot to app.json**

In `app.json`, change the `ios` and `android` sections and add `extra`:

```json
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.locallogo.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#0e0e0e"
      },
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false,
      "package": "com.locallogo.app"
    },
```

And after the `"experiments"` block, at the same level, add:

```json
    "extra": {
      "revenuecatIosApiKey": ""
    }
```

(Empty key is intentional: adapter selection in Task 4 falls back to the mock until a real key exists.)

- [ ] **Step 3: Verify nothing broke**

Run: `npm run typecheck`
Expected: exit 0, no output.
Run: `npm test`
Expected: all existing suites PASS (purchaseSheet, entitlements, merge, etc.).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json app.json
git commit -m "chore: add react-native-purchases + expo-dev-client, app identifiers

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Store adapter contract + mock adapter

**Files:**
- Create: `src/features/store/adapter.ts`
- Create: `src/features/store/mock.ts`
- Test: `src/features/store/__tests__/mock.test.ts`

**Interfaces:**
- Consumes: `computeOwnedAfterBuy` from `@/src/state/entitlements` (existing: `(owned: string[], packId: string, paidIds: string[], isBundle: boolean) => string[]`); `OFFLINE_CATALOG`, `PAID_IDS` from `@/src/features/catalog/catalog`; `loadJSON`, `saveJSON`, `KEYS` from `@/src/lib/storage`.
- Produces (used by every later task):
  - `StoreProduct { sku: string; priceString: string; price: number; currencyCode: string }`
  - `PurchaseOutcome = 'success' | 'cancelled' | 'failed'`
  - `PurchaseResult = { outcome: 'success'; ownedPackIds: string[] } | { outcome: 'cancelled' } | { outcome: 'failed' }`
  - `StoreAdapter { init(): Promise<void>; getProducts(skus: string[]): Promise<StoreProduct[]>; purchase(sku: string): Promise<PurchaseResult>; restore(): Promise<string[]>; getOwnedPackIds(): Promise<string[]> }`
  - `MockStoreAdapter` class (constructor `(delayMs = 600)`), `ownedAfterMockPurchase(sku: string, current: string[]): string[] | null`

- [ ] **Step 1: Write the failing test**

Create `src/features/store/__tests__/mock.test.ts`:

```ts
jest.mock('@/src/lib/storage', () => {
  const mem = new Map<string, unknown>();
  return {
    loadJSON: jest.fn(async (key: string, fallback: unknown) => (mem.has(key) ? mem.get(key) : fallback)),
    saveJSON: jest.fn(async (key: string, value: unknown) => {
      mem.set(key, value);
    }),
    KEYS: { owned: 'll.owned' },
    __mem: mem,
  };
});

import { MockStoreAdapter, ownedAfterMockPurchase } from '../mock';

const PAID = ['food', 'eighties', 'sport', 'retro'];

beforeEach(() => {
  const { __mem } = jest.requireMock('@/src/lib/storage');
  __mem.clear();
});

test('ownedAfterMockPurchase maps a pack sku to its pack id', () => {
  expect(ownedAfterMockPurchase('sku_food', [])).toEqual(['food']);
  expect(ownedAfterMockPurchase('sku_food', ['food'])).toEqual(['food']);
});

test('ownedAfterMockPurchase maps the bundle sku to all paid ids', () => {
  expect(ownedAfterMockPurchase('sku_allaccess', ['food'])!.sort()).toEqual(PAID.slice().sort());
});

test('ownedAfterMockPurchase returns null for unknown skus', () => {
  expect(ownedAfterMockPurchase('sku_nope', [])).toBeNull();
});

test('getProducts returns localized mock prices for known skus only', async () => {
  const adapter = new MockStoreAdapter(0);
  const products = await adapter.getProducts(['sku_food', 'sku_allaccess', 'sku_nope']);
  expect(products).toEqual([
    { sku: 'sku_food', priceString: '€2,99', price: 2.99, currencyCode: 'EUR' },
    { sku: 'sku_allaccess', priceString: '€7,99', price: 7.99, currencyCode: 'EUR' },
  ]);
});

test('purchase persists ownership and restore/getOwnedPackIds read it back', async () => {
  const adapter = new MockStoreAdapter(0);
  await adapter.init();
  const res = await adapter.purchase('sku_sport');
  expect(res).toEqual({ outcome: 'success', ownedPackIds: ['sport'] });
  expect(await adapter.getOwnedPackIds()).toEqual(['sport']);
  expect(await adapter.restore()).toEqual(['sport']);
});

test('purchase of an unknown sku fails without changing ownership', async () => {
  const adapter = new MockStoreAdapter(0);
  const res = await adapter.purchase('sku_nope');
  expect(res).toEqual({ outcome: 'failed' });
  expect(await adapter.getOwnedPackIds()).toEqual([]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/store/__tests__/mock.test.ts`
Expected: FAIL — `Cannot find module '../mock'`.

- [ ] **Step 3: Write the adapter contract**

Create `src/features/store/adapter.ts`:

```ts
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
```

- [ ] **Step 4: Write the mock implementation**

Create `src/features/store/mock.ts`:

```ts
import { OFFLINE_CATALOG, PAID_IDS } from '@/src/features/catalog/catalog';
import { computeOwnedAfterBuy } from '@/src/state/entitlements';
import { loadJSON, saveJSON, KEYS } from '@/src/lib/storage';
import type { PurchaseResult, StoreAdapter, StoreProduct } from './adapter';

// Stand-in price book. Real builds fetch localized prices from the store;
// these exist so web / Expo Go / tests render a realistic store.
const MOCK_PRODUCTS: StoreProduct[] = [
  { sku: 'sku_food', priceString: '€2,99', price: 2.99, currencyCode: 'EUR' },
  { sku: 'sku_eighties', priceString: '€2,99', price: 2.99, currencyCode: 'EUR' },
  { sku: 'sku_sport', priceString: '€1,99', price: 1.99, currencyCode: 'EUR' },
  { sku: 'sku_retro', priceString: '€3,99', price: 3.99, currencyCode: 'EUR' },
  { sku: 'sku_allaccess', priceString: '€7,99', price: 7.99, currencyCode: 'EUR' },
];

/** Maps a purchased sku to the resulting owned pack-id list; null for unknown skus. */
export function ownedAfterMockPurchase(sku: string, current: string[]): string[] | null {
  if (sku === OFFLINE_CATALOG.bundle.storeProductId) {
    return computeOwnedAfterBuy(current, OFFLINE_CATALOG.bundle.id, PAID_IDS, true);
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/features/store/__tests__/mock.test.ts`
Expected: 6 tests PASS.

- [ ] **Step 6: Typecheck and commit**

Run: `npm run typecheck` — expected exit 0.

```bash
git add src/features/store/adapter.ts src/features/store/mock.ts src/features/store/__tests__/mock.test.ts
git commit -m "feat: store adapter contract + mock adapter

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: RevenueCat adapter

**Files:**
- Create: `src/features/store/revenuecat.ts`
- Test: `src/features/store/__tests__/revenuecat.test.ts`

**Interfaces:**
- Consumes: `StoreAdapter`, `StoreProduct`, `PurchaseResult` from `../adapter` (Task 2); `react-native-purchases` (the ONLY file allowed to import it).
- Produces: `RevenueCatAdapter` class (constructor `(apiKey: string)`), `ownedFromCustomerInfo(info): string[]` (exported for tests).

**Domain note for the implementer:** RevenueCat "entitlements" are named grants configured in their dashboard. Ours are named exactly like pack ids (`food`, `eighties`, `sport`, `retro`); buying `sku_allaccess` activates all four (dashboard config, not code). So "owned pack ids" = keys of `customerInfo.entitlements.active`. Non-subscription products MUST be fetched with the `NON_SUBSCRIPTION` category — the SDK defaults to subscriptions and would return `[]`.

- [ ] **Step 1: Write the failing test**

Create `src/features/store/__tests__/revenuecat.test.ts`:

```ts
const mockPurchases = {
  configure: jest.fn(),
  getProducts: jest.fn(),
  purchaseStoreProduct: jest.fn(),
  restorePurchases: jest.fn(),
  getCustomerInfo: jest.fn(),
};

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: mockPurchases,
  PRODUCT_CATEGORY: { NON_SUBSCRIPTION: 'NON_SUBSCRIPTION' },
}));

import { RevenueCatAdapter, ownedFromCustomerInfo } from '../revenuecat';

const rcProduct = (identifier: string, price: number) => ({
  identifier,
  priceString: `€${price.toFixed(2).replace('.', ',')}`,
  price,
  currencyCode: 'EUR',
});

const infoWith = (...packIds: string[]) => ({
  entitlements: { active: Object.fromEntries(packIds.map((id) => [id, {}])) },
});

beforeEach(() => jest.clearAllMocks());

test('ownedFromCustomerInfo returns active entitlement keys', () => {
  expect(ownedFromCustomerInfo(infoWith('food', 'sport'))).toEqual(['food', 'sport']);
  expect(ownedFromCustomerInfo(infoWith())).toEqual([]);
});

test('getProducts fetches NON_SUBSCRIPTION products and maps fields', async () => {
  mockPurchases.getProducts.mockResolvedValue([rcProduct('sku_food', 2.99)]);
  const adapter = new RevenueCatAdapter('appl_test');
  const products = await adapter.getProducts(['sku_food']);
  expect(mockPurchases.getProducts).toHaveBeenCalledWith(['sku_food'], 'NON_SUBSCRIPTION');
  expect(products).toEqual([{ sku: 'sku_food', priceString: '€2,99', price: 2.99, currencyCode: 'EUR' }]);
});

test('purchase success returns owned pack ids from customer info', async () => {
  mockPurchases.getProducts.mockResolvedValue([rcProduct('sku_food', 2.99)]);
  mockPurchases.purchaseStoreProduct.mockResolvedValue({ customerInfo: infoWith('food') });
  const adapter = new RevenueCatAdapter('appl_test');
  await adapter.getProducts(['sku_food']); // warms the product cache
  const res = await adapter.purchase('sku_food');
  expect(res).toEqual({ outcome: 'success', ownedPackIds: ['food'] });
});

test('user cancellation maps to cancelled, other errors to failed', async () => {
  mockPurchases.getProducts.mockResolvedValue([rcProduct('sku_food', 2.99)]);
  const adapter = new RevenueCatAdapter('appl_test');
  await adapter.getProducts(['sku_food']);

  mockPurchases.purchaseStoreProduct.mockRejectedValue({ userCancelled: true });
  expect(await adapter.purchase('sku_food')).toEqual({ outcome: 'cancelled' });

  mockPurchases.purchaseStoreProduct.mockRejectedValue(new Error('network'));
  expect(await adapter.purchase('sku_food')).toEqual({ outcome: 'failed' });
});

test('purchase of an unfetchable sku fails', async () => {
  mockPurchases.getProducts.mockResolvedValue([]);
  const adapter = new RevenueCatAdapter('appl_test');
  expect(await adapter.purchase('sku_ghost')).toEqual({ outcome: 'failed' });
});

test('restore and getOwnedPackIds map customer info', async () => {
  mockPurchases.restorePurchases.mockResolvedValue(infoWith('retro'));
  mockPurchases.getCustomerInfo.mockResolvedValue(infoWith('food', 'retro'));
  const adapter = new RevenueCatAdapter('appl_test');
  expect(await adapter.restore()).toEqual(['retro']);
  expect(await adapter.getOwnedPackIds()).toEqual(['food', 'retro']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/store/__tests__/revenuecat.test.ts`
Expected: FAIL — `Cannot find module '../revenuecat'`.

- [ ] **Step 3: Write the implementation**

Create `src/features/store/revenuecat.ts`:

```ts
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
      const [fetched] = await Purchases.getProducts([sku], PRODUCT_CATEGORY.NON_SUBSCRIPTION);
      product = fetched;
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/features/store/__tests__/revenuecat.test.ts`
Expected: 6 tests PASS.

- [ ] **Step 5: Typecheck and commit**

Run: `npm run typecheck` — expected exit 0. (If `PurchasesStoreProduct` fields mismatch the installed SDK version's types, adapt `toStoreProduct` to the actual type definitions — the four output fields are fixed.)

```bash
git add src/features/store/revenuecat.ts src/features/store/__tests__/revenuecat.test.ts
git commit -m "feat: RevenueCat store adapter

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Adapter selection

**Files:**
- Create: `src/features/store/index.ts`
- Test: `src/features/store/__tests__/select.test.ts`

**Interfaces:**
- Consumes: `MockStoreAdapter` (Task 2), `RevenueCatAdapter` (Task 3), `expo-constants`, `react-native` Platform.
- Produces:
  - `chooseAdapterKind({ platform, appOwnership, apiKey }): 'revenuecat' | 'mock'` (pure, exported for tests)
  - `getReadyStoreAdapter(): Promise<StoreAdapter>` — singleton; creates, `init()`s, and caches the adapter; falls back to an initialized mock if RevenueCat `init()` throws.

- [ ] **Step 1: Write the failing test**

Create `src/features/store/__tests__/select.test.ts`:

```ts
import { chooseAdapterKind } from '../index';

test('iOS dev/production build with an API key uses RevenueCat', () => {
  expect(chooseAdapterKind({ platform: 'ios', appOwnership: null, apiKey: 'appl_x' })).toBe('revenuecat');
});

test('Expo Go uses the mock even with a key', () => {
  expect(chooseAdapterKind({ platform: 'ios', appOwnership: 'expo', apiKey: 'appl_x' })).toBe('mock');
});

test('missing or empty API key uses the mock', () => {
  expect(chooseAdapterKind({ platform: 'ios', appOwnership: null, apiKey: '' })).toBe('mock');
  expect(chooseAdapterKind({ platform: 'ios', appOwnership: null, apiKey: undefined })).toBe('mock');
});

test('web and Android use the mock (Android joins when Play is set up)', () => {
  expect(chooseAdapterKind({ platform: 'web', appOwnership: null, apiKey: 'appl_x' })).toBe('mock');
  expect(chooseAdapterKind({ platform: 'android', appOwnership: null, apiKey: 'appl_x' })).toBe('mock');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/store/__tests__/select.test.ts`
Expected: FAIL — `Cannot find module '../index'` (or `chooseAdapterKind is not a function`).

- [ ] **Step 3: Write the implementation**

Create `src/features/store/index.ts`:

```ts
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { StoreAdapter } from './adapter';
import { MockStoreAdapter } from './mock';

export type { StoreAdapter, StoreProduct, PurchaseOutcome, PurchaseResult } from './adapter';

export type AdapterKind = 'revenuecat' | 'mock';

/**
 * iOS-only for now: the configured key is the Apple one. Android flips to
 * RevenueCat once Play products + an Android key exist (see design spec).
 */
export function chooseAdapterKind(input: {
  platform: string;
  appOwnership: string | null;
  apiKey: string | undefined;
}): AdapterKind {
  if (input.platform !== 'ios') return 'mock';
  if (input.appOwnership === 'expo') return 'mock'; // Expo Go has no native billing module
  if (!input.apiKey) return 'mock';
  return 'revenuecat';
}

let ready: Promise<StoreAdapter> | null = null;

export function getReadyStoreAdapter(): Promise<StoreAdapter> {
  if (!ready) {
    ready = (async () => {
      const apiKey = (Constants.expoConfig?.extra as Record<string, unknown> | undefined)
        ?.revenuecatIosApiKey as string | undefined;
      const kind = chooseAdapterKind({
        platform: Platform.OS,
        appOwnership: Constants.appOwnership,
        apiKey,
      });
      if (kind === 'revenuecat') {
        try {
          // Lazy require: the module factory only executes on real builds.
          const { RevenueCatAdapter } = require('./revenuecat') as typeof import('./revenuecat');
          const rc = new RevenueCatAdapter(apiKey as string);
          await rc.init();
          return rc;
        } catch (e) {
          console.warn('[store] RevenueCat init failed, falling back to mock', e);
        }
      }
      const mock = new MockStoreAdapter();
      await mock.init();
      return mock;
    })();
  }
  return ready;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/features/store/__tests__/select.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 5: Typecheck and commit**

Run: `npm run typecheck` — expected exit 0.

```bash
git add src/features/store/index.ts src/features/store/__tests__/select.test.ts
git commit -m "feat: store adapter selection with mock fallback

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Bundle-savings math + ProductsContext, mounted in the app

**Files:**
- Create: `src/features/store/savings.ts`
- Create: `src/state/ProductsContext.tsx`
- Modify: `app/_layout.tsx`
- Test: `src/features/store/__tests__/savings.test.ts`
- Test: `src/state/__tests__/productsContext.test.tsx`

**Interfaces:**
- Consumes: `StoreProduct`, `StoreAdapter` (Task 2), `getReadyStoreAdapter` (Task 4), `useCatalog` from `@/src/features/catalog/useCatalog` (existing: returns `{ catalog: Catalog }`).
- Produces:
  - `computeBundleSavings(products: StoreProduct[], packSkus: string[], bundleSku: string | undefined): { regular: string; savePct: number } | null`
  - `formatAmount(amount: number, currencyCode: string): string`
  - `ProductsProvider({ children, adapter? })` — `adapter` prop is a test seam; defaults to `getReadyStoreAdapter()`.
  - `useProducts(): { getPrice: (sku?: string) => string; bundleSavings: { regular: string; savePct: number } | null }` — `getPrice` returns `''` while loading/offline/unknown.

- [ ] **Step 1: Write the failing savings test**

Create `src/features/store/__tests__/savings.test.ts`:

```ts
import { computeBundleSavings, formatAmount } from '../savings';
import type { StoreProduct } from '../adapter';

const P = (sku: string, price: number): StoreProduct => ({
  sku,
  priceString: `x`,
  price,
  currencyCode: 'EUR',
});

const PACK_SKUS = ['sku_food', 'sku_eighties', 'sku_sport', 'sku_retro'];
const ALL = [P('sku_food', 2.99), P('sku_eighties', 2.99), P('sku_sport', 1.99), P('sku_retro', 3.99), P('sku_allaccess', 7.99)];

test('formatAmount falls back to code + amount for bogus currencies', () => {
  expect(formatAmount(11.96, 'NOPE!')).toBe('NOPE! 11.96');
});

test('savings from the mock price book: €11,96 regular, save 33%', () => {
  const s = computeBundleSavings(ALL, PACK_SKUS, 'sku_allaccess');
  expect(s).not.toBeNull();
  expect(s!.savePct).toBe(33);
  expect(s!.regular).toBe(formatAmount(11.96, 'EUR'));
});

test('returns null when any pack or the bundle product is missing', () => {
  expect(computeBundleSavings(ALL.slice(0, 3), PACK_SKUS, 'sku_allaccess')).toBeNull();
  expect(computeBundleSavings(ALL.slice(0, 4), PACK_SKUS, 'sku_allaccess')).toBeNull();
  expect(computeBundleSavings(ALL, PACK_SKUS, undefined)).toBeNull();
});

test('returns null when the bundle is not actually cheaper', () => {
  const notCheaper = [P('sku_food', 1.0), P('sku_eighties', 1.0), P('sku_sport', 1.0), P('sku_retro', 1.0), P('sku_allaccess', 4.5)];
  expect(computeBundleSavings(notCheaper, PACK_SKUS, 'sku_allaccess')).toBeNull();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest src/features/store/__tests__/savings.test.ts`
Expected: FAIL — `Cannot find module '../savings'`.

- [ ] **Step 3: Implement savings math**

Create `src/features/store/savings.ts`:

```ts
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
```

- [ ] **Step 4: Run savings test to verify it passes**

Run: `npx jest src/features/store/__tests__/savings.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 5: Write the failing ProductsContext test**

Create `src/state/__tests__/productsContext.test.tsx`:

```tsx
import React from 'react';
import { act, create } from 'react-test-renderer';

jest.mock('@/src/features/catalog/useCatalog', () => ({
  useCatalog: () => ({ catalog: jest.requireActual('@/src/features/catalog/catalog').OFFLINE_CATALOG }),
}));

import { ProductsProvider, useProducts } from '../ProductsContext';
import type { StoreAdapter } from '@/src/features/store/adapter';

const fakeAdapter: StoreAdapter = {
  init: jest.fn(async () => {}),
  getProducts: jest.fn(async (skus: string[]) =>
    [
      { sku: 'sku_food', priceString: '€2,99', price: 2.99, currencyCode: 'EUR' },
      { sku: 'sku_eighties', priceString: '€2,99', price: 2.99, currencyCode: 'EUR' },
      { sku: 'sku_sport', priceString: '€1,99', price: 1.99, currencyCode: 'EUR' },
      { sku: 'sku_retro', priceString: '€3,99', price: 3.99, currencyCode: 'EUR' },
      { sku: 'sku_allaccess', priceString: '€7,99', price: 7.99, currencyCode: 'EUR' },
    ].filter((p) => skus.includes(p.sku))
  ),
  purchase: jest.fn(),
  restore: jest.fn(async () => []),
  getOwnedPackIds: jest.fn(async () => []),
};

let api!: ReturnType<typeof useProducts>;
function Probe() {
  api = useProducts();
  return null;
}

test('exposes fetched prices and bundle savings', async () => {
  await act(async () => {
    create(
      <ProductsProvider adapter={fakeAdapter}>
        <Probe />
      </ProductsProvider>
    );
  });
  expect(api.getPrice('sku_food')).toBe('€2,99');
  expect(api.getPrice(undefined)).toBe('');
  expect(api.getPrice('sku_ghost')).toBe('');
  expect(api.bundleSavings?.savePct).toBe(33);
  expect(fakeAdapter.getProducts).toHaveBeenCalledWith([
    'sku_food',
    'sku_eighties',
    'sku_sport',
    'sku_retro',
    'sku_allaccess',
  ]);
});

test('prices stay empty and savings null when fetching fails', async () => {
  const broken: StoreAdapter = { ...fakeAdapter, getProducts: jest.fn(async () => Promise.reject(new Error('offline'))) };
  await act(async () => {
    create(
      <ProductsProvider adapter={broken}>
        <Probe />
      </ProductsProvider>
    );
  });
  expect(api.getPrice('sku_food')).toBe('');
  expect(api.bundleSavings).toBeNull();
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx jest src/state/__tests__/productsContext.test.tsx`
Expected: FAIL — `Cannot find module '../ProductsContext'`.

- [ ] **Step 7: Implement ProductsContext**

Create `src/state/ProductsContext.tsx`:

```tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useCatalog } from '@/src/features/catalog/useCatalog';
import { getReadyStoreAdapter } from '@/src/features/store';
import type { StoreAdapter, StoreProduct } from '@/src/features/store/adapter';
import { computeBundleSavings } from '@/src/features/store/savings';

interface ProductsValue {
  /** Localized price string for a sku, or '' while loading / offline / unknown. */
  getPrice: (sku?: string) => string;
  /** "Usually X · save Y%" data for the bundle card; null hides the pill. */
  bundleSavings: { regular: string; savePct: number } | null;
}

const Ctx = createContext<ProductsValue | null>(null);

export function ProductsProvider({
  children,
  adapter,
}: {
  children: React.ReactNode;
  adapter?: StoreAdapter; // test seam; defaults to the app-wide adapter
}) {
  const { catalog } = useCatalog();
  const [products, setProducts] = useState<StoreProduct[]>([]);

  const packSkus = useMemo(
    () =>
      catalog.packs
        .filter((p) => !p.isFree && p.storeProductId)
        .map((p) => p.storeProductId as string),
    [catalog]
  );
  const bundleSku = catalog.bundle.storeProductId;
  const skusKey = [...packSkus, bundleSku ?? ''].join(',');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const a = adapter ?? (await getReadyStoreAdapter());
        const skus = bundleSku ? [...packSkus, bundleSku] : packSkus;
        if (skus.length === 0) return;
        const fetched = await a.getProducts(skus);
        if (active) setProducts(fetched);
      } catch {
        // Offline / store unavailable: prices stay '', buying stays disabled.
      }
    })();
    return () => {
      active = false;
    };
    // skusKey covers packSkus + bundleSku (catalog refreshes from Supabase).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, skusKey]);

  const value = useMemo<ProductsValue>(
    () => ({
      getPrice: (sku?: string) => (sku ? products.find((p) => p.sku === sku)?.priceString ?? '' : ''),
      bundleSavings: computeBundleSavings(products, packSkus, bundleSku),
    }),
    [products, packSkus, bundleSku]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useProducts = (): ProductsValue => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useProducts must be used within ProductsProvider');
  return v;
};
```

- [ ] **Step 8: Run it to verify it passes**

Run: `npx jest src/state/__tests__/productsContext.test.tsx`
Expected: 2 tests PASS.

- [ ] **Step 9: Mount the provider**

In `app/_layout.tsx`, add the import and wrap inside `EntitlementsProvider`:

```tsx
import { ProductsProvider } from '@/src/state/ProductsContext';
```

```tsx
        <EntitlementsProvider>
          <ProductsProvider>
            <ProgressProvider>
              <PlayerProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="lab" options={{ headerShown: false }} />
                  <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
                </Stack>
              </PlayerProvider>
            </ProgressProvider>
          </ProductsProvider>
        </EntitlementsProvider>
```

- [ ] **Step 10: Verify, commit**

Run: `npm run typecheck` — expected exit 0.
Run: `npm test` — expected: all suites PASS.

```bash
git add src/features/store/savings.ts src/features/store/__tests__/savings.test.ts src/state/ProductsContext.tsx src/state/__tests__/productsContext.test.tsx app/_layout.tsx
git commit -m "feat: ProductsContext with store prices + computed bundle savings

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Async entitlements (buy/restore through the adapter)

**Files:**
- Modify: `src/state/EntitlementsContext.tsx` (full rewrite below)
- Modify: `app/(tabs)/explore.tsx:50-59` (`doRestore`, `onConfirm`)
- Modify: `app/(tabs)/profile.tsx:41-45` (`doRestore`)
- Test: `src/state/__tests__/entitlementsContext.test.tsx` (new)

**Interfaces:**
- Consumes: `getReadyStoreAdapter` (Task 4), `StoreAdapter`, `PurchaseOutcome` (Task 2), `loadJSON/saveJSON/KEYS` (existing).
- Produces (consumed by Task 7):
  - `useEntitlements(): { owned: string[]; buy: (sku: string | undefined) => Promise<PurchaseOutcome>; restore: () => Promise<boolean> }`
  - `EntitlementsProvider({ children, adapter? })` — `adapter` prop is a test seam.
  - Note: `buy` takes the **sku** (`storeProductId`), no longer pack id + paidIds + isBundle. `computeOwnedAfterBuy` stays exported from `@/src/state/EntitlementsContext` for the mock's use.

- [ ] **Step 1: Write the failing test**

Create `src/state/__tests__/entitlementsContext.test.tsx`:

```tsx
import React from 'react';
import { act, create } from 'react-test-renderer';

jest.mock('@/src/lib/storage', () => {
  const mem = new Map<string, unknown>();
  return {
    loadJSON: jest.fn(async (key: string, fallback: unknown) => (mem.has(key) ? mem.get(key) : fallback)),
    saveJSON: jest.fn(async (key: string, value: unknown) => {
      mem.set(key, value);
    }),
    KEYS: { owned: 'll.owned' },
    __mem: mem,
  };
});

import { EntitlementsProvider, useEntitlements } from '../EntitlementsContext';
import type { StoreAdapter } from '@/src/features/store/adapter';

const adapterWith = (overrides: Partial<StoreAdapter> = {}): StoreAdapter => ({
  init: async () => {},
  getProducts: async () => [],
  purchase: async () => ({ outcome: 'success', ownedPackIds: ['food'] }),
  restore: async () => [],
  getOwnedPackIds: async () => [],
  ...overrides,
});

let api!: ReturnType<typeof useEntitlements>;
function Probe() {
  api = useEntitlements();
  return null;
}

const mount = async (adapter: StoreAdapter) => {
  await act(async () => {
    create(
      <EntitlementsProvider adapter={adapter}>
        <Probe />
      </EntitlementsProvider>
    );
  });
};

beforeEach(() => {
  const { __mem } = jest.requireMock('@/src/lib/storage');
  __mem.clear();
});

test('launch reconciles owned from the adapter and persists it', async () => {
  await mount(adapterWith({ getOwnedPackIds: async () => ['sport'] }));
  expect(api.owned).toEqual(['sport']);
  const { __mem } = jest.requireMock('@/src/lib/storage');
  expect(__mem.get('ll.owned')).toEqual(['sport']);
});

test('launch keeps the cached list when the adapter throws (offline)', async () => {
  const { __mem } = jest.requireMock('@/src/lib/storage');
  __mem.set('ll.owned', ['retro']);
  await mount(adapterWith({ getOwnedPackIds: async () => Promise.reject(new Error('offline')) }));
  expect(api.owned).toEqual(['retro']);
});

test('successful buy updates owned; cancelled/failed do not', async () => {
  await mount(adapterWith());
  await act(async () => {
    expect(await api.buy('sku_food')).toBe('success');
  });
  expect(api.owned).toEqual(['food']);

  await mount(adapterWith({ purchase: async () => ({ outcome: 'cancelled' }) }));
  await act(async () => {
    expect(await api.buy('sku_food')).toBe('cancelled');
  });
  expect(api.owned).toEqual([]);
});

test('buy without a sku fails fast', async () => {
  const purchase = jest.fn();
  await mount(adapterWith({ purchase }));
  await act(async () => {
    expect(await api.buy(undefined)).toBe('failed');
  });
  expect(purchase).not.toHaveBeenCalled();
});

test('restore replaces owned and reports whether anything was found', async () => {
  await mount(adapterWith({ restore: async () => ['food', 'retro'] }));
  await act(async () => {
    expect(await api.restore()).toBe(true);
  });
  expect(api.owned).toEqual(['food', 'retro']);

  await mount(adapterWith({ restore: async () => [] }));
  await act(async () => {
    expect(await api.restore()).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest src/state/__tests__/entitlementsContext.test.tsx`
Expected: FAIL — the provider has no `adapter` prop and `buy` has the old `(packId, paidIds, isBundle)` signature.

- [ ] **Step 3: Rewrite EntitlementsContext**

Replace the entire contents of `src/state/EntitlementsContext.tsx` with:

```tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadJSON, saveJSON, KEYS } from '@/src/lib/storage';
import { getReadyStoreAdapter } from '@/src/features/store';
import type { PurchaseOutcome, StoreAdapter } from '@/src/features/store/adapter';

export { computeOwnedAfterBuy } from './entitlements';

interface EntitlementsValue {
  owned: string[];
  /** Purchase by store sku (pack.storeProductId / bundle.storeProductId). */
  buy: (sku: string | undefined) => Promise<PurchaseOutcome>;
  /** True if restore found anything to restore. */
  restore: () => Promise<boolean>;
}

const Ctx = createContext<EntitlementsValue | null>(null);

export function EntitlementsProvider({
  children,
  adapter,
}: {
  children: React.ReactNode;
  adapter?: StoreAdapter; // test seam; defaults to the app-wide adapter
}) {
  const [owned, setOwned] = useState<string[]>([]);

  const resolveAdapter = () => (adapter ? Promise.resolve(adapter) : getReadyStoreAdapter());

  useEffect(() => {
    let active = true;
    // Offline-first: cached entitlements render immediately…
    loadJSON<string[]>(KEYS.owned, []).then((cached) => {
      if (active) setOwned(cached);
    });
    // …then the store reconciles them (refunds, other-device purchases).
    (async () => {
      try {
        const fresh = await (await resolveAdapter()).getOwnedPackIds();
        if (!active) return;
        setOwned(fresh);
        saveJSON(KEYS.owned, fresh);
      } catch {
        // Store unreachable: keep the cached list.
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter]);

  const buy: EntitlementsValue['buy'] = async (sku) => {
    if (!sku) return 'failed';
    const result = await (await resolveAdapter()).purchase(sku);
    if (result.outcome === 'success') {
      setOwned(result.ownedPackIds);
      saveJSON(KEYS.owned, result.ownedPackIds);
    }
    return result.outcome;
  };

  const restore: EntitlementsValue['restore'] = async () => {
    try {
      const fresh = await (await resolveAdapter()).restore();
      setOwned(fresh);
      saveJSON(KEYS.owned, fresh);
      return fresh.length > 0;
    } catch {
      return false; // surfaced as "nothing to restore"; retry when online
    }
  };

  return <Ctx.Provider value={{ owned, buy, restore }}>{children}</Ctx.Provider>;
}

export const useEntitlements = (): EntitlementsValue => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useEntitlements must be used within EntitlementsProvider');
  return v;
};
```

- [ ] **Step 4: Update the two call sites**

In `app/(tabs)/explore.tsx`, replace `doRestore` and `onConfirm` (lines 50–59) with:

```tsx
  const doRestore = async () => {
    const ok = await restore();
    setToast(ok ? t('sheet.restored') : t('sheet.restoreEmpty'));
    setTimeout(() => setToast(null), 1800);
  };

  const onConfirm = (tg: PurchaseTarget) =>
    buy(tg.kind === 'bundle' ? tg.bundle.storeProductId : tg.pack.storeProductId);
```

In `app/(tabs)/profile.tsx`, replace `doRestore` (lines 41–45) with:

```tsx
  const doRestore = async () => {
    const ok = await restore();
    setToast(ok ? t('sheet.restored') : t('sheet.restoreEmpty'));
    setTimeout(() => setToast(null), 1800);
  };
```

(Note: `PurchaseSheet`'s `onConfirm` prop is still typed `(target) => void` until Task 7 — an async function is assignable to it, and during this transitional task the sheet's fake 950 ms timer simply runs alongside the real mock purchase.)

- [ ] **Step 5: Run all tests and typecheck**

Run: `npx jest src/state/__tests__/entitlementsContext.test.tsx` — expected: 5 tests PASS.
Run: `npm test` — expected: all suites PASS (the old `entitlements.test.ts` still passes untouched).
Run: `npm run typecheck` — expected exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/state/EntitlementsContext.tsx src/state/__tests__/entitlementsContext.test.tsx "app/(tabs)/explore.tsx" "app/(tabs)/profile.tsx"
git commit -m "feat: async entitlements via store adapter (buy/restore by sku)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: PurchaseSheet real outcomes + i18n strings

**Files:**
- Modify: `src/components/store/PurchaseSheet.tsx`
- Modify: `src/i18n/locales/en.json`, `src/i18n/locales/nl.json`, `src/i18n/locales/fr.json`, `src/i18n/locales/de.json`
- Test: `src/components/store/__tests__/purchaseSheet.test.tsx` (update + extend)

**Interfaces:**
- Consumes: `useProducts` (Task 5), `PurchaseOutcome` (Task 2). `onConfirm` prop becomes `(target: PurchaseTarget) => Promise<PurchaseOutcome>` — `explore.tsx` already returns exactly that (Task 6).
- Produces: sheet behavior — success → done phase; cancelled → back to confirm silently; failed → back to confirm with `t('sheet.failed')` shown; no price → confirm disabled + `t('sheet.noPrice')` shown.

- [ ] **Step 1: Add the i18n strings**

In each locale file, extend the `"sheet"` object with two keys (keep existing keys untouched):

`en.json`:
```json
    "failed": "Something went wrong. You weren't charged.",
    "noPrice": "Price unavailable — check your connection"
```

`nl.json`:
```json
    "failed": "Er ging iets mis. Er is niets afgeschreven.",
    "noPrice": "Prijs niet beschikbaar — controleer je verbinding"
```

`fr.json`:
```json
    "failed": "Une erreur s'est produite. Vous n'avez pas été débité.",
    "noPrice": "Prix indisponible — vérifiez votre connexion"
```

`de.json`:
```json
    "failed": "Etwas ist schiefgelaufen. Es wurde nichts abgebucht.",
    "noPrice": "Preis nicht verfügbar — prüfe deine Verbindung"
```

- [ ] **Step 2: Update the test file (failing first)**

Replace the contents of `src/components/store/__tests__/purchaseSheet.test.tsx` with:

```tsx
import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { Bundle } from '@/src/features/catalog/types';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: { View }, SlideInDown: { duration: () => ({}) } };
});
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});
jest.mock('@/src/theme/ThemeProvider', () => ({
  useTheme: () => ({
    dark: true,
    accent: { rgb: '255,153,51', deep: '204,102,0' },
    colors: {
      primary: '#f93', primaryDeep: '#c60', secondary: '#4af',
      text: '#fff', textMuted: '#aaa', textFaint: '#888',
    },
  }),
}));
jest.mock('@/src/state/SettingsContext', () => ({ useSettings: () => ({ locale: 'en' }) }));
// @expo/vector-icons loads fonts async, which trips act() warnings after teardown.
jest.mock('@/src/components/ui/MaterialIcon', () => ({ MaterialIcon: () => null }));

// Price comes from ProductsContext now; overridable per test.
let mockPrice = '€7,99';
jest.mock('@/src/state/ProductsContext', () => ({
  useProducts: () => ({ getPrice: () => mockPrice, bundleSavings: null }),
}));

import { PurchaseSheet } from '../PurchaseSheet';

const bundle: Bundle = {
  id: 'allaccess',
  title: { en: 'Unlock Everything' },
  blurb: { en: 'All paid packs.' },
  icon: 'workspace_premium',
  storeProductId: 'sku_allaccess',
};

const target = { kind: 'bundle', bundle } as const;

// Pressable is memo(forwardRef(...)), so we match on props rather than type.
const findRestore = (tree: ReactTestRenderer) =>
  tree.root.findAll((n) => n.props.testID === 'restore-purchases' && typeof n.props.onPress === 'function');

const findByTestID = (tree: ReactTestRenderer, testID: string) =>
  tree.root.findAll((n) => n.props.testID === testID && typeof n.props.onPress === 'function');

const texts = (tree: ReactTestRenderer): string[] =>
  tree.root.findAll((n) => n.type === 'Text' || (n.type as any)?.displayName === 'Text').flatMap((n) => {
    const c = n.props.children;
    return Array.isArray(c) ? c.filter((x) => typeof x === 'string') : typeof c === 'string' ? [c] : [];
  });

const mount = (onConfirm: (t: typeof target) => Promise<'success' | 'cancelled' | 'failed'>, onRestore = () => {}) => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <PurchaseSheet target={target} onConfirm={onConfirm} onClose={() => {}} onStart={() => {}} onRestore={onRestore} />
    );
  });
  return tree;
};

beforeEach(() => {
  mockPrice = '€7,99';
});

test('pressing restore calls onRestore', () => {
  const onRestore = jest.fn();
  const tree = mount(async () => 'success', onRestore);
  const [restore] = findRestore(tree);
  expect(restore).toBeDefined();
  act(() => restore.props.onPress());
  expect(onRestore).toHaveBeenCalledTimes(1);
});

test('restore is inert while payment is processing', async () => {
  const onRestore = jest.fn();
  let resolveBuy!: (o: 'success') => void;
  const pending = new Promise<'success'>((r) => (resolveBuy = r));
  const tree = mount(() => pending, onRestore);

  const [confirm] = findByTestID(tree, 'confirm-purchase');
  await act(async () => {
    confirm.props.onPress();
  });

  expect(findRestore(tree)).toHaveLength(0);
  expect(onRestore).not.toHaveBeenCalled();
  await act(async () => resolveBuy('success'));
});

test('successful purchase reaches the done phase', async () => {
  const tree = mount(async () => 'success');
  const [confirm] = findByTestID(tree, 'confirm-purchase');
  await act(async () => confirm.props.onPress());
  expect(texts(tree)).toContain('sheet.done');
});

test('cancelled purchase returns to confirm without an error', async () => {
  const tree = mount(async () => 'cancelled');
  const [confirm] = findByTestID(tree, 'confirm-purchase');
  await act(async () => confirm.props.onPress());
  expect(findByTestID(tree, 'confirm-purchase')).toHaveLength(1);
  expect(texts(tree)).not.toContain('sheet.failed');
});

test('failed purchase returns to confirm and shows the error', async () => {
  const tree = mount(async () => 'failed');
  const [confirm] = findByTestID(tree, 'confirm-purchase');
  await act(async () => confirm.props.onPress());
  expect(findByTestID(tree, 'confirm-purchase')).toHaveLength(1);
  expect(texts(tree)).toContain('sheet.failed');
});

test('without a price the confirm button is disabled and a hint shows', () => {
  mockPrice = '';
  const onConfirm = jest.fn(async () => 'success' as const);
  const tree = mount(onConfirm);
  const [confirm] = findByTestID(tree, 'confirm-purchase');
  act(() => confirm.props.onPress());
  expect(onConfirm).not.toHaveBeenCalled();
  expect(texts(tree)).toContain('sheet.noPrice');
});
```

- [ ] **Step 3: Run it to verify the new tests fail**

Run: `npx jest src/components/store/__tests__/purchaseSheet.test.tsx`
Expected: FAIL — the sheet still imports `getPrice` from `prices.ts`, uses the fake timer, and has no error/noPrice handling. (The two legacy tests may pass; the four new ones must fail.)

- [ ] **Step 4: Update PurchaseSheet**

In `src/components/store/PurchaseSheet.tsx`:

1. Replace the `getPrice` import (line 14) with:
```tsx
import { useProducts } from '@/src/state/ProductsContext';
import type { PurchaseOutcome } from '@/src/features/store/adapter';
```

2. Change the `onConfirm` prop type in `Props`:
```tsx
  onConfirm: (target: PurchaseTarget) => Promise<PurchaseOutcome>;
```

3. Inside the component, replace the `getPrice` call and the `go`/`dismiss` handlers:
```tsx
  const [phase, setPhase] = useState<Phase>('confirm');
  const [error, setError] = useState<string | null>(null);

  if (!target) return null;

  const isBundle = target.kind === 'bundle';
  const meta = isBundle ? target.bundle : target.pack;
  const title = meta.title[locale] ?? meta.title.en ?? '';
  const { getPrice } = useProducts();
  const price = getPrice(meta.storeProductId);

  const go = async () => {
    if (!price) return; // no price loaded → purchasing is disabled
    setError(null);
    setPhase('processing');
    const outcome = await onConfirm(target);
    if (outcome === 'success') {
      setPhase('done');
    } else {
      setPhase('confirm');
      if (outcome === 'failed') setError(t('sheet.failed'));
    }
  };

  const dismiss = () => {
    setPhase('confirm');
    setError(null);
    onClose();
  };
```

**Important:** `useProducts()` is a hook — hooks must not be called after the early `return null`. Move the `if (!target) return null;` line to AFTER all hook calls (`useState`, `useProducts`, `useTheme`, `useSettings`, `useTranslation`, `useSafeAreaInsets`), like this ordering: hooks first, then the guard, then derived values.

4. Update the confirm button `disabled` and add the error/noPrice hints. Replace the CTA block (the `<View style={styles.cta}>` containing the confirm `Pressable`) with:

```tsx
              <View style={styles.cta}>
                <Pressable
                  testID="confirm-purchase"
                  onPress={phase === 'confirm' ? go : undefined}
                  disabled={phase === 'processing' || !price}
                  style={{ borderRadius: radii.pill, opacity: price ? 1 : 0.5 }}
                >
                  <LinearGradient colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.confirmBtn}>
                    {phase === 'processing' ? (
                      <>
                        <ActivityIndicator color="#ffffff" />
                        <Text style={styles.confirmText}>{t('sheet.processing')}</Text>
                      </>
                    ) : (
                      <>
                        <MaterialIcon name="lock" size={18} color="#ffffff" />
                        <Text style={styles.confirmText}>{t('sheet.confirm')}{price ? ` · ${price}` : ''}</Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>

              {error && (
                <View style={styles.hintRow}>
                  <MaterialIcon name="error" size={14} color={colors.secondary} />
                  <Text style={[styles.hint, { color: colors.secondary }]}>{error}</Text>
                </View>
              )}
              {!price && (
                <View style={styles.hintRow}>
                  <MaterialIcon name="wifi_off" size={14} color={colors.textMuted} />
                  <Text style={[styles.hint, { color: colors.textMuted }]}>{t('sheet.noPrice')}</Text>
                </View>
              )}
```

(The existing `faceid` hint row, cancel button, and restore row stay below, unchanged.)

- [ ] **Step 5: Run the sheet tests to verify they pass**

Run: `npx jest src/components/store/__tests__/purchaseSheet.test.tsx`
Expected: 6 tests PASS. If the `texts()` helper finds no strings, adjust it to also flatten nested arrays — but prefer fixing the assertion, not the component.

- [ ] **Step 6: Full verify and commit**

Run: `npm test` — expected: all suites PASS.
Run: `npm run typecheck` — expected exit 0.

```bash
git add src/components/store/PurchaseSheet.tsx src/components/store/__tests__/purchaseSheet.test.tsx src/i18n/locales/en.json src/i18n/locales/nl.json src/i18n/locales/fr.json src/i18n/locales/de.json
git commit -m "feat: PurchaseSheet handles real purchase outcomes

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Cards read ProductsContext; delete the old price book

**Files:**
- Modify: `src/components/store/PackCard.tsx` (lines 11, 30)
- Modify: `src/components/store/BundleCard.tsx` (lines 10, 22, 36-40)
- Modify: `app/(tabs)/explore.tsx` (lines 14, 93)
- Delete: `src/features/store/prices.ts`

**Interfaces:**
- Consumes: `useProducts` (Task 5).
- Produces: no module imports `@/src/features/store/prices` anymore; the file is gone.

- [ ] **Step 1: PackCard**

In `src/components/store/PackCard.tsx`, replace line 11:
```tsx
import { useProducts } from '@/src/state/ProductsContext';
```
and inside the component replace `const price = getPrice(pack.storeProductId);` with:
```tsx
  const { getPrice } = useProducts();
  const price = getPrice(pack.storeProductId);
```

- [ ] **Step 2: BundleCard**

In `src/components/store/BundleCard.tsx`, replace line 10:
```tsx
import { useProducts } from '@/src/state/ProductsContext';
```
Inside the component (hooks are already before the `if (allOwned) return null;` guard — add this one above that guard too):
```tsx
  const { getPrice, bundleSavings } = useProducts();
```
Replace `const price = getPrice(bundle.storeProductId);` with:
```tsx
  const price = getPrice(bundle.storeProductId);
```
And make the savings pill conditional — replace the `<View style={styles.pill}>…</View>` block with:
```tsx
          {bundleSavings && (
            <View style={styles.pill}>
              <Text style={styles.pillText}>
                {t('store.save')} {bundleSavings.savePct}% · {t('store.regular')} {bundleSavings.regular}
              </Text>
            </View>
          )}
```

- [ ] **Step 3: explore.tsx grid prices**

In `app/(tabs)/explore.tsx`: remove line 14 (`import { getPrice } …`), add to the imports:
```tsx
import { useProducts } from '@/src/state/ProductsContext';
```
add inside the component next to the other hooks:
```tsx
  const { getPrice } = useProducts();
```
(line 93's `price={getPrice(p.storeProductId)}` then keeps working unchanged.)

- [ ] **Step 4: Delete the mock price book**

Delete `src/features/store/prices.ts`.
Run: `npx jest --listTests` should still list all suites; then verify nothing references it:
`grep -r "features/store/prices" src app` (or on Windows: `findstr /s /m "features/store/prices" src\* app\*`)
Expected: no matches.

- [ ] **Step 5: Full verify**

Run: `npm test` — expected: ALL suites PASS.
Run: `npm run typecheck` — expected exit 0.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: cards read store prices from ProductsContext; drop mock price book

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Post-plan reality checklist (not code — user + dashboard work)

The app now runs end-to-end on the mock. Real purchases additionally need (from the spec, in order):

1. Apple Developer Program enrollment (individual-vs-organization decision pending — see spec "Seller identity").
2. RevenueCat account; project with an Apple app for `com.locallogo.app`; the 5 products; entitlements `food`/`eighties`/`sport`/`retro` with `sku_allaccess` attached to all four.
3. Paste the public Apple SDK key into `app.json` → `extra.revenuecatIosApiKey`.
4. App Store Connect: Paid Applications agreement, 5 non-consumable IAPs, base prices + per-country overrides (the regional pricing feature).
5. `eas build --profile development --platform ios`, install on iPhone, sandbox-test: buy pack, buy bundle, cancel, restore, airplane-mode launch, storefront-country switch.
