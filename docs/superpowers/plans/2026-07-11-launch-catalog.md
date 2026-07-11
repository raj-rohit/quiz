# Launch Catalog Reshape Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reshape the launch catalog to one paid pack (Retro €2.99) + an all-access pass (€4.99) with a dedicated `pass` entitlement, everything else free, eighties hidden.

**Architecture:** Flag flips in the baked-in offline catalog (Supabase mirrors via SQL that Rohit runs), a new `pass` capability entitlement in RevenueCat distinguished from pack ids app-side, and mock-adapter parity so web/Expo Go behave like the Test Store. No new screens; the savings pill hides itself.

**Tech Stack:** React Native (Expo), TypeScript, Jest, RevenueCat (MCP for dashboard ops), Supabase (content SQL).

**Spec:** `docs/superpowers/specs/2026-07-11-launch-catalog-and-nations-design.md`

## Global Constraints

- Prices NEVER live in code — dashboard values only (Test Store now: retro €2.99/$2.99, allaccess €4.99/$4.99).
- `pass` is a capability flag, never a pack id: it must not appear in the `owned` pack list consumers see.
- Dormant SKUs (`sku_food`, `sku_sport`, `sku_eighties`) stay in code, mock price book, Supabase, and RevenueCat.
- Standing rule (dashboard, for every FUTURE paid pack): attach `sku_allaccess` to the new pack's entitlement.
- Branch: commit pending working-tree changes on `feat/iap-followups` first (Android store enable + eas.json — pre-existing WIP, one commit `feat: enable RevenueCat on Android via Test Store key + EAS build config`), then create `feat/launch-catalog` from it.
- Run tests with `npx jest <path> --silent`; full suite + `npx tsc --noEmit` must pass at the end of every task.

---

### Task 1: RevenueCat dashboard — `pass` entitlement + new Test Store prices

Dashboard operations via the RevenueCat MCP (no repo code). Project `proj17d1e20f`, products: `sku_retro` = `prod8d456eb91f`, `sku_allaccess` = `prod3f5c6570bc`.

**Files:** none (dashboard state). Record resulting entitlement id in the task commit message of Task 4 (docs-only reference).

**Interfaces:**
- Produces: RevenueCat entitlement with `lookup_key: "pass"` attached to `sku_allaccess`; Test Store prices retro 2.99 EUR + 2.99 USD, allaccess 4.99 EUR + 4.99 USD.

- [ ] **Step 1: Create the `pass` entitlement**

`create-entitlement` with `project_id: proj17d1e20f`, body `{"lookup_key": "pass", "display_name": "All Access Pass"}`. Note the returned entitlement id.

- [ ] **Step 2: Attach `sku_allaccess`**

`attach-products-to-entitlement` with the new entitlement id, body `{"product_ids": ["prod3f5c6570bc"]}`.

- [ ] **Step 3: Update prices (one currency per call — API limitation)**

`create-product-prices` four times:
- `prod8d456eb91f` + `{"prices":[{"currency":"EUR","amount_micros":2990000}]}`
- `prod8d456eb91f` + `{"prices":[{"currency":"USD","amount_micros":2990000}]}`
- `prod3f5c6570bc` + `{"prices":[{"currency":"EUR","amount_micros":4990000}]}`
- `prod3f5c6570bc` + `{"prices":[{"currency":"USD","amount_micros":4990000}]}`

- [ ] **Step 4: Verify**

`list-prices` for both products → expect exactly the four values above. `get-products-from-entitlement` for the new entitlement → expect `sku_allaccess` only.

---

### Task 2: Offline catalog reshape

**Files:**
- Modify: `src/features/catalog/catalog.ts`
- Test: `src/features/catalog/__tests__/launchCatalog.test.ts` (create)

**Interfaces:**
- Consumes: existing `OFFLINE_CATALOG`, `paidIds`, `PAID_IDS` exports.
- Produces: `PAID_IDS === ['retro']`; `OFFLINE_CATALOG.packs` has 4 entries (classics, food, sport, retro — no eighties); food/sport `isFree: true` (storeProductIds retained); new future-facing bundle blurb.

- [ ] **Step 1: Write the failing test**

