/**
 * Loads the generated emotion spritesheets and registers one Phaser animation per clip.
 *
 * Deliberately parallel to `animalAtlases.ts` + `animalAnimations.ts` rather than folded
 * into them, because the two asset families are loaded by different Phaser calls that share
 * no code path: the ported cast ships as trimmed multiatlases (`load.multiatlas`, frame
 * names from TexturePacker), the generated emotion clips as uniform grids
 * (`load.spritesheet`, frames addressed by index). Keeping them apart means a failure in
 * the generated art — a sheet that never got promoted, a stale entry — cannot take the base
 * cast's animations down with it.
 *
 * Texture keys are namespaced `emotion/<animal>/<emotion>` so they can never collide with an
 * atlas key (a bare `AnimalSpriteId`), and animation keys reuse `animalAnimKey`'s
 * `<animal>/<name>` shape with an `emotion_` prefix on the name.
 */
import { EMOTION_SHEETS } from './emotionSheets.generated';
import { animalAnimKey } from './animalAnimations';
import {
  ANIMAL_EMOTIONS,
  EMOTION_FRAME_RATE,
  type AnimalEmotion,
  type EmotionSheet,
} from './animalEmotions';
import type { AnimalSpriteId } from '../../data/characters';

export const EMOTION_ASSET_PATH = 'assets/characters/emotions';

/** Texture key for one generated clip. */
export function emotionTextureKey(animalId: AnimalSpriteId, emotion: AnimalEmotion): string {
  return `emotion/${animalId}/${emotion}`;
}

/**
 * The clip's *logical* name, in the same namespace as a descriptor's `baseAnimations[].name`.
 * Prefixed so a generated clip can never shadow a hand-authored one, and exported because
 * `AnimalAnimator` feeds it straight into an ordinary behaviour sequence — that is what lets
 * emotions reuse the existing playback engine instead of needing a second one.
 */
export function emotionSequenceKey(emotion: AnimalEmotion): string {
  return `emotion_${emotion}`;
}

/** Phaser animation key for one generated clip. */
export function emotionAnimKey(animalId: AnimalSpriteId, emotion: AnimalEmotion): string {
  return animalAnimKey(animalId, emotionSequenceKey(emotion));
}

/** Flattens the nested generated record into `[animal, emotion, sheet]` triples. */
function eachSheet(
  visit: (animalId: AnimalSpriteId, emotion: AnimalEmotion, sheet: EmotionSheet) => void,
): void {
  (Object.keys(EMOTION_SHEETS) as AnimalSpriteId[]).forEach((animalId) => {
    const byEmotion = EMOTION_SHEETS[animalId];
    if (!byEmotion) return;
    (Object.keys(byEmotion) as AnimalEmotion[]).forEach((emotion) => {
      const sheet = byEmotion[emotion];
      if (sheet) visit(animalId, emotion, sheet);
    });
  });
}

/**
 * Walks promoted sheets, optionally restricted to a set of animal ids so a scene that
 * only asked for the farm pack does not warn about gallery-only animals.
 */
function eachSheetFor(
  ids: readonly AnimalSpriteId[],
  visit: (animalId: AnimalSpriteId, emotion: AnimalEmotion, sheet: EmotionSheet) => void,
): void {
  const wanted = new Set(ids);
  eachSheet((animalId, emotion, sheet) => {
    if (!wanted.has(animalId)) return;
    visit(animalId, emotion, sheet);
  });
}

/**
 * Queues promoted emotion sheets for `ids`. A no-op until the first `--promote` run
 * writes entries into `emotionSheets.generated.ts`, and a no-op per clip whose texture
 * is already in the cache.
 *
 * The loader path is set and restored around the queueing rather than inherited from
 * whatever the scene last called `setPath` with. `loadAnimalAtlases` gets this for
 * free by passing `path` to `load.multiatlas`; `load.spritesheet` has no such argument (its
 * `SpriteSheetFileConfig` accepts no `path`), so it has to be done by hand — and it is worth
 * doing, because Phaser captures the current path at queue time and a call that leans on an
 * earlier `setPath` silently 404s the day someone reorders `preload`. `sheet.file` is
 * therefore a bare filename, not a path.
 *
 * Returns whether anything was added to the loader.
 */
