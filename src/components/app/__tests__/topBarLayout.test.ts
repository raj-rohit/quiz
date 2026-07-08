import { TOP_BAR_CONTENT, TOP_BAR_CLEARANCE, contentTopPadding, scrimGeometry } from '../topBarLayout';

// Status-bar insets across devices: notchless, notch, Dynamic Island.
const INSETS = [20, 47, 59];

describe('topBarLayout', () => {
  test('content clears the bar by the shared clearance', () => {
    for (const inset of INSETS) {
      expect(contentTopPadding(inset)).toBe(inset + TOP_BAR_CONTENT + TOP_BAR_CLEARANCE);
    }
  });

  test('scrim fades out exactly where resting content begins', () => {
    for (const inset of INSETS) {
      const { height } = scrimGeometry(inset);
      // The scrim must never extend past the content's resting position,
      // otherwise the top bar visually covers the body.
      expect(height).toBe(contentTopPadding(inset));
    }
  });

  test('scrim stays fully solid across the status bar and bar controls area', () => {
    for (const inset of INSETS) {
      const { height, locations } = scrimGeometry(inset);
      const solidEnd = locations[1] * height;
      // Solid at least through the status bar + most of the bar row.
      expect(solidEnd).toBeGreaterThanOrEqual(inset + TOP_BAR_CONTENT * 0.6);
      // ...but done fading by the bar's own footprint + clearance.
      expect(locations[locations.length - 1]).toBe(1);
    }
  });

  test('gradient locations are increasing and within [0, 1]', () => {
    for (const inset of INSETS) {
      const { locations } = scrimGeometry(inset);
      expect(locations[0]).toBe(0);
      for (let i = 1; i < locations.length; i++) {
        expect(locations[i]).toBeGreaterThan(locations[i - 1]);
        expect(locations[i]).toBeLessThanOrEqual(1);
      }
    }
  });
});
