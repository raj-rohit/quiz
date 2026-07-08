import React, { useMemo, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Image, ImageStyle } from 'expo-image';
import { radii } from '@/src/theme/tokens';
import { resolveMode, clampReveal, brandObscureLevel, RevealModeId } from '@/src/features/quiz/reveal';

/**
 * The logo reveal/obfuscation engine (ported from logo-lab.html).
 *
 * One `reveal` value in [0,1] drives every mode: 0 = hidden, 1 = fully shown.
 * The canvas-based lab can't port verbatim — this RN build has no Skia/SVG — so
 * each mode is re-expressed with native primitives: layered <Image> with
 * `tintColor`, clip + transform, and overlay grids. The output matches the
 * design's intent for each treatment.
 *
 * `mode` is the brand's `obfuscation_type`. Falsy / 'none' renders the logo
 * plainly (most brands), so this is a drop-in for the previous LogoStage.
 *
 * `reveal` is optional: when omitted, each mode uses its tuned fixed obscure
 * level (see OBSCURE_LEVEL) — so callers only need to pass the mode.
 */
export interface RevealStageProps {
  imageUrl?: string | null;
  mode?: string | null;
  /** 0 hidden → 1 shown. Omit to use the brand's / mode's obscure level. */
  reveal?: number;
  /** Brand's `start_reveal` column — per-brand difficulty override. */
  startReveal?: unknown;
  /** Brand's signature colour — used by `color` and as the stage backdrop. */
  dominantColor?: string | null;
  radius?: number;
  style?: any;
}

const MAX_BLUR = 28; // expo-image blurRadius (points) at reveal 0
const BLACK = '#0a0a0a';
const SLICE_BARS = 9;
const TILE_COLS = 10;
const TILE_ROWS = 7;
const GLITCH_SLICES = 12;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Deterministic PRNG so a given brand's tile order / glitch offsets are stable
// across renders (mulberry32). Seeded from the image URL.
function seededRandoms(seed: number, n: number): number[] {
  let s = seed >>> 0;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    out.push(((t ^ (t >>> 14)) >>> 0) / 4294967296);
  }
  return out;
}

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function RevealStage({ imageUrl, mode, reveal, startReveal, dominantColor, radius = radii.stage, style }: RevealStageProps) {
  const resolved = resolveMode(mode);
  const r = clampReveal(reveal ?? brandObscureLevel(resolved, startReveal));
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width && height && (!dims || dims.w !== width || dims.h !== height)) {
      setDims({ w: width, h: height });
    }
  };

  const seed = useMemo(() => hashString(imageUrl ?? 'logo'), [imageUrl]);

  return (
    <View
      style={[styles.stage, { borderRadius: radius, backgroundColor: stageBg(resolved, dominantColor) }, style]}
      onLayout={onLayout}
    >
      {imageUrl && dims ? (
        <ModeRender url={imageUrl} mode={resolved} reveal={r} color={dominantColor} dims={dims} seed={seed} />
      ) : null}
    </View>
  );
}

function stageBg(mode: RevealModeId | null, dominantColor?: string | null): string {
  // Spotlight needs a black field to read as a flashlight; everything else
  // sits on the brand colour (or a neutral dark stage) like the original.
  if (mode === 'spotlight') return BLACK;
  return dominantColor ?? '#14110d';
}

function Logo({ url, style: s, blurRadius, tintColor }: { url: string; style?: ImageStyle | ImageStyle[]; blurRadius?: number; tintColor?: string }) {
  return (
    <Image
      source={{ uri: url }}
      style={s as any}
      contentFit="contain"
      transition={120}
      cachePolicy="memory-disk"
      blurRadius={blurRadius}
      tintColor={tintColor}
    />
  );
}

