# Explore Hub with Grid/List Toggle (beta) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Explore the single category hub (grid ⇄ list toggle, inline purchasing, launch tab) and reduce Arena to gameplay only (round + minimal Continue screen).

**Architecture:** Explore gains a persisted view toggle: list = existing PackCards, grid = the CategoryTile grid (tiles gain a price for locked packs); both views buy via the existing PurchaseSheet and start rounds via the existing `?pack=` deep-link. Arena's `CategoryPicker` is replaced by a new `ContinueCard` idle screen; `PackRound` and the deep-link effect are untouched.

**Tech Stack:** Expo Router 6, React Native 0.81, React 19, TypeScript, Jest (`jest-expo`), i18next, AsyncStorage.

## Global Constraints

- **Explore is the launch tab** (`initialRouteName: 'explore'` in the tabs layout).
- **View toggle persists** under storage key `storeView: 'll.storeView'`, values `'grid' | 'list'`, default `'list'`.
- **Same pack info in both views**: title, solved/questions, owned state, lock + price on locked packs.
- **Locked pack tap → PurchaseSheet in place** (no tab switch). Buy → Start deep-links into the pack's round.
- **"Try free" is removed for the beta** (sample gating still deferred).
- **Arena idle = Continue screen**; remembered pack resolved via existing `resolveLastPack`, hydration-gated; Play disabled when the resolved pack is missing/locked/empty.
- **PackRound, deep-link effect in `app/(tabs)/index.tsx`, entitlements, bottom nav structure: unchanged.**
- New i18n keys in ALL FOUR locales (`en`, `nl`, `fr`, `de`): `store.viewGrid`, `store.viewList`, `arena.continueKicker`, `arena.browse`.
- No new dependencies. No new unit tests required (logic already covered by `selection`/`deck` tests; RN UI untested per repo pattern) — every task must pass `npm run typecheck` and `npm test`.
- Test commands: `npx jest <path>` single file; `npm test` all; `npm run typecheck`.
- End commit messages with: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. Do not push.

---

### Task 1: Foundations — storage key, icons, i18n copy

**Files:**
- Modify: `src/lib/storage.ts` (KEYS)
- Modify: `src/components/ui/MaterialIcon.tsx` (icon MAP)
- Modify: `src/i18n/locales/en.json`, `nl.json`, `fr.json`, `de.json`

**Interfaces:**
- Produces: `KEYS.storeView` (`'ll.storeView'`); icon names `grid_view`, `view_list`; i18n keys `store.viewGrid`, `store.viewList`, `arena.continueKicker`, `arena.browse`.

- [ ] **Step 1: Add the storage key**

In `src/lib/storage.ts`, add to `KEYS` after `lastPack`:

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
  storeView: 'll.storeView',
} as const;
```

- [ ] **Step 2: Add the toggle icons**

In `src/components/ui/MaterialIcon.tsx`, add two entries to `MAP` (after `travel_explore`):

```ts
  grid_view: 'grid-view',
  view_list: 'view-list',
```

(Both glyph names exist in `@expo/vector-icons` MaterialIcons.)

- [ ] **Step 3: Add copy to all four locales**

In `src/i18n/locales/en.json` — add to the existing `"store"` block:

```json
    "viewGrid": "Grid view",
    "viewList": "List view",
```

and add a new top-level `"arena"` block (e.g. after `"category"`):

```json
  "arena": {
    "continueKicker": "Jump back in",
    "browse": "Browse categories"
  },
```

`nl.json` — in `"store"`:

```json
    "viewGrid": "Rasterweergave",
    "viewList": "Lijstweergave",
```

new block:

```json
  "arena": {
    "continueKicker": "Ga verder",
    "browse": "Bekijk categorieën"
  },
```

`fr.json` — in `"store"`:

```json
    "viewGrid": "Vue grille",
    "viewList": "Vue liste",
```

new block:

```json
  "arena": {
    "continueKicker": "Reprends la partie",
    "browse": "Parcourir les catégories"
  },
