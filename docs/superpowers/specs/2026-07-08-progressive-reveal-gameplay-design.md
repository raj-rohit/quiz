# Progressive Reveal Gameplay — Design

**Date:** 2026-07-08
**Status:** Approved pending user review
**Scope:** Make the logo reveal engine an active game mechanic: the logo sharpens automatically over time and the score tracks how early the player answers. No new player actions.

## Problem

The reveal engine ([src/features/quiz/reveal.ts](../../../src/features/quiz/reveal.ts), [RevealStage](../../../src/components/quiz/RevealStage.tsx)) ships ten obfuscation modes, but the quiz renders each brand at one static obscure level that never changes during play. Wrong guesses shake and reset. Scoring (`computeScore`) is time-only, floored at 50, with unlimited free retries — a player cannot do badly without giving up, and the time pressure is invisible until the reveal screen.

## Design (one system: the reveal is the timer)

A question is a single ~40-second timeline. The logo sharpens continuously along it; the score slides down along it; answering stops the clock. There are no new buttons and no player-facing decisions beyond **Check** and **Give up**.

### Rules

- **Reveal ramp.** For brands with an obfuscation mode, the reveal level rises linearly from the brand's start level (`brandObscureLevel(mode, start_reveal)` — unchanged) to a cap of **0.88** at **40s**, then holds. The logo is never fully clean until solved/given up (the existing RevealCard shows the clean logo).
- **Score curve.** 100 for the first **10s** (grace), then linear decay to a floor of **15** at **40s**, then holds. Integer-rounded. Solving at 15s ≈ 86; at 25s ≈ 58; any time after 40s = 15.
- **Wrong guess.** Shake only, exactly as today — no penalty, no reveal jump. Time running is the implicit cost. One UX fix: the typed text is **no longer cleared** after the shake, so the player can fix a typo instead of retyping.
- **Give up.** Unchanged: score 0, reveal card shown.
- **Near match.** Unchanged: Levenshtein ≤ 2 (via `useQuiz`) or normalized equality counts as fully correct.
- **Plain brands** (`obfuscation_type` null/`'none'`, the majority): logo stays fully visible as today (no ramp), but the same score curve applies.
- **Live points chip.** A small pill on the logo stage shows the current attainable score (e.g. "86 pts"), green during grace, amber while decaying. This is what makes the countdown legible.

### Tuning constants (single source of truth, exported)

| Constant | Value | Meaning |
|---|---|---|
| `GRACE_SEC` | 10 | full 100 pts window |
| `DECAY_END_SEC` | 40 | score reaches floor; reveal reaches cap |
| `SCORE_FLOOR` | 15 | minimum score for a correct answer |
| `REVEAL_CAP` | 0.88 | max auto-reveal; never fully clean |

## Architecture

The earlier "round reducer" idea collapses: with no events (no hints, no wrong-guess effects), the logic is two pure functions of elapsed time. They live in the existing pure modules, matching repo structure:

- **`src/features/quiz/score.ts`** — replace `computeScore` with `scoreAt(elapsedSec): number` implementing the grace/decay/floor curve. `normalizeAnswer` unchanged.
- **`src/features/quiz/reveal.ts`** — add `revealAt(elapsedSec, mode, startReveal): number`: linear ramp from `brandObscureLevel` to `REVEAL_CAP` over `DECAY_END_SEC`; returns 1 (fully shown) when mode is null.

### Component changes

- **[QuizCard.tsx](../../../src/components/quiz/QuizCard.tsx)**
  - Keeps `startedAt` ref as the single clock (wall time; backgrounding the app keeps costing time — accepted, same as today).
  - A ticker (250ms interval) updates an `elapsed` state while `state === 'idle'`; cleared on solve/give-up/unmount.
  - Passes `revealAt(elapsed, obfuscationType, startReveal)` into `LogoStage`.
  - Renders the points chip from `scoreAt(elapsed)`.
  - `submit()` uses `scoreAt(elapsed)` for `scorePct`; wrong-guess branch no longer clears `guess`.
- **[LogoStage.tsx](../../../src/components/quiz/LogoStage.tsx)** — grows a `reveal?: number` prop, forwarded to `RevealStage`'s existing `reveal` prop (one line).
- **Unchanged:** `RevealStage` and all ten modes, `RevealCard`, `index.tsx` / `onComplete` signature, `ProgressContext`/`progress.ts`, `useQuiz`, Supabase schema and data.

### Edge cases

- Reveal updates arrive as prop changes 4×/sec; expo-image's built-in `transition` smooths blur steps. No reanimated work needed.
- Double-submit guarded by the existing `state !== 'idle'` check.
- `elapsed` derives from `Date.now() - startedAt` at each tick (no drift from interval jitter).
- Brands with `start_reveal >= REVEAL_CAP` simply render at their start level the whole question (ramp clamps upward only).

## Testing (TDD)

- `score.test.ts` — rewrite for `scoreAt`: grace window boundary (10s → 100), mid-curve value, floor at/after 40s, integer rounding.
- `reveal.test.ts` — extend for `revealAt`: starts at `brandObscureLevel`, linear midpoint, caps at 0.88 from 40s on, returns 1 for null mode, clamps when `start_reveal` ≥ cap.
- Component behavior (ticker, chip, kept text) verified manually via the app / Logo Lab; no component-test infra exists in the repo and none is added here.

## Out of scope (explicitly deferred)

- Round structure (sessions of N questions with a summary screen) — separate spec.
- Hint button / hint ladder — cut during design; the auto-ramp is the hint.
- Deck shuffling / unseen-first ordering.
- Wrong-guess penalties of any kind.
