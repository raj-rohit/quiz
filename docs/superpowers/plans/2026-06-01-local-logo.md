# Local Logo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recreate the Claude Design "Local Logo" quiz handoff (Arena + Explore/Store + Profile, top bar, raised bottom nav, mocked purchase sheet) faithfully in the existing Expo/React Native app.

**Architecture:** Expo Router `Tabs` with a custom glass `tabBar` (3 routes; Arena default) under a shared transparent `TopAppBar`. App-wide state via React Context + AsyncStorage: theme (dark + per-build accent), settings (language), entitlements, and a local progress store. Styling via `StyleSheet` + a shared `src/theme` tokens module and `useTheme()`. Arena keeps the existing real Supabase `quiz_brands` logos; Store reads a Supabase pack catalog with a baked-in offline fallback; purchases are mocked into local entitlements.

**Tech Stack:** Expo SDK 54, React Native 0.81, React 19, expo-router, expo-blur, expo-linear-gradient, react-native-reanimated, @supabase/supabase-js, i18next, @react-native-async-storage/async-storage (new), jest-expo (new, for logic tests).

**Testing strategy (deliberate):** TDD with `jest-expo` for **pure-logic** modules (locale resolution, scoring, entitlements, progress/streak, catalog merge). **Visual components** are verified by `npx tsc --noEmit` (strict) + running the app and checking against the spec — RN unit tests for glass/gradient/animation/layout have low value and there is no value in asserting style objects. Spec with exact token/values: `docs/superpowers/specs/2026-06-01-local-logo-design.md` (referenced as **SPEC** below).

**Conventions:** Frequent commits (one per task). Path alias `@/*` → repo root (e.g. `@/src/...`). Commit message footer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

## File Structure

**Create:**
- `src/theme/tokens.ts` — base colors, glass recipes, radii, spacing, shadows, motion.
- `src/theme/builds.ts` — per-country `BUILDS` accent profiles; `resolveAccent`.
- `src/theme/ThemeProvider.tsx` — `ThemeProvider`, `useTheme()` → `{ dark, accent, colors, glass, toggleDark }`.
- `src/lib/storage.ts` — typed AsyncStorage get/set helpers.
- `src/state/SettingsContext.tsx` — language (`auto|nl|en|fr|de`), persisted; `resolveLocale`.
- `src/state/EntitlementsContext.tsx` — owned pack ids, persisted; `buy`, `restore`; `computeOwnedAfterBuy`.
- `src/state/ProgressContext.tsx` — local progress; `applyResult`, `computeStreak`.
- `src/features/quiz/score.ts` — `computeScore`, `normalizeAnswer`.
- `src/features/catalog/types.ts` — `Pack`, `Bundle`, `Catalog`.
- `src/features/catalog/catalog.ts` — baked-in offline catalog (mirrors seed).
- `src/features/catalog/useCatalog.ts` — Supabase fetch + `mergeCatalog` fallback.
- `src/components/ui/MeshBackground.tsx`, `GlassSurface.tsx`, `PrimaryButton.tsx`, `GhostButton.tsx`, `Chip.tsx`, `Toast.tsx`, `MaterialIcon.tsx`.
- `src/components/app/FlagChip.tsx`, `Avatar.tsx`, `LanguageSwitcher.tsx`, `TopAppBar.tsx`, `BottomNav.tsx`.
- `src/components/quiz/SectionHeader.tsx`, `LogoStage.tsx`, `GuessInput.tsx`, `RevealCard.tsx`, `ProgressStrip.tsx`, `QuizCard.tsx`.
- `src/components/store/PackCover.tsx`, `PackCard.tsx`, `BundleCard.tsx`, `PurchaseSheet.tsx`.
- `app/(tabs)/explore.tsx`, `app/(tabs)/profile.tsx`.
- `supabase/migrations/<ts>_create_packs.sql`.
- Test files under `src/**/__tests__/*.test.ts`.

**Modify:**
- `app/_layout.tsx` — load Plus Jakarta Sans at root; wrap tree in providers.
- `app/(tabs)/_layout.tsx` — custom `tabBar` (BottomNav) + `TopAppBar`; register 3 routes.
- `app/(tabs)/index.tsx` — rebuild Arena from the new components.
- `src/i18n/index.ts` — drive `lng` from SettingsContext; keep fallback.
- `src/i18n/locales/{en,nl,fr,de}.json` — full design copy.
- `src/components/ui/GlassCard.tsx` — superseded by `GlassSurface` (delete after migration).
- `package.json` — `test` script + jest-expo preset; new deps.

---

# PHASE 1 — Foundation

### Task 1: Test runner (jest-expo)

**Files:** Modify `package.json`; Create `src/features/quiz/__tests__/smoke.test.ts`.

- [ ] **Step 1: Install dev deps**

Run: `npx expo install jest-expo jest && npm i -D @types/jest`
Expected: installs without peer-dep errors.

- [ ] **Step 2: Add jest config + script to package.json**

Add to `package.json`:
```json
"scripts": { "start": "expo start", "android": "expo start --android", "ios": "expo start --ios", "web": "expo start --web", "test": "jest", "typecheck": "tsc --noEmit" },
"jest": { "preset": "jest-expo", "testMatch": ["**/__tests__/**/*.test.ts?(x)"], "transformIgnorePatterns": ["node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg))"] }
```

- [ ] **Step 3: Write a smoke test**

`src/features/quiz/__tests__/smoke.test.ts`:
```ts
test('jest runs', () => { expect(1 + 1).toBe(2); });
```

- [ ] **Step 4: Run it**

Run: `npm test -- src/features/quiz/__tests__/smoke.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/features/quiz/__tests__/smoke.test.ts
git commit -m "chore: add jest-expo test runner + typecheck script"
```

### Task 2: Theme tokens + builds