Create `src/features/catalog/__tests__/launchCatalog.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/catalog/__tests__/launchCatalog.test.ts --silent`
Expected: FAIL — `PAID_IDS` is `['food','eighties','sport','retro']`, eighties present, old blurb.

- [ ] **Step 3: Edit `src/features/catalog/catalog.ts`**

In the `food` pack object: change `isFree: false` → `isFree: true`.
In the `sport` pack object: change `isFree: false` → `isFree: true`.
Delete the entire `eighties` pack object (the `{ id: 'eighties', … }` block, currently lines 44–62).
In `sortOrder`: leave existing values (gaps are fine; packs sort numerically).
Replace the bundle `blurb`:

```ts
    blurb: {
      nl: 'Alle packs — nu én in de toekomst. Eénmalig.',
      en: 'Every pack, now and in the future. One-time.',
      fr: 'Tous les packs, actuels et futurs. Une fois.',
      de: 'Alle Packs, jetzt und künftig. Einmalig.',
    },
```

Update the file-top comment on the eighties removal is NOT needed; instead add one line above the packs array:

```ts
// Launch shape (2026-07-11 spec): retro is the only paid pack; food/sport are
// free with dormant SKUs; eighties lives only in Supabase (hidden) until it
// returns as a decade pack.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/features/catalog/__tests__/launchCatalog.test.ts --silent`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the FULL suite — expect two pre-existing suites to break**

Run: `npx jest --silent`
Expected: `launchCatalog` PASS; `src/features/store/__tests__/mock.test.ts` FAILS (bundle test expects 4 paid ids). Possibly `src/theme/__tests__/builds.test.ts` or snapshot-ish suites if they iterate packs — if any other suite fails, fix its fixture to the 4-pack catalog in this task (do not change product code for it).

- [ ] **Step 6: Update `src/features/store/__tests__/mock.test.ts` expectations**

Replace the `PAID` constant and the two affected tests:

```ts
const PAID = ['retro'];
```

```ts
test('ownedAfterMockPurchase maps the bundle sku to all paid ids plus the pass', () => {
  expect(ownedAfterMockPurchase('sku_allaccess', ['food'])!.sort()).toEqual(
    ['food', 'pass', 'retro'].sort()
  );
});
```

(The `'sku_food'` mapping test still passes — food keeps its dormant SKU. The `getProducts` price expectations change in Task 3; leave them for now.)

Note: this test's new expectation (`pass` granted by the bundle) FAILS until Task 3 lands the mock change — that is the intended TDD hand-off. Run `npx jest src/features/store/__tests__/mock.test.ts --silent` and confirm the ONLY failure is the new `pass` expectation.

- [ ] **Step 7: Commit**

```bash
git add src/features/catalog/catalog.ts src/features/catalog/__tests__/launchCatalog.test.ts src/features/store/__tests__/mock.test.ts
git commit -m "feat: launch catalog shape — retro only paid pack, eighties hidden, pass blurb"
```

---

### Task 3: `PASS_ID` + mock adapter parity

**Files:**
- Modify: `src/state/entitlements.ts`
- Modify: `src/features/store/mock.ts`
- Test: `src/features/store/__tests__/mock.test.ts` (already updated in Task 2 Step 6)

**Interfaces:**
- Consumes: `computeOwnedAfterBuy(owned, packId, paidIds, isBundle)` (unchanged); `PAID_IDS` from Task 2.
- Produces: `export const PASS_ID = 'pass'` from `src/state/entitlements.ts`; mock bundle purchase returns pack ids ∪ `PASS_ID`; mock prices retro €2,99 / allaccess €4,99.

- [ ] **Step 1: Run the failing test from Task 2**

Run: `npx jest src/features/store/__tests__/mock.test.ts --silent`
Expected: FAIL — bundle purchase result lacks `'pass'`.

- [ ] **Step 2: Add `PASS_ID` to `src/state/entitlements.ts`**

```ts
/**
 * Capability entitlement granted only by sku_allaccess. Never a pack id —
 * consumers must not surface it in owned-pack lists (see EntitlementsContext).
 */
export const PASS_ID = 'pass';
```

- [ ] **Step 3: Update `src/features/store/mock.ts`**

Import and grant the pass on bundle purchases; update the price book:

