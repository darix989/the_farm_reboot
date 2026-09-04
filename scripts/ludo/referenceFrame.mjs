/**
 * Cuts one frame out of a ported TexturePacker multiatlas and rebuilds it as a standalone
 * transparent PNG, for use as a generator reference image.
 *
 * This is the step that keeps generated emotions on-model. Ludo's own guidance is that "the
 * most reliable way to keep a set of sprites on-model is to start every animation from a
 * still image you already trust" — so every clip starts from a frame of the character's
 * *existing, shipped* idle loop rather than from a text description of it.
 *
 * The un-trimming matters. TexturePacker frames are trimmed: `frame` is the packed rect,
 * `spriteSourceSize` is where that rect sat inside the original export canvas, and
 * `sourceSize` is that canvas. Handing the generator the trimmed rect alone hands it a
 * sprite cropped hard against its own outline, and it composes the animation as if the
 * character filled the frame — legs and ears end up clipped. Pasting the rect back at its
 * original offset restores the framing the art was drawn with.
 */
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import sharp from 'sharp';

const ATLAS_DIR = 'public/assets/characters';

/** Locates a frame by filename across a multiatlas's pages. */
function findFrame(atlas, frameName) {
  for (const texture of atlas.textures) {
    const frame = texture.frames.find((f) => f.filename === frameName);
    if (frame) return { frame, image: texture.image };
  }
  return null;
}

/**
 * Returns `{ buffer, width, height }` for one atlas frame as an untrimmed PNG.
 *
 * `animalId` is both the atlas key and its JSON filename; `frameName` is the exact
 * `filename` field from the atlas (the owl's are foldered, e.g.
 * `__owl_no_tail_idle_awake/__owl_no_tail_idle_awake_0.png`).
 */
export async function extractReferenceFrame(animalId, frameName) {
  const atlasPath = join(ATLAS_DIR, `${animalId}.json`);
  const atlas = JSON.parse(await readFile(atlasPath, 'utf8'));

  const hit = findFrame(atlas, frameName);
  if (!hit) {
    const available = atlas.textures
      .flatMap((t) => t.frames.map((f) => f.filename))
      .slice(0, 5)
      .join(', ');
    throw new Error(
      `Frame "${frameName}" is not in ${atlasPath}. First few frames there: ${available}…`,
    );
  }

  const { frame, image } = hit;
  // `textures[].image` is the authority on the page filename, not the animal id — the two
  // disagree for at least one ported animal (see docs/characters-and-animations.md §2).
  const pagePath = join(dirname(atlasPath), image);
  const page = sharp(await readFile(pagePath));

  const trimmed = await page
    .extract({
      left: frame.frame.x,
      top: frame.frame.y,
      width: frame.frame.w,
      height: frame.frame.h,
    })
    .png()
    .toBuffer();

  // Untrimmed frames have no `spriteSourceSize` offset to restore, but the field is present
  // either way in these atlases; defaulting keeps this honest for a hand-written one.
  const canvasWidth = frame.sourceSize?.w ?? frame.frame.w;
  const canvasHeight = frame.sourceSize?.h ?? frame.frame.h;
  const offsetX = frame.spriteSourceSize?.x ?? 0;
  const offsetY = frame.spriteSourceSize?.y ?? 0;

  const buffer = await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: trimmed, left: offsetX, top: offsetY }])
    .png()
    .toBuffer();

  return { buffer, width: canvasWidth, height: canvasHeight };
}

/** `data:` URI form, which is what both sprite endpoints accept for `initial_image`. */
export function toDataUri(buffer) {
  return `data:image/png;base64,${buffer.toString('base64')}`;
}