**Files:** Create `src/theme/tokens.ts`, `src/theme/builds.ts`, `src/theme/__tests__/builds.test.ts`.

- [ ] **Step 1: Write failing test** — `src/theme/__tests__/builds.test.ts`:
```ts
import { BUILDS, resolveAccent } from '../builds';
test('NL is the default amber accent', () => {
  expect(BUILDS.NL.accent.rgb).toBe('245 158 11');
  expect(BUILDS.NL.accent.deep).toBe('180 83 9');
  expect(BUILDS.NL.accent.glow).toBe('252 211 77');
});
test('resolveAccent falls back to NL', () => {
  expect(resolveAccent('XX' as any).code).toBe('NL');
});
```
- [ ] **Step 2: Run → FAIL** (`Cannot find module '../builds'`). Run: `npm test -- builds`
- [ ] **Step 3: Implement `tokens.ts`** — export base palette + helpers. Use SPEC §5 exact values:
```ts
export const palette = { secondary: '#0cb6fd', ink: '#1A1C1C', cream: '#f9f9f9', night: '#0e0e0e', red: '#ef4444', white: '#ffffff' };
export const radii = { pill: 9999, card: 26, cardLg: 28, cardSm: 24, stage: 16, cover: 18, sheet: 28 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 };
export const motion = {
  fadeup: { duration: 450, easing: [0.2, 0.8, 0.2, 1] as const, translateY: 8 },
  pop: { duration: 550, easing: [0.2, 0.9, 0.3, 1.25] as const },
  ring: { duration: 700 },
  stagger: [80, 160, 240, 320, 400],
};
export const shadow = {
  soft: { shadowColor: 'rgba(26,28,28,1)', shadowOpacity: 0.10, shadowRadius: 30, shadowOffset: { width: 0, height: 18 }, elevation: 8 },
};
export const rgb = (triplet: string, a = 1) => `rgba(${triplet.split(' ').join(',')}, ${a})`;
```
- [ ] **Step 4: Implement `builds.ts`**:
```ts
export type BuildCode = 'NL' | 'FR' | 'BE' | 'DE';
export interface Build { code: BuildCode; country: string; defaultLocale: 'nl'|'fr'|'de'; titleKey: string; accent: { rgb: string; deep: string; glow: string }; }
export const BUILDS: Record<BuildCode, Build> = {
  NL: { code:'NL', country:'Nederland', defaultLocale:'nl', titleKey:'deck.nl', accent:{ rgb:'245 158 11', deep:'180 83 9',  glow:'252 211 77' } },
  FR: { code:'FR', country:'France',     defaultLocale:'fr', titleKey:'deck.fr', accent:{ rgb:'0 85 164',   deep:'0 59 122',  glow:'125 178 255' } },
  BE: { code:'BE', country:'België',     defaultLocale:'nl', titleKey:'deck.be', accent:{ rgb:'237 41 57',  deep:'167 19 28', glow:'252 211 77' } },
  DE: { code:'DE', country:'Deutschland',defaultLocale:'de', titleKey:'deck.de', accent:{ rgb:'221 0 0',    deep:'165 0 0',   glow:'255 206 0' } },
};
export const ACTIVE_BUILD: BuildCode = 'NL';
export const resolveAccent = (code: BuildCode): Build => BUILDS[code] ?? BUILDS.NL;
```
- [ ] **Step 5: Run → PASS.** Run: `npm test -- builds`
- [ ] **Step 6: Commit** `git add src/theme && git commit -m "feat: theme tokens + per-build accent profiles"`

### Task 3: ThemeProvider + useTheme

**Files:** Create `src/theme/ThemeProvider.tsx`.

- [ ] **Step 1: Implement** — context resolving `dark` (override → system) and accent → derived `colors` + `glass`. No test (RN hook); verified by tsc + app.
```tsx
import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { palette, rgb } from './tokens';
import { ACTIVE_BUILD, resolveAccent } from './builds';

type ThemeValue = {
  dark: boolean; toggleDark: () => void; accent: { rgb: string; deep: string; glow: string };
  colors: { bg: string; text: string; textMuted: string; primary: string; primaryDeep: string; primaryGlow: string; secondary: string; border: string; };
  glass: { backgroundColor: string; borderColor: string; blurTint: 'light'|'dark'; blurIntensity: number };
};
const Ctx = createContext<ThemeValue | null>(null);
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [override, setOverride] = useState<null | 'light' | 'dark'>(null);
  const dark = (override ?? system ?? 'light') === 'dark';
  const accent = resolveAccent(ACTIVE_BUILD).accent;
  const value = useMemo<ThemeValue>(() => ({
    dark, toggleDark: () => setOverride(dark ? 'light' : 'dark'), accent,
    colors: {
      bg: dark ? palette.night : palette.cream,
      text: dark ? '#ffffff' : palette.ink,
      textMuted: dark ? 'rgba(255,255,255,0.55)' : 'rgba(26,28,28,0.55)',
      primary: rgb(accent.rgb), primaryDeep: rgb(accent.deep), primaryGlow: rgb(accent.glow),
      secondary: palette.secondary,
      border: dark ? rgb(accent.glow, 0.22) : rgb(accent.rgb, 0.30),
    },
    glass: dark
      ? { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: rgb(accent.glow, 0.22), blurTint: 'dark', blurIntensity: 28 }
      : { backgroundColor: 'rgba(255,255,255,0.7)',  borderColor: rgb(accent.rgb, 0.30),  blurTint: 'light', blurIntensity: 20 },
  }), [dark, accent]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useTheme = () => { const v = useContext(Ctx); if (!v) throw new Error('useTheme outside ThemeProvider'); return v; };
```
> Note: `toggleDark` here is local; Task 11 lifts persistence in. Keep this signature.
- [ ] **Step 2: tsc** Run: `npm run typecheck` Expected: no new errors.
- [ ] **Step 3: Commit** `git add src/theme/ThemeProvider.tsx && git commit -m "feat: ThemeProvider + useTheme"`

