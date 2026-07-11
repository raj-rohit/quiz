# Launch Catalog & Nations — Design

**Date:** 2026-07-11
**Status:** Approved (brainstorm session with Rohit)
**Scope:** Two sequential sub-projects sharing one strategy: (1) launch catalog reshape — one paid pack + all-access pass; (2) nation/market system with pass-gated roaming. Content production is explicitly out of scope — Rohit adds content via the Supabase pipeline after the app work ships.

## Strategy background (decisions already made)

- Monetization is **purchases only — no ads at launch** (ads may be reconsidered later only if data warrants; see memory notes).
- Research basis: ~2% payer conversion is the realistic ceiling; trivia converts worst of all game categories. Therefore: maximize free content, concentrate monetization into few decisions.
- Two-app splits (ad/IAP variants) rejected — App Review 4.3 risk + self-cannibalization.
- Pricing intent: **Retro €2.99, pass €4.99** — changeable at any time in store dashboards; prices never live in code.
- The pass's long-term identity: **"all packs, all countries, all future content."** Future-pack shelves: new categories, new markets (Belgium first), decade packs (90s/2000s before older), pan-EU packs.

## Sub-project 1 — Launch catalog reshape

### Store structure at launch

| Pack | `is_free` | `visible` | SKU state |
|---|---|---|---|
| classics | true | true | — (never had one) |
| food | **true** (was false) | true | `sku_food` dormant |
| sport | **true** (was false) | true | `sku_sport` dormant |
| eighties | false | **false** (hidden in Supabase; row REMOVED from `OFFLINE_CATALOG` — see note) | `sku_eighties` dormant; best content folds into retro via content work; may return as a decade pack |
| retro | false | true | `sku_retro` — the single paid pack, €2.99 |
| bundle (allaccess) | — | — | `sku_allaccess` — the pass, €4.99 |

Dormant SKUs stay in code, Supabase, and RevenueCat. Reviving one = flip `is_free` in Supabase + create the ASC product. No app update.

### The pass

- Bundle copy (all 4 locales) changes from "All 4 paid packs. One-time." to the future-facing pitch: everything today **plus every future pack**, one-time purchase.
- The savings pill hides automatically: `computeBundleSavings` already returns null when the bundle is not cheaper than the sum of paid packs (€4.99 > €2.99) — no code change needed, verified.
- **Standing rule:** every future paid pack's entitlement MUST get `sku_allaccess` attached in RevenueCat at creation time. That is the mechanism that makes the pass promise true (worked example: a future paid EU pack → create `eu` entitlement, attach `sku_eu` AND `sku_allaccess`).

### New `pass` entitlement (RevenueCat)

Problem: with one paid pack, "owns all paid pack ids" cannot distinguish a Retro buyer from a pass holder — but only pass holders may roam nations (sub-project 2).

Fix: a dedicated **`pass` entitlement** attached to `sku_allaccess` only. App-side, `pass` is a capability flag, never a pack id:

- `EntitlementsContext` exposes `hasPass: boolean` (true when `pass` ∈ active entitlements).
- Owned-pack derivation ignores non-pack entitlement keys (pack ids come from the catalog; `pass` is filtered out).

### Dashboard changes (via RevenueCat MCP)

1. Create entitlement `pass` ("All Access Pass"), attach `sku_allaccess`.
2. Test Store prices: `sku_retro` → €2.99/$2.99; `sku_allaccess` → €4.99/$4.99.
3. Later, at ASC setup time: only 2 products needed at launch (`sku_retro`, `sku_allaccess`).

### Code changes

- `OFFLINE_CATALOG`: food/sport flip to `isFree: true`; the **eighties row is removed entirely** (offline fallback mirrors launch state). Rationale: `paidIds()` filters only on `isFree`, not `visible` — a hidden-but-paid offline row would leak into `PAID_IDS` and the mock bundle grant. With the row gone, `PAID_IDS` derives to `['retro']` correctly. New bundle copy per "The pass" section.
- Mock adapter price book: keep all five SKU entries (dormant SKUs stay priced, harmless); update `sku_retro` → 2.99 and `sku_allaccess` → 4.99 so Expo Go/web mirror the Test Store.
- i18n: new bundle title/blurb strings (nl/en/fr/de).
- `EntitlementsContext.hasPass` + filtering `pass` out of owned pack ids.
- Tests: update suites assuming 4 paid packs (savings, mock, entitlements); add `hasPass` tests.
- Supabase (content-side, exact SQL provided in plan; Rohit executes or approves): `packs` flag updates matching the table.