```

`de.json` — in `"store"`:

```json
    "viewGrid": "Rasteransicht",
    "viewList": "Listenansicht",
```

new block:

```json
  "arena": {
    "continueKicker": "Weiterspielen",
    "browse": "Kategorien ansehen"
  },
```

(Insert position within the file is flexible; keep commas valid.)

- [ ] **Step 4: Verify**

Run: `npm run typecheck` → no errors. `node -e "require('./src/i18n/locales/en.json'); require('./src/i18n/locales/nl.json'); require('./src/i18n/locales/fr.json'); require('./src/i18n/locales/de.json')"` → exit 0. `npm test` → all suites pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.ts src/components/ui/MaterialIcon.tsx src/i18n/locales/*.json
git commit -m "feat: storeView key, grid/list icons, explore-hub copy"
```

---

### Task 2: CategoryTile price + optional selection; PackCard optional Try-free

**Files:**
- Modify: `src/components/quiz/CategoryTile.tsx`
- Modify: `src/components/store/PackCard.tsx` (make `onTry` optional)

**Interfaces:**
- Consumes: `getPrice` (existing, `src/features/store/prices.ts`: `(sku?: string) => string`) — used by the caller in Task 3, not here.
- Produces: `CategoryTile` props become `{ pack: Pack; playable: boolean; solved: number; selected?: boolean; price?: string; onPress: () => void }` — `selected` defaults to `false`; locked tiles (`!playable`) show a lock+price pill when `price` is non-empty. `PackCard`'s `onTry` becomes `onTry?: (p: Pack) => void` and the "Try free" link renders only when provided.

- [ ] **Step 1: Update CategoryTile**

Replace `src/components/quiz/CategoryTile.tsx` contents with:

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
  selected?: boolean;
  /** Localized price string; shown on locked tiles. */
  price?: string;
  onPress: () => void;
}