export function loadAnimalEmotionSheets(
  scene: Phaser.Scene,
  ids: readonly AnimalSpriteId[],
): boolean {
  const previousPath = scene.load.path;
  scene.load.setPath(EMOTION_ASSET_PATH);

  let queued = false;
  eachSheetFor(ids, (animalId, emotion, sheet) => {
    const key = emotionTextureKey(animalId, emotion);
    if (scene.textures.exists(key)) return; // React StrictMode / scene restart / already lazy-loaded
    scene.load.spritesheet(key, sheet.file, {
      frameWidth: sheet.frameWidth,
      frameHeight: sheet.frameHeight,
    });
    queued = true;
  });

  scene.load.setPath(previousPath);
  return queued;
}

/**
 * Creates one animation per loaded emotion sheet in `ids`. Idempotent, and skips any clip
 * whose texture is missing — a promoted entry whose PNG was deleted warns once and leaves
 * the animal on its base behaviour instead of throwing during scene create. Only the
 * requested ids are considered, so a Farm pack does not warn about gallery-only animals.
 */
export function ensureAnimalEmotionAnimations(
  scene: Phaser.Scene,
  ids: readonly AnimalSpriteId[],
): void {
  eachSheetFor(ids, (animalId, emotion, sheet) => {
    const textureKey = emotionTextureKey(animalId, emotion);
    const animKey = emotionAnimKey(animalId, emotion);
    if (scene.anims.exists(animKey)) return;

    if (!scene.textures.exists(textureKey)) {
      console.warn(`[animals] emotion sheet "${textureKey}" not loaded — skipping its animation`);
      return;
    }

    scene.anims.create({
      key: animKey,
      // `end` is inclusive, and `frameCount` counts frames rather than indices — the grid's
      // trailing cells are blank whenever cols*rows overshoots the generated frame count,
      // and playing them would flash an empty frame mid-loop.
      frames: scene.anims.generateFrameNumbers(textureKey, { start: 0, end: sheet.frameCount - 1 }),
      frameRate: sheet.frameRate ?? EMOTION_FRAME_RATE,
      // `repeat` is set per playback, matching the base animations' convention.
    });
  });
}

/**
 * The generated clip for this pairing, or null when there is none — the animator's fallback
 * test, and its source for the clip's `scale` / `origin` normalization.
 */
export function emotionSheet(
  animalId: AnimalSpriteId,
  emotion: AnimalEmotion,
): EmotionSheet | null {
  return EMOTION_SHEETS[animalId]?.[emotion] ?? null;
}

/** Every emotion this animal has generated art for, in `ANIMAL_EMOTIONS` order. */
export function generatedEmotions(animalId: AnimalSpriteId): AnimalEmotion[] {
  const byEmotion = EMOTION_SHEETS[animalId];
  if (!byEmotion) return [];
  return ANIMAL_EMOTIONS.filter((emotion) => byEmotion[emotion]);
}

/**
 * The scale and origin a sprite was staged with, so an emotion clip's override can be undone.
 *
 * Capture it once, before anything plays: the two scenes stage sprites differently (`Trial`
 * scales by cast size, `AnimalGallery` fits the preview box) and neither wants the other's
 * numbers baked in.
 */
export interface SpriteStaging {
  scaleX: number;
  scaleY: number;
  originX: number;
  originY: number;
}

export function captureStaging(sprite: Phaser.GameObjects.Sprite): SpriteStaging {
  return {
    scaleX: sprite.scaleX,
    scaleY: sprite.scaleY,
    originX: sprite.originX,
    originY: sprite.originY,
  };
}

/**
 * Applies a generated clip's normalization — see `EmotionSheet.scale` for why it exists at
 * all. Shared by `AnimalAnimator` and the gallery scene so the two cannot disagree about how
 * a clip is placed; a gallery that staged clips differently from the game would be worse than
 * useless, since its whole job is to show you what the game will do.
 *
 * Must run after the emotion texture is on the sprite. Scale is a multiplier on the current
 * frame's canvas; applying it while an atlas frame is still showing (or restoring atlas
 * scale onto a generated cell) is a ~2× size flash. `AnimalAnimator` hooks `ANIMATION_START`
 * for that reason.
 */
export function applyEmotionStaging(
  sprite: Phaser.GameObjects.Sprite,
  sheet: EmotionSheet,
  base: SpriteStaging,
): void {
  sprite.setScale(base.scaleX * sheet.scale, base.scaleY * sheet.scale);
  sprite.setOrigin(sheet.originX, sheet.originY);
}

/** Undoes `applyEmotionStaging`. A no-op when no override is in effect. */
export function restoreStaging(sprite: Phaser.GameObjects.Sprite, base: SpriteStaging): void {
  sprite.setScale(base.scaleX, base.scaleY);
  sprite.setOrigin(base.originX, base.originY);
}
