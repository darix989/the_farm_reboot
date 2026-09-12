/**
 * Whether switching to `sceneKey` needs to fetch anything before it can run — the one
 * predicate `GameManager.switchScene` (and `beginSideSceneTravel`, for a warm/cold hop
 * between two `FarmSide` levels) gates `beginSceneLoad()` on.
 *
 * `animalPackForScene` returns `null` for a scene that loads no animal art, which used to
 * be the whole check. That left `FarmSide` with no loading gate at all: several megabytes
 * of kit art would fetch in the background while the outgoing scene's overlay stayed on
 * screen, and `current-scene-ready` could fire against a scene that had not finished
 * loading its own art. `sideSceneNeedsLoad` closes that gap — and is exported on its own
 * so a scene-to-scene hop can ask the identical question against an explicit target
 * descriptor, never through the store, so the menu path and the in-scene travel path can
 * never disagree about whether a loading overlay is needed.
 */
import type { Scene } from 'phaser';
import {
  animalAssetsMissing,
  animalPackForScene,
  sideSceneAnimalIds,
} from '../phaser/animals/animalPacks';
import { sideSceneAssetsMissing } from '../phaser/sideScene/sideSceneAssets';
import { SIDE_SCENES } from '../data/sideScenes';
import type { SideSceneDescriptor, SideSceneId } from '../types/sideScene';
import type { DebateScenarioKey } from '../data/levels';

/** Kit art or animal pack missing for `descriptor`, whichever a `FarmSide` visit needs. */
export function sideSceneNeedsLoad(
  textures: Scene['textures'],
  descriptor: SideSceneDescriptor,
): boolean {
  if (animalAssetsMissing(textures, sideSceneAnimalIds(descriptor), { emotions: false })) {
    return true;
  }
  return sideSceneAssetsMissing(textures, descriptor);
}

export function sceneAssetsMissing(
  sceneKey: string,
  textures: Scene['textures'],
  activeDebateId: DebateScenarioKey,
  activeSideSceneId: SideSceneId,
): boolean {
  if (sceneKey === 'FarmSide') {
    return sideSceneNeedsLoad(textures, SIDE_SCENES[activeSideSceneId]);
  }

  const pack = animalPackForScene(sceneKey, activeDebateId, activeSideSceneId);
  if (pack && animalAssetsMissing(textures, pack.ids, { emotions: pack.emotions })) return true;

  return false;
}
