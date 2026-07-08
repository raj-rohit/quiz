# Category Screen (open-on-pick) — Design

**Date:** 2026-07-08
**Status:** Approved for planning

## Problem

Today the app opens `initialRouteName: 'index'` straight into a round, loading *all*
active `quiz_brands` as one undifferentiated deck. Packs exist only in the Explore
store, and their "Play"/"Try free" buttons just jump to that generic all-brands round
(`goArena`) — they don't actually scope the deck.

We want the quiz to **open on a category screen** where the player picks what to play,
with the last-played category pre-selected so a single tap resumes.

## Scope

**In scope**

- A category screen shown first, as the index tab.
- Categories = visible packs (no "All brands" mixed mode).
- Per-pack deck filtering (round plays only that pack's brands).
- "Remember last played" — pre-select the last pack; default to the first free pack
  on first launch.

**Out of scope (deliberately deferred — "keep it simple for now")**

- Free-sample gating inside the quiz (playing N free logos of a locked pack).
  Locked packs are not playable from this screen; tapping one routes to the store.
- Any change to purchasing, entitlements, or the Explore store layout beyond
  deep-linking its Play buttons into a pack round.

## Behaviour & Flow

1. App launches → index tab renders the **Category screen** (grid layout, "Layout A").
2. Categories are `catalog.packs` filtered to `visible`, ordered by `sortOrder`.
   Each tile shows: pack icon, title, question count, a 🔒 if locked (not owned and
   not free), and existing progress if any.
3. The **last-played pack is pre-selected**; its name appears on the pinned
   **Continue** button (e.g. "Continue · Classics"). On first launch (nothing
   remembered) the default is the first free pack (Classics).
4. Tapping a tile **selects** it (updates the Continue button). Tapping **Continue**,
   or double-tapping a tile, **starts** that pack's round.
5. **Free/owned pack** → plays the full pack deck. **Locked pack** → tapping routes to
   the Explore (store) tab; it does not start a round.
6. Starting a round writes the pack id as "last played".
7. Within a round, a back/close affordance returns to the Category screen.

## Architecture

Least-disruptive: keep the quiz inside the index tab (top bar + bottom nav unchanged),
split the screen into two view states.

- **`CategoryPicker`** *(new)* — the grid + Continue button. Consumes `useCatalog()`
  (packs), `useEntitlements()` (lock state), `useProgress()` (progress), and the
  remembered pack id. Emits `onStart(pack)` for playable packs and `onLocked(pack)`
  (→ navigate to `/explore`) for locked ones.
- **`PackRound`** *(extracted from today's `index.tsx`)* — the existing
  deck/QuizCard/RoundSummary/ProgressStrip flow, taking a `pack: Pack` prop and
  filtering its deck to that pack. Keyboard-height handling and image-colour probing
  move here unchanged.
- **`index.tsx`** becomes a thin switch: no pack chosen → `CategoryPicker`;
  a pack chosen (local state) → `PackRound` with a back handler that clears selection.

`app/(tabs)/explore.tsx` — its `onPlay`/`onTry` handlers deep-link into a pack round
(carry the pack id) instead of the generic `goArena`. Mechanism: navigate to `/` with
the pack id via a route param or shared selection, resolved by `index.tsx`.

## Data Flow

- **Deck filter:** the Supabase `quiz_brands` query filters `.eq('pack_id', pack.id)`
  (plus `is_active`) for the chosen pack, instead of loading all brands.
- **Per-pack cache:** cache each pack's deck under `ll.deck.cache.<packId>` so a pack
  opens instantly from cache, then revalidates from Supabase (same
  stale-while-revalidate pattern as today's single deck).
- **Remember last played:** new storage key `ll.lastPack` (add to `KEYS`). Written when
  a round starts; read on mount to pre-select Continue.

## Edge Cases

- **Pack with no brands** (empty deck after filter) → tile shown disabled/greyed and
  not startable; if reached, show the existing empty state.
- **Remembered pack id no longer exists / not visible** → fall back to the first free
  visible pack.
- **No free pack at all** (all locked) → Continue targets the first visible pack but is
  disabled; player must go to the store. (Unlikely given Classics is free.)

## Testing

Unit tests (Jest, matching `src/**/__tests__`):

- `filterDeckByPack(brands, packId)` returns only that pack's brands.
- `resolveLastPack(lastId, packs)` → remembered pack when valid/visible; first free
  pack when the id is missing, invalid, or hidden.
- `isPackPlayable(pack, owned)` → true for free/owned, false for locked.

Pure helpers live under `src/features/catalog/` (or `src/features/quiz/`) so they're
testable without React Native.
