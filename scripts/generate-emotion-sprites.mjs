#!/usr/bin/env node
/**
 * Generates the cast's emotion spritesheets through the Ludo.ai API, and promotes the ones
 * you approve into `public/assets/`.
 *
 * Run with `npm run sprites:emotions -- <flags>`:
 *
 *   --dry-run                    Extract reference frames and print the exact payloads.
 *                                No API key needed, no credits spent. Do this first.
 *   --animal donkey-grey[,fox]   Restrict to these animals (default: every one in the manifest).
 *   --emotion angry[,sneaky]     Restrict to these emotions (default: every one).
 *   --promote                    Copy reviewed clips out of the review dir into
 *                                `public/assets/characters/emotions/` and rewrite
 *                                `src/phaser/animals/emotionSheets.generated.ts`.
 *   --force                      Regenerate a clip that already exists in the review dir,
 *                                bypassing the API's request_id result cache (see `requestId`).
 *   --reindex                    Rebuild the generated TS module from `promoted-clips.json`
 *                                alone, with no review dir and no API calls. For when the
 *                                record was edited by hand (a corrected frame rate) or the
 *                                module drifted from it.
 *   --faces                      Operate on the FACE (headshot) register instead of the
 *                                body one: crops each animal's head out of its reference
 *                                frame and animates that, for the portraits the dialogue
 *                                boxes play. Composes with every flag above. A separate
 *                                review dir, public dir, record file and generated module,
 *                                so a face run can never touch a body clip and vice versa.
 *                                See `$faceComment` in the manifest for the prompt rules,
 *                                which are NOT the body rules.
 *   --remeasure                  Re-run `measureNormalization` and `measureClipQuality`
 *                                against the shipped PNGs in `public/assets/characters/emotions/`
 *                                (and the atlas reference frames for scale/origin), then rewrite
 *                                `promoted-clips.json` and the generated module. Free: no API,
 *                                no review dir. Use after changing the origin/scale maths in
 *                                `normalize.mjs`, or to fill quality numbers that predate
 *                                provenance. Honours `--animal` / `--emotion`.
 *
 * ## The API key
 *
 * Read from `LUDO_API_KEY` in the environment, never from a flag — a key in argv leaks into
 * shell history and into `ps` output for anyone else on the machine.
 *
 * `npm run sprites:emotions` passes Node's `--env-file-if-exists=.env.local`, so putting
 *
 *     LUDO_API_KEY=...
 *
 * in `.env.local` is the intended way to hold it. That filename is already gitignored by the
 * repo's `*.local` rule, the `-if-exists` form means the command still runs fine with no such
 * file (an exported shell variable works exactly as well), and Node reads it natively — no
 * dotenv dependency.
 *
 * Do **not** name it `VITE_LUDO_API_KEY`. Vite inlines every `VITE_`-prefixed variable into
 * the client bundle, which would publish the key to anyone who opens the game.
 *
 * ## Why generation and promotion are two commands
 *
 * Diffusion output is not deterministic and not always usable: Ludo's own docs warn that
 * seamless looping is never guaranteed and that colour drifts between the input frame and
 * the animation. A run that wrote straight into `public/assets/` would put art nobody had
 * looked at in front of players. So generation lands in `.ludo-review/` (gitignored) next to
 * a contact sheet that plays every clip at stage scale; you delete the ones that missed, and
 * `--promote` ships what is left. Deleting a directory is the whole approval mechanism —
 * there is no approval state to get out of sync with the files.
 */
