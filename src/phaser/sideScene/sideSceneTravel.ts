/**
 * Carries a `FarmSide` -> `FarmSide` hop across the restart: validates the target,
 * decides whether a loading overlay is owed, and restarts the one scene instance onto
 * the new descriptor.
 *
 * Deliberately not routed through `GameManager.switchScene` — its `isActive(sceneKey)`
 * guard (`gameManager.ts:68`) is what stops a double-click re-entering a scene that is
 * already live, and `FarmSide` restarting onto itself is exactly that case. Relaxing the
 * guard there to allow this would weaken every other caller.
 */
import type { Scene } from 'phaser';
import { SIDE_SCENES } from '../../data/sideScenes';
import type { SidePortalLink } from '../../types/sideScene';
import { useGameStore } from '../../store/gameStore';
import { sideSceneNeedsLoad } from '../../utils/sceneAssets';

/**
 * Begins a hop through `link`. Returns whether the hop actually started — `false` means
 * the scene is no longer live, a load is already in flight, or `link` names a scene/portal
 * that doesn't exist, and the caller (`FarmSide.startTravel`) has to fade back in rather
 * than stranding the player on black.
 */
export function beginSideSceneTravel(scene: Scene, link: SidePortalLink): boolean {
  const store = useGameStore.getState();
  if (!scene.scene.isActive() || store.isSceneLoading) return false;

  const target = SIDE_SCENES[link.scene];
  if (!target) return false;
  const targetPortal = target.portals.find((portal) => portal.id === link.portal);
  if (!targetPortal) return false;

  // Computed against `target` explicitly, never by reading `activeSideSceneId` back out of
  // the store — the store isn't updated to `link.scene` until the very next line, and the
  // in-scene travel path must ask this exact question the same way the menu path
  // (`sceneAssetsMissing`) does, or the two could disagree about whether a hop is warm.
  const needsLoad = sideSceneNeedsLoad(scene.textures, target);

  store.setActiveSideScene(link.scene);
  if (needsLoad) store.beginSceneLoad();

  scene.scene.start('FarmSide', { sceneId: link.scene, entryPortalId: link.portal });
  return true;
}