/** Compact category tile for pack grids (Explore grid view). */
export function CategoryTile({ pack, playable, solved, selected = false, price, onPress }: Props) {
  const { colors, dark } = useTheme();
  const { locale } = useSettings();
  const title = pack.title[locale] ?? pack.title.en ?? '';
  const empty = pack.questions === 0;

  return (
    <Pressable
      onPress={onPress}
      disabled={empty}
      accessibilityState={{ selected }}
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
        {!playable && (
          <View style={[styles.pricePill, { backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(26,28,28,0.07)' }]}>
            <MaterialIcon name="lock" size={12} color={colors.textFaint} />
            {!!price && <Text style={[styles.priceText, { color: colors.text }]}>{price}</Text>}
          </View>
        )}
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
  pricePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999 },
  priceText: { fontFamily: fonts.extrabold, fontSize: 10 },
  name: { fontFamily: fonts.bold, fontSize: 14, marginTop: 10 },
  meta: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 2 },
});
```

- [ ] **Step 2: Make PackCard's Try-free optional**

In `src/components/store/PackCard.tsx`:

Change the interface line

```ts
  onTry: (p: Pack) => void;
```

to

```ts
  onTry?: (p: Pack) => void;
```

and change the Try-free render condition from

```tsx
              {pack.sample && (
                <Pressable onPress={() => onTry(pack)} hitSlop={6}>
                  <Text style={[styles.try, { color: colors.secondary }]}>{t('store.tryFree')}</Text>
                </Pressable>
              )}
```

to

```tsx
              {pack.sample && onTry && (
                <Pressable onPress={() => onTry(pack)} hitSlop={6}>
                  <Text style={[styles.try, { color: colors.secondary }]}>{t('store.tryFree')}</Text>
                </Pressable>
              )}
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck` → no errors (existing callers still compile: `CategoryPicker` passes `selected`, `explore.tsx` still passes `onTry` until Task 3). `npm test` → all pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/quiz/CategoryTile.tsx src/components/store/PackCard.tsx
git commit -m "feat: CategoryTile price pill; PackCard Try-free optional"
```

---

### Task 3: Explore hub — view toggle, grid view, inline purchase, launch tab

**Files:**
- Modify: `app/(tabs)/explore.tsx`
- Modify: `app/(tabs)/_layout.tsx` (initial route)

**Interfaces:**
- Consumes: `KEYS.storeView`, icons `grid_view`/`view_list`, copy `store.viewGrid`/`store.viewList` (Task 1); `CategoryTile` with `price` (Task 2); existing `getPrice`, `playPack`, `PurchaseSheet`, `loadJSON`/`saveJSON`.
- Produces: Explore renders grid or list per persisted preference; app launches on Explore.

- [ ] **Step 1: Rewrite `app/(tabs)/explore.tsx`**

Replace the file contents with:

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/src/components/app/Screen';
import { Toast } from '@/src/components/ui/Toast';
import { MaterialIcon } from '@/src/components/ui/MaterialIcon';
import { BundleCard } from '@/src/components/store/BundleCard';
import { PackCard } from '@/src/components/store/PackCard';
import { PurchaseSheet, PurchaseTarget } from '@/src/components/store/PurchaseSheet';
import { CategoryTile } from '@/src/components/quiz/CategoryTile';
import { useCatalog } from '@/src/features/catalog/useCatalog';
import { paidIds } from '@/src/features/catalog/catalog';
import { getPrice } from '@/src/features/store/prices';
import { useEntitlements } from '@/src/state/EntitlementsContext';
import { useProgress } from '@/src/state/ProgressContext';
import { useTheme } from '@/src/theme/ThemeProvider';
import { loadJSON, saveJSON, KEYS } from '@/src/lib/storage';
import { fonts } from '@/src/theme/tokens';

type StoreView = 'grid' | 'list';

export default function ExploreScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { catalog } = useCatalog();
  const { owned, buy, restore } = useEntitlements();
  const { progress } = useProgress();
  const [target, setTarget] = useState<PurchaseTarget | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [view, setView] = useState<StoreView>('list');

  // Restore the tester's preferred presentation (beta A/B: grid vs list).
  useEffect(() => {
    loadJSON<StoreView>(KEYS.storeView, 'list').then(setView);
  }, []);

  const toggleView = () => {
    const next: StoreView = view === 'grid' ? 'list' : 'grid';
    setView(next);
    saveJSON(KEYS.storeView, next);
  };

  const paid = paidIds(catalog);
  const allOwned = paid.length > 0 && paid.every((id) => owned.includes(id));
  const goArena = () => router.navigate('/');
  const playPack = (packId: string) => router.navigate({ pathname: '/', params: { pack: packId } });

  const doRestore = () => {
    const ok = restore();
    setToast(ok ? t('sheet.restored') : t('sheet.restoreEmpty'));
    setTimeout(() => setToast(null), 1800);
  };

  const onConfirm = (tg: PurchaseTarget) => {
    if (tg.kind === 'bundle') buy(tg.bundle.id, paid, true);
    else buy(tg.pack.id, paid, false);
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.kicker, { color: colors.textFaint }]}>{t('store.kicker')}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{t('store.title')}</Text>
        </View>
        <Pressable
          onPress={toggleView}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t(view === 'grid' ? 'store.viewList' : 'store.viewGrid')}
          style={[styles.toggle, { borderColor: colors.border }]}
        >
          <MaterialIcon name={view === 'grid' ? 'view_list' : 'grid_view'} size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={{ marginBottom: 12 }}>
        <BundleCard bundle={catalog.bundle} allOwned={allOwned} onBuy={(b) => setTarget({ kind: 'bundle', bundle: b })} />
      </View>

      {view === 'grid' ? (
        <View style={styles.grid}>
          {catalog.packs.map((p) => {
            const isOwned = owned.includes(p.id) || p.isFree;
            return (
              <CategoryTile
                key={p.id}
                pack={p}
                playable={isOwned}
                solved={progress.byPack[p.id] ?? 0}
                price={getPrice(p.storeProductId)}
                onPress={() => (isOwned ? playPack(p.id) : setTarget({ kind: 'pack', pack: p }))}
              />
            );
          })}
        </View>
      ) : (
        catalog.packs.map((p) => (
          <View key={p.id} style={{ marginBottom: 12 }}>
            <PackCard
              pack={p}
              owned={owned.includes(p.id)}
              solved={progress.byPack[p.id] ?? 0}
              onPlay={(pk) => playPack(pk.id)}
              onBuy={(pk) => setTarget({ kind: 'pack', pack: pk })}
            />
          </View>
        ))
      )}

      <View style={styles.footer}>
        <Pressable onPress={doRestore} hitSlop={6}>
          <Text style={[styles.restore, { color: colors.secondary }]}>{t('store.restore')}</Text>
        </Pressable>
        <View style={styles.footRow}>
          <MaterialIcon name="lock_open" size={13} color={colors.textFaint} />
          <Text style={[styles.noAccount, { color: colors.textFaint }]}>{t('store.noAccount')}</Text>
        </View>
        <Text style={[styles.disclaimer, { color: colors.textFaint }]}>{t('disclaimer')}</Text>
      </View>

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
      <Toast message={toast} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 },
  headerText: { flex: 1 },
  kicker: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 2.4, textTransform: 'uppercase' },
  title: { fontFamily: fonts.extrabold, fontSize: 26, letterSpacing: -0.5, marginTop: 2 },
  toggle: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginBottom: 12 },
  footer: { alignItems: 'center', gap: 8, marginTop: 24 },
  restore: { fontFamily: fonts.bold, fontSize: 12 },
  footRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noAccount: { fontFamily: fonts.medium, fontSize: 10 },
  disclaimer: { fontFamily: fonts.regular, fontSize: 9, lineHeight: 14, textAlign: 'center', maxWidth: 300, marginTop: 4 },
});
```

Notes: `onTry` is intentionally no longer passed (Try-free removed for beta; link hides because Task 2 made it optional). Bundle card and footer render in BOTH views.

- [ ] **Step 2: Launch on Explore**

In `app/(tabs)/_layout.tsx`, change

```ts
export const unstable_settings = {
  initialRouteName: 'index',
};
```

to

```ts
export const unstable_settings = {
  initialRouteName: 'explore',
};
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck` → no errors. `npm test` → all pass.

- [ ] **Step 4: Commit**

```bash
git add "app/(tabs)/explore.tsx" "app/(tabs)/_layout.tsx"
git commit -m "feat: Explore hub — grid/list toggle, inline buy, launch tab"
```

---

### Task 4: Arena Continue screen; retire CategoryPicker

**Files:**
- Create: `src/components/quiz/ContinueCard.tsx`
- Modify: `app/(tabs)/index.tsx` (swap CategoryPicker → ContinueCard)
- Delete: `src/components/quiz/CategoryPicker.tsx`

**Interfaces:**
- Consumes: `resolveLastPack`, `isPackPlayable` (`@/src/features/catalog/selection`); `KEYS.lastPack`; copy `arena.continueKicker`, `arena.browse`, `category.continue` (existing); `PackCover`, `PrimaryButton`, `Screen`.
- Produces: `ContinueCard` props `{ onStart: (pack: Pack) => void; onBrowse: () => void }`.

- [ ] **Step 1: Create `src/components/quiz/ContinueCard.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/src/components/app/Screen';
import { PrimaryButton } from '@/src/components/ui/PrimaryButton';
import { PackCover } from '@/src/components/store/PackCover';
import { useCatalog } from '@/src/features/catalog/useCatalog';
import { resolveLastPack, isPackPlayable } from '@/src/features/catalog/selection';
import { Pack } from '@/src/features/catalog/types';
import { useEntitlements } from '@/src/state/EntitlementsContext';
import { useSettings } from '@/src/state/SettingsContext';
import { useTheme } from '@/src/theme/ThemeProvider';
import { loadJSON, KEYS } from '@/src/lib/storage';
import { fonts } from '@/src/theme/tokens';