import { mkdir, readdir, readFile, writeFile, copyFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { validateApiKey, submitGeneration, awaitJob, downloadAsset } from './ludo/ludoClient.mjs';
import { extractReferenceFrame, strokeRectPreview, toDataUri } from './ludo/referenceFrame.mjs';
import { measureNormalization, faceBoxTransform, FACE_BOX_FILL } from './ludo/normalize.mjs';
import {
  buildHeadTemplate,
  alignFrames,
  cropFaceSheet,
  fitForRect,
  summarizeAlignment,
  CROP_CELL_SIZE,
} from './ludo/cropFace.mjs';
import {
  measureClipQuality,
  QUALITY_THRESHOLDS,
  CROP_QUALITY_THRESHOLDS,
} from './ludo/qualityCheck.mjs';

const MANIFEST_PATH = 'scripts/ludo/emotion-manifest.json';

/**
 * The two registers this script drives, and every path that differs between them.
 *
 * Body clips are whole-animal loops staged on a floor line in Phaser. Face clips are
 * headshots played by a React component in a dialogue box. They share the API client, the
 * reference-frame extractor, the job polling and the quality maths — and share *nothing*
 * else, deliberately.
 *
 * Each register owns its own review dir, `public/` dir, record file and generated module.
 * That separation is not tidiness: the one bug this pipeline has actually shipped was a
 * promote that rebuilt the index from whatever happened to be in the review directory and
 * silently dropped every clip of an animal whose review dir had been cleared. Two registers
 * merging into one record would be that bug with a second way to happen. As it stands a face
 * run cannot write a byte of body-clip state.
 *
 * `record` is the durable, committed record of everything ever promoted in that register.
 * The metadata cannot be recovered from a promoted PNG alone — grid shape and frame rate are
 * not derivable from the image — so it has to be written down, and `--promote` merges into it
 * and generates the module from the merged whole.
 */
const BODY_MODE = {
  kind: 'body',
  noun: 'clip',
  reviewDir: '.ludo-review',
  publicDir: 'public/assets/characters/emotions',
  generatedTs: 'src/phaser/animals/emotionSheets.generated.ts',
  record: 'scripts/ludo/promoted-clips.json',
  thresholds: QUALITY_THRESHOLDS,
};
const FACE_MODE = {
  kind: 'face',
  noun: 'face clip',
  reviewDir: '.ludo-review-faces',
  publicDir: 'public/assets/characters/faces',
  generatedTs: 'src/phaser/animals/faceSheets.generated.ts',
  record: 'scripts/ludo/promoted-faces.json',
  thresholds: CROP_QUALITY_THRESHOLDS,
};

/**
 * Set once from `--faces` in `main()` and constant for the rest of the process.
 *
 * Module state rather than a parameter threaded through ten functions: the register is fixed
 * for the whole run of a one-shot CLI, and there is no code path that switches it mid-run.
 */
let MODE = BODY_MODE;

/** Portrait box the review page previews a face clip at — matches `FACE_BOX_PX` in TS. */
const FACE_PREVIEW_PX = 112;

/** Keep in sync with `ANIMAL_EMOTIONS` in `src/phaser/animals/animalEmotions.ts`. */
const TAXONOMY_PATH = 'src/phaser/animals/animalEmotions.ts';

// ---------------------------------------------------------------------------
// args
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {
    animals: null,
    emotions: null,
    dryRun: false,
    promote: false,
    force: false,
    reindex: false,
    remeasure: false,
    faces: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--promote') args.promote = true;
    else if (arg === '--force') args.force = true;
    else if (arg === '--reindex') args.reindex = true;
    else if (arg === '--remeasure') args.remeasure = true;
    else if (arg === '--faces') args.faces = true;
    else if (arg === '--animal') args.animals = (argv[++i] ?? '').split(',').filter(Boolean);
    else if (arg === '--emotion') args.emotions = (argv[++i] ?? '').split(',').filter(Boolean);
    else {
      console.error(`Unknown flag: ${arg}`);
      process.exit(1);
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// manifest
// ---------------------------------------------------------------------------

/**
 * Reads `ANIMAL_EMOTIONS` straight out of the TypeScript source so the manifest cannot name
 * an emotion the game has no type for. A regex rather than a TS import because this is a
 * plain `.mjs` script and Node's type stripping is still experimental — the list is a
 * single `as const` array, and a parse failure here is loud rather than silent.
 */
async function readTaxonomy() {
  const source = await readFile(TAXONOMY_PATH, 'utf8');
  const block = source.match(/export const ANIMAL_EMOTIONS = \[([\s\S]*?)\] as const;/);
  if (!block) throw new Error(`Could not find ANIMAL_EMOTIONS in ${TAXONOMY_PATH}`);
  const names = [...block[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  if (names.length === 0) throw new Error(`ANIMAL_EMOTIONS in ${TAXONOMY_PATH} parsed as empty`);
  return names;
}

async function readManifest() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  const taxonomy = await readTaxonomy();

  // Gated so a prompt for an emotion the game has no type for cannot generate art nothing can
  // ever ask to play. Portraits need no gate of their own: they are cropped from whatever body
  // clips exist, so they inherit this one.
  const unknown = Object.keys(manifest.emotions).filter((e) => !taxonomy.includes(e));
  if (unknown.length > 0) {
    throw new Error(
      `${MANIFEST_PATH} \`emotions\` defines emotion(s) the game does not know: ${unknown.join(', ')}. ` +
        `Add them to ANIMAL_EMOTIONS in ${TAXONOMY_PATH} first.`,
    );
  }
  return manifest;
}

/**
 * Expands the manifest into one job description per (animal, emotion) pair to generate.
 *
 * Which vocabulary, defaults and override block it reads depends on the register — the two
 * are parallel and never mixed, so an animal can have a body `angry` and no face `angry`, or
 * the reverse, without either run noticing the other's gap.
 */
function planJobs(manifest, args) {
  const jobs = [];
  for (const [animalId, animal] of Object.entries(manifest.animals)) {
    if (args.animals && !args.animals.includes(animalId)) continue;

    for (const [emotion, base] of Object.entries(manifest.emotions)) {
      if (args.emotions && !args.emotions.includes(emotion)) continue;

      const override = animal.overrides?.[emotion];
      const prompt = (override?.prompt ?? base.prompt)
        .replaceAll('{species}', animal.species)
        .replaceAll('{view}', animal.view);
      const settings = { ...manifest.defaults, ...base, ...override };
      settings.frameRate = playbackFrameRate(settings);

      jobs.push({ animalId, emotion, prompt, settings, reference: animal.reference });
    }
  }
  return jobs;
}

/**
 * `request_id` is an **idempotency key**, not just a label.
 *
 * The docs present it as a tag for finding a result again later, which undersold it badly:
 * re-submitting a request_id the account has already used returns that earlier generation
 * verbatim — no new job, no charge. Measured the hard way, by "regenerating" two clips with a
 * corrected prompt and getting byte-identical output back for free.
 *
 * That is genuinely useful, so it is kept and made accurate: the id carries a hash of
 * everything that defines the clip, so re-running an unchanged manifest costs nothing while
 * an edited prompt or a changed setting is a different clip and really regenerates. `--force`
 * adds a timestamp to escape the cache entirely, which is what it always claimed to do.
 */
function requestId(job, force) {
  const suffix = force ? `-${Date.now().toString(36)}` : '';
  const fingerprint = createHash('sha1')
    .update(JSON.stringify([job.prompt, job.reference, job.settings]))
    .digest('hex')
    .slice(0, 8);
  return `farm-emotion-${job.animalId}-${job.emotion}-${fingerprint}${suffix}`;
}

/**
 * Frame rate that plays a clip back at the speed it was generated at.
 *
 * The API is asked for `duration` seconds of motion sampled into `frames` frames, so the only
 * rate that reproduces the intended speed is `frames / duration`. Hard-coding 12 to match the
 * hand-authored atlas clips — which is what this did originally — silently played every
 * generated clip **1.5x too fast** (16 frames of a 2s motion in 1.33s), which reads as rushed
 * and is the reason the defaults now ask for 25 frames rather than 16: at 2s that lands on
 * 12.5fps, so the clip is both correctly paced *and* close to the atlas tempo.
 *
 * An explicit `frameRate` in the manifest still wins, for the rare clip that should deliberately
 * run off-speed.
 */
function playbackFrameRate(settings) {
  if (settings.frameRateOverride) return settings.frameRateOverride;
  return Math.round(settings.frames / settings.duration);
}

/**
 * Maps manifest settings onto the `AnimateSpritePayload` field names.
 *
 * `referenceDataUri` is whatever this register submits as the starting image: the un-trimmed
 * atlas frame for a body clip, the head crop of that same frame for a face clip. Everything
 * else is register-independent — a headshot is the same generation problem with a different
 * picture in it.
 */
function buildPayload(job, referenceDataUri, force) {
  return {
    initial_image: referenceDataUri,
    motion_prompt: job.prompt,
    image_type: job.settings.imageType,
    model: job.settings.model,
    frames: job.settings.frames,
    frame_size: job.settings.frameSize,
    duration: job.settings.duration,
    loop: job.settings.loop,
    // Pin the last frame to the same reference the first one came from. `loop: true` alone is
    // a hint the generator is free to miss — measured on the first real run, an unpinned clip
    // drifted from a standing donkey to a lying-down one and popped hard on every repeat.
    // Handing it the same image as both ends removes the ambiguity instead of asking nicely.
    ...(job.settings.closeLoop ? { final_image: referenceDataUri } : {}),
    margin_ratio_mode: job.settings.marginRatioMode,
    // Off deliberately: `crop` gives per-frame sizes, and a uniform grid is the entire
    // reason `load.spritesheet` can read these without an atlas.
    crop: false,
    gif: true, // the contact sheet plays this; costs nothing extra
    request_id: requestId(job, force),
  };
}

// ---------------------------------------------------------------------------
// generate
// ---------------------------------------------------------------------------

const clipDir = (animalId, emotion) => join(MODE.reviewDir, animalId, emotion);

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function generate(args) {
  const manifest = await readManifest();
  const jobs = planJobs(manifest, args);

  if (jobs.length === 0) {
    console.error('Nothing to generate — check --animal / --emotion against the manifest.');
    process.exit(1);
  }

  const apiKey = process.env.LUDO_API_KEY;
  if (!args.dryRun) {
    if (!apiKey) {
      console.error(
        'LUDO_API_KEY is not set.\n' +
          '  export LUDO_API_KEY=... then re-run, or pass --dry-run to inspect the payloads first.',
      );
      process.exit(1);
    }
    await validateApiKey(apiKey);
    console.log('API key OK.');
  }

  console.log(`${jobs.length} ${MODE.noun}(s) to generate.\n`);

  for (const job of jobs) {
    const label = `${job.animalId}/${job.emotion}`;
    const dir = clipDir(job.animalId, job.emotion);

    if (!args.force && (await exists(join(dir, 'meta.json')))) {
      console.log(`- ${label}: already in ${MODE.reviewDir} — skipping (use --force to redo)`);
      continue;
    }

    const reference = await extractReferenceFrame(job.animalId, job.reference);
    const payload = buildPayload(job, toDataUri(reference.buffer), args.force);

    if (args.dryRun) {
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, 'reference.png'), reference.buffer);
      console.log(`- ${label}: reference ${reference.width}x${reference.height} → ${dir}`);
      console.log(
        `  payload ${JSON.stringify({ ...payload, initial_image: `<${reference.buffer.length} bytes>` })}`,
      );
      continue;
    }

    process.stdout.write(`- ${label}: submitting… `);
    const { id, result: immediate } = await submitGeneration(apiKey, 'sprite/animate', payload);
    const result = immediate ?? (await awaitJob(apiKey, id, { onTick: () => process.stdout.write('.') }));

    if (!result?.spritesheet_url) {
      throw new Error(`${label}: job finished with no spritesheet_url — got ${JSON.stringify(result)}`);
    }

    const sheet = await downloadAsset(result.spritesheet_url);
    const { width, height } = await sharp(sheet).metadata();

    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'spritesheet.png'), sheet);
    // What `--remeasure` measures against, so it never needs another API call.
    await writeFile(join(dir, 'reference.png'), reference.buffer);
    if (result.gif_url) {
      await writeFile(join(dir, 'preview.gif'), await downloadAsset(result.gif_url));
    }

    const grid = {
      cols: result.num_cols,
      frameWidth: Math.round(width / result.num_cols),
      frameHeight: Math.round(height / result.num_rows),
      frameCount: result.num_frames,
    };
    const quality = await measureClipQuality(sheet, grid, MODE.thresholds);

    const meta = {
      kind: MODE.kind,
      animalId: job.animalId,
      emotion: job.emotion,
      prompt: job.prompt,
      referenceFrame: job.reference,
      settings: job.settings,
      generatedAt: new Date().toISOString(),
      sheetWidth: width,
      sheetHeight: height,
      frameCount: result.num_frames,
      cols: result.num_cols,
      rows: result.num_rows,
      // Frame size is derived, not taken from `frame_size`: the API pads to whole pixels and
      // the request value is a request, not a guarantee.
      frameWidth: grid.frameWidth,
      frameHeight: grid.frameHeight,
      quality,
    };
    await writeFile(join(dir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);

    console.log(
      ` done (${meta.frameCount} frames, ${meta.cols}x${meta.rows} grid of ${meta.frameWidth}x${meta.frameHeight})`,
    );
    console.log(
      `    loop seam ${quality.loopPop}%  height swing ${quality.heightSwing}%  drift ±${quality.driftX}px`,
    );
    quality.warnings.forEach((warning) => console.log(`    ⚠ ${warning}`));
  }

  await writeContactSheet();
  console.log(`\nReview them: open ${join(MODE.reviewDir, 'index.html')}`);
  console.log(
    `Delete any ${MODE.noun} directory that missed, then: npm run sprites:emotions -- --promote`,
  );
}

// ---------------------------------------------------------------------------
// face crops
// ---------------------------------------------------------------------------

/**
 * The canonical clip a head rect and alignment template are taken from.
 *
 * `talking` because it is the emotion every animal has and the one closest to a neutral pose,
 * so a rect authored against it reads sensibly for the other four. See the header of
 * `cropFace.mjs` for why one rect and one template are shared across an animal's emotions
 * rather than measured per clip.
 */
const CANONICAL_EMOTION = 'talking';

/**
 * Which portraits to cut, from the *body record* rather than from a prompt vocabulary.
 *
 * The source of truth for what can be cropped is what has actually been promoted as a body
 * clip — a face vocabulary listing five emotions would happily plan a crop of art that was
 * never generated. An animal with no `headCrop` is skipped, which is how the five gallery-only
 * animals stay out of a full-cast run without needing a flag: nobody has authored and checked
 * their box yet.
 */
function planCropJobs(manifest, bodyRecord, args) {
  const jobs = [];
  for (const [animalId, animal] of Object.entries(manifest.animals)) {
    if (args.animals && !args.animals.includes(animalId)) continue;
    if (!animal.headCrop) continue;

    const emotions = bodyRecord[animalId];
    if (!emotions) continue;
    if (!emotions[CANONICAL_EMOTION]) {
      throw new Error(
        `${animalId} has a headCrop but no promoted '${CANONICAL_EMOTION}' body clip, which is ` +
          `where its head rect and alignment template come from.`,
      );
    }

    for (const [emotion, source] of Object.entries(emotions)) {
      if (args.emotions && !args.emotions.includes(emotion)) continue;
      jobs.push({ animalId, emotion, headCrop: animal.headCrop, source });
    }
  }
  return jobs;
}

/**
 * Grid of a promoted body sheet.
 *
 * `cols` is not on the body record — `promote` only ever wrote `scale`/`originX`/`originY` —
 * so it is derived from the PNG exactly as `remeasure` derives it. Nothing here may assume
 * 25 frames or 5 columns: `donkey-grey` is 16 frames at 8fps on a 4x4 grid.
 */
async function bodyGrid(sheetBuffer, source) {
  const { width } = await sharp(sheetBuffer).metadata();
  return {
    cols: Math.round(width / source.frameWidth),
    frameWidth: source.frameWidth,
    frameHeight: source.frameHeight,
    frameCount: source.frameCount,
  };
}

/**
 * Cuts every planned portrait out of its body clip.
 *
 * Spends nothing and calls no API. Replaces the generated face register — see the header of
 * `cropFace.mjs` for the three failed generation attempts that led here.
 */
async function cropFaces(args) {
  const manifest = await readManifest();
  const bodyRecord = JSON.parse(await readFile(BODY_MODE.record, 'utf8'));
  const jobs = planCropJobs(manifest, bodyRecord, args);

  if (jobs.length === 0) {
    console.error(
      'Nothing to crop — check --animal / --emotion, and that the animal has a `headCrop` ' +
        'in the manifest and promoted body clips.',
    );
    process.exit(1);
  }

  console.log(`${jobs.length} portrait(s) to cut. No API, no credits.\n`);

  const byAnimal = new Map();
  for (const job of jobs) {
    if (!byAnimal.has(job.animalId)) byAnimal.set(job.animalId, []);
    byAnimal.get(job.animalId).push(job);
  }

  /** Per-animal crop facts for the boxes review page. */
  const reviewed = [];

  for (const [animalId, animalJobs] of byAnimal) {
    const animalEmotions = bodyRecord[animalId];
    const canonicalSource = animalEmotions[CANONICAL_EMOTION];
    const canonicalPath = join(BODY_MODE.publicDir, canonicalSource.file);
    const canonicalSheet = await readFile(canonicalPath);
    const canonicalGrid = await bodyGrid(canonicalSheet, canonicalSource);
    const { rect, union, template } = await buildHeadTemplate(
      canonicalSheet,
      canonicalGrid,
      animalJobs[0].headCrop,
    );

    const fit = fitForRect(rect, CROP_CELL_SIZE);
    const upscale = CROP_CELL_SIZE / Math.max(rect.width, rect.height);
    console.log(
      `- ${animalId}: head ${rect.width}x${rect.height}px out of a ${canonicalGrid.frameWidth}px ` +
        `cell (body union ${union.width}x${union.height}) → x${upscale.toFixed(2)} to ${CROP_CELL_SIZE}px`,
    );

    reviewed.push({
      animalId,
      headCrop: animalJobs[0].headCrop,
      rect,
      union,
      upscale,
      cellSize: CROP_CELL_SIZE,
      sourceCell: canonicalGrid.frameWidth,
      clips: [],
    });

    for (const job of animalJobs) {
      const label = `${animalId}/${job.emotion}`;
      const dir = clipDir(animalId, job.emotion);
      const sheetBuffer = await readFile(join(BODY_MODE.publicDir, job.source.file));
      const grid = await bodyGrid(sheetBuffer, job.source);

      const offsets = await alignFrames(sheetBuffer, grid, { rect, template });
      const alignment = summarizeAlignment(offsets);
      const cropped = await cropFaceSheet(sheetBuffer, grid, rect, offsets, CROP_CELL_SIZE);
      const croppedGrid = {
        cols: cropped.cols,
        frameWidth: cropped.frameWidth,
        frameHeight: cropped.frameHeight,
        frameCount: grid.frameCount,
      };
      const quality = await measureClipQuality(cropped.buffer, croppedGrid, MODE.thresholds);

      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, 'spritesheet.png'), cropped.buffer);
      // The source frame with the rect stroked on it: the "what got left out" view. A clipped
      // ear is invisible in the crop and obvious here.
      await writeFile(
        join(dir, 'crop.png'),
        await strokeRectPreview(await frameAtPng(sheetBuffer, 0, grid), rect),
      );

      const meta = {
        kind: MODE.kind,
        source: 'crop',
        animalId,
        emotion: job.emotion,
        // Provenance: which body clip this was cut from, the rect, and where each frame's head
        // was found. Without the offsets nobody can tell a tracking failure from bad art.
        sourceClip: job.source.file,
        headCrop: job.headCrop,
        headRect: rect,
        alignment: { offsets, ...alignment },
        settings: { frameRate: job.source.frameRate },
        croppedAt: new Date().toISOString(),
        generatedAt: new Date().toISOString(),
        sheetWidth: cropped.cols * cropped.frameWidth,
        sheetHeight: cropped.rows * cropped.frameHeight,
        frameCount: grid.frameCount,
        cols: cropped.cols,
        rows: cropped.rows,
        frameWidth: cropped.frameWidth,
        frameHeight: cropped.frameHeight,
        fit,
        quality,
      };
      await writeFile(join(dir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);

      if (job.emotion === CANONICAL_EMOTION) {
        // Frame 0 of the canonical crop: the still the head box is actually judged on.
        const animalDir = join(MODE.reviewDir, animalId);
        await mkdir(animalDir, { recursive: true });
        await writeFile(join(animalDir, 'head.png'), await frameAtPng(cropped.buffer, 0, croppedGrid));
        await writeFile(
          join(animalDir, 'crop.png'),
          await strokeRectPreview(await frameAtPng(sheetBuffer, 0, grid), rect),
        );
      }

      reviewed[reviewed.length - 1].clips.push({ emotion: job.emotion, alignment, quality });
      console.log(
        `  ${job.emotion}: ${grid.frameCount} frames from ${job.source.file} ` +
          `(align ≤${alignment.maxOffset}px, jump ≤${alignment.maxJump}px)`,
      );
      [...alignment.warnings, ...quality.warnings].forEach((w) => console.log(`    ⚠ ${w}`));
    }
  }

  if (args.dryRun) {
    await writeHeadBoxesPage(reviewed);
    console.log(`\nCheck the crops: open ${join(MODE.reviewDir, 'boxes.html')}`);
    console.log('Retune `headCrop` in the manifest and re-run — this costs nothing.');
    return;
  }

  await writeFaceContactSheet();
  console.log(`\nReview them: open ${join(MODE.reviewDir, 'index.html')}`);
  console.log(
    'Delete any portrait directory that missed, then: npm run sprites:emotions -- --faces --promote',
  );
}

