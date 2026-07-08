# Visible Score Decay — Design

**Date:** 2026-07-08
**Status:** Approved pending user review
**Scope:** Make the existing time-based scoring visible during play, and stop clearing the input on a wrong guess. Nothing else changes.

## Problem

The score already decays with time (`computeScore` in [src/features/quiz/score.ts](../../../src/features/quiz/score.ts): 100 pts for the first 10s, then −2/sec, floor 50), but the player can't see it — the timer is invisible until the reveal screen, so the mechanic exerts no pressure. Separately, a wrong guess clears the typed text after the 600ms shake, forcing a full retype even for a one-letter typo.

Design decisions confirmed during brainstorming:

- **The obfuscation level never changes during a question.** A brand renders at its fixed obscure level (`brandObscureLevel(mode, start_reveal)`) from start to reveal — exactly as today. No auto-reveal, no hint button.
- **The score curve stays exactly as shipped.** `computeScore` is untouched.
- **Wrong guesses cost nothing** beyond the time they consume.
- Buttons remain **Check** and **Give up** only.

## Design

Two changes, both in [QuizCard.tsx](../../../src/components/quiz/QuizCard.tsx):

1. **Live points chip.** A small pill overlaid on the logo stage shows the currently attainable score, i.e. `computeScore(elapsedSec)` — "100 pts" during the grace window, then ticking down ("96 pts", …) to the floor of 50. Green while at 100, amber once decaying. Driven by a 1-second interval that runs only while the question is unanswered (`state !== 'revealed'`), reading elapsed time from the existing `startedAt` ref (`Date.now() - startedAt` each tick — no interval drift). Cleared on reveal/give-up/unmount.

2. **Keep the text on a wrong guess.** The wrong-guess branch keeps the shake and refocus but no longer resets `guess` to `''`.

### Explicitly unchanged

- `computeScore`, `normalizeAnswer`, and their tests
- The reveal engine: [reveal.ts](../../../src/features/quiz/reveal.ts), [RevealStage](../../../src/components/quiz/RevealStage.tsx), [LogoStage](../../../src/components/quiz/LogoStage.tsx) — obfuscation is static by design
- RevealCard, ProgressContext/progress.ts, useQuiz (near-match rule), index.tsx, Supabase schema/data

## Implementation notes

- Chip styling follows existing tokens (`fonts`, `radii`, theme colors); positioned absolute in the stage's top-right corner, matching the glass aesthetic. `pointerEvents="none"`.
- Elapsed seconds shown to the player and the seconds used for the final score come from the same `startedAt` ref, so the chip value at the moment of a correct submit equals the awarded `scorePct` (both are `computeScore(elapsed)` — no drift between display and result).
- Backgrounding the app keeps the clock running (wall time) — same behavior as today, accepted.

## Testing

- `computeScore` is already covered by `score.test.ts`; no new pure logic is introduced.
- Manual verification in the app: chip appears at 100, starts dropping at 10s, turns amber, floors at 50; final score chip on the reveal card matches the last value shown; wrong guess keeps the typed text and refocuses.

## Out of scope (deferred)

- Any change to obfuscation during play (auto-reveal, hints) — rejected during design
- Score curve retuning
- Round structure / session summaries, deck shuffling, wrong-guess penalties
