# Local Logo — App Identity ("Pinned Question")

**Date:** 2026-07-04 · **Status:** Implemented

## What

Replace the untouched Expo placeholder icons with a real identity for the app,
now named **Local Logo** — a quiz about local-market brands (NL, DE, BE, FR),
not global ones.

## The mark

A question mark caught mid-reveal:

- The **hook** is solid, luminous amber — the NL accent (`245 158 11`, which is
  also Dutch *Oranje*), running the design-system gradient glow `#fcd34d` →
  mid `#f59e0b` → deep `#b45309`.
- The **stem** dissolves into rounded mosaic tiles — the same visual language
  as the app's logo-obfuscation engine (see `feat: per-brand logo
  reveal/obfuscation engine`). The question is literally mid-reveal.
- The **dot** is a solid **map pin** — the "local" in Local Logo. The question
  fades; the place stays anchored.
- Ground: night `#0e0e0e` with the mesh-gradient treatment from DESIGN.md
  (faint amber blob top-left, faint teal `#0cb6fd` bottom-right).
- Typeface: Plus Jakarta Sans ExtraBold — the app's own display face.

Options considered (7 total across 3 rounds — dissolve directions, frosted
glass pane, full mosaic, teal trail, glass locator pin, flag chip). "Pinned
Question" won because it says *guess* and *local* in one glyph and stays
legible at 28 px. Gallery artifact:
https://claude.ai/code/artifact/01e2b524-2be5-4196-aa93-e277a346bbb1

## Assets & wiring

| File | Treatment |
|---|---|
| `assets/images/icon.png` | Full-bleed 1024, mark on night mesh |
| `assets/images/adaptive-icon.png` | Transparent foreground, mark scaled to the 66% safe zone; adaptive bg `#0e0e0e` |
| `assets/images/splash-icon.png` | Mark + "Local Logo" wordmark + "DUTCH CLASSICS" tag; splash bg `#0e0e0e` |
| `assets/images/favicon.png` | 64 px simplified mark (solid ?, pin dot — no mosaic at tab size) |

`app.json`: `name` → "Local Logo"; splash & adaptive backgrounds → `#0e0e0e`
(slug stays `quiz`).

## Regenerating / re-theming

Everything is generated from `scripts/generate_brand_assets.js`
(deterministic, seeded):

```
npm i --no-save @resvg/resvg-js
node scripts/generate_brand_assets.js
```

Per-country builds (FR/BE/DE) can re-tint the same geometry by swapping the
`AMBER` constants for the build's accent triplet from `src/theme/builds.ts`.
The splash tagline should follow the build's deck name.
