# RevenueCat In-App Purchases — Design

**Date:** 2026-07-10
**Status:** Approved (brainstormed with Rohit)

## Goal

Replace the mocked purchase system with real Apple In-App Purchases via RevenueCat, so paid packs can be sold on the App Store with per-country pricing. This removes the App Store submission blocker.

## Decisions made

- **Platform:** iOS first. Code supports Android too, but Google Play store setup is deferred.
- **Integration:** RevenueCat SDK (`react-native-purchases`) behind the app's existing interfaces. The custom `PurchaseSheet` UI stays; RevenueCat's paywall UI is not used.
- **Mock stays:** current mock behavior remains as the fallback for web, Expo Go, and Jest tests.
- **Bundle identifier:** `com.locallogo.app` (iOS), same value for Android `package`. Permanent once the App Store app record is created.
- **Product IDs:** keep the existing catalog SKUs unchanged: `sku_food`, `sku_eighties`, `sku_sport`, `sku_retro`, `sku_allaccess`. All five are **non-consumable** (one-time, permanent) purchases.
- **Regional pricing lives in App Store Connect,** not in code. Base price per product; per-country overrides (e.g. cheaper price for India) set in the ASC price schedule. The app only ever displays the localized price string the store returns.
- **Constraints honored:** developer machine is Windows (no Mac) → all iOS builds via EAS Build cloud service. Testing on a physical iPhone with a sandbox Apple account.
- **Seller identity: deferred.** Rohit does not want his personal name on the App Store listing. Individual Apple accounts publicly show the developer's legal name (plus EU trader contact info under the DSA, since the app sells IAPs); showing only a brand requires enrolling as an **organization** (registered legal entity + D-U-N-S number). Decision (individual vs. form a company) is postponed — all code work proceeds now on the mock adapter, and the dashboards checklist below starts only after that decision.

## Architecture

### Store adapter

New module `src/features/store/adapter.ts` defines the interface both implementations satisfy:

```ts
interface StoreProduct {
  sku: string;
  priceString: string;   // localized, e.g. "€2,99" / "₹99" — display as-is
  price: number;         // numeric, for bundle-savings math
  currencyCode: string;  // e.g. "EUR"
}

type PurchaseOutcome = 'success' | 'cancelled' | 'failed';

type PurchaseResult =
  | { outcome: 'success'; ownedPackIds: string[] }
  | { outcome: 'cancelled' }
  | { outcome: 'failed' };

interface StoreAdapter {
  init(): Promise<void>;                       // configure SDK, warm product cache
  getProducts(skus: string[]): Promise<StoreProduct[]>;
  purchase(sku: string): Promise<PurchaseResult>;
  restore(): Promise<string[]>;                // owned pack ids after restore
  getOwnedPackIds(): Promise<string[]>;        // current entitlements (launch sync)
}
```

### Implementations

- **`src/features/store/revenuecat.ts`** — wraps `react-native-purchases`.
  - `init` calls `Purchases.configure({ apiKey })` with the public Apple SDK key.
  - Owned packs come from RevenueCat **entitlements**: one entitlement per paid pack, identifier = pack id (`food`, `eighties`, `sport`, `retro`). Owned = keys of `customerInfo.entitlements.active`. Refund revocations propagate automatically.
  - `purchase` maps SDK results: user-cancelled flag → `'cancelled'`; other errors → `'failed'`; success returns updated owned list from the returned customer info.
- **`src/features/store/mock.ts`** — today's behavior, extracted: `MOCK_PRICES` price book, instant purchase success, AsyncStorage-backed ownership. Maps SKU → pack ids via the offline catalog (`sku_allaccess` → all paid ids via `computeOwnedAfterBuy`, single SKU → its pack id). Used by tests, web, and Expo Go, where the offline catalog is the norm.

### Adapter selection (`src/features/store/index.ts`)

Use RevenueCat only when it can actually run; otherwise mock. Conditions for RevenueCat, checked at startup:

1. `Platform.OS` is `ios` or `android`, and
2. not running in Expo Go (`Constants.appOwnership !== 'expo'`), and
3. an API key is configured (`Constants.expoConfig.extra.revenuecatIosApiKey` non-empty).

If `init()` throws despite the checks (e.g. native module missing), log and fall back to mock so the app never crashes over billing.

### API key

RevenueCat's **public** Apple SDK key goes in `app.json` under `expo.extra.revenuecatIosApiKey`, read via `expo-constants` (already a dependency). Public SDK keys are safe to embed in the binary. Until the real key exists, the value is empty string → adapter selection falls back to mock, so the code can merge before the accounts exist.

## File-level changes

