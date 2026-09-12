import type { SideSceneDescriptor } from '../../types/sideScene';
import { GREEN_MEADOWS_ROAD } from './greenMeadowsRoad';

export { STANDARD_FARM_LAYERS } from './greenMeadowsRoad';

export type SideSceneId = 'greenMeadowsRoad';

/** Same shape as `DEBATES` in `src/data/levels.ts`. */
export const SIDE_SCENES: Record<SideSceneId, SideSceneDescriptor> = {
  greenMeadowsRoad: GREEN_MEADOWS_ROAD,
};