/** One cell of a body sheet as a PNG, for the stroked review image. */
async function frameAtPng(sheetBuffer, index, grid) {
  return sharp(sheetBuffer)
    .extract({
      left: (index % grid.cols) * grid.frameWidth,
      top: Math.floor(index / grid.cols) * grid.frameHeight,
      width: grid.frameWidth,
      height: grid.frameHeight,
    })
    .png()
    .toBuffer();
}

// ---------------------------------------------------------------------------
// contact sheet
// ---------------------------------------------------------------------------

/** Every clip currently sitting in the review directory, in manifest-independent order. */
async function reviewedClips() {
  if (!(await exists(MODE.reviewDir))) return [];
  const clips = [];
  for (const animalId of await readdir(MODE.reviewDir, { withFileTypes: true })) {
    if (!animalId.isDirectory()) continue;
    for (const emotion of await readdir(join(MODE.reviewDir, animalId.name), {
      withFileTypes: true,
    })) {
      if (!emotion.isDirectory()) continue;
      const metaPath = join(MODE.reviewDir, animalId.name, emotion.name, 'meta.json');
      if (!(await exists(metaPath))) continue; // a --dry-run stub, not a generated clip
      clips.push(JSON.parse(await readFile(metaPath, 'utf8')));
    }
  }
  return clips;
}