```ts
import { computeOwnedAfterBuy, PASS_ID } from '@/src/state/entitlements';
```

```ts
const MOCK_PRODUCTS: StoreProduct[] = [
  { sku: 'sku_food', priceString: '€2,99', price: 2.99, currencyCode: 'EUR' },
  { sku: 'sku_eighties', priceString: '€2,99', price: 2.99, currencyCode: 'EUR' },
  { sku: 'sku_sport', priceString: '€1,99', price: 1.99, currencyCode: 'EUR' },
  { sku: 'sku_retro', priceString: '€2,99', price: 2.99, currencyCode: 'EUR' },
  { sku: 'sku_allaccess', priceString: '€4,99', price: 4.99, currencyCode: 'EUR' },
];
```

```ts
export function ownedAfterMockPurchase(sku: string, current: string[]): string[] | null {
  if (sku === OFFLINE_CATALOG.bundle.storeProductId) {
    // Mirror RevenueCat: the bundle grants every paid pack AND the pass flag.
    return computeOwnedAfterBuy(current, OFFLINE_CATALOG.bundle.id, [...PAID_IDS, PASS_ID], true);
  }
  const pack = OFFLINE_CATALOG.packs.find((p) => p.storeProductId === sku);
  if (!pack) return null;
  return computeOwnedAfterBuy(current, pack.id, PAID_IDS, false);
}
```

- [ ] **Step 4: Update the price expectation in `mock.test.ts`**

In the `getProducts` test, the allaccess line becomes:

```ts
    { sku: 'sku_allaccess', priceString: '€4,99', price: 4.99, currencyCode: 'EUR' },
```

- [ ] **Step 5: Run mock tests**

Run: `npx jest src/features/store/__tests__/mock.test.ts --silent`
Expected: PASS (all 6).

- [ ] **Step 6: Commit**

```bash
git add src/state/entitlements.ts src/features/store/mock.ts src/features/store/__tests__/mock.test.ts
git commit -m "feat: PASS_ID capability entitlement; mock adapter grants pass and mirrors new prices"
```

---

### Task 4: `hasPass` in EntitlementsContext (pass never leaks into owned)

**Files:**
- Modify: `src/state/EntitlementsContext.tsx`
- Test: `src/state/__tests__/entitlementsContext.test.tsx` (add cases)

**Interfaces:**
- Consumes: `PASS_ID` from Task 3; existing `EntitlementsValue { owned, buy, restore }` and its test harness (fake adapter seam via the `adapter` prop).
- Produces: `EntitlementsValue.hasPass: boolean`; `owned` guaranteed to exclude `PASS_ID` while raw entitlement keys (including `pass`) stay in AsyncStorage under `KEYS.owned`.

- [ ] **Step 1: Write the failing tests**

Add to `src/state/__tests__/entitlementsContext.test.tsx`, following the file's existing fake-adapter pattern (an object implementing `StoreAdapter` passed via the `adapter` prop; mirror the surrounding tests' render/act helpers exactly):

```tsx
test('bundle purchase sets hasPass and keeps pass out of owned', async () => {
  const adapter = fakeAdapter({
    purchase: async () => ({ outcome: 'success' as const, ownedPackIds: ['retro', 'pass'] }),
  });
  const api = await renderEntitlements(adapter);
  expect(await api.buy('sku_allaccess')).toBe('success');
  expect(api.current.hasPass).toBe(true);
  expect(api.current.owned).toEqual(['retro']); // pass is a capability, not a pack
});

test('reconcile without pass clears hasPass', async () => {
  const adapter = fakeAdapter({ getOwnedPackIds: async () => ['retro'] });
  const api = await renderEntitlements(adapter);
  expect(api.current.hasPass).toBe(false);
  expect(api.current.owned).toEqual(['retro']);
});
```

If the file has no named `fakeAdapter`/`renderEntitlements` helpers, adapt the two tests to whatever inline pattern its existing tests use — the assertions are the contract, the harness is the file's.

- [ ] **Step 2: Run to verify failure**

Run: `npx jest src/state/__tests__/entitlementsContext.test.tsx --silent`
Expected: FAIL — `hasPass` undefined / TS error on the interface.

- [ ] **Step 3: Implement in `src/state/EntitlementsContext.tsx`**

