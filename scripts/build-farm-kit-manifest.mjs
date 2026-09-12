#!/usr/bin/env node
/**
 * Scans `public/assets/farm-kit/`, bakes the tiling backdrop bands to power-of-two
 * dimensions, and writes `src/phaser/sideScene/farmKit.generated.ts`.
 *
 * Why POT-bake the bands: Phaser's `TileSprite` draws its repeating fill into a
 * power-of-two internal canvas (`TileSprite.js`). An NPOT source gets bilinearly
 * resampled into that canvas on every rebuild, then resampled *again* at render —
 * worst on `midground-details.png` (995x273 -> 1024x512, an 88% vertical stretch).
 * Baking the padding into the source file once, offline, makes that step a 1:1 blit.
 * The padding is edge-replicated, never stretched, so the seamless tiling edge stays
 * seamless — a fresh right/bottom margin duplicates the last column/row rather than
 * smearing the whole image.
 *
 * Every other asset (props, decals, sky) is placed as an ordinary `Image`, which has
 * no POT constraint, so it is left at native size.
 *
 * Run with `npm run assets:farm-kit`. Safe to re-run: an asset already at POT size is
 * left untouched — and, because padding is baked into the file in place, its true
 * pre-pad content size is recovered from this same script's previous output (see
 * `readPreviousAssets`) rather than re-derived from the now-padded file, which would
 * just record the padded canvas as if it were the content.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const ROOT = join(import.meta.dirname, '..');
const ASSETS_DIR = join(ROOT, 'public/assets/farm-kit');
const OUT_FILE = join(ROOT, 'src/phaser/sideScene/farmKit.generated.ts');

/**
 * The tiling backdrop bands — everything drawn as a `TileSprite` fill in
 * `sideSceneLayers.ts`. Every other `bg/*` file (sky, decals) is a plain `Image` and
 * is left at native size.
 */
const TILING_BANDS = new Set([
  'bg/far-hills.png',
  'bg/midground-details.png',
  'bg/midground-no-details.png',
  'bg/midground-fields-large.png',
  'bg/midground-fields-small.png',
  'bg/near-grass.png',
  'bg/road.png',
  'bg/front-grass.png',
]);

function nextPow2(value) {
  return Math.pow(2, Math.ceil(Math.log2(value)));
}

/** Extends `image` (raw RGBA) to `potWidth` x `potHeight`, replicating the edge pixels. */
async function padToPowerOfTwo(filePath, potWidth, potHeight) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const out = Buffer.alloc(potWidth * potHeight * channels);
  for (let y = 0; y < potHeight; y += 1) {
    const srcY = Math.min(y, height - 1);
    for (let x = 0; x < potWidth; x += 1) {
      const srcX = Math.min(x, width - 1);
      const srcOffset = (srcY * width + srcX) * channels;
      const dstOffset = (y * potWidth + x) * channels;
      data.copy(out, dstOffset, srcOffset, srcOffset + channels);
    }
  }

  await sharp(out, { raw: { width: potWidth, height: potHeight, channels } })
    .png()
    .toFile(filePath);
}

function listPngs(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listPngs(full));
    } else if (extname(entry.name) === '.png') {
      out.push(full);
    }
  }
  return out;
}

function toAssetId(relPath) {
  // "bg/road.png" -> "bg/road"; camelCase would fight the "prefix/kebab-name" shape
  // every consumer already reads this as, so the id stays exactly the relative path.
  return relPath.slice(0, -'.png'.length).replaceAll('\\', '/');
}

/**
 * Recovers `{ id: { width, height, fileWidth, fileHeight } }` from this script's own
 * previous output, by regexing the plain object-literal shape it writes below — the
 * generated file isn't valid ESM a `.mjs` script can `import()` directly, and this
 * structure is deterministic enough that a full parser would be overkill.
 */
