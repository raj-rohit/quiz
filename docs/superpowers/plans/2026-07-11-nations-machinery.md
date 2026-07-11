# Nations Machinery Implementation Plan (sub-project 2a)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The market/nation data model and state machinery — market-tagged content, `NationContext` (home + active nation, pass-gated roaming, refund snap-back), market filtering in `useCatalog`, and nation-scoped deck caches + progress. No UI (that is plan 2b); with one market live, the app behaves exactly as today.

**Architecture:** Supabase gains `quiz_brands.market`, `packs.markets` (null = all markets), and `app_config.markets` (authoritative live-market list). `NationProvider` holds `homeNation`/`activeNation` (AsyncStorage-persisted; active snaps back to home whenever `hasPass` is false). `useCatalog` filters packs by `activeNation` — the single choke point all five consumers share — and exposes `markets`. PackRound queries brands by market and nation-scopes its deck cache; progress `byPack` keys become `nl:retro`-style with a silent one-time migration.

**Tech Stack:** React Native (Expo), TypeScript, Jest, Supabase (management API for DDL).

**Spec:** `docs/superpowers/specs/2026-07-11-launch-catalog-and-nations-design.md` §Sub-project 2

## Global Constraints

- Default/fallback nation is `'nl'` everywhere (unknown or removed market codes in stored state → `'nl'`).
- `activeNation === homeNation` unless the user holds the `pass` entitlement (`hasPass` from EntitlementsContext); whenever `hasPass` is false, `activeNation` MUST snap back to `homeNation` (covers refunds). Roaming state may persist, but never survives pass loss.
- Pack visibility per market: `markets` null/empty ⇒ visible in ALL markets; else visible iff it contains the active nation code.
- Storage keys: `ll.homeNation`, `ll.activeNation` (new); deck cache `ll.deck.cache.<nation>.<packId>`; progress `byPack` keys `<nation>:<packId>`. One-time silent migrations prefix existing un-scoped keys with `nl` — no data loss.
- `OFFLINE_CATALOG` stays the NL-only offline fallback; offline packs have no `markets` field (= all markets).
- No UI in this plan: no new visible components, no picker, no switcher. With `markets.length === 1` the app renders identically to today.
- Branch: create `feat/nations-machinery` from `feat/iap-followups`. Run tests `npx jest <path> --silent`; full suite + `npx tsc --noEmit` green at the end of every task.

---

### Task 1: Supabase schema migration

Dashboard/DB operation via Supabase management API (controller executes; token supplied by Rohit in-session). No repo code except committing the reference SQL.

**Files:**
- Create: `docs/superpowers/plans/2026-07-11-nations-supabase.sql`

**Interfaces:**
- Produces: `quiz_brands.market text not null default 'nl'`; `packs.markets text[] null`; `app_config.markets jsonb` = `[{"code":"nl","name":"Nederland"}]`.

- [ ] **Step 1: Write and commit the reference SQL**

```sql
-- Nations machinery (2026-07-11 spec §Sub-project 2). Run via management API / SQL editor.
alter table quiz_brands add column if not exists market text not null default 'nl';
create index if not exists quiz_brands_market_idx on quiz_brands (market, pack_id);

alter table packs add column if not exists markets text[];  -- null = all markets

alter table app_config add column if not exists markets jsonb
  default '[{"code": "nl", "name": "Nederland"}]'::jsonb;
update app_config set markets = '[{"code": "nl", "name": "Nederland"}]'::jsonb where markets is null;

select column_name, data_type from information_schema.columns
 where table_name in ('quiz_brands', 'packs', 'app_config') order by table_name, ordinal_position;
```

```bash
git add docs/superpowers/plans/2026-07-11-nations-supabase.sql
git commit -m "docs: supabase DDL for nations machinery"
```

