// Generates the app's brand assets (icon, adaptive icon, splash, favicon) from
// the "Pinned Question" mark: a dissolving "?" whose dot is a map pin — the
// logo-reveal engine + local-market positioning in one glyph.
//
// One-off dependency (not in package.json):  npm i --no-save @resvg/resvg-js
// Run from the repo root:                    node scripts/generate_brand_assets.js
//
// Colors/typeface come from the design system (DESIGN.md / src/theme):
// night #0e0e0e, NL amber accent 245 158 11 (glow 252 211 77, deep 180 83 9),
// teal #0cb6fd, Plus Jakarta Sans ExtraBold.
const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FONT_DIR = path.join(ROOT, 'node_modules', '@expo-google-fonts', 'plus-jakarta-sans');
const FONTS = [
  path.join(FONT_DIR, '800ExtraBold', 'PlusJakartaSans_800ExtraBold.ttf'),
  path.join(FONT_DIR, '400Regular', 'PlusJakartaSans_400Regular.ttf'),
];
const OUT = path.join(ROOT, 'assets', 'images');

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const AMBER = { glow: '#fcd34d', mid: '#f59e0b', deep: '#b45309' };
const NIGHT = '#0e0e0e';
const TEAL = '#0cb6fd';

const sharedDefs = `
  <linearGradient id="amberG" x1="0" y1="0" x2="0.85" y2="1">
    <stop offset="0" stop-color="${AMBER.glow}"/><stop offset="0.5" stop-color="${AMBER.mid}"/><stop offset="1" stop-color="${AMBER.deep}"/>
  </linearGradient>
  <radialGradient id="meshAmber" cx="0.30" cy="0.20" r="0.8">
    <stop offset="0" stop-color="${AMBER.glow}" stop-opacity="0.13"/><stop offset="1" stop-color="${AMBER.glow}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="meshTeal" cx="0.88" cy="0.92" r="0.55">
    <stop offset="0" stop-color="${TEAL}" stop-opacity="0.09"/><stop offset="1" stop-color="${TEAL}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="glyphGlow" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="${AMBER.mid}" stop-opacity="0.20"/><stop offset="1" stop-color="${AMBER.mid}" stop-opacity="0"/>
  </radialGradient>`;

function render(svg, file, width = 1024) {
  const r = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: 'Plus Jakarta Sans' },
  });
  fs.writeFileSync(path.join(OUT, file), r.render().asPng());
  console.log('wrote assets/images/' + file);
}

// Map pin (the dot of the "?"): single path so the gradient maps once, + hole.
function pin(cx, cy, r, fill, hole) {
  const d = `M ${cx} ${cy + 1.62 * r}
    C ${cx - 0.55 * r} ${cy + 0.95 * r} ${cx - r} ${cy + 0.5 * r} ${cx - r} ${cy}
    A ${r} ${r} 0 1 1 ${cx + r} ${cy}
    C ${cx + r} ${cy + 0.5 * r} ${cx + 0.55 * r} ${cy + 0.95 * r} ${cx} ${cy + 1.62 * r} Z`;
  return `<path d="${d}" fill="${fill}"/><circle cx="${cx}" cy="${cy}" r="${0.42 * r}" fill="${hole}"/>`;
}