### Task 4: Storage helpers

**Files:** Create `src/lib/storage.ts`.

- [ ] **Step 1: Install** Run: `npx expo install @react-native-async-storage/async-storage`
- [ ] **Step 2: Implement**:
```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try { const v = await AsyncStorage.getItem(key); return v == null ? fallback : JSON.parse(v) as T; } catch { return fallback; }
}
export async function saveJSON<T>(key: string, value: T): Promise<void> {
  try { await AsyncStorage.setItem(key, JSON.stringify(value)); } catch {}
}
export const KEYS = { lang: 'll.lang', dark: 'll.dark', owned: 'll.owned', progress: 'll.progress' } as const;
```
- [ ] **Step 3: tsc + commit** `git add src/lib/storage.ts package.json package-lock.json && git commit -m "feat: AsyncStorage JSON helpers"`

### Task 5: SettingsContext (language)

**Files:** Create `src/state/SettingsContext.tsx`, `src/state/__tests__/locale.test.ts`. Modify `src/i18n/index.ts`.

- [ ] **Step 1: Failing test** — `locale.test.ts`:
```ts
import { resolveLocale } from '../SettingsContext';
test('auto → nl when device is Dutch', () => expect(resolveLocale('auto', 'nl-NL')).toBe('nl'));
test('auto → en otherwise', () => expect(resolveLocale('auto', 'de-DE')).toBe('en'));
test('explicit choice wins', () => expect(resolveLocale('fr', 'nl-NL')).toBe('fr'));
```
- [ ] **Step 2: Run → FAIL.** Run: `npm test -- locale`
- [ ] **Step 3: Implement** `resolveLocale` (pure) + provider:
```tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Localization from 'expo-localization';
import i18n from '@/src/i18n';
import { loadJSON, saveJSON, KEYS } from '@/src/lib/storage';
export type Lang = 'auto'|'nl'|'en'|'fr'|'de';
export type Locale = 'nl'|'en'|'fr'|'de';
export function resolveLocale(lang: Lang, deviceTag: string): Locale {
  if (lang !== 'auto') return lang;
  return deviceTag.toLowerCase().startsWith('nl') ? 'nl' : 'en';
}
type V = { lang: Lang; locale: Locale; setLang: (l: Lang) => void };
const Ctx = createContext<V | null>(null);
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const device = Localization.getLocales()[0]?.languageTag ?? 'en';
  const [lang, setLangState] = useState<Lang>('auto');
  useEffect(() => { loadJSON<Lang>(KEYS.lang, 'auto').then(setLangState); }, []);
  const locale = resolveLocale(lang, device);
  useEffect(() => { i18n.changeLanguage(locale); }, [locale]);
  const setLang = (l: Lang) => { setLangState(l); saveJSON(KEYS.lang, l); };
  return <Ctx.Provider value={{ lang, locale, setLang }}>{children}</Ctx.Provider>;
}
export const useSettings = () => { const v = useContext(Ctx); if (!v) throw new Error('useSettings outside provider'); return v; };
```
- [ ] **Step 4: Run → PASS** (`npm test -- locale`). **tsc.**
- [ ] **Step 5: Commit** `git add src/state/SettingsContext.tsx src/state/__tests__/locale.test.ts && git commit -m "feat: settings/language context with auto-locale"`

### Task 6: EntitlementsContext

**Files:** Create `src/state/EntitlementsContext.tsx`, `src/state/__tests__/entitlements.test.ts`.

- [ ] **Step 1: Failing test**:
```ts
import { computeOwnedAfterBuy } from '../EntitlementsContext';
const PAID = ['food','eighties','sport','retro'];
test('buying a pack adds its id once', () => {
  expect(computeOwnedAfterBuy([], 'food', PAID, false)).toEqual(['food']);
  expect(computeOwnedAfterBuy(['food'], 'food', PAID, false)).toEqual(['food']);
});
test('buying the bundle adds all paid ids', () => {
  expect(computeOwnedAfterBuy(['food'], 'allaccess', PAID, true).sort()).toEqual(PAID.slice().sort());
});
```
- [ ] **Step 2: Run → FAIL.** Run: `npm test -- entitlements`
- [ ] **Step 3: Implement** pure fn + provider (persists via storage):
```tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadJSON, saveJSON, KEYS } from '@/src/lib/storage';
export function computeOwnedAfterBuy(owned: string[], packId: string, paidIds: string[], isBundle: boolean): string[] {
  if (isBundle) return Array.from(new Set([...owned, ...paidIds]));
  return owned.includes(packId) ? owned : [...owned, packId];
}
type V = { owned: string[]; buy: (packId: string, paidIds: string[], isBundle: boolean) => void; restore: () => boolean };
const Ctx = createContext<V | null>(null);
export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
  const [owned, setOwned] = useState<string[]>([]);
  useEffect(() => { loadJSON<string[]>(KEYS.owned, []).then(setOwned); }, []);
  const buy: V['buy'] = (id, paid, isBundle) => setOwned(prev => { const next = computeOwnedAfterBuy(prev, id, paid, isBundle); saveJSON(KEYS.owned, next); return next; });
  const restore = () => owned.length > 0; // real app queries store/RevenueCat
  return <Ctx.Provider value={{ owned, buy, restore }}>{children}</Ctx.Provider>;
}
export const useEntitlements = () => { const v = useContext(Ctx); if (!v) throw new Error('useEntitlements outside provider'); return v; };
```
- [ ] **Step 4: Run → PASS. tsc.**
- [ ] **Step 5: Commit** `git add src/state/EntitlementsContext.tsx src/state/__tests__/entitlements.test.ts && git commit -m "feat: entitlements context (mock IAP)"`

### Task 7: ProgressContext (stats + streak)

