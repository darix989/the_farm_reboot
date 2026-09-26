/**
 * Packs a GameDeveloperStudio character pack into a Phaser multiatlas, the same shape the
 * ported cast already ships (see `docs/characters-and-animations.md` §2).
 *
 * The eleven original atlases arrived pre-packed from the prototype, made with TexturePacker.
 * These packs do not: they ship loose keyframe PNGs (one file per frame, on a uniform export
 * canvas) or strip spritesheets (one PNG per animation, laid out on a fixed grid). This script
 * is the missing export step, so a new animal can be imported without the GUI tool.
 *
 *   node scripts/build-animal-atlas.mjs --src "<GSD pack root>" [--animal a,b] [--dry-run]
 *
 * `--src` is the directory holding the downloaded packs (each animal's `dir` below is relative
 * to it). `GSD_CHAR_DIR` is read when `--src` is omitted, so the machine-specific path stays
 * out of the repo.
 *
 * Output matches TexturePacker's multiatlas JSON closely enough for both consumers that read
 * it — Phaser's `load.multiatlas` and `scripts/ludo/referenceFrame.mjs`, which un-trims a frame
 * back onto its export canvas to use as a generator reference. That second one is why `trimmed`
 * frames carry a real `sourceSize` / `spriteSourceSize` pair rather than being written out
 * untrimmed: the emotion generator needs the original framing, not the cropped silhouette.
 *
 * Frame names are normalised to the cast's majority shape, flat and dash-separated
 * (`__brown_bull_idle-0.png`), so the descriptors need no `framePrefix`. The source's
 * zero-padded `_000` suffix is dropped.
 */
import { mkdir, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import sharp from 'sharp';

const OUT_DIR = 'public/assets/characters';
const MAX_PAGE = 2048;
/** Transparent gutter between packed frames; TexturePacker's default, and it kills bleeding. */
const PADDING = 2;

/**
 * One entry per animal to import. `frames` picks the source layout:
 *
 * - `{ kind: 'keyframes', dir, match }` — loose PNGs named `<stem>_<nnn>.png`, one per frame,
 *   all on the same export canvas. `match` selects the colour variant to keep (these packs
 *   ship several recolours side by side in one folder).
 * - `{ kind: 'sheets', dir, cell }` — one strip PNG per animation, cut row-major on a fixed
 *   `cell` grid. Frame order is left-to-right, top-to-bottom.
 */
const SOURCES = {
  'brown-bull': {
    dir: 'bull - 1t6u1k3h7m2c7r474n',
    frames: { kind: 'keyframes', dir: 'keyframes', match: /^__brown_bull_/ },
  },
  'white-chicken': {
    dir: 'chicken - 175s8e1q442d046c11',
    frames: { kind: 'keyframes', dir: 'keyframes', match: /^__white_chicken_/ },
  },
  skunk: {
    dir: 'skunk - 1m6v0q501k0m2u8583',
    // `effect_keyframes/` (the spray cloud) is deliberately left out: it is a standalone VFX
    // sprite on its own canvas, not a pose of the animal, and nothing stages it yet.
    frames: { kind: 'keyframes', dir: 'keyframes', match: /^__skunk_/ },
  },
  seagull: {
    // Foldered by animation; the filenames already carry the animation name, so the folders
    // are flattened away and the frame names stay flat like the rest of the cast.
    dir: 'seagull--1t5j3e21542n377m60',
    frames: { kind: 'keyframes', dir: 'frames', match: /^__seagull_/, recursive: true },
  },
  snake: {
    dir: 'snake--1s5m1c2t104w519v19',
    // The green variant is the pack's unprefixed default (`__snake_*`); blue and red are
    // recolours of the same frames. Cell size is the sheets' common divisor, confirmed by
    // eye: die is 4x1, bite and slither 4x3, idle 4x5.
    frames: {
      kind: 'sheets',
      dir: 'spritesheets',
      match: /^__snake_/,
      cell: { w: 1082, h: 621 },
    },
  },
};

function parseArgs(argv) {
  const args = { animals: null, src: process.env.GSD_CHAR_DIR ?? null, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--src') args.src = argv[(i += 1)];
    else if (arg === '--animal') args.animals = argv[(i += 1)].split(',').map((s) => s.trim());
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

async function listPngs(dir, recursive) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (recursive) out.push(...(await listPngs(path, recursive)));
    } else if (entry.name.toLowerCase().endsWith('.png')) {
      out.push(path);
    }
  }
  return out;
}