// The mark on a 1024 canvas: solid hook fading into mosaic tiles, pin dot.
function mark({ id, seed = 6, holeColor = NIGHT }) {
  const cx = 512, base = 795, fsz = 760;
  const w = 0.60 * fsz, top = base - 0.73 * fsz;
  const bb = { x0: cx - w / 2, y0: top, x1: cx + w / 2, y1: base };
  const T = (y) => (y - bb.y0) / (bb.y1 - bb.y0);
  const glyph = (fill) =>
    `<text x="${cx}" y="${base}" font-family="Plus Jakarta Sans" font-weight="800" font-size="${fsz}" text-anchor="middle" fill="${fill}">?</text>`;

  const rnd = mulberry32(seed);
  const cell = fsz * 0.062, gap = fsz * 0.013;
  let tiles = '';
  for (let y = bb.y0 - cell; y < bb.y1 + cell; y += cell + gap) {
    for (let x = bb.x0 - cell; x < bb.x1 + cell; x += cell + gap) {
      const t = T(y + cell / 2);
      if (t > 0.78) continue; // dot area belongs to the pin
      const r = smoothstep(0.38, 0.52, t);
      const tail = 1 - smoothstep(0.85, 1.1, t) * 0.35;
      if (r <= 0.01) continue;
      if (rnd() < 0.4 * smoothstep(0.55, 0.95, t)) continue;
      const sc = 0.72 + 0.28 * rnd();
      const size = cell * sc;
      const o = Math.min(1, r * tail * (0.55 + 0.45 * rnd()));
      if (o < 0.05) continue;
      tiles += `<rect x="${(x + (cell - size) / 2).toFixed(1)}" y="${(y + (cell - size) / 2).toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" rx="${(size * 0.2).toFixed(1)}" fill="url(#amberG)" opacity="${o.toFixed(2)}"/>`;
    }
  }

  const rnd2 = mulberry32(19);
  let drift = '';
  for (let i = 0; i < 6; i++) {
    const x = 470 + rnd2() * 110, y = 615 + rnd2() * 60;
    const size = 10 + 18 * rnd2();
    drift += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" rx="4" fill="url(#amberG)" opacity="${(0.2 + 0.35 * rnd2()).toFixed(2)}"/>`;
  }

  const defs = `
  <linearGradient id="sf${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0.42" stop-color="#ffffff"/><stop offset="0.68" stop-color="#000000"/>
  </linearGradient>
  <mask id="sm${id}"><rect x="${bb.x0 - 80}" y="${bb.y0 - 80}" width="${w + 160}" height="${bb.y1 - bb.y0 + 160}" fill="url(#sf${id})"/></mask>
  <mask id="gm${id}">${glyph('#ffffff')}</mask>`;

  const body = `
  <g mask="url(#sm${id})">${glyph('url(#amberG)')}</g>
  <g mask="url(#gm${id})">${tiles}</g>
  ${drift}
  ${pin(512, 700, 80, 'url(#amberG)', holeColor)}`;

  return { defs, body };
}

const svgDoc = (defs, body) =>
  `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><defs>${sharedDefs}${defs}</defs>${body}</svg>`;

const background = `
  <rect width="1024" height="1024" fill="${NIGHT}"/>
  <rect width="1024" height="1024" fill="url(#meshAmber)"/>
  <rect width="1024" height="1024" fill="url(#meshTeal)"/>
  <circle cx="512" cy="500" r="470" fill="url(#glyphGlow)"/>`;

// 1) App icon — full bleed on the night mesh
{
  const m = mark({ id: 'i' });
  render(svgDoc(m.defs, background + m.body), 'icon.png');
}

// 2) Android adaptive foreground — transparent, mark inside the 66% safe zone
{
  const m = mark({ id: 'a' });
  const scaled = `<g transform="translate(512 512) scale(0.66) translate(-512 -527)">${m.body}</g>`;
  render(svgDoc(m.defs, scaled), 'adaptive-icon.png');
}

// 3) Splash icon — transparent, mark + wordmark (splash bg is #0e0e0e in app.json)
{
  const m = mark({ id: 's' });
  const scaled = `
  <circle cx="512" cy="440" r="420" fill="url(#glyphGlow)"/>
  <g transform="translate(512 440) scale(0.62) translate(-512 -527)">${m.body}</g>
  <text x="512" y="822" font-family="Plus Jakarta Sans" font-weight="800" font-size="94" text-anchor="middle" letter-spacing="-1.8"><tspan fill="#ffffff">Local</tspan><tspan fill="${AMBER.mid}"> Logo</tspan></text>
  <text x="512" y="878" font-family="Plus Jakarta Sans" font-weight="400" font-size="34" text-anchor="middle" letter-spacing="10" fill="rgba(255,255,255,0.45)">DUTCH CLASSICS</text>`;
  render(svgDoc(m.defs, scaled), 'splash-icon.png');
}

// 4) Favicon — simplified: solid ? with pin dot (mosaic is noise at 16–32px)
{
  const defs = `<mask id="dotOff"><rect width="1024" height="1024" fill="#ffffff"/><rect x="420" y="640" width="190" height="180" fill="#000000"/></mask>`;
  const body = `
  <rect width="1024" height="1024" rx="200" fill="${NIGHT}"/>
  <g mask="url(#dotOff)"><text x="512" y="790" font-family="Plus Jakarta Sans" font-weight="800" font-size="740" text-anchor="middle" fill="url(#amberG)">?</text></g>
  ${pin(512, 700, 78, 'url(#amberG)', NIGHT)}`;
  render(svgDoc(defs, body), 'favicon.png', 64);
}