function readPreviousAssets() {
  if (!existsSync(OUT_FILE)) return new Map();
  const src = readFileSync(OUT_FILE, 'utf8');
  const entryRe =
    /'([^']+)':\s*{\s*file:\s*'[^']+',\s*width:\s*(\d+),\s*height:\s*(\d+),\s*fileWidth:\s*(\d+),\s*fileHeight:\s*(\d+),\s*}/g;
  const previous = new Map();
  for (const [, id, width, height, fileWidth, fileHeight] of src.matchAll(entryRe)) {
    previous.set(id, { width: Number(width), height: Number(height), fileWidth: Number(fileWidth), fileHeight: Number(fileHeight) });
  }
  return previous;
}

async function main() {
  const files = listPngs(ASSETS_DIR)
    .map((f) => relative(ASSETS_DIR, f).replaceAll('\\', '/'))
    .sort();
  const previousAssets = readPreviousAssets();

  const entries = [];
  for (const file of files) {
    const full = join(ASSETS_DIR, file);
    const meta = await sharp(full).metadata();
    const width = meta.width;
    const height = meta.height;

    if (TILING_BANDS.has(file)) {
      const potWidth = nextPow2(width);
      const potHeight = nextPow2(height);
      const alreadyPadded = width === potWidth && height === potHeight;
      if (!alreadyPadded) {
        await padToPowerOfTwo(full, potWidth, potHeight);
        entries.push({ file, width, height, fileWidth: potWidth, fileHeight: potHeight });
        continue;
      }

      const prev = previousAssets.get(toAssetId(file));
      if (prev && prev.fileWidth === potWidth && prev.fileHeight === potHeight) {
        entries.push({ file, width: prev.width, height: prev.height, fileWidth: potWidth, fileHeight: potHeight });
      } else {
        console.warn(
          `warning: ${file} is already POT-padded with no prior manifest entry to recover its true content size from — recording the padded size as content size.`,
        );
        entries.push({ file, width, height, fileWidth: potWidth, fileHeight: potHeight });
      }
    } else {
      entries.push({ file, width, height, fileWidth: width, fileHeight: height });
    }
  }

  const assetIds = entries.map((e) => toAssetId(e.file));

  const lines = [];
  lines.push('/**');
  lines.push(' * GENERATED FILE — do not edit by hand.');
  lines.push(' *');
  lines.push(' * Written by `npm run assets:farm-kit`, which scans `public/assets/farm-kit/`');
  lines.push(' * and bakes the tiling backdrop bands to power-of-two dimensions. Regenerate');
  lines.push(' * rather than editing, or the next run overwrites your change.');
  lines.push(' */');
  lines.push('export type FarmKitAssetId =');
  assetIds.forEach((id, i) => {
    lines.push(`  ${i === 0 ? '' : '| '}'${id}'${i === assetIds.length - 1 ? ';' : ''}`);
  });
  lines.push('');
  lines.push('export interface FarmKitAssetMeta {');
  lines.push('  /** Path relative to `public/assets/farm-kit/`. */');
  lines.push('  file: string;');
  lines.push('  /** Content width/height, before any power-of-two padding. */');
  lines.push('  width: number;');
  lines.push('  height: number;');
  lines.push('  /** On-disk pixel size — differs from width/height only for a padded `bg/*` band. */');
  lines.push('  fileWidth: number;');
  lines.push('  fileHeight: number;');
  lines.push('}');
  lines.push('');
  lines.push('export const FARM_KIT_ASSETS: Record<FarmKitAssetId, FarmKitAssetMeta> = {');
  for (const e of entries) {
    const id = toAssetId(e.file);
    lines.push(`  '${id}': {`);
    lines.push(`    file: '${e.file}',`);
    lines.push(`    width: ${e.width},`);
    lines.push(`    height: ${e.height},`);
    lines.push(`    fileWidth: ${e.fileWidth},`);
    lines.push(`    fileHeight: ${e.fileHeight},`);
    lines.push('  },');
  }
  lines.push('};');
  lines.push('');

  writeFileSync(OUT_FILE, lines.join('\n'));
  execFileSync('npx', ['prettier', '--write', OUT_FILE], { stdio: 'inherit' });

  console.log(`Wrote ${entries.length} assets to ${relative(ROOT, OUT_FILE)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
