/**
 * The barn yard, one door back onto `greenMeadowsRoad`. A single-entrance pocket scene —
 * proves a scene needs no `west`/`east` edge portals at all, only whatever `to` links it
 * authors. Built strictly from asset ids `greenMeadowsRoad` already uses, so visiting it
 * is always a warm hop (see `docs/farm_side_scenes.md`).
 *
 * Bella stands here as the cow, occupying Hetty's old yard spot. Hetty moved to
 * `oldPond`. Bella has no generated emotion clips yet, so every emotion falls back to her
 * "eating" animation (see `emotionFallbacks.ts`), flagged as a placeholder in the Animation
 * Gallery — swap it out once real clips are generated for `cow`.
 */
import type { SideSceneDescriptor } from '../../types/sideScene';
import { STANDARD_FARM_LAYERS } from './greenMeadowsRoad';

const GROUND_SEAM_Y = 796;
const FLOWER_SCALE = 0.72;

export const HETTYS_BARN: SideSceneDescriptor = {
  id: 'hettysBarn',
  width: 2880,
  scale: 0.8543,
  firstTop: 400,
  road: { top: 837, bottom: 999 },
  layers: STANDARD_FARM_LAYERS,

  props: [
    { asset: 'props/track-to-barn', x: 700, y: GROUND_SEAM_Y, band: 'ground' },
    { asset: 'props/red-barn', x: 1050, y: GROUND_SEAM_Y, band: 'ground' },
    { asset: 'props/chicken-coop-wooden', x: 1500, y: GROUND_SEAM_Y, band: 'ground' },
    { asset: 'props/haypile', x: 1750, y: GROUND_SEAM_Y, band: 'ground', scale: 0.9 },

    { asset: 'flowers/flower-1-yellow', x: 480, y: 1042, band: 'front', scale: FLOWER_SCALE },
    { asset: 'flowers/flower-side-1-red', x: 700, y: 1052, band: 'front', scale: FLOWER_SCALE },
    { asset: 'flowers/flower-1-white', x: 2150, y: 1038, band: 'front', scale: FLOWER_SCALE },
    {
      asset: 'flowers/flower-side-1-blue',
      x: 2400,
      y: 1048,
      band: 'front',
      scale: FLOWER_SCALE,
      flipX: true,
    },
  ],

  fences: [],

  npcs: [{ characterId: 'bella', x: 2150, y: 952, facing: 'left' }],

  portals: [
    {
      id: 'road-door',
      side: 'back',
      x: 360,
      to: { scene: 'greenMeadowsRoad', portal: 'barn-door', label: 'farmSidePortalBackToRoad' },
    },
  ],
};
