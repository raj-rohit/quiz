# Local Logo — Design Implementation Spec

**Date:** 2026-06-01
**Status:** Approved approach; ready for implementation plan
**Source:** Claude Design handoff `uVX4u83HXEgdAaVaOrAFlw` (`design_handoff_local_logo/README.md` + chat transcript + `index.html`/`app.jsx`/`components.jsx`/`screens.jsx`)

## 1. Goal

Recreate the "Local Logo" logo-guessing quiz app design faithfully in the existing **Expo / React Native** codebase. The HTML/React prototype is visual reference only; we match the look and behavior using the target stack's patterns.

The app: player is shown a brand logo and types the brand name. Three tabs — **Explore** (store), **Arena** (quiz, default), **Profile** — under a transparent top app bar and a raised glass bottom nav, over a mesh-gradient backdrop with frosted-glass cards. Account-free. Light/dark + runtime language switcher. Per-country accent (NL default).

## 2. Scope

**In scope (this work, 4 phases):**
- Foundation: theme tokens + provider, settings/entitlements/progress state (persisted), full i18n strings, shared UI primitives, top app bar, custom bottom nav, tab routing.
- Arena quiz to spec (keeps existing real Supabase logos).
- Explore/Store with **Supabase-backed pack catalog** (new tables + offline fallback) and a **mocked** purchase sheet.
- Profile (identity, stats from local progress store, my packs, settings, restore, disclaimer).

**Out of scope / mocked:**
- Real IAP — RevenueCat / StoreKit / Play Billing. Purchases are **mocked** → local entitlement state. Prices are **not** stored/displayed from Supabase (per README; real prices come from the store later).
- Reveal/obfuscation engines (client will design the in-quiz obscuring mechanic themselves).
- Cross-promo card; Rankings/leaderboard tab (cut for v1 — strings kept for easy re-add).
- Applying the Supabase migration to the **hosted** project (we write migration + seed files; pushing to remote is a separate, explicitly-confirmed step).

## 3. Architecture

### Navigation
Expo Router `Tabs` with a **custom `tabBar`** that renders the design's raised glass BottomNav. Three routes:
- `app/(tabs)/explore.tsx` → Store
- `app/(tabs)/index.tsx` → Arena (default/initial tab)
- `app/(tabs)/profile.tsx` → Profile

The **TopAppBar** is rendered once in `app/(tabs)/_layout.tsx` above the screen content (transparent, overlays the mesh). The PurchaseSheet renders as an app-level overlay/modal triggered from the Store.

### State (React Context + AsyncStorage)
New dependency: `@react-native-async-storage/async-storage`.
- **ThemeProvider** — resolves `dark` (override → system) and the active **build** accent; exposes `useTheme()` returning `{ dark, colors, accent, glass, toggleDark }`.
- **SettingsProvider** — `lang` (`auto|nl|en|fr|de`), persisted; `resolvedLocale` (auto → `nl` if device is Dutch else `en`); drives i18n `changeLanguage`. Independent of build.
- **EntitlementsProvider** — `owned: string[]` pack ids, persisted; `buy(pack)` (bundle adds all paid ids), `restore()` (re-confirms cached entitlements; real app would query the store).
- **Progress store** (`src/state/progress.ts` + context) — persisted: solved count, streak (+ last-played date), best time, per-pack solved/position. Arena writes to it; Profile + Store read from it.

### Styling
`StyleSheet` + a shared **`src/theme/tokens.ts`** (colors, glass recipes, radii, spacing, shadows, motion durations/easings) and `useTheme()`. **Not** NativeWind. Accent is a JS theme object per build, replicating the prototype's `--accent-rgb / --accent-deep-rgb / --accent-glow-rgb` system so `primary` / `primary-deep` / `primary-glow` propagate.

### Animation
`react-native-reanimated` (already a dependency) for: wrong-answer **shake**, reveal **fadeup** (staggered), correct-answer **pop** + glow **ring** pulse. Easings/durations match §5.

### Icons & Fonts
- Fonts: Plus Jakarta Sans (already wired via `@expo-google-fonts/plus-jakarta-sans`; load 400/700/800 at root so all tabs share them). Remove the legacy SpaceMono/FontAwesome-only root load.
- Icons: `@expo/vector-icons` `MaterialIcons` mapped from the design's Material Symbols names (e.g. `play_arrow`→`play-arrow`, `sports_esports`→`sports-esports`, `local_fire_department`→`local-fire-department`).

