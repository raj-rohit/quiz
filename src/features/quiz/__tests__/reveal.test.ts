import { resolveMode, modeForLogoType, clampReveal, REVEAL_MODES } from '../reveal';

describe('resolveMode', () => {
  it('returns null for empty / none / unknown', () => {
    expect(resolveMode(null)).toBeNull();
    expect(resolveMode(undefined)).toBeNull();
    expect(resolveMode('')).toBeNull();
    expect(resolveMode('none')).toBeNull();
    expect(resolveMode('NONE')).toBeNull();
    expect(resolveMode('wat')).toBeNull();
  });

  it('passes through known modes (case-insensitive)', () => {
    expect(resolveMode('blur')).toBe('blur');
    expect(resolveMode('Letter-Mask')).toBe('letter-mask');
    expect(resolveMode(' SILHOUETTE ')).toBe('silhouette');
  });

  it('maps legacy aliases', () => {
    expect(resolveMode('blackout')).toBe('silhouette');
    expect(resolveMode('grayscale')).toBe('blur');
    expect(resolveMode('mosaic')).toBe('tiles');
    expect(resolveMode('pixelated')).toBe('pixelate');
  });
});

describe('modeForLogoType', () => {
  it('recommends letter-mask for wordmarks, silhouette for marks', () => {
    expect(modeForLogoType('wordmark')).toBe('letter-mask');
    expect(modeForLogoType('mark')).toBe('silhouette');
    expect(modeForLogoType(null)).toBe('blur');
  });
});

describe('clampReveal', () => {
  it('clamps to [0,1]', () => {
    expect(clampReveal(-0.5)).toBe(0);
    expect(clampReveal(1.5)).toBe(1);
    expect(clampReveal(0.42)).toBe(0.42);
  });
});

describe('REVEAL_MODES', () => {
  it('exposes the 10 lab engines', () => {
    expect(REVEAL_MODES).toHaveLength(10);
    expect(REVEAL_MODES.map((m) => m.id)).toEqual(
      expect.arrayContaining(['blur', 'pixelate', 'silhouette', 'crop', 'letter-mask', 'spotlight', 'slices', 'tiles', 'color', 'glitch'])
    );
  });
});
