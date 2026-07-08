# Explore Hub with Grid/List Toggle (beta) — Design

**Date:** 2026-07-08
**Status:** Approved for planning
**Supersedes:** parts of `2026-07-08-category-screen-design.md` (the Arena category picker)

## Problem

After the category-screen change, the Arena picker and the Explore store both list
packs — two near-duplicate screens. For the beta we consolidate: **Explore is the
one category hub** (with two switchable presentations to A/B test), and **Arena is
gameplay only**.

## Scope

**In scope**

- App launches on the Explore tab.
- Explore: grid ⇄ list view toggle, persisted; same pack info in both views;
  inline purchasing; playable packs start a round.
- Arena idle state: minimal "Continue · last pack" screen.
- Retire the Arena category picker (`CategoryPicker`); reuse `CategoryTile` in
  Explore's grid.
- Remove the "Try free" link for the beta.

**Out of scope**

- Sample gating (still deferred).
- Any change to PackRound, purchase/entitlements logic, Profile, or bottom nav
  structure.

## Behaviour & Flow

1. App launches → **Explore tab** (categories hub).
2. Explore header shows a **view toggle** (grid/list icon button). The chosen view
   persists in storage (`ll.storeView`, `'grid' | 'list'`, default `'list'`).
3. **List view** = current Explore: bundle card, `PackCard` rows, restore link,
   disclaimer.
4. **Grid view** = 2-column `CategoryTile` grid carrying the same info: title,
   solved/questions, owned check, lock + **price** on locked tiles. Bundle card
   above the grid; restore + disclaimer below (both views share these).
5. Either view: tapping a **playable** pack navigates to Arena with `?pack=<id>`
   and the round starts (existing deep-link effect). Tapping a **locked** pack
   opens `PurchaseSheet` in place; after buying, **Start** deep-links into the
   just-bought pack's round.
6. "Try free" is removed for the beta (its old target — the generic all-brands
   arena — no longer exists; sample gating remains deferred).
7. **Arena tab**: with an active round, renders `PackRound` (unchanged — back
   arrow / summary exit return to the **idle screen**, and testers can also
   switch tabs). With no active round, renders a **Continue screen**: kicker,
   "Continue · <last-played pack title>", a Play button that starts the
   remembered pack (resolved via `resolveLastPack`: last → first free → first),
   and a "Browse categories" link to Explore. If the resolved pack is not
   playable (all packs locked), the Play button is disabled.
8. Starting any round still writes `KEYS.lastPack` (existing PackRound effect).

## Architecture

- `app/(tabs)/_layout.tsx` + `app/_layout.tsx`: `initialRouteName` → `'explore'`.
- `app/(tabs)/explore.tsx`: owns the view-toggle state (hydrated from
  `KEYS.storeView`), renders list (existing markup) or grid
  (`CategoryTile` grid). Locked tap → `setTarget({kind:'pack', pack})` (same as
  list's `onBuy`). Playable tap → `playPack(pack.id)` (existing helper).
- `src/components/quiz/CategoryTile.tsx`: gains an optional `price?: string`
  prop shown on locked tiles (from `getPrice(pack.storeProductId)`).
- `app/(tabs)/index.tsx` (Arena): replaces `CategoryPicker` with a new
  `ContinueCard` idle screen; keeps the `?pack=` deep-link effect and
  `PackRound` switch exactly as-is.
- `src/components/quiz/ContinueCard.tsx` *(new)*: consumes `useCatalog`,
  `useEntitlements`, `KEYS.lastPack` (hydration-gated like CategoryPicker was),
  `resolveLastPack`, `isPackPlayable`. Emits `onStart(pack)` and
  `onBrowse()`.
- `src/components/quiz/CategoryPicker.tsx`: deleted (superseded).
- `src/lib/storage.ts`: add `storeView: 'll.storeView'` to `KEYS`.
- `src/components/ui/MaterialIcon.tsx`: add `grid_view` → `'grid-view'` and
  `view_list` → `'view-list'` to the icon MAP.
- i18n (all 4 locales): `store.viewGrid` / `store.viewList` (a11y labels for the
  toggle), `arena.continueKicker` ("Jump back in" etc.), `arena.browse`
  ("Browse categories"). Reuse `category.continue` for the button.

## Data Flow

- View preference: `loadJSON(KEYS.storeView, 'list')` on Explore mount; saved on
  toggle. No flicker concern beyond first paint (default list).
- Continue screen: same hydration-gate pattern as the old picker — resolve
  remembered pack only after `KEYS.lastPack` loads; Play disabled until then.
- Round start from Explore: `router.navigate({ pathname: '/', params: { pack } })`
  — unchanged deep-link contract (consume-on-playable, guarded against live
  rounds).

## Edge Cases

- Remembered pack invalid/hidden → `resolveLastPack` fallback (existing tested
  helper).
- All packs locked → Continue Play disabled; Browse categories still works.
- Pack with 0 questions → not startable (existing guards in tile/deep-link).
- Toggle hydration: default `'list'` renders until stored value arrives —
  acceptable (no wrong-selection implications, purely presentational).

## Testing

- Unit: none required beyond existing helper tests (`resolveLastPack`,
  `isPackPlayable`, `filterDeckByPack` already cover the logic). View toggle and
  screens are RN UI per repo pattern (typecheck + manual smoke).
- Manual smoke (beta): launch → Explore; toggle grid/list persists across
  relaunch; play from both views; buy from both views → Start plays; Arena tab
  idle shows Continue with last pack; Continue plays; relaunch remembers.