/** `__brown_bull_idle_007.png` -> `{ stem: '__brown_bull_idle', index: 7 }`. */
function splitKeyframeName(file) {
  const match = /^(.*)_(\d+)\.png$/i.exec(basename(file));
  if (!match) throw new Error(`Frame name is not <stem>_<nnn>.png: ${file}`);
  return { stem: match[1], index: Number(match[2]) };
}

/** Opaque bounding box, or null for a fully transparent frame. */
async function alphaBounds(image) {
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = channels === 4 ? data[(y * width + x) * channels + 3] : 255;
      if (alpha === 0) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/**
 * Every frame of one animal as `{ filename, sourceSize, spriteSourceSize, buffer }`, already
 * trimmed to its opaque bounds. Fully transparent frames keep a 1x1 placeholder so an
 * animation's frame range stays contiguous — `generateFrameNames` would otherwise skip a hole.
 */
async function readFrames(spec, packRoot) {
  const dir = join(packRoot, spec.dir, spec.frames.dir);
  if (!existsSync(dir)) throw new Error(`Source directory not found: ${dir}`);
  const files = (await listPngs(dir, spec.frames.recursive ?? false))
    .filter((f) => spec.frames.match.test(basename(f)))
    .sort();
  if (files.length === 0) throw new Error(`No frames matched ${spec.frames.match} under ${dir}`);

  const frames = [];
  const push = async (stem, index, image, canvas) => {
    const bounds = (await alphaBounds(image.clone())) ?? { x: 0, y: 0, w: 1, h: 1 };
    frames.push({
      filename: `${stem}-${index}.png`,
      stem,
      index,
      sourceSize: canvas,
      spriteSourceSize: bounds,
      buffer: await image.extract({
        left: bounds.x,
        top: bounds.y,
        width: bounds.w,
        height: bounds.h,
      })
        .png()
        .toBuffer(),
    });
  };

  if (spec.frames.kind === 'keyframes') {
    for (const file of files) {
      const { stem, index } = splitKeyframeName(file);
      const image = sharp(await readFile(file)).ensureAlpha();
      const { width, height } = await image.metadata();
      await push(stem, index, image, { w: width, h: height });
    }
  } else {
    const { w: cellW, h: cellH } = spec.frames.cell;
    for (const file of files) {
      const stem = basename(file).replace(/\.png$/i, '');
      const source = sharp(await readFile(file)).ensureAlpha();
      const { width, height } = await source.metadata();
      if (width % cellW || height % cellH) {
        throw new Error(`${file} (${width}x${height}) is not a whole number of ${cellW}x${cellH} cells`);
      }
      const cols = width / cellW;
      const rows = height / cellH;
      const raw = await source.png().toBuffer();
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const cell = sharp(raw).extract({
            left: col * cellW,
            top: row * cellH,
            width: cellW,
            height: cellH,
          });
          await push(stem, row * cols + col, cell, { w: cellW, h: cellH });
        }
      }
    }
  }

  frames.sort((a, b) =>
    a.stem === b.stem ? a.index - b.index : a.stem < b.stem ? -1 : 1,
  );
  return frames;
}

/**
 * Shelf packer: tallest frame first, laid in rows, a new page when the next row will not fit.
 *
 * Not as tight as TexturePacker's MaxRects — it wastes whatever the shortest frame in a row
 * leaves under the tallest — but these packs are near-uniform in height per animation, which
 * is exactly the case a shelf packer handles well, and pages are cheap.
 */
function packPages(frames) {
  const ordered = [...frames].sort((a, b) => b.spriteSourceSize.h - a.spriteSourceSize.h);
  const pages = [];
  let page = null;
  let shelfY = PADDING;
  let shelfH = 0;
  let cursorX = PADDING;

  const newPage = () => {
    page = { placements: [], width: 0, height: 0 };
    pages.push(page);
    shelfY = PADDING;
    shelfH = 0;
    cursorX = PADDING;
  };

  for (const frame of ordered) {
    const { w, h } = frame.spriteSourceSize;
    if (w + PADDING * 2 > MAX_PAGE || h + PADDING * 2 > MAX_PAGE) {
      throw new Error(`Frame ${frame.filename} is ${w}x${h}, larger than the ${MAX_PAGE}px page`);
    }
    if (!page) newPage();
    if (cursorX + w + PADDING > MAX_PAGE) {
      shelfY += shelfH + PADDING;
      shelfH = 0;
      cursorX = PADDING;
    }
    if (shelfY + h + PADDING > MAX_PAGE) {
      newPage();
    }
    page.placements.push({ frame, x: cursorX, y: shelfY });
    cursorX += w + PADDING;
    shelfH = Math.max(shelfH, h);
    page.width = Math.max(page.width, cursorX + PADDING - PADDING);
    page.height = Math.max(page.height, shelfY + h + PADDING);
  }
  return pages;
}

