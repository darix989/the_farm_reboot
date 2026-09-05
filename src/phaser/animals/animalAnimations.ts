/**
 * Builds Phaser animations from `ANIMAL_DESCRIPTORS` and resolves per-animal setup data.
 *
 * Ported from `the_farm/src/phaser/utils/animationBuilders.ts` (`createAnimalsAnims`,
 * `getAnimInfoByName`). The source builds animations inside `Trial.create()`, which
 * re-registers every (global) key each time the scene re-enters — its own doc flags this
 * as a bug (§9.3). Here `ensureAnimalAnimations` is called from each scene that just
 * loaded its animal pack (`Farm` / `Trial` / `AnimalGallery` `create()`), and is
 * idempotent besides, so a second call anywhere is always harmless.
 */
import {
  ANIMAL_DESCRIPTORS,
  ANIMAL_SPRITE_IDS,
  FRAME_INDEX_SEPARATOR,
  FRAME_SUFFIX,
  type AnimalDescriptor,
} from './animalDescriptors';
import type { AnimalSpriteId } from '../../data/characters';

/**
 * Phaser animation key, namespaced per animal. The source used the art-export frame stem
 * directly as a global key, unique only by accident (two animals could collide). Namespacing
 * makes collisions structurally impossible and turns key lookup into a pure string build
 * instead of a `.find()` over `baseAnimations`.
 */
export function animalAnimKey(animalId: AnimalSpriteId, name: string): string {
  return `${animalId}/${name}`;
}

export interface AnimalSetup {
  descriptor: AnimalDescriptor;
  /** Texture key: `variantOf ?? id`. */
  textureKey: AnimalSpriteId;
  /** Phaser key of the resting pose (see `REST_POSE`). */
  restAnimKey: string;
  /** Atlas frame name shown before any animation plays. */
  restFrameName: string;
}

/** Resting pose per animal — the source encoded this as each getter's default argument. */
const REST_POSE: Record<AnimalSpriteId, string> = {
  'donkey-grey': 'idle',
  owl: 'idle_awake',
  raccoon: 'idle',
  fox: 'idle',
  'white-sheep-1': 'idle',
  'brown-wolf': 'idle',
  cow: 'idle',
  'cow-female-001': 'idle',
  dog: 'idle',
  mouse: 'idle',
  pig: 'idle',
};

function buildAnimalSetup(id: AnimalSpriteId): AnimalSetup {
  const descriptor = ANIMAL_DESCRIPTORS[id];
  const textureKey = descriptor.variantOf ?? descriptor.id;
  const restName = REST_POSE[id];
  const restAnim = descriptor.baseAnimations.find((a) => a.name === restName);

  return {
    descriptor,
    textureKey,
    restAnimKey: restAnim ? animalAnimKey(id, restAnim.name) : '',
    restFrameName: restAnim
      ? `${restAnim.framePrefix ?? `${restAnim.frameStem}${FRAME_INDEX_SEPARATOR}`}${restAnim.startFrameIndex ?? 0}${FRAME_SUFFIX}`
      : '',
  };
}

export const ANIMAL_SETUP: Readonly<Record<AnimalSpriteId, AnimalSetup>> = Object.fromEntries(
  ANIMAL_SPRITE_IDS.map((id) => [id, buildAnimalSetup(id)]),
) as Record<AnimalSpriteId, AnimalSetup>;

export function animalSetup(id: AnimalSpriteId): AnimalSetup {
  return ANIMAL_SETUP[id];
}

/**
 * Creates one Phaser animation per `baseAnimations` entry, for each id whose atlas is
 * loaded. Pass only the pack this scene asked for — calling it with every descriptor
 * would warn about animals that were deliberately not fetched. Idempotent — safe to
 * call more than once, which matters because React StrictMode tears the Phaser game
 * down and rebuilds it in dev (mirrors `ensureFarmTextures`).
 */
export function ensureAnimalAnimations(scene: Phaser.Scene, ids: readonly AnimalSpriteId[]): void {
  ids.forEach((id) => {
    const descriptor = ANIMAL_DESCRIPTORS[id];
    if (descriptor.variantOf) return; // variants share the base animal's keys

    if (!scene.textures.exists(id)) {
      console.warn(`[animals] atlas "${id}" not loaded — skipping its animations`);
      return;
    }

    descriptor.baseAnimations.forEach((anim) => {
      const key = animalAnimKey(id, anim.name);
      if (scene.anims.exists(key)) return;

      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNames(id, {
          start: anim.startFrameIndex ?? 0,
          end: anim.endFrameIndex, // inclusive
          prefix: anim.framePrefix ?? `${anim.frameStem}${FRAME_INDEX_SEPARATOR}`,
          suffix: FRAME_SUFFIX,
        }),
        frameRate: anim.frameRate ?? 12,
        // `repeat` deliberately NOT set here: looping is a property of the sequence entry
        // (`{ key: 'idle', repeat: -1 }`), so the same clip can loop in one context and
        // play once in another.
      });
    });
  });
}
