/**
 * Loads the placeholder animal multiatlases.
 *
 * Phaser captures the loader's current path at queue time (see `MultiFile` in the Phaser
 * source), which is why the source repo's docs warn that a `load.multiatlas` call added
 * after `this.load.setPath('')` silently 404s its pages. Passing `path` explicitly as the
 * third argument here sidesteps that entirely — this call is correct regardless of what
 * `setPath` was last set to.
 */
import { ANIMAL_SPRITE_IDS } from './animalDescriptors';

export const ANIMAL_ATLAS_PATH = 'assets/characters';

export function loadAnimalAtlases(scene: Phaser.Scene): void {
  ANIMAL_SPRITE_IDS.forEach((id) => {
    if (scene.textures.exists(id)) return; // React StrictMode / scene restart
    scene.load.multiatlas(id, `characters/${id}.json`, ANIMAL_ATLAS_PATH);
  });
}