## Sub-project 2 — Nation/market system

### Chosen approach (B)

Market column on brands + optional market scoping on packs. Rejected: (A) brands-only column — cannot express "pack not yet available in market X", forces all-or-nothing market launches; (C) per-market packs/SKUs — SKU explosion, breaks "buy once, works everywhere".

### Supabase schema

- `quiz_brands.market` — text (`'nl'`, `'be'`, …). Existing rows backfilled `'nl'`. `batch_add_brands.js` gains a market parameter (content-side follow-up).
- `packs.markets` — nullable text[]. `null` = all markets (all current packs). Belgium-only or held-back packs list specific markets.
- `app_config.markets` — authoritative list of live markets: `[{"code":"nl","name":"Nederland"}, …]`. The app derives market availability ONLY from this list. Launching a market = add entry after its content is loaded. Rohit controls the switch.

### App state — new `NationContext`

- `homeNation` — AsyncStorage-persisted. While `markets.length <= 1`: silently `'nl'`, **zero nation UI anywhere** (dormant rule). When a 2nd market ships: existing players (local progress present) keep `'nl'` silently; fresh installs get a one-time picker pre-selected from device region (`expo-localization`).
- `activeNation` — the market currently played; equals `homeNation` unless a pass holder roams. Persisted; **snaps back to `homeNation` whenever `hasPass` is false** (covers refunds/expiry).
- Free users may change `homeNation` (deliberate, confirmed action in Profile) — one home at a time. This is the expat path and removes any incentive for reinstall tricks; paid content protection comes from entitlements alone.

### Filtering (two existing queries)

- `useCatalog`: packs where `markets is null OR activeNation ∈ markets`.
- PackRound brand query: add `.eq('market', activeNation)`.
- `OFFLINE_CATALOG` remains the NL-only offline fallback.

### Cache & progress correctness when roaming

Deck caches and progress are keyed per pack today; a Belgian retro deck must not collide with the Dutch one. Both key families become nation-scoped (`nl:retro`), with a one-time silent migration renaming existing keys to the `nl:` prefix. Store-price and entitlement state are nation-independent (one storefront, one entitlement set) — untouched.

### Roaming UI (rendered only when `markets.length >= 2`)

- **Explore header**: compact flag control → nation sheet. Pass holders switch `activeNation` instantly; a subtle "browsing 🇧🇪" indicator shows when `activeNation ≠ homeNation`. Non-pass users see other nations with a small lock; tapping one opens the existing PurchaseSheet for the pass (upsell at the moment of desire; their home flag always works).
- **Profile**: "Home nation" row → same sheet in move-home mode, free for everyone, one-line confirm. Progress stays saved per country (nation-scoped keys make this true automatically).
- Gate is a single check everywhere: `canRoam = hasPass`.

### Error handling

- Unknown/removed market code in stored state → fall back to `'nl'`.
- Market with a visible pack but zero brands for it → pack behaves as PackRound's existing empty-deck path; content discipline (config list updated only after content) makes this rare.
- Offline while roaming → cached nation-scoped deck or offline catalog fallback; same stale-while-revalidate semantics as today.

### Testing

- Unit: market filtering (null vs scoped), nation state transitions incl. refund snap-back, key migration, `hasPass` derivation, picker default logic (existing-player vs fresh-install).
- Component: nation sheet in roam mode vs move-home mode; locked-flag → PurchaseSheet.
- All existing suites pass with the reshaped catalog.

## Out of scope

- Content production (all markets) — Rohit, post-implementation, via `batch_add_brands.js`.
- The EU pack, decade packs, Belgium content — future content work; the design accommodates them with zero code (worked example above).
- Per-nation leaderboards, market-specific pricing logic (store price schedules handle regional pricing), ads.
- ASC product creation — blocked on Apple enrollment; only 2 products needed at launch.

## Sequencing

1. Sub-project 1 (catalog reshape) — small; test on the Android Test Store build.
2. Sub-project 2 (nations) — bigger; dormant at launch by design, exercised fully when Belgium content lands.