| File | Change |
|---|---|
| `src/features/store/adapter.ts` | **New.** `StoreAdapter`, `StoreProduct`, `PurchaseOutcome` types. |
| `src/features/store/revenuecat.ts` | **New.** RevenueCat implementation. |
| `src/features/store/mock.ts` | **New.** Mock implementation (moves logic from `prices.ts` + mock buy). |
| `src/features/store/index.ts` | **New.** Adapter selection + singleton export. |
| `src/features/store/prices.ts` | **Deleted.** Prices must trigger re-renders when they load asynchronously, so a module-level `getPrice` can't work — the single price mechanism is `ProductsContext`. The mock price book moves into `mock.ts`; `BUNDLE_REGULAR`/`BUNDLE_SAVE_PCT` constants are removed in favor of computed values. |
| `src/state/EntitlementsContext.tsx` | `buy` becomes `buy(sku: string | undefined): Promise<PurchaseOutcome>` — callers pass the target's `storeProductId` and it delegates to `adapter.purchase(sku)`; `restore` becomes async. On launch: load AsyncStorage cache immediately (offline-first), then `adapter.getOwnedPackIds()` and reconcile. AsyncStorage remains the offline cache of owned pack ids. |
| `src/state/entitlements.ts` | Unchanged (`computeOwnedAfterBuy` now used by the mock adapter). |
| `src/state/ProductsContext.tsx` | **New.** Loads products once at startup via adapter; exposes `getPrice(sku)` and `bundleSavings` (regular-price total + save %) via a `useProducts()` hook. `PackCard`, `BundleCard`, and `PurchaseSheet` switch from the `prices.ts` import to this hook. |
| `src/components/store/PurchaseSheet.tsx` | `onConfirm` awaits the real async buy. Outcomes: `success` → existing done state; `cancelled` → silently return to confirm; `failed` → inline error text under the button. Missing price (products not loaded) → confirm button disabled. |
| `src/components/store/BundleCard.tsx` | Strikethrough price + save % come from `bundleSavings` (sum of the 4 pack numeric prices, formatted with `Intl.NumberFormat` in the products' currency). Hidden when products aren't loaded. |
| `app/(tabs)/explore.tsx`, `app/(tabs)/profile.tsx` | Adjust to async `buy`/`restore`. |
| `app.json` | Add `ios.bundleIdentifier` + `android.package` = `com.locallogo.app`, `extra.revenuecatIosApiKey: ""`. |
| `package.json` | Add `react-native-purchases`, `expo-dev-client` (via `npx expo install`). |
| `src/i18n/locales/*.json` | New strings: purchase failed, price unavailable. |

## Data flows

- **Startup:** EntitlementsProvider shows cached owned list from AsyncStorage immediately → adapter `init()` → products fetched (prices appear) → `getOwnedPackIds()` reconciles ownership (handles refunds and purchases made on another device with the same Apple ID).
- **Price display:** components call `getPrice(sku)` → returns the store's localized string, or `''` while loading/offline (UI already renders empty price gracefully; buy is disabled).
- **Purchase:** confirm tap → `buy(target)` → Apple payment sheet → outcome mapped to sheet phase; on success owned list updated + persisted.
- **Restore:** existing buttons → `adapter.restore()` → owned list replaced with result; empty result keeps the existing "nothing to restore" messaging.
- **Offline launch:** cached ownership works; prices empty; buying disabled.

## Store-side configuration (dashboards, not code)

### App Store Connect (after Apple Developer enrollment — individual vs. organization decision pending, see Decisions)

1. Sign the **Paid Applications agreement** + banking/tax info (IAPs are invisible to the app until this is done).
2. Create the app record with bundle id `com.locallogo.app`.
3. Create 5 in-app purchases, type **non-consumable**, product IDs exactly matching the SKUs above; add localized display names (nl/en/fr/de to match the app's locales).
4. **Pricing:** pick a base price per product (current mock values: packs €1.99–€3.99, bundle €7.99). Apple generates all ~175 storefront prices; override individual countries in the price schedule where desired. This is the entire "different price per country" feature — zero code.
5. Enroll in the **App Store Small Business Program** (15% commission instead of 30%).

### RevenueCat dashboard

1. Create project "Local Logo"; add an Apple App Store app with the bundle id + App Store Connect **In-App Purchase key** (for server-side receipt validation).
2. Import/add the 5 products.
3. Create 4 entitlements — `food`, `eighties`, `sport`, `retro`. Attach each pack's product to its entitlement; attach `sku_allaccess` to **all four**. (Future packs: create the new entitlement and attach `sku_allaccess` to it too, so all-access keeps meaning "everything".)
4. Copy the **public Apple API key** into `app.json` → `extra.revenuecatIosApiKey`.

### Build & test (no Mac)

1. `npx expo install expo-dev-client react-native-purchases`, configure EAS (`eas build:configure`).
2. `eas build --profile development --platform ios` (cloud build; requires the Apple Developer account), install on the iPhone via the QR/link.
3. Create a **sandbox tester** in App Store Connect; on the iPhone, set the sandbox account (Settings → App Store → Sandbox Account). Verify: buy a pack, buy the bundle, cancel mid-payment, restore after reinstall, airplane-mode launch.
4. Change the sandbox account's country to verify regional price display (e.g. India storefront shows ₹).

## Error handling

- Products fail to load (offline / ASC misconfig): prices render empty, confirm disabled — never show wrong or stale prices.
- Purchase fails (network, payment declined): sheet returns to confirm with a translated inline error; no ownership change.
- User cancels Apple's sheet: treated as normal, back to confirm, no error shown.
- Interrupted/pending transactions: RevenueCat replays them on next launch; the launch reconcile picks them up.
- `init()` failure: fall back to mock adapter in dev; in production builds log to console (no crash — packs simply appear unpurchasable with empty prices; free content unaffected).

## Testing

- **Existing Jest suites** run against the mock adapter unchanged (purchaseSheet, merge, entitlements tests).
- **New unit tests:** adapter selection logic (platform/Expo Go/key permutations); RevenueCat customer-info → owned-pack-ids mapping (including refund revocation = entitlement disappears); bundle savings math + `Intl.NumberFormat` formatting; PurchaseSheet cancelled/failed phases.
- **Manual sandbox pass** on the iPhone per the checklist above, before TestFlight/submission.

## Out of scope

- Google Play Console setup and Android store testing (code paths exist but untested until Android ships).
- Subscriptions, consumables, price experiments, promo offers.
- Server-side entitlement sync into Supabase (RevenueCat is the source of truth; can be added later via their webhooks if ever needed).