async function buildAnimal(animalId, spec, packRoot, dryRun) {
  const frames = await readFrames(spec, packRoot);
  const pages = packPages(frames);

  const animations = new Map();
  for (const frame of frames) {
    const run = animations.get(frame.stem) ?? [];
    run.push(frame.index);
    animations.set(frame.stem, run);
  }

  console.log(`\n${animalId}: ${frames.length} frames, ${pages.length} page(s)`);
  for (const [stem, indices] of [...animations].sort()) {
    const max = Math.max(...indices);
    const contiguous = indices.length === max + 1 && Math.min(...indices) === 0;
    console.log(
      `  ${stem.padEnd(36)} ${String(indices.length).padStart(3)} frames  endFrameIndex: ${max}` +
        (contiguous ? '' : '  ⚠ NOT CONTIGUOUS FROM 0'),
    );
  }

  const atlas = {
    textures: pages.map((page, pageIndex) => ({
      image: `${animalId}/${animalId}-${pageIndex}.png`,
      format: 'RGBA8888',
      size: { w: page.width, h: page.height },
      scale: 1,
      frames: page.placements.map(({ frame, x, y }) => ({
        filename: frame.filename,
        rotated: false,
        trimmed: true,
        sourceSize: { w: frame.sourceSize.w, h: frame.sourceSize.h },
        spriteSourceSize: {
          x: frame.spriteSourceSize.x,
          y: frame.spriteSourceSize.y,
          w: frame.spriteSourceSize.w,
          h: frame.spriteSourceSize.h,
        },
        frame: { x, y, w: frame.spriteSourceSize.w, h: frame.spriteSourceSize.h },
      })),
    })),
    meta: {
      app: 'scripts/build-animal-atlas.mjs',
      version: '1.0',
      source: spec.dir,
    },
  };

  if (dryRun) {
    const bytes = pages.reduce((sum, p) => sum + p.width * p.height, 0);
    console.log(`  (dry run) pages: ${pages.map((p) => `${p.width}x${p.height}`).join(', ')}`);
    console.log(`  (dry run) ~${(bytes / 1e6).toFixed(1)} Mpx of page area`);
    return;
  }

  const pageDir = join(OUT_DIR, animalId);
  await rm(pageDir, { recursive: true, force: true });
  await mkdir(pageDir, { recursive: true });

  for (const [pageIndex, page] of pages.entries()) {
    const composite = page.placements.map(({ frame, x, y }) => ({
      input: frame.buffer,
      left: x,
      top: y,
    }));
    const file = join(pageDir, `${animalId}-${pageIndex}.png`);
    await sharp({
      create: {
        width: page.width,
        height: page.height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(composite)
      // Palettised, unlike the TexturePacker pages, which are RGBA8888. This art is flat
      // cartoon fill inside hard outlines, so 256 colours is effectively lossless on it:
      // measured against the truecolour write of the same page, the mean per-channel error
      // over non-transparent pixels is 0.07/255 (worst single pixel 36, on an antialiased
      // edge). It roughly halves the payload, which the bull needs — it is the largest
      // export canvas in the cast and its 123 frames come to 9.4MB truecolour.
      .png({ compressionLevel: 9, palette: true })
      .toFile(file);
    console.log(`  wrote ${file} (${page.width}x${page.height})`);
  }

  const jsonPath = join(OUT_DIR, `${animalId}.json`);
  await writeFile(jsonPath, `${JSON.stringify(atlas, null, 2)}\n`);
  console.log(`  wrote ${jsonPath}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.src) {
    throw new Error('Pass --src <GSD pack root>, or set GSD_CHAR_DIR.');
  }
  const ids = args.animals ?? Object.keys(SOURCES);
  for (const id of ids) {
    const spec = SOURCES[id];
    if (!spec) throw new Error(`No source spec for "${id}". Known: ${Object.keys(SOURCES).join(', ')}`);
    await buildAnimal(id, spec, args.src, args.dryRun);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