/**
 * Writes the face-box review page: every animal's crop, once, with the numbers.
 *
 * This is the whole free iteration loop for authoring `face` rects. Three views per animal,
 * because each catches a different mistake:
 *
 *  - **crop.png** — the rect stroked on the full reference frame. Shows what was left *out*:
 *    an ear clipped by the top edge, or a rect that has slid down onto the shoulder.
 *  - **face.png at portrait size** — what the portrait will actually read like in the
 *    dialogue box. Detail that survives here survives in game.
 *  - **face.png at native size** — the honest look at the upscale. The cast's export canvases
 *    differ by 2.5x, so the sheep's head is ~170px where the raccoon's is ~400px, and the
 *    small ones are being resampled 2.5x before the generator ever sees them.
 */
async function writeHeadBoxesPage(animals) {
  const RETINA_PX = FACE_PREVIEW_PX * 2;
  const cards = animals
    .sort((a, b) => a.animalId.localeCompare(b.animalId))
    .map((a) => {
      const hard = a.upscale >= 2;
      const clips = a.clips
        .map((c) => {
          const warnings = [...c.alignment.warnings, ...c.quality.warnings];
          return `<tr class="${warnings.length ? 'warn' : ''}">
            <td>${c.emotion}</td>
            <td>&le;${c.alignment.maxOffset}px</td>
            <td>&le;${c.alignment.maxJump}px</td>
            <td>${c.quality.loopPop}%</td>
            <td>${warnings.join('; ') || '—'}</td>
          </tr>`;
        })
        .join('\n');
      return `
      <figure class="card">
        <div class="views">
          <div class="view">
            <img src="${a.animalId}/crop.png" alt="">
            <span>rect on frame 0 of the body clip — check nothing is clipped</span>
          </div>
          <div class="view">
            <div class="portrait"><img src="${a.animalId}/head.png" alt=""></div>
            <span>ship size (${FACE_PREVIEW_PX}px)</span>
          </div>
          <div class="view">
            <div class="portrait retina"><img src="${a.animalId}/head.png" alt=""></div>
            <span>2&times; DPR (${RETINA_PX}px) — judge softness here</span>
          </div>
        </div>
        <figcaption>
          <strong>${a.animalId}</strong>
          <span>headCrop { x: ${a.headCrop.x}, y: ${a.headCrop.y}, w: ${a.headCrop.w}, h: ${a.headCrop.h} }
                &rarr; ${a.rect.width}&times;${a.rect.height}px at (${a.rect.left}, ${a.rect.top})
                in a ${a.sourceCell}px cell</span>
          <span>body union box ${a.union.width}&times;${a.union.height}px</span>
          <span class="${hard ? 'bad' : 'good'}">&times;${a.upscale.toFixed(2)} to ${a.cellSize}px${
            hard ? ' — over 2&times;, judge this crop hardest' : ''
          }</span>
          <table>
            <tr><th>emotion</th><th>align</th><th>jump</th><th>loop</th><th>warnings</th></tr>
            ${clips}
          </table>
        </figcaption>
      </figure>`;
    })
    .join('\n');

  const html = `<!doctype html>
<meta charset="utf-8">
<title>Head crop review</title>
<style>
  body { margin: 0; padding: 24px; background: #3a3a3a; color: #eee;
         font: 14px system-ui, sans-serif; }
  h1 { font-size: 18px; font-weight: 600; }
  p { color: #bbb; max-width: 78ch; }
  .grid { display: grid; gap: 24px; }
  .card { margin: 0; background: #2b2b2b; border-radius: 8px; overflow: hidden; }
  .views { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; padding: 12px;
           align-items: start;
           background: repeating-conic-gradient(#333 0 25%, #3d3d3d 0 50%) 0 0 / 24px 24px; }
  .view { display: grid; gap: 6px; justify-items: center; }
  .view img { max-width: 100%; display: block; }
  .view span { color: #999; font-size: 11px; text-align: center; }
  .portrait { width: ${FACE_PREVIEW_PX}px; height: ${FACE_PREVIEW_PX}px; display: grid;
              place-items: center; border: 2px solid #555; border-radius: 10px;
              overflow: hidden; background: #262626; }
  .portrait.retina { width: ${RETINA_PX}px; height: ${RETINA_PX}px; }
  .portrait img { width: 100%; height: 100%; object-fit: contain; }
  figcaption { padding: 12px 14px; display: grid; gap: 6px; }
  figcaption span { color: #aaa; font-size: 12px; }
  figcaption .good { color: #7fd18b; }
  figcaption .bad { color: #f0a05a; }
  table { border-collapse: collapse; margin-top: 6px; font-size: 12px; }
  th, td { text-align: left; padding: 3px 12px 3px 0; color: #aaa; }
  th { color: #777; font-weight: 500; }
  tr.warn td { color: #f0a05a; }
</style>
<h1>Head crop review — ${animals.length} animal(s), no credits spent</h1>
<p>Step 1 of the portrait workflow. Every crop should be a head-and-shoulders with air around
   it: nothing clipped by an edge, the eyes and mouth well inside the frame. Part of the neck
   and chest in shot is fine and expected. Retune <code>headCrop</code> in
   <code>${MANIFEST_PATH}</code> and re-run
   <code>npm run sprites:emotions -- --faces --dry-run</code> — this loop is free.</p>
<p>One rect per animal, never one per emotion, and one alignment template per animal taken
   from its <code>${CANONICAL_EMOTION}</code> clip: all five portraits play in the same box in
   the same dialogue, so a per-emotion rect would make the head jump size when the beat
   changes speaker emotion.</p>
<p><strong>align</strong> is how far the aligner had to move to follow the head, and
   <strong>jump</strong> how far it moved between consecutive frames. A saturated align means
   the search window was too small; a large jump means the matcher probably lost its lock.
   Both are worth opening the clip for.</p>
<div class="grid">${cards}</div>
`;
  await writeFile(join(MODE.reviewDir, 'boxes.html'), html);
}