interface Props {
  onStart: (pack: Pack) => void;
  onBrowse: () => void;
}

/** Arena idle state: one-tap resume of the last-played (or default) pack. */
export function ContinueCard({ onStart, onBrowse }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { locale } = useSettings();
  const { catalog } = useCatalog();
  const { owned } = useEntitlements();
  const [lastId, setLastId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Gate on storage hydration so the remembered pack never flickers.
  useEffect(() => {
    loadJSON<string | null>(KEYS.lastPack, null).then((v) => {
      setLastId(v);
      setHydrated(true);
    });
  }, []);

  const resolvedId = hydrated ? resolveLastPack(lastId, catalog.packs) : null;
  const pack = catalog.packs.find((p) => p.id === resolvedId) ?? null;
  const playable = pack ? isPackPlayable(pack, owned) : false;
  const title = pack ? pack.title[locale] ?? pack.title.en ?? '' : '';

  return (
    <Screen center>
      {pack && (
        <View style={styles.coverWrap}>
          <PackCover cover={pack.cover} icon={pack.icon} size={72} />
        </View>
      )}
      <Text style={[styles.kicker, { color: colors.textFaint }]}>{t('arena.continueKicker')}</Text>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <PrimaryButton
        label={t('category.continue')}
        iconRight="play_arrow"
        disabled={!pack || !playable || pack.questions === 0}
        onPress={() => pack && onStart(pack)}
        style={styles.cta}
      />
      <Pressable onPress={onBrowse} hitSlop={8}>
        <Text style={[styles.browse, { color: colors.secondary }]}>{t('arena.browse')}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  coverWrap: { marginBottom: 16 },
  kicker: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 2.4, textTransform: 'uppercase' },
  title: { fontFamily: fonts.extrabold, fontSize: 26, letterSpacing: -0.5, marginTop: 2, textAlign: 'center' },
  cta: { marginTop: 20, alignSelf: 'stretch', marginHorizontal: 24 },
  browse: { fontFamily: fonts.bold, fontSize: 12, marginTop: 16 },
});
```

- [ ] **Step 2: Rewire `app/(tabs)/index.tsx`**

Only the import and the idle branch change — the deep-link effect and PackRound switch stay exactly as they are. Change

```tsx
import { CategoryPicker } from '@/src/components/quiz/CategoryPicker';
```

to

```tsx
import { ContinueCard } from '@/src/components/quiz/ContinueCard';
```

and change the return block

```tsx
  return (
    <CategoryPicker
      onStart={(pack) => setSelected(pack)}
      onLocked={() => router.navigate('/explore')}
    />
  );
