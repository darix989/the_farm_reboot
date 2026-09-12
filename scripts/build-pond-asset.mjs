#!/usr/bin/env node
/**
 * Bakes the muddy-water tile set (`assets-src/water-tiles/muddy-water/`, sourced from
 * gamedeveloperstudio.com's "Repeating water tiles" pack — licence in that folder's
 * README) into two farm-kit assets:
 *
 * 1. `water/pond-muddy.png` — the distant ellipse pond on `eastOrchard`. The source tiles
 *    are side-view: a solid body with a ~60px wavy band along the top, meant for a
 *    platformer's water column. The farm kit instead reads a pond obliquely (see
 *    `public/assets/farm-kit/bg/puddle-for-road-piece.png` — a flattened ellipse with a
 *    dark mud rim), so rather than using a tile raw, this bakes several tiled strips
 *    into that idiom: one wave band sitting just inside the water ellipse's top edge
 *    (the far shore's ripple line), two more faded wave slices further down standing in
 *    for ripples receding into the distance, all masked to a water ellipse that sits
 *    inside a slightly larger dark-mud bank-rim ellipse.
 * 2. `bg/near-muddy-water.png` — the near-background tiling band on `oldPond`. Eight
 *    tiles wide (already power-of-two), cropped 11px off the bottom so the solid-fill
 *    height matches `bg/near-grass` (205 native px) and the road seam stays at y≈796
 *    with `firstTop: 400` / `scale: 0.8543`. Measured `opaqueFromRow` of the mixed
 *    strip is 40 (the trough tile's fully-opaque row).
 *
 * Run with `npm run assets:pond`. Safe to re-run: deterministic output, nothing to
 * clobber. After a first bake of the band, run `npm run assets:farm-kit` so the
 * manifest picks it up and POT-pads the 245px content height to 256.
 */
import { mkdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import sharp from 'sharp';

const ROOT = join(import.meta.dirname, '..');
const TILES_DIR = join(ROOT, 'assets-src/water-tiles/muddy-water');
const POND_OUT_FILE = join(ROOT, 'public/assets/farm-kit/water/pond-muddy.png');
const BAND_OUT_FILE = join(ROOT, 'public/assets/farm-kit/bg/near-muddy-water.png');

const TILE_SIZE = 256;
const CANVAS_WIDTH = 1400;
const CANVAS_HEIGHT = 260;
const CENTER_X = CANVAS_WIDTH / 2;
const CENTER_Y = CANVAS_HEIGHT / 2;

// Bank rim fills almost the whole canvas; the water ellipse sits inside it at a uniform
// scale-down, which (because the canvas is so much wider than tall) tapers to a thicker
// rim at the ends and a thinner one top/bottom — the same idiom `puddle-for-road-piece`
// uses.
const BANK_RX = CENTER_X - 2;
const BANK_RY = CENTER_Y - 2;
const WATER_SCALE = 0.85;
const WATER_RX = BANK_RX * WATER_SCALE;
const WATER_RY = BANK_RY * WATER_SCALE;

/** Darker than the tile's own base fill (`water-color.png`, #786721) so the rim reads as
 * mud behind the water rather than more water. */
const BANK_COLOR = '#423912';
/** Matches `water-color.png` exactly, so the tiled strip's uncovered bottom rows (it's
 * only 256 tall, the canvas is 260) blend in seamlessly. */
const WATER_BASE_RGBA = { r: 120, g: 103, b: 33, alpha: 1 };

const RIPPLE_BAND_HEIGHT = 70;
const RIPPLE_OPACITY = 0.5;

// Tiles interlock in any order (an any-to-any repeating pack); mixing flat/crest/trough
// per strip gives an irregular wave line instead of one tile's pattern repeating flatly.
const MAIN_STRIP_ORDER = [
  'flat-top-one',
  'crest-top-one',
  'trough-top-one',
  'flat-top-two',
  'crest-top-one',
  'trough-top-one',
];
const RIPPLE_STRIP_ORDER = [
  'trough-top-one',
  'flat-top-two',
  'crest-top-one',
  'flat-top-one',
  'trough-top-one',
  'crest-top-one',
];

/** Eight 256px tiles = 2048, already a power of two, so the farm-kit POT pad only
 *  has to grow the cropped height (245 → 256). Mixing trough tiles is what pushes
 *  `opaqueFromRow` to 40 — a strip of only flats/crests would report 20. */
const BAND_STRIP_ORDER = [
  'flat-top-one',
  'crest-top-one',
  'trough-top-one',
  'flat-top-two',
  'crest-top-one',
  'trough-top-one',
  'flat-top-one',
  'flat-top-two',
];
/** 256 − 11 = 245: `nativeHeight - opaqueFromRow` (245 − 40) = 205, matching
 *  `bg/near-grass` (227 − 22) so the road still lands at y≈796. */
const BAND_CROP_BOTTOM = 11;
const BAND_HEIGHT = TILE_SIZE - BAND_CROP_BOTTOM;

function tilePath(name) {
  return join(TILES_DIR, `${name}.png`);
}

/** Tiles `order` left-to-right, then crops a `CANVAS_WIDTH`-wide window out of the
 * centre — an even split either side of whatever the order's total width overshoots
 * `CANVAS_WIDTH` by, so no one tile in the order is favoured over another. */
async function buildStrip(order) {
  const totalWidth = order.length * TILE_SIZE;
  const cropLeft = Math.floor((totalWidth - CANVAS_WIDTH) / 2);
  return sharp({
    create: { width: totalWidth, height: TILE_SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(order.map((name, i) => ({ input: tilePath(name), left: i * TILE_SIZE, top: 0 })))
    .extract({ left: cropLeft, top: 0, width: CANVAS_WIDTH, height: TILE_SIZE })
    .png()
    .toBuffer();
}

/** Scales a PNG buffer's alpha channel by `opacity`, leaving colour untouched. */
async function fadeAlpha(buffer, opacity) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += info.channels) {
    data[i] = Math.round(data[i] * opacity);
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .png()
    .toBuffer();
}

function ellipseSvg(rx, ry, fill) {
  return Buffer.from(
    `<svg width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}"><ellipse cx="${CENTER_X}" cy="${CENTER_Y}" rx="${rx}" ry="${ry}" fill="${fill}"/></svg>`,
  );
}

async function bakePondEllipse() {
  mkdirSync(dirname(POND_OUT_FILE), { recursive: true });

  const mainStrip = await buildStrip(MAIN_STRIP_ORDER);
  const waterBody = await sharp({
    create: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, channels: 4, background: WATER_BASE_RGBA },
  })
    .composite([{ input: mainStrip, top: 0, left: 0 }])
    .png()
    .toBuffer();

  const rippleStrip = await buildStrip(RIPPLE_STRIP_ORDER);
  const rippleSlice = await sharp(rippleStrip)
    .extract({ left: 0, top: 0, width: CANVAS_WIDTH, height: RIPPLE_BAND_HEIGHT })
    .png()
    .toBuffer();
  const fadedRipple = await fadeAlpha(rippleSlice, RIPPLE_OPACITY);

  const waterEllipseTop = CENTER_Y - WATER_RY;
  const waterEllipseHeight = WATER_RY * 2;
  const ripple1Top = Math.round(waterEllipseTop + waterEllipseHeight / 3);
  const ripple2Top = Math.round(waterEllipseTop + (waterEllipseHeight * 2) / 3);

  const waterLayer = await sharp(waterBody)
    .composite([
      { input: fadedRipple, top: ripple1Top, left: 0 },
      { input: fadedRipple, top: ripple2Top, left: 0 },
    ])
    .png()
    .toBuffer();

  const waterMasked = await sharp(waterLayer)
    .composite([{ input: ellipseSvg(WATER_RX, WATER_RY, '#fff'), blend: 'dest-in' }])
    .png()
    .toBuffer();

  await sharp({
    create: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: ellipseSvg(BANK_RX, BANK_RY, BANK_COLOR), top: 0, left: 0 },
      { input: waterMasked, top: 0, left: 0 },
    ])
    .png()
    .toFile(POND_OUT_FILE);

  console.log(`Wrote ${relative(ROOT, POND_OUT_FILE)} (${CANVAS_WIDTH}x${CANVAS_HEIGHT})`);
}

async function bakeNearWaterBand() {
  mkdirSync(dirname(BAND_OUT_FILE), { recursive: true });
  const bandWidth = BAND_STRIP_ORDER.length * TILE_SIZE;
  const croppedTiles = await Promise.all(
    BAND_STRIP_ORDER.map((name) =>
      sharp(tilePath(name))
        .extract({ left: 0, top: 0, width: TILE_SIZE, height: BAND_HEIGHT })
        .png()
        .toBuffer(),
    ),
  );
  await sharp({
    create: {
      width: bandWidth,
      height: BAND_HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(croppedTiles.map((input, i) => ({ input, left: i * TILE_SIZE, top: 0 })))
    .png()
    .toFile(BAND_OUT_FILE);

  console.log(`Wrote ${relative(ROOT, BAND_OUT_FILE)} (${bandWidth}x${BAND_HEIGHT})`);
}

async function main() {
  await bakePondEllipse();
  await bakeNearWaterBand();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
