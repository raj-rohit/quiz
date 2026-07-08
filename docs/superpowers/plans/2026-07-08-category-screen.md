# Category Screen (open-on-pick) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open the app on a category screen where the player picks a pack to play (last-played pre-selected), and scope each round to that pack's brands.

**Architecture:** The index tab switches between two view states — a new `CategoryPicker` (grid of packs + Continue button) and `PackRound` (today's quiz flow, extracted and given a `pack` prop that filters its deck). Pure selection/deck helpers are unit-tested; the RN components follow the repo's existing untested-UI pattern and are verified by typecheck.

**Tech Stack:** Expo Router 6, React Native 0.81, React 19, TypeScript, Jest (`jest-expo`), i18next, AsyncStorage.

## Global Constraints

- **Categories = visible packs only.** No "All brands"/mixed mode.
- **Sample gating is OUT of scope.** Free/owned packs play their full deck; a locked pack is not playable from this screen — tapping it navigates to the Explore tab.
- **Last-played default:** pre-select the remembered pack; fall back to the first free pack, then the first pack, when the remembered id is missing/invalid.
- **App name is "Local Logo".** New copy keys go under `category.*` in all four locales (`en`, `nl`, `fr`, `de`).
- **No new dependencies.** Reuse existing components (`Screen`, `PackCover`, `PrimaryButton`, `MaterialIcon`, `GlassSurface`) and tokens.
- **Test runner:** `npx jest <path>` for a single file; `npm test` for all. `npm run typecheck` for `tsc --noEmit`.
- **Commit style:** end messages with `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. Do not push (pushes are a separate, manual step).

---

### Task 1: Pack-selection helpers

**Files:**
- Create: `src/features/catalog/selection.ts`
- Test: `src/features/catalog/__tests__/selection.test.ts`

**Interfaces:**
- Consumes: `Pack` from `src/features/catalog/types.ts`.
- Produces:
  - `isPackPlayable(pack: Pack, owned: string[]): boolean`
  - `resolveLastPack(lastId: string | null, packs: Pack[]): string | null`

- [ ] **Step 1: Write the failing test**

Create `src/features/catalog/__tests__/selection.test.ts`:

```ts
import { isPackPlayable, resolveLastPack } from '../selection';
import { Pack } from '../types';

const pack = (id: string, isFree: boolean): Pack => ({
  id,
  title: { en: id },
  blurb: { en: '' },
  cover: 'accent',
  icon: 'star',
  questions: 5,
  isFree,
  freeQuestionCount: 3,
  sample: false,
  sortOrder: 0,
  visible: true,
});

const packs = [pack('classics', true), pack('food', false), pack('sport', false)];

describe('isPackPlayable', () => {
  test('free packs are always playable', () => {
    expect(isPackPlayable(pack('classics', true), [])).toBe(true);
  });
  test('paid packs are playable only when owned', () => {
    expect(isPackPlayable(pack('food', false), [])).toBe(false);
    expect(isPackPlayable(pack('food', false), ['food'])).toBe(true);
  });
});

describe('resolveLastPack', () => {
  test('returns the remembered id when it is a visible pack', () => {
    expect(resolveLastPack('food', packs)).toBe('food');
  });
  test('falls back to the first free pack when id is null', () => {
    expect(resolveLastPack(null, packs)).toBe('classics');
  });
  test('falls back to the first free pack when id is unknown', () => {
    expect(resolveLastPack('ghost', packs)).toBe('classics');
  });
  test('falls back to the first pack when none are free', () => {
    expect(resolveLastPack(null, [pack('food', false), pack('sport', false)])).toBe('food');
  });
  test('returns null when there are no packs', () => {
    expect(resolveLastPack('food', [])).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/catalog/__tests__/selection.test.ts`
Expected: FAIL — `Cannot find module '../selection'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/features/catalog/selection.ts`:

```ts
import { Pack } from './types';

/** A pack is playable when it is free or the player owns it. */
export function isPackPlayable(pack: Pack, owned: string[]): boolean {
  return pack.isFree || owned.includes(pack.id);
}

/**
 * Resolve which pack to pre-select on the category screen.
 * Prefers the remembered id (when still a known pack), else the first free
 * pack, else the first pack, else null (no packs at all).
 */
export function resolveLastPack(lastId: string | null, packs: Pack[]): string | null {
  if (lastId && packs.some((p) => p.id === lastId)) return lastId;
  const firstFree = packs.find((p) => p.isFree);
  return firstFree?.id ?? packs[0]?.id ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/features/catalog/__tests__/selection.test.ts`
Expected: PASS (8 assertions).

- [ ] **Step 5: Commit**

```bash
git add src/features/catalog/selection.ts src/features/catalog/__tests__/selection.test.ts
git commit -m "feat: pack-selection helpers (playable + last-pack resolution)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Deck-by-pack filter helper

**Files:**
- Create: `src/features/quiz/deck.ts`
- Test: `src/features/quiz/__tests__/deck.test.ts`

**Interfaces:**
- Produces: `filterDeckByPack<T extends { pack_id?: string | null }>(brands: T[], packId: string): T[]`

- [ ] **Step 1: Write the failing test**

Create `src/features/quiz/__tests__/deck.test.ts`:

```ts
import { filterDeckByPack } from '../deck';

const brands = [
  { id: 'a', pack_id: 'classics' },
  { id: 'b', pack_id: 'food' },
  { id: 'c', pack_id: 'classics' },
  { id: 'd', pack_id: null },
];

describe('filterDeckByPack', () => {
  test('keeps only brands whose pack_id matches', () => {
    expect(filterDeckByPack(brands, 'classics').map((b) => b.id)).toEqual(['a', 'c']);
  });
  test('returns an empty array when no brand matches', () => {
    expect(filterDeckByPack(brands, 'ghost')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/quiz/__tests__/deck.test.ts`
Expected: FAIL — `Cannot find module '../deck'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/features/quiz/deck.ts`:

```ts
/** Narrow a deck of brands to a single pack. Generic so it works on any row
 *  shape that carries a `pack_id`. */
export function filterDeckByPack<T extends { pack_id?: string | null }>(
  brands: T[],
  packId: string
): T[] {
  return brands.filter((b) => b.pack_id === packId);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/features/quiz/__tests__/deck.test.ts`
Expected: PASS (2 assertions).

- [ ] **Step 5: Commit**

```bash
git add src/features/quiz/deck.ts src/features/quiz/__tests__/deck.test.ts
git commit -m "feat: filterDeckByPack helper

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Storage key + category copy

**Files:**
- Modify: `src/lib/storage.ts` (add `lastPack` to `KEYS`)
- Modify: `src/i18n/locales/en.json`, `nl.json`, `fr.json`, `de.json` (add `category` block)

**Interfaces:**
- Produces: `KEYS.lastPack` (`'ll.lastPack'`); i18n keys `category.kicker`, `category.title`, `category.continue`.

- [ ] **Step 1: Add the storage key**

In `src/lib/storage.ts`, add `lastPack` to the `KEYS` object (after `namePrompted`):

```ts
export const KEYS = {
  lang: 'll.lang',
  dark: 'll.dark',
  owned: 'll.owned',
  progress: 'll.progress',
  deck: 'll.deck.cache',
  catalog: 'll.catalog.cache',
  name: 'll.name',
  namePrompted: 'll.name.prompted',
  lastPack: 'll.lastPack',
} as const;
```

- [ ] **Step 2: Add copy to all four locales**

In `src/i18n/locales/en.json`, add a top-level `"category"` block (e.g. after the `"quiz"` block):

```json
  "category": {
    "kicker": "Pick your deck",
    "title": "Choose a category",
    "continue": "Continue"
  },
```

In `src/i18n/locales/nl.json`:

```json
  "category": {
    "kicker": "Kies je deck",
    "title": "Kies een categorie",
    "continue": "Doorgaan"
  },
```

In `src/i18n/locales/fr.json`:

```json
  "category": {
    "kicker": "Choisis ton deck",
    "title": "Choisis une catégorie",
    "continue": "Continuer"
  },
```

In `src/i18n/locales/de.json`:

```json
  "category": {
    "kicker": "Wähle dein Deck",
    "title": "Kategorie wählen",
    "continue": "Weiter"
  },
```

(If a locale file already uses a different key order, insert the block anywhere at the top level — JSON key order is irrelevant. Keep commas valid.)

- [ ] **Step 3: Verify JSON + types still compile**

Run: `npm run typecheck`
Expected: no errors. Then `node -e "require('./src/i18n/locales/nl.json')"` for each locale to confirm valid JSON (expected: no output, exit 0).

- [ ] **Step 4: Commit**

```bash
git add src/lib/storage.ts src/i18n/locales/*.json
git commit -m "feat: add lastPack storage key and category screen copy

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: CategoryTile + CategoryPicker components

**Files:**
- Create: `src/components/quiz/CategoryTile.tsx`
- Create: `src/components/quiz/CategoryPicker.tsx`

**Interfaces:**
- Consumes: `isPackPlayable`, `resolveLastPack` (Task 1); `KEYS.lastPack` (Task 3); `category.*` copy (Task 3); `Pack` type; `useCatalog`, `useEntitlements`, `useProgress`, `useSettings`, `useTheme`; `PackCover`, `PrimaryButton`, `MaterialIcon`, `Screen`.
- Produces:
  - `CategoryTile` props: `{ pack: Pack; playable: boolean; solved: number; selected: boolean; onPress: () => void }`
  - `CategoryPicker` props: `{ onStart: (pack: Pack) => void; onLocked: (pack: Pack) => void }`

- [ ] **Step 1: Write `CategoryTile.tsx`**

Create `src/components/quiz/CategoryTile.tsx`:

```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/src/theme/ThemeProvider';
import { useSettings } from '@/src/state/SettingsContext';
import { fonts, radii } from '@/src/theme/tokens';
import { PackCover } from '@/src/components/store/PackCover';
import { MaterialIcon } from '@/src/components/ui/MaterialIcon';
import { Pack } from '@/src/features/catalog/types';

interface Props {
  pack: Pack;
  playable: boolean;
  solved: number;
  selected: boolean;
  onPress: () => void;
}

/** Compact category tile for the opening picker grid. */
export function CategoryTile({ pack, playable, solved, selected, onPress }: Props) {
  const { colors, dark } = useTheme();
  const { locale } = useSettings();
  const title = pack.title[locale] ?? pack.title.en ?? '';
  const empty = pack.questions === 0;

  return (
    <Pressable
      onPress={onPress}
      disabled={empty}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)',
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: selected ? 2 : 1,
          opacity: empty ? 0.4 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.topRow}>
        <PackCover cover={pack.cover} icon={pack.icon} size={40} />
        {!playable && <MaterialIcon name="lock" size={16} color={colors.textFaint} />}
      </View>
      <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.meta, { color: colors.textFaint }]}>
        {solved > 0 ? `${Math.min(solved, pack.questions)}/${pack.questions}` : `${pack.questions}`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { width: '48%', borderRadius: radii.tile, padding: 12, minHeight: 96, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  name: { fontFamily: fonts.bold, fontSize: 14, marginTop: 10 },
  meta: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 2 },
});
```

- [ ] **Step 2: Write `CategoryPicker.tsx`**

Create `src/components/quiz/CategoryPicker.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/src/components/app/Screen';
import { CategoryTile } from './CategoryTile';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { useCatalog } from '@/src/features/catalog/useCatalog';
import { isPackPlayable, resolveLastPack } from '@/src/features/catalog/selection';
import { Pack } from '@/src/features/catalog/types';
import { useEntitlements } from '@/src/state/EntitlementsContext';
import { useProgress } from '@/src/state/ProgressContext';
import { useSettings } from '@/src/state/SettingsContext';
import { useTheme } from '@/src/theme/ThemeProvider';
import { loadJSON, KEYS } from '@/src/lib/storage';
import { fonts } from '@/src/theme/tokens';

interface Props {
  onStart: (pack: Pack) => void;
  onLocked: (pack: Pack) => void;
}

/** Opening screen: pick a category (pack). Last-played is pre-selected. */
export function CategoryPicker({ onStart, onLocked }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { locale } = useSettings();
  const { catalog } = useCatalog();
  const { owned } = useEntitlements();
  const { progress } = useProgress();

  const packs = catalog.packs;
  const [lastId, setLastId] = useState<string | null>(null);
  const [override, setOverride] = useState<string | null>(null);

  useEffect(() => {
    loadJSON<string | null>(KEYS.lastPack, null).then(setLastId);
  }, []);

  const selectedId = override ?? resolveLastPack(lastId, packs);
  const selectedPack = packs.find((p) => p.id === selectedId) ?? null;
  const selectedPlayable = selectedPack ? isPackPlayable(selectedPack, owned) : false;
  const selectedTitle = selectedPack ? selectedPack.title[locale] ?? selectedPack.title.en ?? '' : '';

  const handleTile = (pack: Pack) => {
    if (!isPackPlayable(pack, owned)) return onLocked(pack);
    if (pack.id === selectedId) return onStart(pack); // tap again to start
    setOverride(pack.id);
  };

  return (
    <Screen scroll>
      <Text style={[styles.kicker, { color: colors.textFaint }]}>{t('category.kicker')}</Text>
      <Text style={[styles.title, { color: colors.text }]}>{t('category.title')}</Text>

      <View style={styles.grid}>
        {packs.map((p) => (
          <CategoryTile
            key={p.id}
            pack={p}
            playable={isPackPlayable(p, owned)}
            solved={progress.byPack[p.id] ?? 0}
            selected={p.id === selectedId}
            onPress={() => handleTile(p)}
          />
        ))}
      </View>

      <PrimaryButton
        label={selectedTitle ? `${t('category.continue')} · ${selectedTitle}` : t('category.continue')}
        iconRight="play_arrow"
        disabled={!selectedPack || !selectedPlayable || selectedPack.questions === 0}
        onPress={() => selectedPack && onStart(selectedPack)}
        style={{ marginTop: 20 }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 2.4, textTransform: 'uppercase' },
  title: { fontFamily: fonts.extrabold, fontSize: 26, letterSpacing: -0.5, marginTop: 2, marginBottom: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
});
```

- [ ] **Step 3: Verify it typechecks**

Run: `npm run typecheck`
Expected: no errors. (If `progress.byPack` is flagged, confirm the field name against `src/state/progress.ts` and match it.)

- [ ] **Step 4: Commit**

```bash
git add src/components/quiz/CategoryTile.tsx src/components/quiz/CategoryPicker.tsx
git commit -m "feat: CategoryTile + CategoryPicker components

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Extract PackRound from the quiz screen

**Files:**
- Create: `src/components/quiz/PackRound.tsx`

**Interfaces:**
- Consumes: `filterDeckByPack` (Task 2); `KEYS.lastPack`, `KEYS.deck` (Task 3 / existing); `Pack` type; existing quiz pieces (`QuizCard`, `RoundSummary`, `ProgressStrip`, `SectionHeader`, `Screen`, `summarizeRound`, `isLastQuestion`, `RoundResult`, `logoUrl`, `supabase`).
- Produces: `PackRound` props: `{ pack: Pack; onExit: () => void }`. `onExit` is called when the player leaves the round (round-summary exit).

This task moves today's quiz logic out of `app/(tabs)/index.tsx` into a reusable component, adds pack scoping, per-pack deck caching, and last-played persistence. The `Brand` interface moves here.

- [ ] **Step 1: Write `PackRound.tsx`**

Create `src/components/quiz/PackRound.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Keyboard, Platform, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Screen } from '@/src/components/app/Screen';
import { SectionHeader } from '@/src/components/quiz/SectionHeader';
import { QuizCard } from '@/src/components/quiz/QuizCard';
import { RoundSummary } from '@/src/components/quiz/RoundSummary';
import { ProgressStrip } from '@/src/components/quiz/ProgressStrip';
import { MaterialIcon } from '@/src/components/ui/MaterialIcon';
import { supabase } from '@/src/lib/supabase';
import { loadJSON, saveJSON, KEYS } from '@/src/lib/storage';
import { useProgress } from '@/src/state/ProgressContext';
import { useSettings } from '@/src/state/SettingsContext';
import { useTheme } from '@/src/theme/ThemeProvider';
import { logoUrl } from '@/src/features/quiz/logo';
import { filterDeckByPack } from '@/src/features/quiz/deck';
import { isLastQuestion, summarizeRound, RoundResult } from '@/src/features/quiz/round';
import { Pack } from '@/src/features/catalog/types';

const imageColorsAvailable = requireOptionalNativeModule('ImageColors') != null;

export interface Brand {
  id: string;
  brand_name: string;
  image_url: string;
  description: any;
  brand_color?: string | null;
  pack_id?: string | null;
  obfuscation_type?: string | null;
  start_reveal?: number | string | null;
}

interface Props {
  pack: Pack;
  onExit: () => void;
}

/** A quiz round scoped to a single pack. */
export function PackRound({ pack, onExit }: Props) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { locale } = useSettings();
  const { record } = useProgress();
  const [deck, setDeck] = useState<Brand[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dominant, setDominant] = useState<string | null>(null);
  const [kbHeight, setKbHeight] = useState(0);

  const cacheKey = `${KEYS.deck}.${pack.id}`;

  // Remember this pack as the last-played one.
  useEffect(() => {
    saveJSON(KEYS.lastPack, pack.id);
  }, [pack.id]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => setKbHeight(e.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    // Instant: last cached deck for THIS pack.
    loadJSON<Brand[]>(cacheKey, []).then((cached) => {
      if (active && cached.length) {
        setDeck(cached);
        setLoading(false);
      }
    });
    // Background: refresh this pack's brands from Supabase.
    (async () => {
      const { data } = await supabase
        .from('quiz_brands')
        .select('*')
        .eq('is_active', true)
        .eq('pack_id', pack.id);
      if (!active) return;
      if (data) {
        const scoped = filterDeckByPack(data as Brand[], pack.id);
        setDeck(scoped);
        saveJSON(cacheKey, scoped);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [pack.id, cacheKey]);

  const current = deck[qIndex];
  const imageUrl = current ? logoUrl(current.image_url) : undefined;

  const resolvedDescription = (() => {
    if (!current) return undefined;
    const desc = current.description;
    if (!desc) return undefined;
    if (typeof desc === 'object') {
      return (desc as any)[locale] || (desc as any)['en'] || (desc as any)[Object.keys(desc)[0]] || '';
    }
    try {
      const parsed = JSON.parse(desc);
      if (parsed && typeof parsed === 'object') {
        return parsed[locale] || parsed['en'] || parsed[Object.keys(parsed)[0]] || '';
      }
    } catch (e) {
      // treat as plain string
    }
    return desc;
  })();

  useEffect(() => {
    if (!imageUrl || !imageColorsAvailable) {
      setDominant(null);
      return;
    }
    setDominant(null);
    let cancelled = false;
    (async () => {
      try {
        const ImageColors = require('react-native-image-colors').default;
        const c = await ImageColors.getColors(imageUrl, { fallback: current?.brand_color ?? '#262626', cache: true, key: imageUrl });
        if (cancelled) return;
        const color =
          c.platform === 'android' ? c.dominant ?? c.vibrant ?? c.muted :
          c.platform === 'ios' ? c.background :
          c.platform === 'web' ? c.dominant :
          null;
        if (color) setDominant(color);
      } catch {
        // native module unavailable → keep brand-color fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [imageUrl, current?.brand_color]);

  const packTitle = pack.title[locale] ?? pack.title.en ?? '';

  const onComplete = ({ correct, timeSec }: { correct: boolean; timeSec: number }) => {
    record({ packId: pack.id, correct, timeSec });
    setResults((r) => [...r, { correct, timeSec }]);
    if (isLastQuestion(qIndex, deck.length)) {
      setFinished(true);
    } else {
      setQIndex((i) => i + 1);
    }
  };

  const resetRound = () => {
    setResults([]);
    setQIndex(0);
    setFinished(false);
  };

  if (loading) {
    return (
      <Screen center>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (!current) {
    return (
      <Screen center>
        <SectionHeader title={packTitle} />
        <Pressable onPress={onExit} style={styles.backLink} hitSlop={8}>
          <MaterialIcon name="arrow_back" size={18} color={colors.textMuted} />
        </Pressable>
      </Screen>
    );
  }

  return (
    <Screen scroll contentStyle={{ flexGrow: 1 }}>
      <Pressable onPress={onExit} style={styles.back} hitSlop={8}>
        <MaterialIcon name="arrow_back" size={22} color={colors.textMuted} />
      </Pressable>
      <View style={{ flexGrow: 1, justifyContent: 'center', paddingTop: 20, paddingBottom: 20 + kbHeight }}>
        {finished ? (
          <RoundSummary
            {...summarizeRound(results)}
            onExit={() => {
              resetRound();
              onExit();
            }}
            onPlayAgain={resetRound}
          />
        ) : (
          <QuizCard
            key={current.id}
            imageUrl={imageUrl}
            answer={current.brand_name}
            founded={resolvedDescription}
            dominantColor={dominant ?? current.brand_color}
            obfuscationType={current.obfuscation_type}
            startReveal={current.start_reveal}
            onComplete={onComplete}
          />
        )}
      </View>
      <ProgressStrip
        current={finished ? deck.length : qIndex + 1}
        total={deck.length}
        label={t('quiz.progress')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start', padding: 4, marginBottom: -8 },
  backLink: { marginTop: 16 },
});
```

Note: keep `i18n.language` handling identical to the original — here `locale` from `useSettings` already drives description resolution, matching the original which used `i18n.language`. Both resolve to the active locale; `useSettings().locale` is the canonical source, so this is equivalent.

- [ ] **Step 2: Verify it typechecks**

Run: `npm run typecheck`
Expected: no errors. `RoundSummary`, `QuizCard`, `ProgressStrip` prop shapes are unchanged from the original screen.

- [ ] **Step 3: Commit**

```bash
git add src/components/quiz/PackRound.tsx
git commit -m "feat: PackRound — pack-scoped quiz round extracted from index

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Rewire the index tab as picker ↔ round

**Files:**
- Modify: `app/(tabs)/index.tsx` (full rewrite — replace file contents)

**Interfaces:**
- Consumes: `CategoryPicker` (Task 4), `PackRound` (Task 5), `isPackPlayable` (Task 1), `useCatalog`, `useEntitlements`, `Pack`; expo-router `useRouter`, `useLocalSearchParams`.
- Behaviour: no pack chosen → render `CategoryPicker`; a pack chosen → render `PackRound`. A `?pack=<id>` route param (from Explore) opens that pack directly when playable. `onLocked` routes to `/explore`.

- [ ] **Step 1: Replace `app/(tabs)/index.tsx` contents**

```tsx
import React, { useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CategoryPicker } from '@/src/components/quiz/CategoryPicker';
import { PackRound } from '@/src/components/quiz/PackRound';
import { useCatalog } from '@/src/features/catalog/useCatalog';
import { useEntitlements } from '@/src/state/EntitlementsContext';
import { isPackPlayable } from '@/src/features/catalog/selection';
import { Pack } from '@/src/features/catalog/types';

export default function ArenaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ pack?: string }>();
  const { catalog } = useCatalog();
  const { owned } = useEntitlements();
  const [selected, setSelected] = useState<Pack | null>(null);

  // Deep link from Explore (?pack=<id>): open that pack's round when playable.
  useEffect(() => {
    if (!params.pack) return;
    const pack = catalog.packs.find((p) => p.id === params.pack);
    if (pack && isPackPlayable(pack, owned)) setSelected(pack);
    // Clear the param so leaving the round returns to the picker, not straight back in.
    router.setParams({ pack: '' });
  }, [params.pack, catalog.packs, owned]);

  if (selected) {
    return <PackRound pack={selected} onExit={() => setSelected(null)} />;
  }

  return (
    <CategoryPicker
      onStart={(pack) => setSelected(pack)}
      onLocked={() => router.navigate('/explore')}
    />
  );
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Smoke-test the app**

Run: `npm run web` (or `npm start` and open a device). Confirm:
1. App opens on the **category screen** (grid + Continue), not a round.
2. Tapping a free tile selects it; tapping Continue (or the selected tile again) starts a round scoped to that pack.
3. The round's back arrow / round-summary exit returns to the category screen.
4. Tapping a locked tile switches to the Explore tab.
5. Relaunch → the last-played pack is pre-selected on Continue.

- [ ] **Step 4: Commit**

```bash
git add "app/(tabs)/index.tsx"
git commit -m "feat: open on category screen; index switches picker <-> pack round

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Deep-link Explore "Play" into a pack round

**Files:**
- Modify: `app/(tabs)/explore.tsx` (the `goArena` helper and the `PackCard` / `PurchaseSheet` handlers)

**Interfaces:**
- Consumes: the `?pack=<id>` param handling added in Task 6.
- Behaviour: an owned/free pack's **Play** deep-links into that pack's round; the purchase sheet's **Start** does the same for the just-bought pack. "Try free" (sample) has no target while sample gating is out of scope, so it opens the category screen.

- [ ] **Step 1: Replace the `goArena` helper**

In `app/(tabs)/explore.tsx`, replace:

```tsx
  const goArena = () => router.navigate('/');
```

with:

```tsx
  const goArena = () => router.navigate('/');
  const playPack = (packId: string) => router.navigate({ pathname: '/', params: { pack: packId } });
```

- [ ] **Step 2: Route the PackCard Play button to the pack**

In the `catalog.packs.map(...)` block, change the `PackCard` handlers so **Play** targets the pack:

```tsx
          <PackCard
            pack={p}
            owned={owned.includes(p.id)}
            solved={progress.byPack[p.id] ?? 0}
            onPlay={(pk) => playPack(pk.id)}
            onTry={goArena}
            onBuy={(pk) => setTarget({ kind: 'pack', pack: pk })}
          />
```

(`PackCard` only calls `onPlay` for owned/free packs, so this never bypasses the paywall. `onTry` stays on the category screen since sample play is out of scope.)

- [ ] **Step 3: Route the purchase sheet Start button to the pack**

Replace the `PurchaseSheet`'s `onStart` so that, after buying, Start opens the purchased pack when it is a single pack (bundles have no single target, so fall back to the category screen):

```tsx
      <PurchaseSheet
        target={target}
        onConfirm={onConfirm}
        onClose={() => setTarget(null)}
        onStart={() => {
          const justBought = target?.kind === 'pack' ? target.pack.id : null;
          setTarget(null);
          if (justBought) playPack(justBought);
          else goArena();
        }}
      />
```

- [ ] **Step 4: Verify it typechecks**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Smoke-test the Explore path**

Run the app (`npm run web`). From the Explore tab: tapping **Play** on the free Classics pack opens a round scoped to Classics (not the category screen). Buying a pack and tapping **Start** opens that pack's round.

- [ ] **Step 6: Commit**

```bash
git add "app/(tabs)/explore.tsx"
git commit -m "feat: Explore Play/Start deep-link into the selected pack round

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Final Verification

- [ ] Run the full suite: `npm test` — all tests pass (existing + `selection.test.ts` + `deck.test.ts`).
- [ ] Run `npm run typecheck` — no errors.
- [ ] Manual: fresh install (clear storage) opens on the category screen with Classics pre-selected; playing a pack, exiting, and relaunching pre-selects that pack.

## Notes / Deferred

- **Sample gating** (play N free logos of a locked pack) is intentionally deferred. When picked up: reintroduce a `freeQuestionCount` slice in `PackRound` for unowned packs and an "Unlock full pack" CTA on `RoundSummary`.
- **Pinned Continue button:** the plan places Continue at the end of the scroll content rather than absolutely pinned, for simplicity. If a truly pinned footer is wanted later, wrap `CategoryPicker` content in a non-scroll `Screen` with a flexed grid area and a fixed footer.
- **`progress.byPack`**: verified against `record({ packId, ... })` usage in the original screen. If `src/state/progress.ts` names the map differently, adjust the two `progress.byPack[...]` reads (Task 4, Task 7) to match.
