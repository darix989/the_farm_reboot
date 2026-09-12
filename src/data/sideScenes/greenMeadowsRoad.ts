/**
 * The first lateral scene: a ~4-screen-wide farm road with a barn/silo cluster, a
 * windmill, a tree line, crop beds, a picket-fence run with one gate, and flowers on
 * the front grass. Proves the traversal contract (walk on the road only, one entrance
 * plus a multi-exit shape) via `west`/`east`/`barn-gate` portals.
 *
 * `STANDARD_FARM_LAYERS` is exported so scene #2 does not have to retype the six-band
 * stack — every number here comes from the kit's measured asset-analysis pass (see
 * `docs/farm_side_scenes.md`), not from eyeballing a reference image.
 */
import type { SideSceneDescriptor, SideSceneLayer } from '../../types/sideScene';

export const STANDARD_FARM_LAYERS: readonly SideSceneLayer[] = [
  { asset: 'bg/far-hills', nativeHeight: 102, opaqueFromRow: 31, parallax: 0.15 },
  { asset: 'bg/midground-fields-large', nativeHeight: 204, opaqueFromRow: 48, parallax: 0.35 },
  { asset: 'bg/near-grass', nativeHeight: 227, opaqueFromRow: 22, parallax: 0.65 },
  { asset: 'bg/road', nativeHeight: 238, opaqueFromRow: 0, parallax: 1 },
  { asset: 'bg/front-grass', nativeHeight: 126, opaqueFromRow: 31, parallax: 1 },
];

/** The near-grass / road seam — where a fence or a ground prop plants its feet. */
const GROUND_SEAM_Y = 796;
const GATE_X = 3800;
/**
 * Front-grass flowers. Native art is oversized like the crops above; 0.72 is double the
 * first-pass 0.36 that made a bloom sit next to a fence post.
 */
const FLOWER_SCALE = 0.72;

