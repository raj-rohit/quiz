# Visible Score Decay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the currently attainable score as a live chip on the quiz logo stage, and stop clearing the player's typed text after a wrong guess.

**Architecture:** Two changes confined to the quiz card. A new presentational `PointsChip` component overlays the logo stage; a 1-second ticker in `QuizCard` feeds it `computeScore(elapsed)` from the existing `startedAt` clock. The wrong-guess branch keeps the input text. No changes to scoring math, the reveal engine, or data.

**Tech Stack:** React Native (Expo SDK 54), TypeScript, jest-expo, i18next.

**Spec:** `docs/superpowers/specs/2026-07-08-visible-score-decay-design.md`

## Global Constraints

- `computeScore` in `src/features/quiz/score.ts` must NOT change (100 pts ≤10s, then −2/sec, floor 50).
- Obfuscation level stays static during a question — do not touch `reveal.ts`, `RevealStage.tsx`, or `LogoStage.tsx`.
- Buttons remain exactly **Check** and **Give up**; no new player actions.
- All user-facing strings go through i18next; every new key must exist in all four locales: `en`, `nl`, `de`, `fr` (under `src/i18n/locales/`).
- Styling uses existing tokens (`fonts`, `radii`, `rgb` from `src/theme/tokens.ts`); no new dependencies.
- Verification commands: `npm test` (jest) and `npm run typecheck` (tsc); both must pass before every commit.

---

### Task 1: PointsChip component + live ticker in QuizCard

**Files:**
- Create: `src/components/quiz/PointsChip.tsx`
- Modify: `src/components/quiz/QuizCard.tsx`
- Modify: `src/i18n/locales/en.json`, `src/i18n/locales/nl.json`, `src/i18n/locales/de.json`, `src/i18n/locales/fr.json` (add `quiz.pts`)

**Interfaces:**
- Consumes: `computeScore(sec: number): number` from `@/src/features/quiz/score` (existing); `fonts`, `radii`, `rgb` from `@/src/theme/tokens` (existing).
- Produces: `PointsChip({ pts, suffix, decaying }: { pts: number; suffix: string; decaying: boolean })` — presentational pill; no state. Task 2 does not depend on it.

There is no new pure logic in this task (the value shown is the already-tested `computeScore`), and this repo has no component-render test infrastructure — so this task is verified by typecheck, the existing jest suite, and a manual app check (per the spec's Testing section).

- [ ] **Step 1: Create the PointsChip component**

Create `src/components/quiz/PointsChip.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts, radii, rgb } from '@/src/theme/tokens';

const GREEN = '34 197 94'; // grace window: full points still attainable
const AMBER = '245 158 11'; // decaying: score is ticking down

/** Live "answer now for N pts" pill overlaid on the quiz logo stage. */
export function PointsChip({ pts, suffix, decaying }: { pts: number; suffix: string; decaying: boolean }) {
  const triplet = decaying ? AMBER : GREEN;
  return (
    <View style={[styles.chip, { borderColor: rgb(triplet, 0.35) }]}>
      <Text style={[styles.label, { color: rgb(triplet) }]}>{`${pts} ${suffix}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    backgroundColor: 'rgba(10,10,10,0.55)',
  },
  label: { fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 0.5 },
});
```

- [ ] **Step 2: Add the `quiz.pts` key to all four locales**

In each locale file, add one key inside the existing `"quiz": { … }` object (after `"score"` is fine):

`src/i18n/locales/en.json`: `"pts": "pts",`
`src/i18n/locales/nl.json`: `"pts": "ptn",`
`src/i18n/locales/de.json`: `"pts": "Pkt.",`
`src/i18n/locales/fr.json`: `"pts": "pts",`

- [ ] **Step 3: Wire the ticker and chip into QuizCard**

In `src/components/quiz/QuizCard.tsx`:

3a. Change the React import (line 1) to include `useEffect`:

```tsx
import React, { useEffect, useRef, useState } from 'react';
```

3b. Add imports:

```tsx
import { PointsChip } from './PointsChip';
```

3c. Inside the component, after the `startedAt` ref, add the elapsed ticker:

```tsx
const [elapsed, setElapsed] = useState(0);