```tsx
import { PASS_ID } from './entitlements';
```

```tsx
interface EntitlementsValue {
  /** Owned pack ids — never contains PASS_ID. */
  owned: string[];
  /** All-access pass: unlocks roaming (nations) and every future pack. */
  hasPass: boolean;
  /** Purchase by store sku (pack.storeProductId / bundle.storeProductId). */
  buy: (sku: string | undefined) => Promise<PurchaseOutcome>;
  /** True if restore found anything to restore. */
  restore: () => Promise<boolean>;
}
```

State keeps the RAW entitlement keys (storage stays backward/forward-compatible); derivation happens at the provider value:

```tsx
  const [rawOwned, setRawOwned] = useState<string[]>([]);
  const owned = rawOwned.filter((id) => id !== PASS_ID);
  const hasPass = rawOwned.includes(PASS_ID);
```

Rename every existing `setOwned(x)` call to `setRawOwned(x)` (initial cache load, reconcile, `buy` success, `restore`) — the saved value under `KEYS.owned` remains the raw list.

```tsx
  return <Ctx.Provider value={{ owned, hasPass, buy, restore }}>{children}</Ctx.Provider>;
```

- [ ] **Step 4: Run the suite for this file**

Run: `npx jest src/state/__tests__/entitlementsContext.test.tsx --silent`
Expected: PASS (existing + 2 new).

- [ ] **Step 5: Full suite + typecheck**

Run: `npx jest --silent` then `npx tsc --noEmit`
Expected: all suites PASS, typecheck clean. (Consumers of `owned` are unaffected — the filtered list is a subset; nothing consumes `hasPass` yet until the nations sub-project.)

- [ ] **Step 6: Commit**

```bash
git add src/state/EntitlementsContext.tsx src/state/__tests__/entitlementsContext.test.tsx
git commit -m "feat: hasPass capability flag; pass entitlement never leaks into owned packs"
```

---

### Task 5: Supabase content SQL + end-to-end verification

**Files:**
- Create: `docs/superpowers/plans/2026-07-11-launch-catalog-supabase.sql` (reference copy, committed)

**Interfaces:**
- Consumes: Supabase tables `packs` (`is_free`, `visible` columns) and `app_config` (`bundle` json).
- Produces: remote catalog matching `OFFLINE_CATALOG`'s launch shape.

- [ ] **Step 1: Write the SQL reference file**

```sql
-- Launch catalog reshape (2026-07-11 spec). Run in Supabase SQL editor.
update packs set is_free = true  where id in ('food', 'sport');
update packs set visible = false where id = 'eighties';
-- retro stays: is_free = false, visible = true (verify, don't change)

update app_config set bundle = jsonb_set(
  bundle::jsonb,
  '{blurb}',
  '{"nl": "Alle packs — nu én in de toekomst. Eénmalig.",
    "en": "Every pack, now and in the future. One-time.",
    "fr": "Tous les packs, actuels et futurs. Une fois.",
    "de": "Alle Packs, jetzt und künftig. Einmalig."}'::jsonb
);
```

- [ ] **Step 2: Rohit runs the SQL** (app anon key cannot write) — pause here and ask him to run it in the Supabase dashboard SQL editor, or walk him through it.

- [ ] **Step 3: Verify end-to-end on a device/web**

Start the app (`npx expo start`, web is fine — mock adapter). Expected in Explore: classics/food/sport free (no price chip), retro shows €2,99, bundle card shows €4,99 with the new future-packs blurb and NO strikethrough-savings pill. Buy the bundle (mock): retro unlocks.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-07-11-launch-catalog-supabase.sql
git commit -m "docs: supabase SQL for launch catalog flags"
```

---

## Self-review notes

- Spec coverage: store-structure table → Task 2+5; pass entitlement → Tasks 1, 3, 4; prices → Tasks 1, 3; bundle copy → Tasks 2, 5; savings-pill auto-hide → verified by design in Task 5 Step 3 (no code task needed); dormant SKUs → Tasks 2 (kept storeProductIds) and 3 (kept price-book entries). Standing rule recorded in Global Constraints.
- The nations sub-project has its own plan, written after this one lands (spec §Sub-project 2).
