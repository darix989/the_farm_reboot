/**
 * Loads the placeholder animal multiatlases.
 *
 * Phaser captures the loader's current path at queue time (see `MultiFile` in the Phaser
 * source). Both the JSON url *and* the image pages are affected: a `load.multiatlas` call
 * whose json path is `characters/foo.json` only resolves if `setPath('assets')` ran first.
 * That used to be true of `Preloader`; scene-scoped loading is not. The JSON url is therefore
 * rooted at `ANIMAL_ATLAS_PATH`, the third argument pins the pages the same way, and
 * `setPath` is cleared around the queue so a leftover path cannot double-prefix either.
 *
 * Callers pass the ids they actually need (see `animalPacks.ts`). Already-cached textures
 * are skipped, so a scene re-entry after the first load is a no-op.
 */
import type { AnimalSpriteId } from '../../data/characters';

export const ANIMAL_ATLAS_PATH = 'assets/characters';

/** Queues missing atlases. Returns whether anything was added to the loader. */
export function loadAnimalAtlases(scene: Phaser.Scene, ids: readonly AnimalSpriteId[]): boolean {
  const previousPath = scene.load.path;
  scene.load.setPath('');

  let queued = false;
  ids.forEach((id) => {
    if (scene.textures.exists(id)) return; // React StrictMode / scene restart / already lazy-loaded
    scene.load.multiatlas(id, `${ANIMAL_ATLAS_PATH}/${id}.json`, ANIMAL_ATLAS_PATH);
    queued = true;
  });

  scene.load.setPath(previousPath);
  return queued;
}
