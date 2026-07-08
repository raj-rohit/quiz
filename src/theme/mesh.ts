import { palette, blendOver } from './tokens';

/** Overlay strength of the mesh's top accent blob (single source for MeshBackground + scrims). */
export const MESH_ACCENT_ALPHA = { dark: 0.16, light: 0.08 } as const;

/**
 * The flat color the mesh backdrop composites to at the top of the screen
 * (base + accent blob). Surfaces that must blend seamlessly into the backdrop
 * — like the top-bar scrim — use this instead of the raw background color.
 */
export function meshTopColor(dark: boolean, accent: { rgb: string; glow: string }): string {
  return dark
    ? blendOver(palette.night, accent.glow, MESH_ACCENT_ALPHA.dark)
    : blendOver(palette.cream, accent.rgb, MESH_ACCENT_ALPHA.light);
}
