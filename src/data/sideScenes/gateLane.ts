/**
 * Beyond the picket gate on `greenMeadowsRoad`: a short fence run (the same gate the
 * player just walked through, from its far side), a stand of trees and bushes, and Bram.
 * Built strictly from asset ids `greenMeadowsRoad` already uses, so visiting it is always
 * a warm hop (see `docs/farm_side_scenes.md`).
 */
import type { SideSceneDescriptor } from '../../types/sideScene';
import { STANDARD_FARM_LAYERS } from './greenMeadowsRoad';

const GROUND_SEAM_Y = 796;
const GATE_X = 320;

export const GATE_LANE: SideSceneDescriptor = {
  id: 'gateLane',
  width: 2880,
  scale: 0.8543,
  firstTop: 400,
  road: { top: 837, bottom: 999 },
  layers: STANDARD_FARM_LAYERS,

  props: [
    { asset: 'trees/tree-one-mid-green', x: 800, y: GROUND_SEAM_Y, band: 'ground' },
    { asset: 'trees/tree-three-mid-green', x: 1300, y: GROUND_SEAM_Y, band: 'ground', flipX: true },
    { asset: 'trees/tree-two-mid-green', x: 2450, y: GROUND_SEAM_Y, band: 'ground' },
    { asset: 'bushes/bush-2-mid-green', x: 1050, y: GROUND_SEAM_Y, band: 'ground' },
    { asset: 'bushes/bush-1-dark-green', x: 2100, y: GROUND_SEAM_Y, band: 'ground' },
  ],

  fences: [
    {
      y: GROUND_SEAM_Y,
      fromX: 150,
      // Same "run the tiling past the edge of the world" trick as `greenMeadowsRoad`'s
      // own run — the last piece's bare-rail stub lands somewhere the camera can never
      // scroll to.
      toX: 3400,
      scale: 0.45,
      gaps: [{ x: GATE_X, gate: 'complete' }],
    },
  ],

  // Bram keeps his distance from the gate itself, the way Hetty keeps hers from the barn
  // door on the main road. He walks the fence line — `y: 855` sits just inside the top of
  // the walkable road band (`{ top: 837, bottom: 999 }`), right under the rail at
  // `GROUND_SEAM_Y = 796` — and his patrol stretch stays clear of the gate portal's own
  // interact radius so it never muddies that focus contest.
  npcs: [
    {
      characterId: 'bram',
      x: 1600,
      y: 855,
      facing: 'left',
      patrol: { fromX: 1100, toX: 2200, speed: 140, pauseMs: 1000 },
    },
  ],

  portals: [
    {
      id: 'gate',
      side: 'back',
      x: GATE_X,
      to: { scene: 'greenMeadowsRoad', portal: 'gate', label: 'farmSidePortalBackToRoad' },
    },
  ],
};
