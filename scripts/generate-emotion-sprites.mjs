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
import { extractReferenceFrame, toDataUri } from './ludo/referenceFrame.mjs';
import { measureNormalization } from './ludo/normalize.mjs';
import { measureClipQuality } from './ludo/qualityCheck.mjs';

const MANIFEST_PATH = 'scripts/ludo/emotion-manifest.json';
const REVIEW_DIR = '.ludo-review';
const PUBLIC_DIR = 'public/assets/characters/emotions';
const GENERATED_TS = 'src/phaser/animals/emotionSheets.generated.ts';
/**
 * Durable record of every clip ever promoted, committed alongside the PNGs.
 *
 * `--promote` used to rebuild `GENERATED_TS` from whatever happened to be sitting in the
 * review directory, which made it silently destructive: promoting the owl after the review
 * dir had been cleared dropped every donkey entry from the module, leaving five orphaned PNGs
 * in `public/` that the game no longer knew about. The metadata cannot be recovered from a
 * promoted PNG alone — grid shape and frame rate are not derivable from the image — so it has
 * to be written down. Promotion now merges into this file and generates the module from the
 * merged whole.
 */
const PROMOTED_RECORD = 'scripts/ludo/promoted-clips.json';

/** Keep in sync with `ANIMAL_EMOTIONS` in `src/phaser/animals/animalEmotions.ts`. */
const TAXONOMY_PATH = 'src/phaser/animals/animalEmotions.ts';

// ---------------------------------------------------------------------------
// args
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { animals: null, emotions: null, dryRun: false, promote: false, force: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--promote') args.promote = true;
    else if (arg === '--force') args.force = true;
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

  const unknown = Object.keys(manifest.emotions).filter((e) => !taxonomy.includes(e));
  if (unknown.length > 0) {
    throw new Error(
      `${MANIFEST_PATH} defines emotion(s) the game does not know: ${unknown.join(', ')}. ` +
        `Add them to ANIMAL_EMOTIONS in ${TAXONOMY_PATH} first.`,
    );
  }
  return manifest;
}

/** Expands the manifest into one job description per (animal, emotion) pair to generate. */
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
  const fingerprint = createHash('sha1')
    .update(JSON.stringify([job.prompt, job.reference, job.settings]))
    .digest('hex')
    .slice(0, 8);
  const suffix = force ? `-${Date.now().toString(36)}` : '';
  return `farm-emotion-${job.animalId}-${job.emotion}-${fingerprint}${suffix}`;
}

/** Maps manifest settings onto the `AnimateSpritePayload` field names. */
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