**Files:** Create `src/state/ProgressContext.tsx`, `src/state/__tests__/progress.test.ts`.

- [ ] **Step 1: Failing test**:
```ts
import { applyResult, computeStreak, emptyProgress } from '../ProgressContext';
test('correct answer updates solved + best time', () => {
  const p = applyResult(emptyProgress(), { packId:'classics', correct:true, timeSec:4 }, '2026-06-01');
  expect(p.solved).toBe(1); expect(p.bestTimeSec).toBe(4); expect(p.byPack.classics).toBe(1);
});
test('give-up does not increment solved', () => {
  const p = applyResult(emptyProgress(), { packId:'classics', correct:false, timeSec:9 }, '2026-06-01');
  expect(p.solved).toBe(0);
});
test('streak increments on consecutive day, resets on gap', () => {
  let p = applyResult(emptyProgress(), { packId:'x', correct:true, timeSec:2 }, '2026-06-01');
  p = applyResult(p, { packId:'x', correct:true, timeSec:2 }, '2026-06-02'); expect(p.streak).toBe(2);
  p = applyResult(p, { packId:'x', correct:true, timeSec:2 }, '2026-06-05'); expect(p.streak).toBe(1);
});
```
- [ ] **Step 2: Run → FAIL.** Run: `npm test -- progress`
- [ ] **Step 3: Implement** pure helpers + provider (persists). `computeStreak(prevDay, today, prevStreak)` returns 1 if first/ gap>1, prevStreak+1 if exactly next day, prevStreak if same day.
```tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadJSON, saveJSON, KEYS } from '@/src/lib/storage';
export type Progress = { solved: number; streak: number; lastDay: string | null; bestTimeSec: number | null; byPack: Record<string, number> };
export const emptyProgress = (): Progress => ({ solved: 0, streak: 0, lastDay: null, bestTimeSec: null, byPack: {} });
export function computeStreak(prevDay: string | null, today: string, prevStreak: number): number {
  if (!prevDay) return 1;
  if (prevDay === today) return prevStreak || 1;
  const diff = (Date.parse(today) - Date.parse(prevDay)) / 86400000;
  return diff === 1 ? prevStreak + 1 : 1;
}
export function applyResult(p: Progress, r: { packId: string; correct: boolean; timeSec: number }, today: string): Progress {
  const streak = computeStreak(p.lastDay, today, p.streak);
  if (!r.correct) return { ...p, streak, lastDay: today };
  return { ...p, solved: p.solved + 1, streak, lastDay: today,
    bestTimeSec: p.bestTimeSec == null ? r.timeSec : Math.min(p.bestTimeSec, r.timeSec),
    byPack: { ...p.byPack, [r.packId]: (p.byPack[r.packId] ?? 0) + 1 } };
}
type V = { progress: Progress; record: (r: { packId: string; correct: boolean; timeSec: number }) => void };
const Ctx = createContext<V | null>(null);
export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<Progress>(emptyProgress());
  useEffect(() => { loadJSON<Progress>(KEYS.progress, emptyProgress()).then(setProgress); }, []);
  const record: V['record'] = (r) => setProgress(prev => { const next = applyResult(prev, r, new Date().toISOString().slice(0,10)); saveJSON(KEYS.progress, next); return next; });
  return <Ctx.Provider value={{ progress, record }}>{children}</Ctx.Provider>;
}
export const useProgress = () => { const v = useContext(Ctx); if (!v) throw new Error('useProgress outside provider'); return v; };
```
- [ ] **Step 4: Run → PASS. tsc.**
- [ ] **Step 5: Commit** `git add src/state/ProgressContext.tsx src/state/__tests__/progress.test.ts && git commit -m "feat: local progress store (solved/streak/best)"`

### Task 8: i18n strings (full design copy)

**Files:** Modify `src/i18n/locales/{en,nl,fr,de}.json`, `src/i18n/index.ts`.

- [ ] **Step 1: Replace locale JSONs** with the full key set drawn from `components.jsx` `STRINGS` + `screens.jsx` `SCREEN_T`. Namespaces: `deck.*`, `quiz.*` (identify, placeholder, check, giveUp, progress, next, score), `nav.*` (explore, arena, profile — keep `rankings` for later), `store.*` (kicker, title, owned, play, tryFree, questions, bundleCta, save, regular, restore, noAccount), `sheet.*` (title, confirm, faceid, processing, done, continue, cancel, restored, restoreEmpty), `profile.*` (name, sub, solved, streak, best, days, myPacks, settings, language, darkMode, privacy), `disclaimer`. Use the exact translated strings from the design files for en/nl/fr/de.
- [ ] **Step 2:** Set `src/i18n/index.ts` `lng` default `'en'` (SettingsProvider calls `changeLanguage` on mount); keep `fallbackLng:'en'`.
- [ ] **Step 3: tsc + run** `npm run typecheck`; `npx expo start` boots without missing-key warnings on the existing screen.
- [ ] **Step 4: Commit** `git add src/i18n && git commit -m "feat: full i18n copy for all screens (en/nl/fr/de)"`

### Task 9: UI primitives

**Files:** Create `src/components/ui/{MaterialIcon,MeshBackground,GlassSurface,PrimaryButton,GhostButton,Chip,Toast}.tsx`.

