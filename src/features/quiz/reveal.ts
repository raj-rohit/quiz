// Logo reveal / obfuscation engine — data model.
//
// Ported from the "Logo Obfuscation Lab" design (logo-lab.html). The app ships
// the rendering engines (see RevealStage); Supabase decides *which* mode each
// brand uses via the `obfuscation_type` column, plus optional `start_reveal` /
// `reveal_step` difficulty knobs. Choosing/tuning an existing mode is a pure
// data change — no app update. Adding a brand-new mode needs new render code.
//
// Every mode reads a single `reveal` value in [0, 1]: 0 = fully hidden,
// 1 = fully shown. That same value doubles as the hint/difficulty engine —
// start near 0 and raise it on each wrong guess (or over time), then score by
// how little reveal the player needed.

export type RevealModeId =
  | 'blur'
  | 'pixelate'
  | 'silhouette'
  | 'crop'
  | 'letter-mask'
  | 'spotlight'
  | 'slices'
  | 'tiles'
  | 'color'
  | 'glitch';

/** Brands split into a distinctive symbol (mark) vs the styled name (wordmark). */
export type LogoType = 'mark' | 'wordmark';

export interface RevealMode {
  id: RevealModeId;
  label: string;
  /** Which brand kind this treatment is built for. */
  bestFor: LogoType | 'any';
  /** One-line explanation (powers the Lab legend). */
  blurb: string;
}

export const REVEAL_MODES: RevealMode[] = [
  { id: 'blur', label: 'Blur', bestFor: 'any', blurb: 'Universal. Reads colour + shape, hides detail. De-blur as a hint. Works for marks and wordmarks.' },
  { id: 'pixelate', label: 'Pixelate', bestFor: 'any', blurb: 'Same idea, arcade feel. Block size = difficulty. Good for any logo.' },
  { id: 'silhouette', label: 'Silhouette', bestFor: 'mark', blurb: 'Single-colour blackout of the shape. Perfect for mark brands — fades to full colour on reveal.' },
  { id: 'crop', label: 'Crop / Zoom', bestFor: 'any', blurb: 'Extreme close-up of one fragment. Zooms out on reveal. Hard mode for any brand.' },
  { id: 'letter-mask', label: 'Letter-mask', bestFor: 'wordmark', blurb: 'The fix for wordmark brands: keep the colour + container, redact the name, then wipe it open.' },
  { id: 'spotlight', label: 'Spotlight', bestFor: 'any', blurb: 'A flashlight circle that grows on reveal. Tense, focused — great for a timed hint.' },
  { id: 'slices', label: 'Slices', bestFor: 'any', blurb: 'Venetian blinds that open as you reveal. Reads structure before detail.' },
  { id: 'tiles', label: 'Tiles', bestFor: 'any', blurb: 'Mosaic squares dissolve in one by one. Satisfying, very game-y countdown.' },
  { id: 'color', label: 'Color', bestFor: 'wordmark', blurb: "Flatten to the brand's signature colour + shape, then sharpen to the real logo. Pure guess-by-colour." },
  { id: 'glitch', label: 'Glitch', bestFor: 'any', blurb: 'Displaced scanlines that settle into place. Loud, arcade energy for bonus rounds.' },
];

const MODE_IDS = new Set<string>(REVEAL_MODES.map((m) => m.id));

export const DEFAULT_MODE: RevealModeId = 'blur';

/**
 * Normalise a raw `obfuscation_type` value from Supabase.
 * `null` / `'none'` / unknown → null (render the logo plainly, no obscuring).
 */
export function resolveMode(raw?: string | null): RevealModeId | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === 'none' || v === '') return null;
  if (MODE_IDS.has(v)) return v as RevealModeId;
  // Legacy / loosely-typed aliases from earlier data.
  if (v === 'blackout') return 'silhouette';
  if (v === 'grayscale' || v === 'greyscale' || v === 'opacity' || v === 'invert') return 'blur';
  if (v === 'rotate') return 'blur';
  if (v === 'mosaic') return 'tiles';
  if (v === 'pixelated') return 'pixelate';
  return null;
}

/** Recommended default treatment for a brand, given its logo type. */
export function modeForLogoType(type?: LogoType | null): RevealModeId {
  return type === 'wordmark' ? 'letter-mask' : type === 'mark' ? 'silhouette' : DEFAULT_MODE;
}

/**
 * The fixed "hidden but fair" reveal each mode renders at during the quiz.
 * 0 = fully hidden, 1 = fully shown. Tuned per mode so each looks right without
 * any per-brand level — the brand only stores *which* mode (obfuscation_type).
 */
export const OBSCURE_LEVEL: Record<RevealModeId, number> = {
  blur: 0.18,
  pixelate: 0.18,
  silhouette: 0,
  crop: 0.32,
  'letter-mask': 0.12,
  spotlight: 0.22,
  slices: 0.25,
  tiles: 0.32,
  color: 0,
  glitch: 0.25,
};

/** Obscure level for a resolved mode; `null` (no mode) shows the logo in full. */
export function obscureLevel(mode: RevealModeId | null): number {
  return mode ? OBSCURE_LEVEL[mode] : 1;
}

export const clampReveal = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