// Live clock for the points chip; stops once the answer is revealed.
useEffect(() => {
  if (state === 'revealed') return;
  const id = setInterval(() => {
    setElapsed(Math.round((Date.now() - startedAt.current) / 1000));
  }, 1000);
  return () => clearInterval(id);
}, [state]);

const livePts = computeScore(elapsed);
```

(`computeScore` is already imported in this file.)

3d. Wrap `LogoStage` in a plain `View` with the chip overlaid — replace

```tsx
<LogoStage imageUrl={imageUrl} dominantColor={dominantColor} obfuscationType={obfuscationType} startReveal={startReveal} />
```

with

```tsx
<View>
  <LogoStage imageUrl={imageUrl} dominantColor={dominantColor} obfuscationType={obfuscationType} startReveal={startReveal} />
  <View style={styles.pointsWrap} pointerEvents="none">
    <PointsChip pts={livePts} suffix={t('quiz.pts')} decaying={livePts < 100} />
  </View>
</View>
```

3e. Add to the `StyleSheet.create` block at the bottom:

```tsx
pointsWrap: { position: 'absolute', top: 10, right: 10 },
```

3f. Make the awarded score exactly match the chip (spec: "no drift between display and result"). In `submit()`, replace

```tsx
const elapsed = Math.round((Date.now() - startedAt.current) / 1000);
const correct = submitGuess(guess).success || normalizeAnswer(guess) === normalizeAnswer(answer);
```

with (the local recomputation goes away; the ticked `elapsed` state is used instead)

```tsx
const correct = submitGuess(guess).success || normalizeAnswer(guess) === normalizeAnswer(answer);
```

and in `giveUp()` delete the same `const elapsed = …` line. Both functions' subsequent `setTimeSec(elapsed)` / `computeScore(elapsed)` calls now read the state variable, so the reveal card shows precisely the last value the player saw on the chip.

- [ ] **Step 4: Typecheck and run the test suite**

Run: `npm run typecheck`
Expected: exits 0, no errors.

Run: `npm test`
Expected: all existing suites pass (score, reveal, topBarLayout, mesh).

- [ ] **Step 5: Manual verification in the app**

Run: `npm start` and open the app (Expo Go or dev build), Arena tab.

Verify:
- A pill reading "100 pts" (green) sits in the top-right corner of the logo stage.
- After 10 seconds it starts ticking down by 2 every second and turns amber ("98 pts", "96 pts", …).
- It stops at "50 pts" (the floor) and stays there.
- Answering correctly shows a reveal-card score equal to the chip's last value.
- The chip does not intercept taps (logo area still non-interactive, input/buttons work).

- [ ] **Step 6: Commit**

```bash
git add src/components/quiz/PointsChip.tsx src/components/quiz/QuizCard.tsx src/i18n/locales/en.json src/i18n/locales/nl.json src/i18n/locales/de.json src/i18n/locales/fr.json
git commit -m "feat: live points chip shows score decay during a question"
```

---

### Task 2: Keep typed text after a wrong guess

**Files:**
- Modify: `src/components/quiz/QuizCard.tsx` (the `submit` function's wrong branch)

**Interfaces:**
- Consumes: nothing from Task 1 (independent change in the same file).
- Produces: nothing consumed later.

- [ ] **Step 1: Stop clearing the guess**

In `src/components/quiz/QuizCard.tsx`, in `submit()`, the wrong branch currently reads:

```tsx
setState('wrong');
setTimeout(() => {
  setState('idle');
  setGuess('');
  inputRef.current?.focus();
}, 600);
```

Remove the `setGuess('');` line only — shake and refocus stay:

```tsx
setState('wrong');
setTimeout(() => {
  setState('idle');
  inputRef.current?.focus();
}, 600);
```

- [ ] **Step 2: Typecheck and run the test suite**

Run: `npm run typecheck`
Expected: exits 0.

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 3: Manual verification in the app**

In the running app: type a wrong answer, press Check.
Verify: the input shakes red, then returns to idle with **your text still in the field**, focused, and Check enabled (text non-empty). Correct the text and submit — solves normally.

- [ ] **Step 4: Commit**

```bash
git add src/components/quiz/QuizCard.tsx
git commit -m "fix: keep typed guess after a wrong answer"
```