- [ ] **Step 1: `MaterialIcon`** — thin wrapper over `@expo/vector-icons` `MaterialIcons`, prop `name` accepts the design's symbol names; map snake→kebab (`play_arrow`→`play-arrow`). Provide a `Name` union for the icons used (SPEC §7: explore, sports_esports, person, language, expand_more/less, play_arrow, check_circle, stars, schedule, lock, fingerprint, lock_open, shield, info, smartphone, dark_mode, task_alt, local_fire_department, bolt, workspace_premium, arrow_forward, restaurant, graphic_eq, sports_soccer, progress_activity, travel_explore, star).
- [ ] **Step 2: `MeshBackground`** — absolute-fill `View` with `colors.bg`, plus two large soft blobs (borderRadius 9999, low-opacity accent top-left + cyan bottom-right) per SPEC §5. Accept `dark` from `useTheme`.
- [ ] **Step 3: `GlassSurface`** — replaces `GlassCard`: `BlurView intensity={glass.blurIntensity} tint={glass.blurTint}` inside a `View` with `glass.backgroundColor`, 1px `glass.borderColor`, `radius` prop (default 26), `shadow.soft`, `overflow:'hidden'`. Children + `style` passthrough.
- [ ] **Step 4: `PrimaryButton`** — `LinearGradient` 135° `[primary, primaryDeep]`, pill, uppercase white 800 text (tracking 0.08em → `letterSpacing` ~1.3), optional right `MaterialIcon`, `disabled` opacity 0.5, `activeOpacity` press scale. Glow via `shadowColor: primary`.
- [ ] **Step 5: `GhostButton`** — text-only, uppercase 11px 700, `letterSpacing` ~2.6 (0.24em), `textMuted` → `secondary` on press.
- [ ] **Step 6: `Chip`** — pill with tinted bg + 1px border + optional icon; `tone: 'primary'|'secondary'`; used for score/time + progress chips.
- [ ] **Step 7: `Toast`** — absolutely-positioned pill near bottom; fade in/out; controlled by `message` prop.
- [ ] **Step 8: tsc + commit** `git add src/components/ui && git commit -m "feat: UI primitives (mesh, glass, buttons, chip, toast, icon)"`

### Task 10: App chrome (TopAppBar + BottomNav)

**Files:** Create `src/components/app/{FlagChip,Avatar,LanguageSwitcher,TopAppBar,BottomNav}.tsx`.

- [ ] **Step 1: `FlagChip`** — `react-native-svg` flag (NL/FR/BE/DE stripes from `components.jsx` FLAGS), 28×19, radius 3, subtle ring/shadow. (Confirm `react-native-svg` is installed via expo; if not, `npx expo install react-native-svg`.)
- [ ] **Step 2: `Avatar`** — 36px circle, gradient bg `primary/30→secondary/30`, ring `primary/30`, initials "JV"; `size` prop (Profile uses 80).
- [ ] **Step 3: `LanguageSwitcher`** — pill (globe icon + 2-letter `locale` upper + chevron) opening a small glass menu (NL/EN/FR/DE) via a `Modal`/popover; calls `setLang`. Active row in `primary`.
- [ ] **Step 4: `TopAppBar`** — transparent, height 100, `paddingTop` = safe-area top; left "LOCAL LOGO" (18/800 tight) + `FlagChip` (active build); right `LanguageSwitcher` + `Avatar`. Reads `useTheme`, `useSettings`.
- [ ] **Step 5: `BottomNav`** — props `{ state, descriptors, navigation }` (Expo Router `tabBar` shape). Glass bar height 88, rounded-top 24, blur; 3 items in order Explore / **Arena (center, raised primary pill + glow when focused)** / Profile; inactive `textMuted`→`secondary`. Icons via `MaterialIcon`. Map route names: `explore`,`index`(=Arena),`profile`.
- [ ] **Step 6: tsc + commit** `git add src/components/app && git commit -m "feat: TopAppBar + raised glass BottomNav"`

### Task 11: Tabs routing + providers + persistence wiring

**Files:** Modify `app/_layout.tsx`, `app/(tabs)/_layout.tsx`; Create `app/(tabs)/explore.tsx`, `app/(tabs)/profile.tsx`.

- [ ] **Step 1:** In `app/_layout.tsx`: load Plus Jakarta Sans (`PlusJakartaSans_400Regular/500Medium/700Bold/800ExtraBold`) at root; remove SpaceMono-only gating; wrap `<RootLayoutNav/>` in `ThemeProvider > SettingsProvider > EntitlementsProvider > ProgressProvider`. Keep splash logic.
- [ ] **Step 2:** Lift dark-mode persistence: extend `ThemeProvider` to load/save `KEYS.dark` (override) via storage (init from stored value; `toggleDark` persists). Update Task 3 provider accordingly (load on mount, save on toggle).
- [ ] **Step 3:** `app/(tabs)/_layout.tsx`: render `<TopAppBar/>` then `<Tabs tabBar={props => <BottomNav {...props}/>} screenOptions={{ headerShown:false }} />` wrapped so content sits between bar (top 100) and nav (bottom 88) over `<MeshBackground/>`. Register screens `explore`, `index`, `profile`; set initial route to `index` (Arena) via `Tabs` order + `unstable_settings` or `initialRouteName`.
- [ ] **Step 4:** `explore.tsx` + `profile.tsx`: temporary placeholders (`<Screen><Text>Explore</Text></Screen>`) so routing renders.
- [ ] **Step 5: Verify (app run):** `npx expo start` → app boots to Arena; bottom nav switches all 3 tabs; TopAppBar shows wordmark+flag+lang+avatar; LanguageSwitcher changes UI language live; dark toggle (temporarily expose on Profile placeholder) flips + persists across reload.
- [ ] **Step 6: Commit** `git add app && git commit -m "feat: providers, fonts, tab routing with custom nav + top bar"`

**CHECKPOINT 1** — App shell: 3 tabs, top bar, mesh, theme + language switch, all persisted.

---

# PHASE 2 — Arena

### Task 12: Scoring + answer matching

**Files:** Create `src/features/quiz/score.ts`, `src/features/quiz/__tests__/score.test.ts`.

