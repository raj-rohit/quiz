import { blendOver, palette } from '../tokens';
import { meshTopColor, MESH_ACCENT_ALPHA } from '../mesh';

describe('blendOver', () => {
  test('alpha 0 returns the base color', () => {
    expect(blendOver('#0e0e0e', '245 158 11', 0)).toBe('#0e0e0e');
  });

  test('alpha 1 returns the overlay color', () => {
    expect(blendOver('#0e0e0e', '245 158 11', 1)).toBe('#f59e0b');
  });

  test('blends channels linearly', () => {
    expect(blendOver('#000000', '255 255 255', 0.5)).toBe('#808080');
  });

  test('pads single-digit channels', () => {
    expect(blendOver('#000000', '16 16 16', 0.5)).toBe('#080808');
  });
});

describe('meshTopColor', () => {
  const accent = { rgb: '245 158 11', glow: '251 191 36' };

  test('dark mode composites the glow blob over night', () => {
    expect(meshTopColor(true, accent)).toBe(blendOver(palette.night, accent.glow, MESH_ACCENT_ALPHA.dark));
  });

  test('light mode composites the accent blob over cream', () => {
    expect(meshTopColor(false, accent)).toBe(blendOver(palette.cream, accent.rgb, MESH_ACCENT_ALPHA.light));
  });

  test('returns a #rrggbb hex so callers can append alpha suffixes', () => {
    expect(meshTopColor(true, accent)).toMatch(/^#[0-9a-f]{6}$/);
    expect(meshTopColor(false, accent)).toMatch(/^#[0-9a-f]{6}$/);
  });
});