```

to

```tsx
  return (
    <ContinueCard
      onStart={(pack) => setSelected(pack)}
      onBrowse={() => router.navigate('/explore')}
    />
  );
```

- [ ] **Step 3: Delete the retired picker**

```bash
git rm src/components/quiz/CategoryPicker.tsx
```

(`CategoryTile` stays — Explore's grid uses it. The i18n keys `category.kicker` / `category.title` become unused; leave them for now.)

- [ ] **Step 4: Verify**

Run: `npm run typecheck` → no errors (confirms nothing else imported CategoryPicker). `npm test` → all pass.

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/index.tsx" src/components/quiz/ContinueCard.tsx
git commit -m "feat: Arena idle Continue screen; retire CategoryPicker"
```

---

## Final Verification

- [ ] `npm test` — all suites pass; `npm run typecheck` — clean.
- [ ] Manual smoke (beta flow): launch → Explore; toggle grid ⇄ list and relaunch (choice persists); Play a free pack from both views → round starts in Arena; tap a locked pack in both views → PurchaseSheet in place; buy → Start plays that pack; Arena tab idle shows "Continue · <last pack>"; Continue resumes; "Browse categories" returns to Explore.

## Notes / Deferred

- Sample gating still deferred (Try-free link now hidden; `store.tryFree` copy and `pack.sample` data kept for when it returns).
- `category.kicker` / `category.title` i18n keys now unused — clean up in a later copy pass if the grid-in-Explore wins the beta.
- If the beta picks ONE view, delete the loser + toggle and hardcode the winner.