- [ ] **Step 1: Failing test**:
```ts
import { computeScore, normalizeAnswer } from '../score';
test('fast answer scores 100', () => expect(computeScore(4)).toBe(100));
test('10s still 100, then -2/s, floor 50', () => { expect(computeScore(10)).toBe(100); expect(computeScore(20)).toBe(80); expect(computeScore(100)).toBe(50); });
test('normalize strips accents/case/punct', () => expect(normalizeAnswer('Crème-Brûlée!')).toBe('cremebrulee'));
```
- [ ] **Step 2: Run → FAIL.** Run: `npm test -- score`
- [ ] **Step 3: Implement** (mirrors `app.jsx`):
```ts
export const computeScore = (sec: number) => Math.min(100, Math.max(50, 100 - Math.max(0, sec - 10) * 2));
export const normalizeAnswer = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
```
- [ ] **Step 4: Run → PASS. tsc. Commit** `git add src/features/quiz/score.ts src/features/quiz/__tests__/score.test.ts && git commit -m "feat: quiz scoring + answer normalization"`

### Task 13: SectionHeader + ProgressStrip

**Files:** Create `src/components/quiz/SectionHeader.tsx`, `ProgressStrip.tsx`.

- [ ] **Step 1: `SectionHeader`** — centered title only (30/800 `primary`, line-height ~1.05, `textAlign:'center'`). **No chapter pill** (SPEC §7). Prop `title`.
- [ ] **Step 2: `ProgressStrip`** — left: uppercase 10px label (tracking 0.22em) + thin (h6 w128) track (`bg ink/white 10%`) with `secondary` fill + glow; right: big `01` (4xl/900 `primary`) + `/12` (muted). Props `{ current, total, label }`.
- [ ] **Step 3: tsc + commit** `git add src/components/quiz/SectionHeader.tsx src/components/quiz/ProgressStrip.tsx && git commit -m "feat: Arena SectionHeader + ProgressStrip"`

### Task 14: LogoStage + GuessInput

**Files:** Create `src/components/quiz/LogoStage.tsx`, `GuessInput.tsx`.

- [ ] **Step 1: `LogoStage`** — `aspect-ratio 16/10`, radius 16, centered. Shows `<Image resizeMode="contain">` of the Supabase logo on a tile colored by `dominantColor` prop (fallback neutral). No black box. Optional `revealed` glow (drop-shadow-ish via shadow). Props `{ imageUrl, dominantColor, revealed }`.
- [ ] **Step 2: `GuessInput`** — `TextInput`, transparent, bottom-border 2px (`border/15`→`primary` on focus); centered 20px text. `state:'idle'|'wrong'`; when `wrong`, border red + **shake** (reanimated translateX keyframes ~500ms). `autoCorrect=false`, `autoCapitalize='words'`, submit on enter. Props `{ value, onChangeText, onSubmit, state, placeholder }` + `inputRef`.
- [ ] **Step 3: tsc + commit** `git add src/components/quiz/LogoStage.tsx src/components/quiz/GuessInput.tsx && git commit -m "feat: Arena LogoStage + GuessInput (shake/red-flash)"`

### Task 15: RevealCard (celebration)

**Files:** Create `src/components/quiz/RevealCard.tsx`.

- [ ] **Step 1: Implement** — centered: white 96px tile (radius ~20) holding the logo `<Image>`; when `celebrate`, a glow **ring** pulse (reanimated scale 0.5→2.5, opacity 0.7→0, 700ms, accent radial-ish) + tile **pop** (scale 0.4→1.12→1, 550ms, cubic-bezier(.2,.9,.3,1.25)); else plain fade. Brand name (30/800) + founded (13 muted) + two `Chip`s (Score% primary, `Ns` secondary) + `PrimaryButton` "Next Challenge" — each entering with staggered `fadeup` (delays 80/160/240/320/400ms). **No confetti.** Props `{ imageUrl, brandName, founded, scorePct, timeSec, celebrate, onNext }`.
- [ ] **Step 2: tsc + commit** `git add src/components/quiz/RevealCard.tsx && git commit -m "feat: Arena RevealCard with pop/ring/fadeup + chips"`

### Task 16: QuizCard + wire Arena screen

**Files:** Create `src/components/quiz/QuizCard.tsx`; rewrite `app/(tabs)/index.tsx`.

