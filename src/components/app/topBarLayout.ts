/** Shared geometry for the floating top bar, its scrim, and screen content padding. */

/** Bar content height below the status-bar inset. */
export const TOP_BAR_CONTENT = 56;

/** Gap between the bar's bottom edge and where screen content starts at rest. */
export const TOP_BAR_CLEARANCE = 8;

/** Length of the scrim's soft fade-out edge. */
const SCRIM_FADE = 24;

/** Total bar footprint: status-bar inset + bar content. */
export function barHeight(insetTop: number) {
  return insetTop + TOP_BAR_CONTENT;
}

/** Where screen content begins at rest (used as `paddingTop` by Screen). */
export function contentTopPadding(insetTop: number) {
  return barHeight(insetTop) + TOP_BAR_CLEARANCE;
}

/**
 * Scrim behind the floating bar: solid over the status bar and bar controls,
 * then fading to transparent exactly where resting content begins — so it
 * hides content scrolling beneath the bar without ever dimming the body at rest.
 */
export function scrimGeometry(insetTop: number) {
  const height = contentTopPadding(insetTop);
  const fadeStart = (height - SCRIM_FADE) / height;
  return { height, locations: [0, fadeStart, 1] as [number, number, number] };
}