const clipDir = (animalId, emotion) => join(REVIEW_DIR, animalId, emotion);

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

  console.log(`${jobs.length} clip(s) to generate.\n`);

  for (const job of jobs) {
    const label = `${job.animalId}/${job.emotion}`;
    const dir = clipDir(job.animalId, job.emotion);

    if (!args.force && (await exists(join(dir, 'meta.json')))) {
      console.log(`- ${label}: already in ${REVIEW_DIR} — skipping (use --force to redo)`);
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
    const quality = await measureClipQuality(sheet, grid);

    const meta = {
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
  console.log(`\nReview them: open ${join(REVIEW_DIR, 'index.html')}`);
  console.log('Delete any clip directory that missed, then: npm run sprites:emotions -- --promote');
}

// ---------------------------------------------------------------------------
// contact sheet
// ---------------------------------------------------------------------------

/** Every clip currently sitting in the review directory, in manifest-independent order. */
async function reviewedClips() {
  if (!(await exists(REVIEW_DIR))) return [];
  const clips = [];
  for (const animalId of await readdir(REVIEW_DIR, { withFileTypes: true })) {
    if (!animalId.isDirectory()) continue;
    for (const emotion of await readdir(join(REVIEW_DIR, animalId.name), {
      withFileTypes: true,
    })) {
      if (!emotion.isDirectory()) continue;
      const metaPath = join(REVIEW_DIR, animalId.name, emotion.name, 'meta.json');
      if (!(await exists(metaPath))) continue; // a --dry-run stub, not a generated clip
      clips.push(JSON.parse(await readFile(metaPath, 'utf8')));
    }
  }
  return clips;
}

/**
 * Writes a static review page. The point is judging the clip *as it will appear in game*, so
 * each one plays through a CSS `steps()` animation at the same frame rate Phaser will use
 * and scaled to roughly its Trial height — a GIF at native resolution flatters art that
 * falls apart at 300px.
 */
async function writeContactSheet() {
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
<p>Delete any clip's directory under <code>${REVIEW_DIR}/</code> to reject it, then run
   <code>npm run sprites:emotions -- --promote</code>.</p>
<div class="grid">${cards}</div>
`;
  await writeFile(join(REVIEW_DIR, 'index.html'), html);
}

// ---------------------------------------------------------------------------
// promote
// ---------------------------------------------------------------------------

/** The committed record, or an empty one on a first run. */
async function readPromotedRecord() {
  if (!(await exists(PROMOTED_RECORD))) return {};
  return JSON.parse(await readFile(PROMOTED_RECORD, 'utf8'));
}

async function promote() {
  const clips = await reviewedClips();
  if (clips.length === 0) {
    console.error(`Nothing to promote — ${REVIEW_DIR} holds no generated clips.`);
    process.exit(1);
  }

  await mkdir(PUBLIC_DIR, { recursive: true });

  // Merge, never replace: clips promoted in earlier runs stay promoted even though their
  // review directories are long gone.
  const byAnimal = await readPromotedRecord();
  for (const clip of clips.sort((a, b) =>
    `${a.animalId}${a.emotion}`.localeCompare(`${b.animalId}${b.emotion}`),
  )) {
    const dir = clipDir(clip.animalId, clip.emotion);
    const file = `${clip.animalId}-${clip.emotion}.png`;

    // Measured here rather than at generation time so a clip generated before this existed
    // still promotes correctly, and so re-measuring never needs another API call.
    const norm = await measureNormalization(
      await readFile(join(dir, 'spritesheet.png')),
      await readFile(join(dir, 'reference.png')),
      clip,
    );

    await copyFile(join(dir, 'spritesheet.png'), join(PUBLIC_DIR, file));
    (byAnimal[clip.animalId] ??= {})[clip.emotion] = {
      file,
      frameWidth: clip.frameWidth,
      frameHeight: clip.frameHeight,
      frameCount: clip.frameCount,
      frameRate: clip.settings.frameRate,
      scale: norm.scale,
      originX: norm.originX,
      originY: norm.originY,
      // Provenance, recorded here and not in the generated module (the runtime has no use for
      // it). The manifest is edited between rounds — generic prompts get rewritten, animals
      // gain overrides — so it stops describing what shipped the moment it changes. Without
      // this, there is no way to know what a promoted clip was actually asked to be.
      prompt: clip.prompt,
      quality: clip.quality,
      generatedAt: clip.generatedAt,
    };
    console.log(
      `- ${clip.animalId}/${clip.emotion} → ${join(PUBLIC_DIR, file)}` +
        `  (scale ×${norm.scale}, origin ${norm.originX}/${norm.originY})`,
    );
  }

  await writeFile(PROMOTED_RECORD, `${JSON.stringify(sortRecord(byAnimal), null, 2)}\n`);
  await writeGeneratedModule(sortRecord(byAnimal));

  const total = Object.values(byAnimal).reduce((n, e) => n + Object.keys(e).length, 0);
  console.log(
    `\nRewrote ${GENERATED_TS} with all ${total} promoted clip(s) across ${Object.keys(byAnimal).length} animal(s).`,
  );
  console.log(`Run \`npx tsc --noEmit\` and reload the game.`);
}

/** Emits Prettier-shaped source, so a promote never leaves the tree needing a format pass. */
/**
 * Quote an object key only when it is not a bare identifier — `'donkey-grey'` needs quotes,
 * `owl` does not. Matching Prettier here means a promote never leaves the tree needing a
 * format pass, which matters because the pre-commit hook would otherwise rewrite a generated
 * file straight after the script wrote it.
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

function serializeSheet(sheet) {
  const rate = sheet.frameRate == null ? '' : `\n      frameRate: ${sheet.frameRate},`;
  return `{
      file: '${sheet.file}',
      frameWidth: ${sheet.frameWidth},
      frameHeight: ${sheet.frameHeight},
      frameCount: ${sheet.frameCount},${rate}
      scale: ${sheet.scale},
      originX: ${sheet.originX},
      originY: ${sheet.originY},
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
  await writeFile(GENERATED_TS, source);
}

// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.promote) await promote();
  else await generate(args);
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  if (error.body) console.error(JSON.stringify(error.body, null, 2));
  process.exitCode = 1;
});
