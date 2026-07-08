import { resolveMode, modeForLogoType, clampReveal, brandObscureLevel, OBSCURE_LEVEL, REVEAL_MODES } from '../reveal';

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

describe('brandObscureLevel', () => {
  it("falls back to the mode's tuned level when start_reveal is missing", () => {
    expect(brandObscureLevel('pixelate', null)).toBe(OBSCURE_LEVEL.pixelate);
    expect(brandObscureLevel('crop', undefined)).toBe(OBSCURE_LEVEL.crop);
  });

  it("uses the brand's start_reveal when set", () => {
    expect(brandObscureLevel('pixelate', 0.1)).toBe(0.1);
    expect(brandObscureLevel('blur', 0.5)).toBe(0.5);
  });

  it('accepts 0 as an explicit fully-hidden level', () => {
    expect(brandObscureLevel('pixelate', 0)).toBe(0);
  });

  it('clamps out-of-range values into [0, 1]', () => {
    expect(brandObscureLevel('pixelate', 1.5)).toBe(1);
    expect(brandObscureLevel('pixelate', -0.2)).toBe(0);
  });

  it('coerces numeric strings from loosely-typed rows', () => {
    expect(brandObscureLevel('pixelate', '0.25')).toBe(0.25);
  });

  it('ignores non-numeric garbage and falls back', () => {
    expect(brandObscureLevel('pixelate', 'hard')).toBe(OBSCURE_LEVEL.pixelate);
    expect(brandObscureLevel('pixelate', NaN)).toBe(OBSCURE_LEVEL.pixelate);
  });

  it('shows the logo plainly when there is no mode, regardless of start_reveal', () => {
    expect(brandObscureLevel(null, 0.1)).toBe(1);
    expect(brandObscureLevel(null, null)).toBe(1);
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