function ModeRender({
  url,
  mode,
  reveal: r,
  color,
  dims,
  seed,
}: {
  url: string;
  mode: RevealModeId | null;
  reveal: number;
  color?: string | null;
  dims: { w: number; h: number };
  seed: number;
}) {
  const { w, h } = dims;
  const fill = StyleSheet.absoluteFill as ImageStyle;

  // No mode (or 'none') → plain logo, regardless of reveal.
  if (!mode) return <Logo url={url} style={fill} />;

  switch (mode) {
    // ── Blur ──────────────────────────────────────────────────────────────
    // pixelate has no native (Skia-free) equivalent, so it shares the blur
    // engine. True block-pixelation would need a shader / canvas.
    case 'blur':
    case 'pixelate':
      return <Logo url={url} style={fill} blurRadius={(1 - r) * MAX_BLUR} />;

    // ── Silhouette ────────────────────────────────────────────────────────
    // Black fill of the logo's shape, fading to full colour on reveal.
    case 'silhouette':
      return (
        <>
          <Logo url={url} style={fill} />
          <View style={[fill, { opacity: 1 - r }]} pointerEvents="none">
            <Logo url={url} style={fill} tintColor={BLACK} />
          </View>
        </>
      );

    // ── Color ───────────────────────────────────────────────────────────
    // Flatten the shape to the brand's signature colour, then sharpen.
    case 'color':
      return (
        <>
          <Logo url={url} style={fill} />
          <View style={[fill, { opacity: 1 - r }]} pointerEvents="none">
            <Logo url={url} style={fill} tintColor={color ?? '#888'} />
          </View>
        </>
      );

    // ── Crop / Zoom ─────────────────────────────────────────────────────
    case 'crop': {
      const scale = 1 + (1 - r) * 2.4;
      return (
        <View style={[fill, styles.clip]}>
          <View style={[fill, { transform: [{ scale }] }]}>
            <Logo url={url} style={fill} />
          </View>
        </View>
      );
    }

    // ── Letter-mask ───────────────────────────────────────────────────────
    // Image analog of redact-then-reveal-letters: a panel that wipes open
    // left→right as reveal rises (keeps the colour/container visible early).
    case 'letter-mask':
      return (
        <>
          <Logo url={url} style={fill} />
          <View
            pointerEvents="none"
            style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: (1 - r) * w, backgroundColor: BLACK }}
          />
        </>
      );

    // ── Spotlight ─────────────────────────────────────────────────────────
    // A circular window into the centred logo that grows on a black field.
    case 'spotlight': {
      const diag = Math.sqrt(w * w + h * h) * 1.05;
      const circle = lerp(Math.min(w, h) * 0.22, diag, r);
      return (
        <View style={[fill, styles.center]} pointerEvents="none">
          <View style={{ width: circle, height: circle, borderRadius: circle / 2, overflow: 'hidden' }}>
            <Logo url={url} style={{ position: 'absolute', width: w, height: h, left: -(w - circle) / 2, top: -(h - circle) / 2 }} />
          </View>
        </View>
      );
    }

    // ── Slices (venetian blinds) ───────────────────────────────────────────
    case 'slices': {
      const bh = h / SLICE_BARS;
      return (
        <>
          <Logo url={url} style={fill} />
          {Array.from({ length: SLICE_BARS }).map((_, i) => (
            <View
              key={i}
              pointerEvents="none"
              style={{ position: 'absolute', left: 0, right: 0, top: i * bh, height: bh * (1 - r), backgroundColor: BLACK }}
            />
          ))}
        </>
      );
    }

    // ── Tiles (mosaic dissolve) ─────────────────────────────────────────────
    case 'tiles': {
      const total = TILE_COLS * TILE_ROWS;
      const tw = w / TILE_COLS;
      const th = h / TILE_ROWS;
      const rnd = seededRandoms(seed, total);
      // Stable shuffled reveal order: rank each tile by its random key.
      const rank = rnd
        .map((v, i) => ({ i, v }))
        .sort((a, b) => a.v - b.v)
        .reduce<number[]>((acc, cur, idx) => {
          acc[cur.i] = idx;
          return acc;
        }, []);
      const shown = Math.floor(r * total);
      return (
        <>
          <Logo url={url} style={fill} />
          {Array.from({ length: total }).map((_, t) => {
            if (rank[t] < shown) return null; // already dissolved in
            const cx = t % TILE_COLS;
            const cy = Math.floor(t / TILE_COLS);
            return (
              <View
                key={t}
                pointerEvents="none"
                style={{ position: 'absolute', left: cx * tw, top: cy * th, width: tw + 1, height: th + 1, backgroundColor: BLACK }}
              />
            );
          })}
        </>
      );
    }

    // ── Glitch ──────────────────────────────────────────────────────────────
    // Horizontal slices displaced sideways, settling into place on reveal.
    case 'glitch': {
      const sh = h / GLITCH_SLICES;
      const offs = seededRandoms(seed, GLITCH_SLICES).map((v) => v * 2 - 1);
      const maxOff = w * 0.14;
      return (
        <>
          {Array.from({ length: GLITCH_SLICES }).map((_, i) => {
            const off = offs[i] * (1 - r) * maxOff;
            return (
              <View key={i} style={{ position: 'absolute', top: i * sh, left: 0, right: 0, height: sh + 1, overflow: 'hidden' }}>
                <Logo url={url} style={{ position: 'absolute', width: w, height: h, top: -i * sh, left: off }} />
              </View>
            );
          })}
          <View pointerEvents="none" style={[fill, { backgroundColor: BLACK, opacity: 0.25 * (1 - r) }]} />
        </>
      );
    }

    default:
      return <Logo url={url} style={fill} blurRadius={(1 - r) * MAX_BLUR} />;
  }
}

const styles = StyleSheet.create({
  stage: {
    width: '100%',
    aspectRatio: 16 / 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clip: { overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