- [ ] **Step 1: `QuizCard`** — `GlassSurface` radius 26, padding 20, **`minHeight:432`, content centered** (no layout shift). Internal state machine `idle|wrong|revealed` + `scorePct/timeSec/revealedBy`, timer ref. `submit()`: normalize-compare (use `normalizeAnswer`; accept near-match via existing `useQuiz`); correct → `computeScore`, reveal, `revealedBy='guess'`; wrong → `state='wrong'`, after 600ms reset + refocus. `giveUp()` → reveal score 0, `revealedBy='give-up'`. Renders `LogoStage`+`GuessInput`+`PrimaryButton`(Check)+`GhostButton`(I don't know) OR `RevealCard`. Props `{ question, dominantColor, onComplete(correct) }`.
- [ ] **Step 2: Rewrite `index.tsx`** — use `ScrollView`/`KeyboardAvoidingView`; fetch brands from Supabase (keep current query + dominant-color extraction); render `SectionHeader` (title from i18n `deck.nl`/active build), `QuizCard` (keyed by question), `ProgressStrip`. On complete: `useProgress().record({ packId: question.pack_id ?? 'classics', correct, timeSec })`, advance index. Remove: chapter badge, emoji theme toggle, Alert popups, old StyleSheet that conflicts.
- [ ] **Step 3: Verify (app run)** — guess correct → celebration + score/time; wrong → red flash + shake + clear + refocus (no Alert); "I don't know" → calm reveal score 0; Next advances; **no layout shift** between states; progress strip updates; dark/light + language all correct.
- [ ] **Step 4: tsc + commit** `git add src/components/quiz/QuizCard.tsx "app/(tabs)/index.tsx" && git commit -m "feat: Arena QuizCard + screen wired to Supabase + progress"`

**CHECKPOINT 2** — Arena fully matches spec; play loop, celebration, scoring, progress recording.

---

# PHASE 3 — Explore / Store

### Task 17: Catalog types + offline fallback

**Files:** Create `src/features/catalog/types.ts`, `catalog.ts`.

- [ ] **Step 1: `types.ts`** — `Pack { id; title: Record<Locale,string>; blurb: Record<Locale,string>; cover:'accent'|'cyan'|'ink'|'cream'; icon:string; isFree:boolean; freeQuestionCount:number; storeProductId?:string; sample:boolean; sortOrder:number; visible:boolean }`, `Bundle { id; title; blurb; icon; storeProductId?; regularHint?:string }`, `Catalog { packs: Pack[]; bundle: Bundle }`.
- [ ] **Step 2: `catalog.ts`** — `OFFLINE_CATALOG: Catalog` mirroring `screens.jsx` `PACKS`/`BUNDLE` (classics=free 5q; food/eighties/sport/retro paid w/ sample; bundle "Unlock Everything", regularHint "€11,96"). `PAID_IDS = packs.filter(!isFree).map(id)`.
- [ ] **Step 3: tsc + commit** `git add src/features/catalog/types.ts src/features/catalog/catalog.ts && git commit -m "feat: catalog types + offline fallback catalog"`

### Task 18: useCatalog (Supabase + merge)

**Files:** Create `src/features/catalog/useCatalog.ts`, `src/features/catalog/__tests__/merge.test.ts`.

- [ ] **Step 1: Failing test**:
```ts
import { mergeCatalog } from '../useCatalog';
import { OFFLINE_CATALOG } from '../catalog';
test('empty remote → offline fallback', () => expect(mergeCatalog([], null).packs.length).toBe(OFFLINE_CATALOG.packs.length));
test('remote packs override + sort by sortOrder', () => {
  const r = [{ id:'z', title:{en:'Z'}, blurb:{en:''}, cover:'cyan', icon:'star', is_free:false, free_question_count:0, sample:false, sort_order:2, visible:true },
             { id:'a', title:{en:'A'}, blurb:{en:''}, cover:'ink',  icon:'star', is_free:true,  free_question_count:5, sample:false, sort_order:1, visible:true }];
  const m = mergeCatalog(r as any, null); expect(m.packs.map(p=>p.id)).toEqual(['a','z']);
});
test('invisible packs filtered out', () => {
  const r = [{ id:'a', title:{en:'A'}, blurb:{en:''}, cover:'ink', icon:'star', is_free:true, free_question_count:5, sample:false, sort_order:1, visible:false }];
  expect(mergeCatalog(r as any, null).packs.length).toBe(0);
});
```
- [ ] **Step 2: Run → FAIL.** Run: `npm test -- merge`
- [ ] **Step 3: Implement** `mergeCatalog(remotePacks, remoteConfig)` (maps snake_case rows → `Pack`, filters `visible`, sorts by `sortOrder`; falls back to `OFFLINE_CATALOG` when remote empty/error; bundle from config or offline) + `useCatalog()` hook (fetch `packs` + `app_config` from supabase in `useEffect`, state `{ catalog, loading }`, fallback on error).
- [ ] **Step 4: Run → PASS. tsc. Commit** `git add src/features/catalog/useCatalog.ts src/features/catalog/__tests__/merge.test.ts && git commit -m "feat: useCatalog with Supabase fetch + offline merge"`

### Task 19: Supabase packs migration + seed

**Files:** Create `supabase/migrations/<ts>_create_packs.sql` (use `20260601120000_create_packs.sql`).

- [ ] **Step 1: Write migration** — tables `packs`, `app_config`, `alter quiz_brands add pack_id` + RLS public-read, per SPEC §4; seed 5 packs + bundle config matching `OFFLINE_CATALOG` (localized `title`/`blurb` jsonb). **No price numbers** (only `regularHint` text + `store_product_id`).
- [ ] **Step 2: Validate SQL locally if CLI present** — Run: `npx supabase db lint` (if available) or visually review. **Do NOT `db push`** to the hosted project; note in commit that pushing is a separate confirmed step. App uses offline fallback until pushed.
- [ ] **Step 3: Commit** `git add supabase/migrations && git commit -m "feat: packs + app_config migration & seed (not pushed)"`

### Task 20: PackCover + PackCard + BundleCard

**Files:** Create `src/components/store/{PackCover,PackCard,BundleCard}.tsx`.

- [ ] **Step 1: `PackCover`** — square `size` (default 64), radius `size*0.28`, gradient per `cover` preset (accent uses theme accent; cyan/ink/cream fixed from `screens.jsx` `coverStyle`), centered filled `MaterialIcon` (`size*0.46`), italic "LL" monogram bottom-right.
- [ ] **Step 2: `PackCard`** — `GlassSurface` radius 24, row: `PackCover` + (title 15/800 + truncated blurb 11 muted + (owned&progress → thin bar + `n/total` from `useProgress().progress.byPack` ; else `N questions`)). Right: owned/free → primary **Play** pill (play icon, glow) → `onPlay`; paid → price label (from store later — for now show `storeProductId` placeholder or hide price; render "Try free" if `sample`). Tap card → owned? `onPlay` : `onBuy`. Props `{ pack, owned, onPlay, onBuy, onTry }`.
> Price note: real price strings come from StoreKit/Play later. For this pass show a neutral "Unlock" affordance (no fabricated number) on paid packs; keep "Try free".
- [ ] **Step 3: `BundleCard`** — full-width radius 28 accent gradient, white text; "Save 33% · usually {regularHint}" pill, title, blurb, CTA "Unlock everything"+arrow; hidden when `allOwned`. Props `{ bundle, allOwned, onBuy }`.
- [ ] **Step 4: tsc + commit** `git add src/components/store/PackCover.tsx src/components/store/PackCard.tsx src/components/store/BundleCard.tsx && git commit -m "feat: store PackCover/PackCard/BundleCard"`

### Task 21: PurchaseSheet (mock)

**Files:** Create `src/components/store/PurchaseSheet.tsx`.

- [ ] **Step 1: Implement** — RN `Modal transparent animationType="slide"` (or reanimated sheet): backdrop `black/45` (tap dismiss in confirm), rounded-top 28 panel (`cream` light / `night` dark), grabber. Phases `confirm → processing(~950ms) → done`. confirm: cover/bundle tile + "ONE-TIME PURCHASE" + title + (no live price) + `PrimaryButton` "Confirm" (lock icon) + Face-ID hint line (fingerprint) + Cancel + "No account needed". processing: spinner + "Working…". done: check_circle in `primary/15` circle + "Unlocked" + name + Start. On confirm → `useEntitlements().buy(pack.id, PAID_IDS, isBundle)`. Props `{ pack | bundle, onClose }`.
- [ ] **Step 2: tsc + commit** `git add src/components/store/PurchaseSheet.tsx && git commit -m "feat: mocked StoreKit-style PurchaseSheet"`

### Task 22: StoreScreen wiring

**Files:** Rewrite `app/(tabs)/explore.tsx`.

- [ ] **Step 1: Implement** — `ScrollView` (hidden scrollbar), header kicker "Store" + "Packs" (26/800). `useCatalog()` + `useEntitlements()`. Render `BundleCard` (allOwned hides) then `PackCard` list (gap 12). State `buying` → `PurchaseSheet`. Play/Try → `router.navigate('/(tabs)')` (Arena). Footer: **Restore** (toast "Purchases restored"/"Nothing to restore") + "No account needed" + **disclaimer**. Loading → light skeleton/spinner.
- [ ] **Step 2: Verify (app run)** — store lists packs from offline fallback; tapping a paid pack opens sheet → Confirm → processing → done → pack now shows Play (entitlement persisted across reload); bundle unlocks all + hides; Restore toast; disclaimer visible; dark/light + 4 languages correct.
- [ ] **Step 3: tsc + commit** `git add "app/(tabs)/explore.tsx" && git commit -m "feat: Explore/Store screen wired to catalog + entitlements"`

**CHECKPOINT 3** — Store renders from catalog, mocked buy flow persists entitlements, restore works.

---

# PHASE 4 — Profile

### Task 23: ProfileScreen

**Files:** Rewrite `app/(tabs)/profile.tsx`.

- [ ] **Step 1: Implement** — `ScrollView`. Identity: 80px `Avatar` + "Player" + "Local profile · this device" (smartphone icon). Stats: 3 `GlassSurface` tiles from `useProgress().progress` — Solved (`solved`, task_alt), Streak (`streak`+`d`, local_fire_department), Best time (`bestTimeSec?+'s'` ?? '—', bolt). "My packs": horizontal owned `PackCover` (56) + titles, from `useCatalog` filtered by `useEntitlements().owned` (+ free). Settings `GlassSurface`: Language row (label + `LanguageSwitcher`) and Dark mode row (label + custom 48×28 toggle → `useTheme().toggleDark`, `primary` when on). Footer: **Restore** (toast) + privacy note (shield) + **disclaimer** (info).
- [ ] **Step 2: Verify (app run)** — stats reflect real play from Arena; owned packs appear after buying in Store; language + dark toggles work and persist; restore toast; disclaimer present; both themes + 4 languages correct.
- [ ] **Step 3: tsc + commit** `git add "app/(tabs)/profile.tsx" && git commit -m "feat: Profile screen (stats, my packs, settings, restore)"`

### Task 24: Cleanup + final verification

**Files:** Delete `src/components/ui/GlassCard.tsx` (superseded), remove stray `jest.js` LRU scratch only if untracked & unwanted (confirm first), drop `DESIGN.md` references that conflict (leave file).

- [ ] **Step 1:** Remove unused legacy code paths; ensure no imports of deleted `GlassCard`.
- [ ] **Step 2: Full typecheck** Run: `npm run typecheck` Expected: clean.
- [ ] **Step 3: Full test run** Run: `npm test` Expected: all logic suites green.
- [ ] **Step 4: App walkthrough** — boot, all 3 tabs against SPEC §7; light+dark; switch all 4 languages; play Arena (correct/wrong/give-up); buy in Store; check Profile stats. Capture any deltas as follow-ups.
- [ ] **Step 5: Commit** `git add -A && git commit -m "chore: cleanup + final verification pass"`

**CHECKPOINT 4** — Full app matches the handoff (mocked IAP; migration written, not pushed).

---

## Self-Review

**Spec coverage:** §2 scope → Phases 1–4 + Task 19 (migration) + out-of-scope honored (no real IAP; no reveal engines; no rankings). §3 architecture → Tasks 2–11. §4 Supabase → Tasks 17–19. §5 tokens → Tasks 2–3, applied throughout. §6 inventory → every file has a task. §7 behavior → Tasks 12–16 (Arena), 20–22 (Store/sheet), 23 (Profile), 10 (chrome), 5 (language). All sections covered.

**Placeholder scan:** Logic tasks contain complete code + tests. UI tasks specify exact files, structure, and SPEC-referenced values + an app-run verification (deliberate per testing strategy) — not "TODO". The one intentional product gap — **no live price string** on paid packs/sheet — is explicit (real prices come from the store), not a placeholder.

**Type consistency:** `computeOwnedAfterBuy(owned, packId, paidIds, isBundle)`, `applyResult(progress, {packId,correct,timeSec}, today)`, `computeScore(sec)`, `normalizeAnswer(s)`, `resolveLocale(lang, deviceTag)`, `mergeCatalog(remotePacks, remoteConfig)`, `useTheme()→{dark,accent,colors,glass,toggleDark}` are used consistently across tasks. `Pack`/`Bundle`/`Catalog` shapes match between Task 17 and Tasks 18/20/22.
