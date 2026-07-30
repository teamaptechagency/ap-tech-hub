/**
 * Renders the AP Tech brand mark into every raster size the PWA manifest and
 * the Android launcher need.
 *
 * Run with: node scripts/generate-app-icons.mjs
 *
 * The launcher icon is baked in at build time on purpose. Admin-editable
 * branding (lib/branding.ts) can change the favicon per request, but a Play
 * Store listing icon and an installed app's launcher icon are fixed at publish
 * time, so they need a stable source.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const BG = "#101623";
const FG = "#f5a83c";

const root = process.cwd();
const webIconDir = path.join(root, "public", "app-icons");
const androidResDir = path.join(root, "android", "app", "src", "main", "res");

/**
 * The wordmark is drawn as explicit paths rather than SVG <text> so rendering
 * does not depend on which fonts happen to be installed on the build machine.
 * Coordinates are in a 100x100 viewbox, letters sitting on a 26..74 band.
 */
const WORDMARK = `
  <path d="M12 74 L26 26 L36 26 L50 74 L40.5 74 L37.6 63 L24.4 63 L21.5 74 Z
           M26.6 54.5 L35.4 54.5 L31 37.5 Z"
        fill="${FG}"/>
  <path d="M56 74 L56 26 L74 26 C83.5 26 88 32 88 40.5 C88 49 83.5 55 74 55
           L65 55 L65 74 Z
           M65 34.5 L65 46.5 L73 46.5 C77.3 46.5 79 44 79 40.5
           C79 37 77.3 34.5 73 34.5 Z"
        fill="${FG}"/>
`;

/** Full-bleed tile: rounded dark square with the wordmark centred. */
function tileSvg(size, { radiusRatio = 0.2222, inset = 0.16 } = {}) {
  const radius = Math.round(size * radiusRatio);
  const markSize = size * (1 - inset * 2);
  const offset = size * inset;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${BG}"/>
  <g transform="translate(${offset} ${offset}) scale(${markSize / 100})">${WORDMARK}</g>
</svg>`;
}

/**
 * Adaptive-icon foreground: transparent, wordmark kept inside the inner 66/108
 * safe zone so Android can crop it to any mask (circle, squircle, rounded).
 */
function foregroundSvg(size) {
  // The glyph's ink is ~76% of its own box, so 0.68 lands the visible mark at
  // roughly 52% of the icon — comfortably filling the 66/108dp safe zone
  // without risking a clip on circular masks.
  const markSize = size * 0.68;
  const offset = (size - markSize) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <g transform="translate(${offset} ${offset}) scale(${markSize / 100})">${WORDMARK}</g>
</svg>`;
}

/** Maskable PWA icon: same tile, extra padding for the browser's own crop. */
function maskableSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <g transform="translate(${size * 0.26} ${size * 0.26}) scale(${(size * 0.48) / 100})">${WORDMARK}</g>
</svg>`;
}

async function writePng(svg, target) {
  await mkdir(path.dirname(target), { recursive: true });
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(target, png);
  return png.length;
}

// Density buckets. Legacy launcher icons are 48dp, adaptive foregrounds 108dp.
const DENSITIES = [
  { dir: "mipmap-mdpi", legacy: 48, foreground: 108 },
  { dir: "mipmap-hdpi", legacy: 72, foreground: 162 },
  { dir: "mipmap-xhdpi", legacy: 96, foreground: 216 },
  { dir: "mipmap-xxhdpi", legacy: 144, foreground: 324 },
  { dir: "mipmap-xxxhdpi", legacy: 192, foreground: 432 },
];

const written = [];

// Web / PWA manifest icons.
for (const size of [192, 512]) {
  const target = path.join(webIconDir, `icon-${size}.png`);
  written.push([`icon-${size}.png`, await writePng(tileSvg(size), target)]);
}
written.push([
  "icon-maskable-512.png",
  await writePng(maskableSvg(512), path.join(webIconDir, "icon-maskable-512.png")),
]);

// Play Store listing icon (512x512, no transparency).
written.push([
  "play-store-icon-512.png",
  await writePng(tileSvg(512, { radiusRatio: 0 }), path.join(webIconDir, "play-store-icon-512.png")),
]);

// Android launcher icons.
for (const density of DENSITIES) {
  written.push([
    `${density.dir}/ic_launcher.png`,
    await writePng(
      tileSvg(density.legacy),
      path.join(androidResDir, density.dir, "ic_launcher.png")
    ),
  ]);
  written.push([
    `${density.dir}/ic_launcher_foreground.png`,
    await writePng(
      foregroundSvg(density.foreground),
      path.join(androidResDir, density.dir, "ic_launcher_foreground.png")
    ),
  ]);
}

// TWA splash screen image (shown while Chrome warms up).
written.push([
  "drawable/splash.png",
  await writePng(tileSvg(512, { radiusRatio: 0, inset: 0.3 }), path.join(androidResDir, "drawable", "splash.png")),
]);

for (const [name, bytes] of written) {
  console.log(`${name.padEnd(38)} ${(bytes / 1024).toFixed(1)} KB`);
}
console.log(`\n${written.length} icons written.`);