/**
 * Writes a static review page. The point is judging the clip *as it will appear in game*, so
 * each one plays through a CSS `steps()` animation at the same frame rate Phaser will use
 * and scaled to roughly its Trial height — a GIF at native resolution flatters art that
 * falls apart at 300px.
 */
async function writeContactSheet() {
  if (MODE.kind === 'face') return writeFaceContactSheet();
  const clips = await reviewedClips();
  const cards = clips
    .map((c) => {
      const src = `${c.animalId}/${c.emotion}/spritesheet.png`;
      const rate = c.settings.frameRate ?? 12;
      const id = `${c.animalId}-${c.emotion}`.replace(/[^a-z0-9-]/gi, '-');
      return `
      <figure class="card">
        <div class="stage">
          <div class="clip" id="${id}"></div>
        </div>
        <figcaption>
          <strong>${c.animalId} · ${c.emotion}</strong>
          <span>${c.frameCount} frames @ ${rate}fps · ${c.frameWidth}×${c.frameHeight}</span>
          ${
            c.quality
              ? `<span class="${c.quality.warnings.length ? 'bad' : 'good'}">loop seam ${c.quality.loopPop}% · height swing ${c.quality.heightSwing}% · drift ±${c.quality.driftX}px</span>
          ${c.quality.warnings.map((w) => `<span class="bad">⚠ ${w}</span>`).join('\n          ')}`
              : ''
          }
          <p>${c.prompt}</p>
        </figcaption>
      </figure>
      <style>
        #${id} {
          width: ${c.frameWidth}px; height: ${c.frameHeight}px;
          background-image: url('${src}');
          transform: scale(${(300 / c.frameHeight).toFixed(3)});
          animation: play-${id} ${(c.frameCount / rate).toFixed(3)}s steps(1) infinite;
        }
        @keyframes play-${id} {
          ${Array.from({ length: c.frameCount }, (_, i) => {
            const col = i % c.cols;
            const row = Math.floor(i / c.cols);
            const pct = ((i / c.frameCount) * 100).toFixed(4);
            return `${pct}% { background-position: -${col * c.frameWidth}px -${row * c.frameHeight}px; }`;
          }).join('\n          ')}
        }
      </style>`;
    })
    .join('\n');

  const html = `<!doctype html>
<meta charset="utf-8">
<title>Emotion clip review</title>
<style>
  body { margin: 0; padding: 24px; background: #3a3a3a; color: #eee;
         font: 14px system-ui, sans-serif; }
  h1 { font-size: 18px; font-weight: 600; }
  .grid { display: grid; gap: 24px; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); }
  .card { margin: 0; background: #2b2b2b; border-radius: 8px; overflow: hidden; }
  .stage { height: 320px; display: grid; place-items: center; overflow: hidden;
           background: repeating-conic-gradient(#333 0 25%, #3d3d3d 0 50%) 0 0 / 24px 24px; }
  figcaption { padding: 12px 14px; display: grid; gap: 6px; }
  figcaption span { color: #aaa; font-size: 12px; }
  figcaption .good { color: #7fd18b; }
  figcaption .bad { color: #f0a05a; }
  figcaption p { margin: 0; color: #999; font-size: 12px; line-height: 1.45; }
</style>
<h1>Emotion clip review — ${clips.length} clip(s), playing at Trial scale (~300px tall)</h1>
<p>Delete any clip's directory under <code>${MODE.reviewDir}/</code> to reject it, then run
   <code>npm run sprites:emotions -- --promote</code>.</p>
<div class="grid">${cards}</div>
`;
  await writeFile(join(MODE.reviewDir, 'index.html'), html);
}

/**
 * The face register's review page. Three views per clip, because a portrait's defects live at
 * three different scales and each view is blind to the others':
 *
 *  1. **At portrait size**, framed with the *same* `faceBoxTransform` the React component
 *     uses. What you approve here is what ships. A review page that frames portraits its own
 *     way is worse than no review page — it is why `applyEmotionStaging` is shared between
 *     the Trial and the gallery rather than reimplemented in each.
 *  2. **At native cell size**, for sharpness and for judging the upscale on the small-canvas
 *     animals.
 *  3. **A churn strip** of still frames around the worst consecutive-frame pair. This is
 *     SKILL.md rule 7's "crop the head from a handful of frames, scale it up and lay them
 *     side by side" done for you: a mouth interior or a pupil redrawn every frame is
 *     invisible in a playing loop and unmissable in a static row.
 */