- [ ] **Step 2: Execute via management API** (POST `https://api.supabase.com/v1/projects/mbvxulohggcyvuqceupr/database/query`, bearer = Rohit's session token) and verify the SELECT output lists the three new columns.

- [ ] **Step 3: Verify through the app's anon read path**

Node one-liner with the app's URL + publishable key: `select('id,markets')` on `packs` (expect `markets: null` on all rows) and `select('id,market').limit(3)` on `quiz_brands` (expect `market: 'nl'`), and `app_config.select('markets')` (expect the one-entry list).

---

### Task 2: Pure nation logic + catalog market plumbing

**Files:**
- Create: `src/state/nation.ts`
- Modify: `src/features/catalog/types.ts`
- Modify: `src/features/catalog/merge.ts`
- Modify: `src/features/catalog/useCatalog.ts` (markets exposure only — filtering wires up in Task 3)
- Test: `src/state/__tests__/nation.test.ts` (create)
- Test: `src/features/catalog/__tests__/merge.test.ts` (extend if it exists; create the cases below regardless)

**Interfaces:**
- Consumes: `Pack`/`Catalog` types; `RemotePack`/`RemoteConfig` in merge.ts.
- Produces (Task 3+ relies on these exact names):
  - `src/state/nation.ts`: `DEFAULT_NATION = 'nl'`; `interface Market { code: string; name: string }`; `sanitizeNation(code: string | null | undefined, markets: Market[]): string`; `packInMarket(markets: string[] | null | undefined, nation: string): boolean`; `scopedKey(nation: string, packId: string): string` (returns `` `${nation}:${packId}` ``); `migrateByPack(byPack: Record<string, number>): Record<string, number>` (prefixes un-scoped keys with `nl:`, idempotent).
  - `Pack.markets?: string[] | null`; `Catalog.markets: Market[]` (offline default `[{ code: 'nl', name: 'Nederland' }]`).
  - `useCatalog()` returns `{ catalog }` where `catalog.markets` reflects `app_config.markets`.

- [ ] **Step 1: Write the failing tests**

`src/state/__tests__/nation.test.ts`:

```ts
import { DEFAULT_NATION, sanitizeNation, packInMarket, scopedKey, migrateByPack } from '../nation';

const MARKETS = [
  { code: 'nl', name: 'Nederland' },
  { code: 'be', name: 'België' },
];

test('sanitizeNation returns the code when it is a live market', () => {
  expect(sanitizeNation('be', MARKETS)).toBe('be');
});

test('sanitizeNation falls back to nl for unknown, removed, or missing codes', () => {
  expect(sanitizeNation('fr', MARKETS)).toBe(DEFAULT_NATION);
  expect(sanitizeNation(null, MARKETS)).toBe(DEFAULT_NATION);
  expect(sanitizeNation(undefined, [])).toBe(DEFAULT_NATION);
});

test('packInMarket: null/empty markets means all markets', () => {
  expect(packInMarket(null, 'be')).toBe(true);
  expect(packInMarket(undefined, 'nl')).toBe(true);
  expect(packInMarket([], 'be')).toBe(true);
});

test('packInMarket: scoped packs match only their listed markets', () => {
  expect(packInMarket(['be'], 'be')).toBe(true);
  expect(packInMarket(['be'], 'nl')).toBe(false);
});

test('scopedKey formats nation:packId', () => {
  expect(scopedKey('nl', 'retro')).toBe('nl:retro');
});

test('migrateByPack prefixes un-scoped keys with nl and is idempotent', () => {
  const once = migrateByPack({ retro: 5, 'be:food': 2 });
  expect(once).toEqual({ 'nl:retro': 5, 'be:food': 2 });
  expect(migrateByPack(once)).toEqual(once);
});
```

Merge cases (in `src/features/catalog/__tests__/merge.test.ts`, creating the file with the repo's existing test style if absent):

```ts
import { mergeCatalog } from '../merge';

const row = (id: string, extra: object = {}) => ({ id, title: { en: id }, ...extra });

test('mergeCatalog carries pack markets through (null = all)', () => {
  const cat = mergeCatalog([row('a'), row('b', { markets: ['be'] })], null);
  expect(cat.packs.find((p) => p.id === 'a')!.markets).toBeNull();
  expect(cat.packs.find((p) => p.id === 'b')!.markets).toEqual(['be']);
});

test('mergeCatalog reads app_config markets with NL fallback', () => {
  expect(mergeCatalog([row('a')], null).markets).toEqual([{ code: 'nl', name: 'Nederland' }]);
  expect(
    mergeCatalog([row('a')], { markets: [{ code: 'nl', name: 'Nederland' }, { code: 'be', name: 'België' }] }).markets
  ).toEqual([{ code: 'nl', name: 'Nederland' }, { code: 'be', name: 'België' }]);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest src/state/__tests__/nation.test.ts src/features/catalog/__tests__/merge.test.ts --silent`
Expected: FAIL — module `../nation` not found; `markets` undefined on packs/catalog.

- [ ] **Step 3: Implement**

`src/state/nation.ts`:

```ts
// Pure nation/market logic — no RN imports.

export const DEFAULT_NATION = 'nl';

export interface Market {
  code: string;
  name: string;
}

/** A stored nation code is only valid while its market is live in app_config. */
export function sanitizeNation(code: string | null | undefined, markets: Market[]): string {
  return code && markets.some((m) => m.code === code) ? code : DEFAULT_NATION;
}

/** Pack visibility per market: null/empty = every market. */
export function packInMarket(markets: string[] | null | undefined, nation: string): boolean {
  return !markets || markets.length === 0 || markets.includes(nation);
}

/** Nation-scoped storage key: deck caches and progress are per (nation, pack). */
export function scopedKey(nation: string, packId: string): string {
  return `${nation}:${packId}`;
}

/** One-time migration: pre-nations byPack keys were bare pack ids ⇒ they were NL. */
export function migrateByPack(byPack: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(byPack)) {
    out[key.includes(':') ? key : scopedKey(DEFAULT_NATION, key)] = value;
  }
  return out;
}
```

`src/features/catalog/types.ts` — add to `Pack`:

```ts
  /** Markets this pack exists in; null/absent = all markets. */
  markets?: string[] | null;
```

and to `Catalog`:

```ts
  /** Live markets from app_config; single-entry list keeps all nation UI dormant. */
  markets: Market[];
```

with `import type { Market } from '@/src/state/nation';` at the top.

`src/features/catalog/catalog.ts` — add to the `OFFLINE_CATALOG` literal (after `bundle`):

```ts
  markets: [{ code: 'nl', name: 'Nederland' }],
```

`src/features/catalog/merge.ts`:
- `RemotePack` gains `markets?: string[] | null;`
- `RemoteConfig` gains `markets?: Market[] | null;` (import the type)
- `toPack` gains `markets: r.markets ?? null,`
- `mergeCatalog` return becomes:

```ts
  return {
    packs,
    bundle: bundleFrom(remoteConfig),
    markets: remoteConfig?.markets?.length ? remoteConfig.markets : OFFLINE_CATALOG.markets,
  };
```

`src/features/catalog/useCatalog.ts` — the `app_config` select already fetches the whole row, so `markets` flows through `mergeCatalog(rows, configRes.data)` unchanged. No edit needed; confirm by reading.

- [ ] **Step 4: Run to verify pass, then full suite + typecheck**

Run: `npx jest src/state/__tests__/nation.test.ts src/features/catalog/__tests__/merge.test.ts --silent` → PASS.
Run: `npx jest --silent` and `npx tsc --noEmit` → all green (adding `markets` to `Catalog` is the one breaking type change — `OFFLINE_CATALOG` gains the field in this task; any test fixture building a bare `Catalog` object needs the field added).

- [ ] **Step 5: Commit**

```bash
git add src/state/nation.ts src/state/__tests__/nation.test.ts src/features/catalog/types.ts src/features/catalog/catalog.ts src/features/catalog/merge.ts src/features/catalog/__tests__/merge.test.ts
git commit -m "feat: pure nation logic + market fields through the catalog pipeline"
```

---

### Task 3: NationContext + market filtering in useCatalog

**Files:**
- Create: `src/state/NationContext.tsx`
- Modify: `src/features/catalog/useCatalog.ts`
- Modify: `src/lib/storage.ts` (two KEYS entries)
- Modify: `app/_layout.tsx` (provider wiring)
- Test: `src/state/__tests__/nationContext.test.tsx` (create)

**Interfaces:**
- Consumes: `sanitizeNation`, `DEFAULT_NATION`, `packInMarket` from Task 2; `useEntitlements().hasPass` (exists since sub-project 1).
- Produces:
  - `NationProvider` (must sit BELOW `EntitlementsProvider`, ABOVE anything calling `useCatalog`).
  - `useNation(): { homeNation: string; activeNation: string; setHomeNation: (code: string) => void; roamTo: (code: string) => void }`. `roamTo` is a no-op unless `hasPass`. Both persist (`KEYS.homeNation`, `KEYS.activeNation`).
  - `useCatalog()` now returns market-filtered `catalog.packs` (by `activeNation`); `catalog.markets` unfiltered.

- [ ] **Step 1: Write the failing tests**

`src/state/__tests__/nationContext.test.tsx` — mirror the storage-mock + provider-mount harness style of `src/state/__tests__/entitlementsContext.test.tsx` (module-level `api` capture via a probe component, `act`-wrapped mount). The behavioral contract:

```tsx
test('defaults to nl home and active with empty storage', ...);
// mount with hasPass=false → homeNation 'nl', activeNation 'nl'

test('setHomeNation persists and moves active with it when not roaming', ...);
// setHomeNation('be') → home 'be', active 'be', ll.homeNation saved 'be'

test('roamTo is ignored without the pass', ...);
// hasPass=false, roamTo('be') → activeNation stays 'nl'

test('roamTo switches active for pass holders and persists', ...);
// hasPass=true, roamTo('be') → active 'be', home unchanged 'nl', ll.activeNation saved

test('active snaps back to home when the pass disappears', ...);
// storage seeded ll.homeNation='nl', ll.activeNation='be'; mount with hasPass=false → active 'nl' and ll.activeNation re-saved 'nl'

test('stored codes are sanitized against live markets', ...);
// storage seeded ll.homeNation='fr' with markets=[nl] → home 'nl'
```

Provide `hasPass` and `markets` via test seams: `NationProvider` accepts optional props `{ hasPassOverride?: boolean; markets?: Market[] }` used only in tests (default: `hasPass` from `useEntitlements()`, markets default `[{code:'nl',...}]` — full markets plumbed from catalog in a later plan when the UI needs the live list; sanitize against the prop for now).

Write each test with real assertions per the contract lines above (no empty bodies) — adapt render/`act` mechanics to the entitlementsContext harness.

- [ ] **Step 2: Run to verify failure**

Run: `npx jest src/state/__tests__/nationContext.test.tsx --silent`
Expected: FAIL — module `../NationContext` not found.

- [ ] **Step 3: Implement**

`src/lib/storage.ts` — add to `KEYS`:

```ts
  homeNation: 'll.homeNation',
  activeNation: 'll.activeNation',
```

`src/state/NationContext.tsx`:

```tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadJSON, saveJSON, KEYS } from '@/src/lib/storage';
import { useEntitlements } from './EntitlementsContext';
import { DEFAULT_NATION, Market, sanitizeNation } from './nation';

interface NationValue {
  homeNation: string;
  /** The market currently played; differs from home only while a pass holder roams. */
  activeNation: string;
  setHomeNation: (code: string) => void;
  /** Pass-gated: silently ignored without the pass. */
  roamTo: (code: string) => void;
}

const Ctx = createContext<NationValue | null>(null);

const NL_ONLY: Market[] = [{ code: 'nl', name: 'Nederland' }];

export function NationProvider({
  children,
  hasPassOverride,
  markets = NL_ONLY,
}: {
  children: React.ReactNode;
  /** Test seam; production reads EntitlementsContext. */
  hasPassOverride?: boolean;
  /** Live market list; UI plumbs the catalog's list in plan 2b. */
  markets?: Market[];
}) {
  const { hasPass: hasPassReal } = useEntitlements();
  const hasPass = hasPassOverride ?? hasPassReal;
  const [homeNation, setHome] = useState(DEFAULT_NATION);
  const [activeNation, setActive] = useState(DEFAULT_NATION);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const home = sanitizeNation(await loadJSON<string | null>(KEYS.homeNation, null), markets);
      const active = sanitizeNation(await loadJSON<string | null>(KEYS.activeNation, null), markets);
      if (!mounted) return;
      setHome(home);
      setActive(active);
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Roaming never survives pass loss (refunds, other-device revocations).
  useEffect(() => {
    if (!hasPass && activeNation !== homeNation) {
      setActive(homeNation);
      saveJSON(KEYS.activeNation, homeNation);
    }
  }, [hasPass, activeNation, homeNation]);

  const setHomeNation = (code: string) => {
    const next = sanitizeNation(code, markets);
    setHome(next);
    saveJSON(KEYS.homeNation, next);
    if (!hasPass || activeNation === homeNation) {
      setActive(next);
      saveJSON(KEYS.activeNation, next);
    }
  };

  const roamTo = (code: string) => {
    if (!hasPass) return;
    const next = sanitizeNation(code, markets);
    setActive(next);
    saveJSON(KEYS.activeNation, next);
  };

  return <Ctx.Provider value={{ homeNation, activeNation, setHomeNation, roamTo }}>{children}</Ctx.Provider>;
}

export const useNation = (): NationValue => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useNation must be used within NationProvider');
  return v;
};
```

`src/features/catalog/useCatalog.ts` — filter at the choke point:

```ts
import { packInMarket } from '@/src/state/nation';
import { useNation } from '@/src/state/NationContext';
```

inside the hook, after the existing state:

```ts
  const { activeNation } = useNation();
```

and change the return to filter (cache/fetch stay raw — the same cached catalog serves every nation):

```ts
  return {
    catalog: {
      ...catalog,
      packs: catalog.packs.filter((p) => packInMarket(p.markets, activeNation)),
    },
  };
```

`app/_layout.tsx` — wrap `NationProvider` immediately inside `EntitlementsProvider` (read the file for the exact provider stack; every `useCatalog` consumer must be inside it).

- [ ] **Step 4: Run to verify pass, then full suite + typecheck**

Run: `npx jest src/state/__tests__/nationContext.test.tsx --silent` → PASS.
Run: `npx jest --silent` + `npx tsc --noEmit` → green. Suites that render `useCatalog` consumers without providers will now throw `useNation must be used within NationProvider` — wrap their test trees in `NationProvider` (with `EntitlementsProvider` or `hasPassOverride`) as needed; fixture-only changes.

- [ ] **Step 5: Commit**

```bash
git add src/state/NationContext.tsx src/state/__tests__/nationContext.test.tsx src/features/catalog/useCatalog.ts src/lib/storage.ts app/_layout.tsx
git commit -m "feat: NationContext with pass-gated roaming; useCatalog filters packs by active nation"
```

---

### Task 4: Nation-scoped brand query, deck cache, and progress

**Files:**
- Modify: `src/components/quiz/PackRound.tsx`
- Modify: `src/state/ProgressContext.tsx`
- Modify: `src/state/progress.ts` (only if `applyResult` hardcodes key shape — read first)
- Modify: `app/(tabs)/explore.tsx`, `app/(tabs)/profile.tsx`, `app/(tabs)/index.tsx` and any other `progress.byPack[...]` reader — scoped lookups
- Test: `src/state/__tests__/progress.test.ts` (extend), `src/state/__tests__/nation.test.ts` (migration already covered in Task 2)

**Interfaces:**
- Consumes: `useNation().activeNation`, `scopedKey`, `migrateByPack` from Tasks 2–3.
- Produces: brands fetched with `.eq('market', activeNation)`; deck cache key `` `${KEYS.deck}.${activeNation}.${pack.id}` ``; `progress.byPack` keyed `nation:packId` (migrated on load); every byPack read goes through `scopedKey(activeNation, packId)`.

- [ ] **Step 1: Write the failing test for progress migration on load**

Extend the ProgressContext/progress tests (match the existing harness in `src/state/__tests__/progress.test.ts` — if it tests only the pure `applyResult`, add a context-level test file following the entitlementsContext harness): seed `ll.progress` with `{ byPack: { retro: 5 }, ... }` (spread `emptyProgress()` for remaining fields), mount, expect `progress.byPack` to equal `{ 'nl:retro': 5 }`; also `record({ packId: scopedKey('nl','food'), ... })` accumulates under `nl:food`.

- [ ] **Step 2: Verify RED**, then implement:

`src/state/ProgressContext.tsx` load effect:

```ts
  useEffect(() => {
    loadJSON<Progress>(KEYS.progress, emptyProgress()).then((p) => {
      const migrated = { ...p, byPack: migrateByPack(p.byPack ?? {}) };
      setProgress(migrated);
    });
  }, []);
```

(import `migrateByPack` from `./nation`). `record`/`applyResult` stay shape-agnostic: callers pass already-scoped pack keys. Read `src/state/progress.ts` to confirm `QuizResult.packId` is an opaque string key (expected); if any logic parses pack ids, adapt it here and say so in the report.

`src/components/quiz/PackRound.tsx`:

```ts
  const { activeNation } = useNation();
  const cacheKey = `${KEYS.deck}.${activeNation}.${pack.id}`;
```

brand fetch adds `.eq('market', activeNation)` after the existing `.eq('pack_id', pack.id)`; the deck effect's dependency array gains `activeNation` (via `cacheKey` it already re-runs — confirm `cacheKey` is in the deps, it is today). Where the round records progress (`record(...)` call — find it in the summary/finish path), the pack key becomes `scopedKey(activeNation, pack.id)`. `KEYS.lastPack` stays un-scoped (Continue card resumes in the active market; acceptable, note it).

Readers: in `explore.tsx` (`progress.byPack[p.id]` twice), `profile.tsx`, `index.tsx` / ContinueCard / category screens — every `byPack[<packId>]` read becomes `byPack[scopedKey(activeNation, <packId>)]` with `useNation()` added where missing. Grep `byPack` to enumerate all readers; update each.

- [ ] **Step 3: Verify GREEN + full suite + typecheck**

Focused tests → PASS; `npx jest --silent` + `npx tsc --noEmit` → green (update any test expecting un-scoped byPack keys).

- [ ] **Step 4: End-to-end sanity on web**

`npx expo start --web`: play a Classics question, confirm solved count still shows on Explore (now stored under `nl:classics`), and localStorage `ll.progress` shows `nl:`-prefixed keys after a round. Confirm deck loads (brands query with `market='nl'` returns rows because Task 1 backfilled the default).

- [ ] **Step 5: Commit**

```bash
git add src/components/quiz/PackRound.tsx src/state/ProgressContext.tsx src/state/progress.ts app/(tabs)/explore.tsx app/(tabs)/profile.tsx app/(tabs)/index.tsx src/state/__tests__/
git commit -m "feat: nation-scoped brand queries, deck caches, and progress keys with silent nl migration"
```

(Adjust the `git add` list to the files actually touched — e.g. ContinueCard/category screens if they read byPack.)

---

## Self-review notes

- Spec §Sub-project 2 coverage: schema → Task 1; `NationContext` semantics (home/active, silent-`'nl'` default, snap-back, sanitize) → Task 3; filtering choke points → Task 3 (packs) + Task 4 (brands); cache/progress scoping + migration → Tasks 2 (pure) & 4 (wiring). Deliberately deferred to plan 2b (UI): first-launch picker + device-region default, Explore switcher + locked-flag upsell, Profile home row + confirm copy, plumbing the live catalog markets list into `NationProvider`, and the final-review carryovers (BundleCard visibility decision, seed-then-clear `hasPass` test).
- Dormancy invariant: with `app_config.markets` = one entry, `sanitizeNation` pins everything to `'nl'`, filtering is a no-op (all packs have null markets), and no UI exists — the app is behaviorally identical to today except storage key shapes.
- Type ripple: `Catalog.markets` is required — Task 2 Step 4 calls out fixture updates explicitly.
