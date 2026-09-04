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
 *   --force                      Regenerate a clip that already exists in the review dir.
 *
 * The key comes from `LUDO_API_KEY` in the environment, never a flag and never a file in the
 * repo — a key in argv leaks into shell history and `ps`.
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
import sharp from 'sharp';
import { validateApiKey, submitGeneration, awaitJob, downloadAsset } from './ludo/ludoClient.mjs';
import { extractReferenceFrame, toDataUri } from './ludo/referenceFrame.mjs';
import { measureNormalization } from './ludo/normalize.mjs';

const MANIFEST_PATH = 'scripts/ludo/emotion-manifest.json';
const REVIEW_DIR = '.ludo-review';
const PUBLIC_DIR = 'public/assets/characters/emotions';
const GENERATED_TS = 'src/phaser/animals/emotionSheets.generated.ts';

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

/** Maps manifest settings onto the `AnimateSpritePayload` field names. */
function buildPayload(job, referenceDataUri) {
  return {
    initial_image: referenceDataUri,
    motion_prompt: job.prompt,
    image_type: job.settings.imageType,
    model: job.settings.model,
    frames: job.settings.frames,
    frame_size: job.settings.frameSize,
    duration: job.settings.duration,
    loop: job.settings.loop,
    margin_ratio_mode: job.settings.marginRatioMode,
    // Off deliberately: `crop` gives per-frame sizes, and a uniform grid is the entire
    // reason `load.spritesheet` can read these without an atlas.
    crop: false,
    gif: true, // the contact sheet plays this; costs nothing extra
    // Tags the generation so it can be found again via `listGenerations` after the run.
    request_id: `farm-emotion-${job.animalId}-${job.emotion}`,
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
    const payload = buildPayload(job, toDataUri(reference.buffer));

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
      frameWidth: Math.round(width / result.num_cols),
      frameHeight: Math.round(height / result.num_rows),
    };
    await writeFile(join(dir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);

    console.log(
      ` done (${meta.frameCount} frames, ${meta.cols}x${meta.rows} grid of ${meta.frameWidth}x${meta.frameHeight})`,
    );
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

async function promote() {
  const clips = await reviewedClips();
  if (clips.length === 0) {
    console.error(`Nothing to promote — ${REVIEW_DIR} holds no generated clips.`);
    process.exit(1);
  }

  await mkdir(PUBLIC_DIR, { recursive: true });

  const byAnimal = {};
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
    };
    console.log(
      `- ${clip.animalId}/${clip.emotion} → ${join(PUBLIC_DIR, file)}` +
        `  (scale ×${norm.scale}, origin ${norm.originX}/${norm.originY})`,
    );
  }

  await writeGeneratedModule(byAnimal);
  console.log(`\nRewrote ${GENERATED_TS}. Run \`npx tsc --noEmit\` and reload the game.`);
}

/** Emits Prettier-shaped source, so a promote never leaves the tree needing a format pass. */
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
      return `  '${animalId}': {\n${inner}\n  },`;
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
