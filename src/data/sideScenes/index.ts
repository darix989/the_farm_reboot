import type { SideSceneDescriptor, SideSceneId } from '../../types/sideScene';
import { GREEN_MEADOWS_ROAD } from './greenMeadowsRoad';
import { HETTYS_BARN } from './hettysBarn';
import { GATE_LANE } from './gateLane';
import { EAST_ORCHARD } from './eastOrchard';
import { OLD_POND } from './oldPond';

export { STANDARD_FARM_LAYERS } from './greenMeadowsRoad';

/** Re-exported for existing consumers — the union itself lives in `types/sideScene.ts`,
 *  the one module `SidePortalSpec.to` can depend on without pulling this value in too. */
export type { SideSceneId } from '../../types/sideScene';

/**
 * The scene `FarmSide` boots into absent a stored `activeSideSceneId` (a fresh boot, or
 * Reset Progress). Named here rather than inside the scene so `animalPacks.ts` can work
 * out which characters to fetch without importing a Phaser scene.
 */
export const DEFAULT_SIDE_SCENE_ID: SideSceneId = 'greenMeadowsRoad';

/** Same shape as `DEBATES` in `src/data/levels.ts`. */
export const SIDE_SCENES: Record<SideSceneId, SideSceneDescriptor> = {
  greenMeadowsRoad: GREEN_MEADOWS_ROAD,
  hettysBarn: HETTYS_BARN,
  gateLane: GATE_LANE,
  eastOrchard: EAST_ORCHARD,
  oldPond: OLD_POND,
};
