// Pure quiz scoring + answer normalization (mirrors the prototype's app.jsx).

/** Score as a function of time: full marks up to 10s, then -2/sec, floored at 50. */
export const computeScore = (sec: number): number =>
  Math.min(100, Math.max(50, 100 - Math.max(0, sec - 10) * 2));

// Combining diacritical marks (U+0300–U+036F), built from an escaped string
// so the source contains no literal combining characters.
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');

/** Strip accents, case and punctuation for forgiving answer comparison. */
export const normalizeAnswer = (s: string): string =>
  (s || '')
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
