/**
 * Whether switching to `sceneKey` needs to fetch anything before it can run — the one
 * predicate `GameManager.switchScene` gates `beginSceneLoad()` on.
 *
 * `animalPackForScene` returns `null` for a scene that loads no animal art (`FarmSide`
 * included), which used to be the whole check. That left `FarmSide` with no loading
 * gate at all: several megabytes of kit art would fetch in the background while the
 * outgoing scene's overlay stayed on screen, and `current-scene-ready` could fire
 * against a scene that had not finished loading its own art. ORing in the side-scene
 * check closes that gap without touching the animal-pack path other scenes rely on.
 */
import type { Scene } from 'phaser';
import { animalAssetsMissing, animalPackForScene } from '../phaser/animals/animalPacks';
import { sideSceneAssetsMissing } from '../phaser/sideScene/sideSceneAssets';
import { SIDE_SCENES } from '../data/sideScenes';
import type { DebateScenarioKey } from '../data/levels';

export function sceneAssetsMissing(
  sceneKey: string,
  textures: Scene['textures'],
  activeDebateId: DebateScenarioKey,
): boolean {
  const pack = animalPackForScene(sceneKey, activeDebateId);
  if (pack && animalAssetsMissing(textures, pack.ids, { emotions: pack.emotions })) return true;

  if (sceneKey === 'FarmSide') {
    return sideSceneAssetsMissing(textures, SIDE_SCENES.greenMeadowsRoad);
  }

  return false;
}
