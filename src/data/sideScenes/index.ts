import type { SideSceneDescriptor } from '../../types/sideScene';
import { GREEN_MEADOWS_ROAD } from './greenMeadowsRoad';

export { STANDARD_FARM_LAYERS } from './greenMeadowsRoad';

export type SideSceneId = 'greenMeadowsRoad';

/**
 * The scene `FarmSide` boots into. Named here rather than inside the scene so
 * `animalPacks.ts` can work out which characters to fetch without importing a Phaser scene.
 */
export const FARM_SIDE_SCENE_ID: SideSceneId = 'greenMeadowsRoad';

/** Same shape as `DEBATES` in `src/data/levels.ts`. */
export const SIDE_SCENES: Record<SideSceneId, SideSceneDescriptor> = {
  greenMeadowsRoad: GREEN_MEADOWS_ROAD,
};