export const GREEN_MEADOWS_ROAD: SideSceneDescriptor = {
  id: 'greenMeadowsRoad',
  width: 7680,
  scale: 0.8543,
  firstTop: 400,
  road: { top: 837, bottom: 999 },
  layers: STANDARD_FARM_LAYERS,

  props: [
    // Barn / silo cluster.
    { asset: 'props/silo', x: 980, y: GROUND_SEAM_Y, band: 'ground' },
    { asset: 'props/red-barn', x: 1260, y: GROUND_SEAM_Y, band: 'ground' },
    { asset: 'props/chicken-coop-wooden', x: 1620, y: GROUND_SEAM_Y, band: 'ground' },
    { asset: 'props/haypile', x: 1780, y: GROUND_SEAM_Y, band: 'ground', scale: 0.9 },
    { asset: 'props/track-to-barn', x: 1400, y: GROUND_SEAM_Y, band: 'ground' },

    // Tree line.
    { asset: 'trees/tree-one-mid-green', x: 250, y: GROUND_SEAM_Y, band: 'ground' },
    { asset: 'trees/tree-three-mid-green', x: 700, y: GROUND_SEAM_Y, band: 'ground', flipX: true },
    { asset: 'trees/tree-four-spring', x: 2050, y: GROUND_SEAM_Y, band: 'ground' },
    { asset: 'trees/tree-five-light-green', x: 4400, y: GROUND_SEAM_Y, band: 'ground' },
    { asset: 'trees/tree-two-mid-green', x: 5600, y: GROUND_SEAM_Y, band: 'ground', flipX: true },
    { asset: 'trees/tree-one-dark-green', x: 7350, y: GROUND_SEAM_Y, band: 'ground' },

    // Crop beds and scarecrow, clear of the gate. The kit exports these at a native
    // resolution that reads as full-grown-tree size next to the barn/silo, so they get
    // an explicit down-scale the structures don't need.
    { asset: 'plants/sunflowers-group', x: 2900, y: GROUND_SEAM_Y, band: 'ground', scale: 0.4 },
    { asset: 'plants/sweetcorn-group', x: 3200, y: GROUND_SEAM_Y, band: 'ground', scale: 0.4 },
    { asset: 'props/scarecrow', x: 3450, y: GROUND_SEAM_Y, band: 'ground', scale: 0.4 },
    {
      asset: 'plants/sweetcorn-group',
      x: 4550,
      y: GROUND_SEAM_Y,
      band: 'ground',
      scale: 0.4,
      flipX: true,
    },
    { asset: 'bushes/bush-2-mid-green', x: 5000, y: GROUND_SEAM_Y, band: 'ground' },
    { asset: 'bushes/bush-1-dark-green', x: 5300, y: GROUND_SEAM_Y, band: 'ground' },
    { asset: 'citrus/orange-tree-oranges', x: 6100, y: GROUND_SEAM_Y, band: 'ground' },
    { asset: 'citrus/lemon-tree-lemons', x: 6400, y: GROUND_SEAM_Y, band: 'ground', flipX: true },

    // Windmill, near the far exit.
    { asset: 'props/windmill', x: 7000, y: GROUND_SEAM_Y, band: 'ground' },

    // Flowers scattered on the front-grass occluder band. Same over-sized-native-art
    // issue as the crops above, but tuned by eye rather than by a fixed ratio — a
    // bloom should read as a foreground plant, not the barn/crop proportion this
    // scene scale works out to.
    { asset: 'flowers/flower-side-1-white', x: 380, y: 1052, band: 'front', scale: FLOWER_SCALE },
    { asset: 'flowers/flower-1-yellow', x: 620, y: 1040, band: 'front', scale: FLOWER_SCALE },
    { asset: 'flowers/flower-1-pink', x: 780, y: 1058, band: 'front', scale: FLOWER_SCALE },
    {
      asset: 'flowers/flower-side-1-yellow',
      x: 1100,
      y: 1038,
      band: 'front',
      scale: FLOWER_SCALE,
      flipX: true,
    },
    { asset: 'flowers/flower-1-orange', x: 1280, y: 1050, band: 'front', scale: FLOWER_SCALE },
    { asset: 'flowers/flower-1-red', x: 1550, y: 1055, band: 'front', scale: FLOWER_SCALE },
    { asset: 'flowers/flower-side-1-red', x: 1720, y: 1042, band: 'front', scale: FLOWER_SCALE },
    {
      asset: 'flowers/flower-1-white',
      x: 1980,
      y: 1036,
      band: 'front',
      scale: FLOWER_SCALE,
      flipX: true,
    },
    { asset: 'flowers/flower-side-1-blue', x: 2220, y: 1050, band: 'front', scale: FLOWER_SCALE },
    { asset: 'flowers/flower-1-blue', x: 2450, y: 1035, band: 'front', scale: FLOWER_SCALE },
    { asset: 'flowers/flower-1-pink', x: 2680, y: 1054, band: 'front', scale: FLOWER_SCALE },
    {
      asset: 'flowers/flower-side-1-white',
      x: 2980,
      y: 1044,
      band: 'front',
      scale: FLOWER_SCALE,
      flipX: true,
    },
    { asset: 'flowers/flower-1-yellow', x: 3280, y: 1058, band: 'front', scale: FLOWER_SCALE },
    { asset: 'flowers/flower-side-1-orange', x: 3700, y: 1050, band: 'front', scale: FLOWER_SCALE },
    { asset: 'flowers/flower-1-red', x: 3920, y: 1038, band: 'front', scale: FLOWER_SCALE },
    {
      asset: 'flowers/flower-1-orange',
      x: 4180,
      y: 1056,
      band: 'front',
      scale: FLOWER_SCALE,
      flipX: true,
    },
    { asset: 'flowers/flower-side-1-yellow', x: 4480, y: 1042, band: 'front', scale: FLOWER_SCALE },
    { asset: 'flowers/flower-1-blue', x: 4720, y: 1034, band: 'front', scale: FLOWER_SCALE },
    { asset: 'flowers/flower-1-white', x: 4900, y: 1040, band: 'front', scale: FLOWER_SCALE },
    { asset: 'flowers/flower-side-1-red', x: 5160, y: 1052, band: 'front', scale: FLOWER_SCALE },
    {
      asset: 'flowers/flower-1-pink',
      x: 5420,
      y: 1036,
      band: 'front',
      scale: FLOWER_SCALE,
      flipX: true,
    },
    { asset: 'flowers/flower-1-orange', x: 5680, y: 1050, band: 'front', scale: FLOWER_SCALE },
    { asset: 'flowers/flower-side-1-purple', x: 5950, y: 1055, band: 'front', scale: FLOWER_SCALE },
    { asset: 'flowers/flower-1-red', x: 6220, y: 1040, band: 'front', scale: FLOWER_SCALE },
    {
      asset: 'flowers/flower-side-1-blue',
      x: 6480,
      y: 1048,
      band: 'front',
      scale: FLOWER_SCALE,
      flipX: true,
    },
    { asset: 'flowers/flower-1-yellow', x: 6780, y: 1038, band: 'front', scale: FLOWER_SCALE },
    { asset: 'flowers/flower-1-pink', x: 7100, y: 1035, band: 'front', scale: FLOWER_SCALE },
    { asset: 'flowers/flower-side-1-white', x: 7380, y: 1054, band: 'front', scale: FLOWER_SCALE },
  ],

  fences: [
    {
      y: GROUND_SEAM_Y,
      fromX: 150,
      // Deliberately well past the scene's own 7680 world width (the camera can never
      // scroll far enough to reveal anything past it): every piece's own right edge is
      // a dangling bare-rail stub with no post to cap it (see `sideSceneFence.ts`), so
      // the run's *true* last piece always looks unfinished. Running the tiling past
      // the edge of the world pushes that unfinished stub somewhere the player can
      // never scroll to, rather than trying to end the run on a "clean" piece that
      // doesn't actually exist in the art.
      toX: 8200,
      // The fence art is native-sized to loom over the road at the scene's own scale
      // (per-plan it was expected to reach up into the near-grass band, but in
      // practice that reads as oversized and occludes the backdrop) — scaled down so
      // it reads as a waist-high picket fence instead.
      scale: 0.45,
      gaps: [{ x: GATE_X, gate: 'complete' }],
    },
  ],

  // Hetty waits a little west of the barn gate, far enough off it that the gate art still
  // reads as a gate and the walk-up talk does not frame her against a post.
  npcs: [{ characterId: 'hetty', x: GATE_X - 340, y: 952, facing: 'left', talkSuffix: 'Side' }],

  portals: [
    { id: 'west', side: 'left' },
    { id: 'east', side: 'right' },
    { id: 'barn-gate', side: 'back', x: GATE_X },
  ],
};