async function writeFaceContactSheet() {
  const clips = await reviewedClips();

  const cards = [];
  for (const c of clips) {
    const src = `${c.animalId}/${c.emotion}/spritesheet.png`;
    const rate = c.settings.frameRate ?? 12;
    const id = `${c.animalId}-${c.emotion}`.replace(/[^a-z0-9-]/gi, '-');
    const grid = {
      cols: c.cols,
      frameWidth: c.frameWidth,
      frameHeight: c.frameHeight,
      frameCount: c.frameCount,
    };

    // The crop's own `fit`, off its meta — the same number that will ship, so the page frames
    // a portrait exactly as the game will. Re-measuring it here would let the review page and
    // the game disagree, which is the failure `faceBoxTransform` is shared to prevent.
    const fit = c.fit ?? fitForRect(c.headRect, c.frameWidth);
    const t = faceBoxTransform(fit, c.frameWidth, c.frameHeight, FACE_PREVIEW_PX);

    const cellAt = (i) =>
      `background-position: ${-(i % c.cols) * c.frameWidth}px ${-Math.floor(i / c.cols) * c.frameHeight}px;`;

    // Evenly spaced samples, plus the churn peak and the frame before it — the pair the
    // warning names.
    const peak = c.quality?.churnPeakIndex;
    const samples = [...new Set(
      [
        ...Array.from({ length: 5 }, (_, k) => Math.round((k * (c.frameCount - 1)) / 4)),
        ...(peak ? [peak - 1, peak] : []),
      ].filter((i) => i >= 0 && i < c.frameCount),
    )].sort((a, b) => a - b);

    const strip = samples
      .map(
        (i) =>
          `<div class="shot ${peak && (i === peak || i === peak - 1) ? 'peak' : ''}">
             <div class="cell" style="width:${c.frameWidth}px;height:${c.frameHeight}px;
                  background-image:url('${src}');${cellAt(i)}
                  transform:scale(${(96 / c.frameHeight).toFixed(4)});"></div>
             <span>${i}</span>
           </div>`,
      )
      .join('\n');

    const q = c.quality;
    const churn = q?.churnMean != null
      ? ` &middot; churn ${q.churnMean} avg / ${q.churnPeak} peak @ frame ${q.churnPeakIndex}`
      : '';

    cards.push(`
      <figure class="card">
        <div class="views">
          <div class="view">
            <div class="portrait"><div class="clip" id="${id}"></div></div>
            <span>in game (${FACE_PREVIEW_PX}px box)</span>
          </div>
          <div class="view">
            <div class="native"><div class="clip" id="${id}-native"></div></div>
            <span>native ${c.frameWidth}&times;${c.frameHeight} cell</span>
          </div>
        </div>
        <div class="strip">${strip}</div>
        <figcaption>
          <strong>${c.animalId} &middot; ${c.emotion}</strong>
          <span>${c.frameCount} frames @ ${rate}fps &middot; ${c.cols} cols &middot;
                head fills ${(fit.width * 100).toFixed(0)}%&times;${(fit.height * 100).toFixed(0)}% of the cell</span>
          ${
            q
              ? `<span class="${q.warnings.length ? 'bad' : 'good'}">loop seam ${q.loopPop}% &middot; height swing ${q.heightSwing}% &middot; drift &plusmn;${q.driftX}px${churn}</span>
          ${q.warnings.map((w) => `<span class="bad">&#9888; ${w}</span>`).join('\n          ')}`
              : ''
          }
          <p>${c.prompt}</p>
        </figcaption>
      </figure>
      <style>
        #${id} {
          width: ${c.frameWidth}px; height: ${c.frameHeight}px;
          background-image: url('${src}');
          transform-origin: 0 0;
          transform: translate(${t.x.toFixed(2)}px, ${t.y.toFixed(2)}px) scale(${t.z.toFixed(4)});
          animation: play-${id} ${(c.frameCount / rate).toFixed(3)}s steps(1) infinite;
        }
        #${id}-native {
          width: ${c.frameWidth}px; height: ${c.frameHeight}px;
          background-image: url('${src}');
          transform-origin: 0 0;
          transform: scale(${(FACE_PREVIEW_PX * 2 / c.frameHeight).toFixed(4)});
          animation: play-${id} ${(c.frameCount / rate).toFixed(3)}s steps(1) infinite;
        }
        @keyframes play-${id} {
          ${Array.from({ length: c.frameCount }, (_, i) => {
            const pct = ((i / c.frameCount) * 100).toFixed(4);
            return `${pct}% { ${cellAt(i)} }`;
          }).join('\n          ')}
        }
      </style>`);
  }

  const html = `<!doctype html>
<meta charset="utf-8">
<title>Face clip review</title>
<style>
  body { margin: 0; padding: 24px; background: #3a3a3a; color: #eee;
         font: 14px system-ui, sans-serif; }
  h1 { font-size: 18px; font-weight: 600; }
  p { color: #bbb; }
  .grid { display: grid; gap: 24px; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); }
  .card { margin: 0; background: #2b2b2b; border-radius: 8px; overflow: hidden; }
  .views { display: flex; gap: 16px; padding: 14px; align-items: flex-start;
           background: repeating-conic-gradient(#333 0 25%, #3d3d3d 0 50%) 0 0 / 24px 24px; }
  .view { display: grid; gap: 6px; justify-items: center; }
  .view span { color: #999; font-size: 11px; }
  .portrait { width: ${FACE_PREVIEW_PX}px; height: ${FACE_PREVIEW_PX}px; overflow: hidden;
              border: 2px solid #555; border-radius: 10px; background: #262626; }
  .native { width: ${FACE_PREVIEW_PX * 2}px; height: ${FACE_PREVIEW_PX * 2}px; overflow: hidden;
            border: 1px solid #444; }
  .strip { display: flex; gap: 4px; padding: 0 14px 12px; overflow-x: auto;
           background: repeating-conic-gradient(#333 0 25%, #3d3d3d 0 50%) 0 0 / 24px 24px; }
  .shot { display: grid; gap: 2px; justify-items: center; }
  .shot .cell { width: 96px; height: 96px; overflow: hidden; transform-origin: 0 0; }
  .shot > .cell { outline: 1px solid #444; }
  .shot span { color: #888; font-size: 10px; }
  .shot.peak > .cell { outline: 2px solid #f0a05a; }
  .shot.peak span { color: #f0a05a; }
  figcaption { padding: 12px 14px; display: grid; gap: 6px; }
  figcaption span { color: #aaa; font-size: 12px; }
  figcaption .good { color: #7fd18b; }
  figcaption .bad { color: #f0a05a; }
  figcaption p { margin: 0; color: #999; font-size: 12px; line-height: 1.45; }
</style>
<h1>Face clip review — ${clips.length} clip(s)</h1>
<p>Judge the <strong>portrait-size</strong> view: it is framed with the same maths the game uses.
   The native view is for sharpness, and the still strip is for per-frame defects — a mouth
   interior or a pupil that is redrawn every frame reads as a strobe in game and is invisible
   in a playing loop. Orange frames are the worst consecutive pair.</p>
<p>Delete any clip's directory under <code>${MODE.reviewDir}/</code> to reject it, then run
   <code>npm run sprites:emotions -- --faces --promote</code>.</p>
<div class="grid">${cards.join('\n')}</div>
`;
  await writeFile(join(MODE.reviewDir, 'index.html'), html);
}

// ---------------------------------------------------------------------------
// promote
// ---------------------------------------------------------------------------

/** The committed record, or an empty one on a first run. */
async function readPromotedRecord() {
  if (!(await exists(MODE.record))) return {};
  return JSON.parse(await readFile(MODE.record, 'utf8'));
}