### Quiz data
Keep the existing `quiz_brands` Supabase integration and `react-native-image-colors` dominant-color background. `useQuiz` (Levenshtein near-match) is retained. Guess-state logo sits on its dominant-color tile (full-bleed `contain`, no black box — per the user's explicit feedback); reveal-state uses the design's white 96px tile.

## 4. Supabase schema (packs)

New migration `supabase/migrations/<ts>_create_packs.sql`:

```sql
-- packs: sellable sets of questions (one pack = one stage)
create table public.packs (
  id text primary key,                 -- e.g. 'classics','food'
  title jsonb not null,                -- { nl, en, fr, de }
  blurb jsonb not null,
  cover text not null default 'accent',-- accent | cyan | ink | cream
  icon text not null,                  -- material symbol name
  is_free boolean not null default false,
  free_question_count int not null default 0,
  store_product_id text,               -- SKU to surface (price comes from store, never here)
  is_bundle_member boolean not null default true,
  sort_order int not null default 0,
  sample boolean not null default false,-- "try free" allowed
  visible boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.packs enable row level security;
create policy "public read packs" on public.packs for select using (true);

-- featured bundle config (single row; no price number stored)
create table public.app_config (
  id text primary key default 'singleton',
  bundle jsonb,                        -- { id, title, blurb, icon, store_product_id, regular_hint }
  quiz_title jsonb, chapter_label jsonb -- catalog-driven, not hard-coded
);
alter table public.app_config enable row level security;
create policy "public read app_config" on public.app_config for select using (true);

-- map questions to a pack
alter table public.quiz_brands add column if not exists pack_id text references public.packs(id);
```
Seed the five packs (classics=free, food, eighties, sport, retro) + bundle row, matching `screens.jsx` `PACKS`/`BUNDLE`. **`regular` is a display hint only; no live price stored.**

App reads via `useCatalog()`: fetch packs/config from Supabase; on error/empty fall back to a **baked-in JS catalog** (`src/features/catalog/catalog.ts`, mirrors the seed). `free_question_count` gates how many of a paid pack's questions are playable as a sample.

## 5. Design tokens (canonical = handoff README)

**Colors:** `secondary` cyan `#0cb6fd`; `ink` `#1A1C1C`; `cream`/light bg `#f9f9f9`; `night`/dark bg `#0e0e0e`.
**Per-build accent** (`rgb` / `deep` / `glow`, space-separated RGB):
- NL `245 158 11` / `180 83 9` / `252 211 77` (default)
- FR `0 85 164` / `0 59 122` / `125 178 255`
- BE `237 41 57` / `167 19 28` / `252 211 77`
- DE `221 0 0` / `165 0 0` / `255 206 0`

> Note: the current screen hardcodes `#FF8C00→#B92902`; we standardize on the README's NL accent (`#F59E0B`-family) as the token source of truth.

**Glass:** light = `rgba(255,255,255,0.7)` + blur 20 + 1px `primary/30`; dark = `rgba(255,255,255,0.06)` + blur 28 + 1px `primary-glow/22`.
**Mesh:** light `#f9f9f9` + radial accent`/0.08` top-left + cyan`/0.07` bottom-right; dark `#0e0e0e` + accent-glow`/0.16` + cyan`/0.12`. (RN approximation: two large soft blobs, as in the current screen.)
**Type:** Plus Jakarta Sans. 30/800 quiz title & reveal brand; 26/800 store title; 18/800 wordmark & sheet title; 15/800 pack title; 13 muted body; 11–12 labels/buttons (uppercase, tracking 0.08–0.24em); 9–10 footnotes.
**Radii:** pills 9999; cards 24–28 (QuizCard 26); logo stage 16; pack cover ~18; sheet top 28.
**Shadows:** soft elevation `0 18px 60px rgba(26,28,28,0.10)`; primary glow `0 8px 24px accent/0.30`.
**Buttons:** `.btn-origin` = 135° accent→accent-deep gradient, white text, active scale 0.98.
**Motion:** `fadeup` translateY(8)+opacity 0.45s cubic-bezier(.2,.8,.2,1); `pop` scale 0.4→1.12→1 0.55s cubic-bezier(.2,.9,.3,1.25); `ring` scale 0.5→2.5 opacity 0.7→0 0.7s ease-out; stagger 0.08/0.16/0.24/0.32/0.4s.

## 6. Component inventory (design → files)

- **Theme/state:** `src/theme/tokens.ts`, `src/theme/builds.ts`, `src/theme/ThemeProvider.tsx`, `src/state/SettingsContext.tsx`, `src/state/EntitlementsContext.tsx`, `src/state/progress.ts`, `src/lib/storage.ts`.
- **UI primitives:** `src/components/ui/MeshBackground.tsx`, `GlassSurface.tsx` (refactor existing `GlassCard`), `PrimaryButton.tsx` (gradient pill), `GhostButton.tsx`, `Chip.tsx`, `Toast.tsx`.
- **App chrome:** `src/components/app/TopAppBar.tsx`, `BottomNav.tsx`, `LanguageSwitcher.tsx`, `Avatar.tsx`, `FlagChip.tsx`.
- **Quiz:** `src/components/quiz/SectionHeader.tsx`, `LogoStage.tsx`, `GuessInput.tsx`, `QuizCard.tsx`, `RevealCard.tsx`, `ProgressStrip.tsx`.
- **Store:** `src/components/store/PackCover.tsx`, `PackCard.tsx`, `BundleCard.tsx`, `PurchaseSheet.tsx`.
- **Catalog:** `src/features/catalog/{types.ts,catalog.ts,useCatalog.ts}`.
- **Screens:** `app/(tabs)/_layout.tsx` (custom tabBar + TopAppBar), `index.tsx` (Arena), `explore.tsx` (Store), `profile.tsx` (Profile).
- **i18n:** expand `src/i18n/locales/{en,nl,fr,de}.json` with all design copy (nav, quiz, store, profile, sheet, disclaimer); `lng` driven by SettingsProvider.

## 7. Screen behavior (acceptance highlights)

- **TopAppBar** — h≈100, safe-area top pad, transparent. Left: "LOCAL LOGO" 18/800 tight + flag chip 28×19 r3 ring/shadow. Right: LanguageSwitcher pill (globe + 2-letter code + chevron; menu NL/EN/FR/DE) + 36px avatar, ring `primary/30`, "JV".
- **Arena** — `SectionHeader` = centered title only (30/800 primary, balance wrap), **no chapter pill**. `QuizCard` glass, radius 26, padding 20, **min-height 432, content centered (no layout shift)**.
  - Guess: `LogoStage` 16:10 r16, logo on dominant-color tile (no black box). `GuessInput` underline 2px (`border/15`→focus `primary`); wrong → red border + shake ~0.5s, clear, refocus after 600ms. `Check` (gradient pill, uppercase, tracking 0.08em) + `GhostButton` "I don't know" (uppercase, tracking 0.24em).
  - Reveal (same footprint, centered): white 96px tile with logo; **correct → glow ring pulse + pop**; **give-up → plain fade, no celebration; no confetti**. Brand 30/800 + founded 13 muted, staggered fadeup. Chips: **Score N%** (primary) + **Ns** time (secondary). `Next Challenge` (gradient).
  - Scoring: `max(50, 100 - max(0, sec-10)*2)`, capped 100; give-up = 0. On Next → advance, record progress.
  - `ProgressStrip` — uppercase label + thin secondary bar (glow) + big `01 / 12` (primary).
- **Explore/Store** — kicker "Store" + "Packs" (26/800). `BundleCard` (featured, accent gradient, "Save 33% · usually €11,96" hint, big price label, CTA) — hidden when all paid owned. `PackCard` list (glass, r24): PackCover 64 (gradient preset + filled icon + italic "LL"), title 15/800 + truncated blurb; owned/free → primary **Play** pill; paid → price label + "Try free" (if `sample`). Footer: **Restore** + "No account needed" + **trademark disclaimer**.
- **PurchaseSheet** — bottom sheet, backdrop `black/45`, rounded-top 28, grabber. `confirm` (cover + "ONE-TIME PURCHASE" + title + price; Confirm·price w/ lock; Face-ID hint; Cancel; "No account") → `processing` (spinner "Working…" ~950ms) → `done` (check_circle in `primary/15`, "Unlocked" + name, Start). Bundle unlocks all paid at once. **Mocked** — adds local entitlement.
- **Profile** — 80px gradient avatar ring + "Player" + "Local profile · this device". 3 glass stat tiles (Solved / Streak `d` / Best time) from progress store. "My packs" horizontal owned PackCovers (56) + titles. Settings glass card: Language row (+ switcher) and Dark mode row (custom 48×28 toggle, `primary` when on). Footer: Restore + privacy note + disclaimer.
- **BottomNav** — h≈88, glass blur, rounded-top 24, 3 tabs (Explore / **Arena** center raised primary pill + glow / Profile); inactive muted → `secondary` on press. No Rankings.
- **Language** — default auto (nl if device Dutch else en); switcher persists; independent of build. Dark mode persists. Entitlements persist.

## 8. Phases (review checkpoints)

1. **Foundation** — deps (AsyncStorage), `tokens`/`builds`/`ThemeProvider`, Settings/Entitlements/Progress contexts + storage, full i18n strings, UI primitives (MeshBackground, GlassSurface, PrimaryButton, GhostButton, Chip), TopAppBar, BottomNav, tab routing (3 routes). App renders shell with empty-ish screens, theme + language switch working.
2. **Arena** — SectionHeader, LogoStage (Supabase logo + dominant color), GuessInput (shake/red-flash), QuizCard (min-height/no-shift), RevealCard (pop/ring/fadeup/chips), ProgressStrip; scoring + progress recording.
3. **Explore/Store** — packs migration + seed + `useCatalog` (Supabase + offline fallback), PackCover/PackCard/BundleCard, PurchaseSheet (mock), restore toast, disclaimer.
4. **Profile** — identity, stat tiles (progress store), my packs, settings (language + dark), restore, privacy + disclaimer.

## 9. Risks / notes
- Radial mesh gradients aren't native in RN → approximate with soft blobs (existing approach).
- Adding AsyncStorage = native module; fine under Expo (config plugin not required for SDK 54).
- Supabase migration is written but **not pushed** to the hosted DB without explicit confirmation; until pushed, Store uses the offline fallback catalog.
- Accent token reconciliation: adopt README NL accent over the screen's current `#FF8C00`.
- `quiz_brands` currently has no `pack_id`; Arena plays the global active set until packs are seeded + brands assigned.
