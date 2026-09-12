/**
 * Off the east end of `greenMeadowsRoad`: citrus trees, bushes, a windmill, and Duchess
 * and Tobias, spaced well clear of each other so the 400px talk radius always picks one
 * of them unambiguously. Built strictly from asset ids `greenMeadowsRoad` already uses,
 * so visiting it is always a warm hop (see `docs/farm_side_scenes.md`).
 */
import type { SideSceneDescriptor } from '../../types/sideScene';
import { STANDARD_FARM_LAYERS } from './greenMeadowsRoad';

const GROUND_SEAM_Y = 796;

export const EAST_ORCHARD: SideSceneDescriptor = {
  id: 'eastOrchard',
  width: 2880,
  scale: 0.8543,
  firstTop: 400,
  road: { top: 837, bottom: 999 },
  layers: STANDARD_FARM_LAYERS,

  props: [
    { asset: 'citrus/orange-tree-oranges', x: 550, y: GROUND_SEAM_Y, band: 'ground' },
    { asset: 'citrus/lemon-tree-lemons', x: 1000, y: GROUND_SEAM_Y, band: 'ground', flipX: true },
    { asset: 'citrus/orange-tree-oranges', x: 1900, y: GROUND_SEAM_Y, band: 'ground', flipX: true },
    { asset: 'citrus/lemon-tree-lemons', x: 2500, y: GROUND_SEAM_Y, band: 'ground' },
    { asset: 'bushes/bush-2-mid-green', x: 1450, y: GROUND_SEAM_Y, band: 'ground' },
    { asset: 'bushes/bush-1-dark-green', x: 2250, y: GROUND_SEAM_Y, band: 'ground' },
    { asset: 'props/windmill', x: 2750, y: GROUND_SEAM_Y, band: 'ground' },
  ],

  fences: [],

  // 1200px apart — comfortably clear of the 400px talk radius either one offers, so
  // `resolveFocus` never has to break a tie between them.
  npcs: [
    { characterId: 'duchess', x: 900, y: 952, facing: 'right' },
    { characterId: 'tobias', x: 2100, y: 952, facing: 'left' },
  ],

  portals: [
    {
      id: 'west',
      side: 'left',
      to: { scene: 'greenMeadowsRoad', portal: 'east', label: 'farmSidePortalBackToRoad' },
    },
  ],
};