async function promote() {
  const clips = await reviewedClips();
  if (clips.length === 0) {
    console.error(`Nothing to promote — ${MODE.reviewDir} holds no generated ${MODE.noun}s.`);
    process.exit(1);
  }

  // Belt as well as braces. The registers already use separate review directories, so this
  // cannot fire today; it exists because the one bug this pipeline has shipped was a promote
  // writing an index from the wrong set of files, and a face clip promoted as a body clip
  // would be measured against a floor line and staged 3x too small with no error anywhere.
  const foreign = clips.filter((c) => (c.kind ?? 'body') !== MODE.kind);
  if (foreign.length > 0) {
    console.error(
      `${MODE.reviewDir} holds ${foreign.length} ${foreign[0].kind} clip(s) but this is a ` +
        `${MODE.kind} promote: ${foreign.map((c) => `${c.animalId}/${c.emotion}`).join(', ')}.`,
    );
    process.exit(1);
  }

  await mkdir(MODE.publicDir, { recursive: true });

  // Merge, never replace: clips promoted in earlier runs stay promoted even though their
  // review directories are long gone.
  const byAnimal = await readPromotedRecord();
  for (const clip of clips.sort((a, b) =>
    `${a.animalId}${a.emotion}`.localeCompare(`${b.animalId}${b.emotion}`),
  )) {
    const dir = clipDir(clip.animalId, clip.emotion);
    const file = `${clip.animalId}-${clip.emotion}.png`;
    const sheetBuffer = await readFile(join(dir, 'spritesheet.png'));

    // The two registers derive different geometry, because they are placed differently. A body
    // clip has to land at atlas scale with its feet on a floor line next to its castmates, so
    // it is measured against the atlas reference frame. A portrait only has to sit centred in
    // its own box.
    //
    // A portrait's `fit` is *arithmetic on the authored rect*, not a measurement of the art —
    // `fitForRect` explains why at length, but the short version is that measuring it back out
    // of the pixels makes it differ per emotion (an open snarl reaches further than a shut
    // mouth), which reintroduces the head-size jump between dialogue beats that one rect per
    // animal exists to prevent. It is computed at crop time and carried on the meta.
    const geometry =
      MODE.kind === 'face'
        ? { fit: clip.fit ?? fitForRect(clip.headRect, clip.frameWidth), cols: clip.cols }
        : await measureNormalization(sheetBuffer, await readFile(join(dir, 'reference.png')), clip);

    await copyFile(join(dir, 'spritesheet.png'), join(MODE.publicDir, file));
    const previous = byAnimal[clip.animalId]?.[clip.emotion];
    (byAnimal[clip.animalId] ??= {})[clip.emotion] = {
      file,
      frameWidth: clip.frameWidth,
      frameHeight: clip.frameHeight,
      frameCount: clip.frameCount,
      frameRate: clip.settings.frameRate,
      ...(MODE.kind === 'face'
        ? {
            // `cols` is the one field faces need and bodies do not. Phaser addresses frames
            // by index and derives the grid from the texture; a CSS `background-position`
            // step has to turn a frame index back into a (col, row) itself, so the column
            // count has to be written down or the portrait plays garbage.
            cols: geometry.cols,
            fit: geometry.fit,
            // Crop provenance. `headCrop` gets retuned between rounds, so without the resolved
            // rect nobody can tell which framing a shipped portrait was actually cut at, and
            // without `sourceClip` nobody can tell which body clip it came from. The offsets
            // are what separates "the art is wrong" from "the aligner lost the head".
            sourceClip: clip.sourceClip,
            headCrop: clip.headCrop,
            headRect: clip.headRect,
            alignment: clip.alignment,
          }
        : { scale: geometry.scale, originX: geometry.originX, originY: geometry.originY }),
      // Provenance, recorded here and not in the generated module (the runtime has no use for
      // it). The manifest is edited between rounds — generic prompts get rewritten, animals
      // gain overrides — so it stops describing what shipped the moment it changes. Without
      // this, there is no way to know what a promoted clip was actually asked to be.
      // Body clips record the prompt they were asked for; a crop has no prompt — its
      // provenance is the rect and the source clip above. `undefined` drops out of the JSON.
      prompt: clip.prompt,
      quality: clip.quality,
      generatedAt: clip.generatedAt,
      // Human notes live on the record, not on the generation. Keep them across a re-promote.
      ...(previous?.reviewNotes?.length ? { reviewNotes: previous.reviewNotes } : {}),
    };
    console.log(
      `- ${clip.animalId}/${clip.emotion} → ${join(MODE.publicDir, file)}` +
        (MODE.kind === 'face'
          ? `  (head fills ${(geometry.fit.width * 100).toFixed(0)}%×${(geometry.fit.height * 100).toFixed(0)}% of a ${geometry.cols}-col cell)`
          : `  (scale ×${geometry.scale}, origin ${geometry.originX}/${geometry.originY})`),
    );
  }

  await writeFile(MODE.record, `${JSON.stringify(sortRecord(byAnimal), null, 2)}\n`);
  await writeGeneratedModule(sortRecord(byAnimal));

  const total = Object.values(byAnimal).reduce((n, e) => n + Object.keys(e).length, 0);
  console.log(
    `\nRewrote ${MODE.generatedTs} with all ${total} promoted clip(s) across ${Object.keys(byAnimal).length} animal(s).`,
  );
  console.log(`Run \`npx tsc --noEmit\` and reload the game.`);
}

/**
 * Runs the emitted module through the repo's own Prettier before it is written.
 *
 * This used to be attempted by hand — emit source that is already "Prettier-shaped" — and it
 * silently stopped being true. A quality warning like `height swing 28% (over 20%) — check it
 * is motion, not the character changing pose` pushes its `warnings: [...]` line past the
 * 100-column budget, so Prettier wraps it and the serializer did not.
 *
 * The result had no stable state: `--reindex` wrote the unwrapped form, the pre-commit hook
 * rewrapped it, and the next `--reindex` dirtied it again. So every `--promote` showed a diff
 * in the generated module that the person running it had not caused — precisely the confusion
 * `promoted-clips.json` exists to prevent.
 *
 * Formatting with Prettier itself, resolving this repo's `.prettierrc`, makes the two agree by
 * construction rather than through a rule duplicated in two places and kept in sync by hope.
 *
 * Prettier is a devDependency and this is a dev-only script, but a missing install degrades to
 * a warning rather than losing a promote that has already spent credits.
 */
async function formatGenerated(source, filepath) {
  try {
    const prettier = await import('prettier');
    const options = (await prettier.resolveConfig(filepath)) ?? {};
    return await prettier.format(source, { ...options, filepath });
  } catch (error) {
    console.warn(
      `Could not format ${filepath} with Prettier (${error.message}) — writing unformatted. ` +
        `Run \`npm run format\` before committing.`,
    );
    return source;
  }
}

/**
 * Quote an object key only when it is not a bare identifier — `'donkey-grey'` needs quotes,
 * `owl` does not. Redundant now that `formatGenerated` runs, since Prettier's `quoteProps`
 * default would do the same; kept so the pre-format source is readable when a Prettier failure
 * makes it the thing that actually lands.
 */
function quoteKey(key) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : `'${key}'`;
}

/** Stable key order, so a promote produces a reviewable diff rather than a reshuffle. */
function sortRecord(byAnimal) {
  return Object.fromEntries(
    Object.keys(byAnimal)
      .sort()
      .map((animalId) => [
        animalId,
        Object.fromEntries(
          Object.keys(byAnimal[animalId])
            .sort()
            .map((emotion) => [emotion, byAnimal[animalId][emotion]]),
        ),
      ]),
  );
}

function jsString(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function serializeQuality(quality) {
  if (!quality) return '';
  const warnings = (quality.warnings ?? []).map(jsString).join(', ');
  // Churn is face-only, so it is emitted only when it was measured — the body clips'
  // `quality` blocks stay exactly the three fields they have always had.
  const churn =
    quality.churnMean == null
      ? ''
      : `
        churnMean: ${quality.churnMean},
        churnPeak: ${quality.churnPeak},
        churnPeakIndex: ${quality.churnPeakIndex},`;
  return `
      quality: {
        loopPop: ${quality.loopPop},
        heightSwing: ${quality.heightSwing},
        driftX: ${quality.driftX},${churn}
        warnings: [${warnings}],
      },`;
}

function serializeReviewNotes(notes) {
  if (!notes?.length) return '';
  return `
      reviewNotes: [${notes.map(jsString).join(', ')}],`;
}

function serializeSheet(sheet) {
  const rate = sheet.frameRate == null ? '' : `\n      frameRate: ${sheet.frameRate},`;
  const geometry =
    MODE.kind === 'face'
      ? `
      cols: ${sheet.cols},
      fit: { x: ${sheet.fit.x}, y: ${sheet.fit.y}, width: ${sheet.fit.width}, height: ${sheet.fit.height} },`
      : `
      scale: ${sheet.scale},
      originX: ${sheet.originX},
      originY: ${sheet.originY},`;
  return `{
      file: '${sheet.file}',
      frameWidth: ${sheet.frameWidth},
      frameHeight: ${sheet.frameHeight},
      frameCount: ${sheet.frameCount},${rate}${geometry}${serializeQuality(sheet.quality)}${serializeReviewNotes(sheet.reviewNotes)}
    }`;
}

async function writeGeneratedModule(byAnimal) {
  const entries = Object.entries(byAnimal)
    .map(([animalId, emotions]) => {
      const inner = Object.entries(emotions)
        .map(([emotion, sheet]) => `    ${emotion}: ${serializeSheet(sheet)},`)
        .join('\n');
      return `  ${quoteKey(animalId)}: {\n${inner}\n  },`;
    })
    .join('\n');

  if (MODE.kind === 'face') {
    const faceSource = `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Written by \`npm run sprites:emotions -- --faces --promote\`. Lists the headshot clips that
 * actually exist on disk under \`public/assets/characters/faces/\`; regenerate rather than
 * editing, or the next promote will overwrite your change.
 *
 * The face register's counterpart to \`emotionSheets.generated.ts\`, and deliberately a
 * separate module rather than a second export from it: the two are promoted independently
 * from independent records, and a face sheet is not a drop-in for a body sheet — it carries
 * \`cols\` and \`fit\` where a body clip carries \`scale\` and a feet origin, because one is
 * centred in a DOM portrait box and the other is planted on a Phaser floor line. Separate
 * types make handing one to the other's code a compile error rather than a sprite rendered
 * 3x too small.
 *
 * Empty is a valid state: a character with no entry here simply shows no portrait, exactly as
 * an animal with no emotion clip falls back to its idle loop.
 */
import type { AnimalSpriteId } from '../../data/characters';
import type { AnimalEmotion } from './animalEmotions';
import type { FaceSheet } from './animalFaces';

export const FACE_SHEETS: Partial<
  Record<AnimalSpriteId, Partial<Record<AnimalEmotion, FaceSheet>>>
> = {
${entries}
};
`;
    await writeFile(MODE.generatedTs, await formatGenerated(faceSource, MODE.generatedTs));
    return;
  }

  const source = `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Written by \`npm run sprites:emotions -- --promote\`. Lists the emotion clips that actually
 * exist on disk under \`public/assets/characters/emotions/\`; regenerate rather than editing,
 * or the next promote will overwrite your change.
 *
 * A committed generated module rather than a JSON file fetched at runtime, for two reasons:
 * Phaser's loader would need a second pass (read the index, then queue the sheets it names),
 * and a TS module gets the animal ids and emotion names type-checked against
 * \`AnimalSpriteId\` / \`AnimalEmotion\` at build time instead of failing silently at runtime.
 *
 * Empty is a valid state: every consumer falls back to the base \`idle\`/\`alert\` behaviour for
 * an animal or emotion that has no entry here.
 */
import type { AnimalSpriteId } from '../../data/characters';
import type { AnimalEmotion, EmotionSheet } from './animalEmotions';

export const EMOTION_SHEETS: Partial<
  Record<AnimalSpriteId, Partial<Record<AnimalEmotion, EmotionSheet>>>
> = {
${entries}
};
`;
  await writeFile(MODE.generatedTs, await formatGenerated(source, MODE.generatedTs));
}

// ---------------------------------------------------------------------------

async function reindex() {
  const record = await readPromotedRecord();
  const total = Object.values(record).reduce((n, e) => n + Object.keys(e).length, 0);
  if (total === 0) {
    console.error(`${MODE.record} holds no clips — nothing to reindex.`);
    process.exit(1);
  }
  await writeGeneratedModule(sortRecord(record));
  console.log(`Rebuilt ${MODE.generatedTs} from ${MODE.record}: ${total} clip(s).`);
}

/**
 * Re-runs `measureNormalization` and `measureClipQuality` on shipped clips. Scale/origin live
 * in `promoted-clips.json` because they cannot be recovered from the PNG alone, so a change to
 * the maths (planting originY at the feet rather than the atlas canvas bottom) has to write
 * new numbers back. Quality is the same story for clips promoted before those numbers were
 * stored — donkey and owl shipped without a `quality` block. Reads the promoted PNG (and, for
 * scale, the atlas reference frame) — the same inputs `--promote` used — and never touches
 * the API.
 */
async function remeasure(args) {
  const record = await readPromotedRecord();
  const animalIds = Object.keys(record).sort();
  const scopedAnimals = args.animals
    ? args.animals.filter((id) => {
        if (record[id]) return true;
        console.warn(`No promoted clips for "${id}" — skipping.`);
        return false;
      })
    : animalIds;
  if (scopedAnimals.length === 0) {
    console.error('Nothing to remeasure — check --animal against promoted-clips.json.');
    process.exit(1);
  }

  const total = scopedAnimals.reduce((n, id) => {
    const emotions = Object.keys(record[id]);
    const scoped = args.emotions ? emotions.filter((e) => args.emotions.includes(e)) : emotions;
    return n + scoped.length;
  }, 0);
  if (total === 0) {
    console.error('Nothing to remeasure — check --emotion against the promoted record.');
    process.exit(1);
  }

  const manifest = await readManifest();
  console.log(`Remeasuring ${total} clip(s) against shipped PNGs (no API calls).\n`);

  for (const animalId of scopedAnimals.sort()) {
    const animal = manifest.animals[animalId];
    // Only body clips need the atlas frame back: their scale is "match this height". A face
    // clip is measured entirely from its own sheet, which is why re-framing the whole cast
    // costs nothing and can never be broken by an atlas repack.
    let referenceBuffer = null;
    if (MODE.kind !== 'face') {
      if (!animal?.reference) {
        throw new Error(
          `No manifest reference for "${animalId}" — cannot extract the atlas frame to measure against.`,
        );
      }
      ({ buffer: referenceBuffer } = await extractReferenceFrame(animalId, animal.reference));
    }
    const emotions = Object.keys(record[animalId]).sort();
    const scopedEmotions = args.emotions
      ? emotions.filter((emotion) => args.emotions.includes(emotion))
      : emotions;

    for (const emotion of scopedEmotions) {
      const sheet = record[animalId][emotion];
      const pngPath = join(MODE.publicDir, sheet.file);
      if (!(await exists(pngPath))) {
        throw new Error(`Missing shipped clip ${pngPath}`);
      }
      const sheetBuffer = await readFile(pngPath);
      const { width } = await sharp(sheetBuffer).metadata();
      if (!width) throw new Error(`${pngPath} has no width`);
      const grid = {
        cols: sheet.cols ?? width / sheet.frameWidth,
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
        frameCount: sheet.frameCount,
      };
      let summary;
      if (MODE.kind === 'face') {
        // Arithmetic on the recorded rect, not a measurement — so `--faces --remeasure` needs
        // neither the atlases nor the pixels, and can never drift because a body clip was
        // re-promoted underneath it. A portrait promoted before `headRect` existed has no rect
        // to derive from, so its `fit` is left as recorded.
        if (sheet.headRect) sheet.fit = fitForRect(sheet.headRect, sheet.frameWidth);
        sheet.cols = grid.cols;
        summary = sheet.headRect
          ? `head fills ${(sheet.fit.width * 100).toFixed(0)}%×${(sheet.fit.height * 100).toFixed(0)}% of the cell`
          : 'fit left as recorded (no headRect — promoted before crops)';
      } else {
        const norm = await measureNormalization(sheetBuffer, referenceBuffer, grid);
        sheet.scale = norm.scale;
        sheet.originX = norm.originX;
        sheet.originY = norm.originY;
        summary = `scale ×${norm.scale}, origin ${norm.originX}/${norm.originY}`;
      }
      const quality = await measureClipQuality(sheetBuffer, grid, MODE.thresholds);
      sheet.quality = quality;
      console.log(`- ${animalId}/${emotion}  (${summary})`);
      console.log(
        `    loop seam ${quality.loopPop}%  height swing ${quality.heightSwing}%  drift ±${quality.driftX}px`,
      );
      quality.warnings.forEach((warning) => console.log(`    ⚠ ${warning}`));
    }
  }

  const sorted = sortRecord(record);
  await writeFile(MODE.record, `${JSON.stringify(sorted, null, 2)}\n`);
  await writeGeneratedModule(sorted);
  console.log(`\nRewrote ${MODE.record} and ${MODE.generatedTs} with ${total} clip(s).`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  MODE = args.faces ? FACE_MODE : BODY_MODE;
  if (args.remeasure) await remeasure(args);
  else if (args.reindex) await reindex();
  else if (args.promote) await promote();
  else if (MODE.kind === 'face') await cropFaces(args);
  else await generate(args);
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exitCode = 1;
});
