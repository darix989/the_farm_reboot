/**
 * The Old Pond, one hop in from the muddy pond on `eastOrchard`. Viewport-wide — the
 * camera does not pan — with muddy water filling the near-background band (replacing
 * `bg/near-grass`) so the player stands on the near shore looking across the water.
 *
 * The waterline sits where the midground band ends, so the pond's level is set by how
 * the 551 native px of backdrop above the road seam are split across the three bands:
 * `bg/far-hills` (127), `bg/midground-fields-large` (255), `bg/near-muddy-water` (169).
 * Only the sum is load-bearing — it keeps the road at y≈796 with the same `firstTop` /
 * `scale` as every other pocket — so moving native px out of the water and into anything
 * above it drops the waterline without touching the ground plane. This split puts it at
 * y≈685, 65px below where the bands' own content heights (102/204/245) would put it.
 *
 * That headroom is now spent. Each land band is drawn past its measured content height,
 * which works only because both pad out in a flat colour — the fields' 204 rows into
 * uniform grass to 256, the hills' 102 into flat pale green to 128 — and 127/255 are the
 * last values before the drawn height reaches the texture height, where a `TileSprite`
 * starts sampling across its own wrap and lets a hairline of the band's transparent top
 * through. Lowering the water further needs a real bank band between the fields and the
 * water (`bg/near-grass`, drawn short), not a bigger number here.
 *
 * The water is the one band drawn short of its content: its rows past 40 are flat fill,
 * so the 76 cut off its bottom are invisible. `opaqueFromRow` 40 is measured off the
 * mixed trough-inclusive strip (`npm run assets:pond`) and stays the art's own property.
 *
 * The props are staged in four depth ranks, all of them sorting on `y` alone within the
 * `'ground'` band (see `resolveBandDepth`): a far tree line and far-bank scrub across the
 * water, then the near shore's bushes and reeds, then two framing trees planted at the
 * stage edges, and finally front-band flowers that draw over the walker. Scale is what
 * carries the distance — 0.26-0.32 across the water against 0.5-0.82 on the near shore.
 *
 * Hetty lives here — Level 1's gossip stand, reached by walking up to the pond in the
 * orchard. The first hop in from `eastOrchard` fetches `bg/near-muddy-water`, which none
 * of its siblings load (see `docs/farm_side_scenes.md`). The trees and flowers are ids
 * `greenMeadowsRoad` already loads, so they cost the texture budget nothing.
 */
import type { SideSceneDescriptor, SideSceneLayer } from '../../types/sideScene';

/** Near-grass / road seam — the near shore, between the water band and the walkable dirt. */
const GROUND_SEAM_Y = 796;
/**
 * The far shore. The water band runs y 651-796 and only becomes fully opaque at y≈685,
 * so 651-685 is the wavy transition the fields band shows through. Far-bank scrub plants
 * at `FAR_BANK_Y`, inside that transition, so it meets the water the way `eastOrchard`'s
 * pond-side bushes do; the tree line sits a little further back at `FAR_TREE_Y`, clear of
 * the waves entirely. Both are far smaller `y` than anything on the near shore, which is
 * the whole depth sort — `resolveBandDepth` orders props within a band on `y` alone.
 */
const FAR_TREE_Y = 644;
const FAR_BANK_Y = 662;
/** Near-bank reeds. Low enough that even at their new size they top out below the far
 *  shore, so a reed reads as standing in the shallows rather than spanning the pond. */
const REED_Y = 784;
const HETTY_X = 1400;
const HETTY_Y = 952;
const INTRO_SPAWN_GAP = 360;
const ORCHARD_PORTAL_X = 360;
/** Same value `greenMeadowsRoad` tuned for the front-grass band — the kit's flower art is
 *  oversized, and this is what makes a bloom read as a foreground plant. */
const FLOWER_SCALE = 0.72;

export const POND_LAYERS: readonly SideSceneLayer[] = [
  { asset: 'bg/far-hills', nativeHeight: 127, opaqueFromRow: 31, parallax: 0.15 },
  { asset: 'bg/midground-fields-large', nativeHeight: 255, opaqueFromRow: 48, parallax: 0.35 },
  { asset: 'bg/near-muddy-water', nativeHeight: 169, opaqueFromRow: 40, parallax: 0.65 },
  { asset: 'bg/road', nativeHeight: 238, opaqueFromRow: 0, parallax: 1 },
  { asset: 'bg/front-grass', nativeHeight: 126, opaqueFromRow: 31, parallax: 1 },
];

export const OLD_POND: SideSceneDescriptor = {
  id: 'oldPond',
  width: 1920,
  scale: 0.8543,
  firstTop: 400,
  road: { top: 837, bottom: 999 },
  layers: POND_LAYERS,

  props: [
    // Framing trees, planted on the near shore at the stage's two edges so the pond is
    // looked at through something rather than sitting in an empty rectangle. Both run
    // off-stage: the left one stops short of the orchard portal at x=360, the right one
    // stands well clear of Hetty at x=1400.
    { asset: 'trees/tree-one-mid-green', x: 60, y: GROUND_SEAM_Y, band: 'ground', scale: 0.82 },
    {
      asset: 'trees/tree-three-mid-green',
      x: 1900,
      y: GROUND_SEAM_Y,
      band: 'ground',
      scale: 0.75,
      flipX: true,
    },

    // Far bank, across the water. Everything here plants above the near shore, so it
    // sorts behind every near prop on `y` alone, and the steep scale drop (0.26-0.32
    // against the near shore's 0.62-0.82) is what sells the distance across the pond.
    { asset: 'trees/tree-two-mid-green', x: 250, y: FAR_TREE_Y, band: 'ground', scale: 0.3 },
    {
      asset: 'trees/tree-five-light-green',
      x: 900,
      y: FAR_TREE_Y + 4,
      band: 'ground',
      scale: 0.26,
      flipX: true,
    },
    { asset: 'trees/tree-three-mid-green', x: 1530, y: FAR_TREE_Y, band: 'ground', scale: 0.28 },
    { asset: 'bushes/bush-2-mid-green', x: 520, y: FAR_BANK_Y, band: 'ground', scale: 0.32 },
    {
      asset: 'bushes/bush-1-dark-green',
      x: 1160,
      y: FAR_BANK_Y + 4,
      band: 'ground',
      scale: 0.28,
      flipX: true,
    },
    { asset: 'bushes/bush-2-mid-green', x: 1790, y: FAR_BANK_Y, band: 'ground', scale: 0.3 },

    // Near shore — the water is a backdrop band, so any ground prop composites in
    // front of it. Planting on the seam (not up in the water's y-range) reads as
    // bushes between the pond and the road rather than sitting in the mud. Sized to
    // the kit's own near-ground proportion (`greenMeadowsRoad` plants bushes at 1.0):
    // the first pass at 0.22-0.27 put pebbles on a shoreline. The gap around x=360 is
    // left open on purpose — it is the way back up to the orchard.
    { asset: 'bushes/bush-2-mid-green', x: 560, y: GROUND_SEAM_Y, band: 'ground', scale: 0.72 },
    {
      asset: 'bushes/bush-1-dark-green',
      x: 1120,
      y: GROUND_SEAM_Y,
      band: 'ground',
      scale: 0.5,
      flipX: true,
    },
    {
      asset: 'bushes/bush-2-mid-green',
      x: 1700,
      y: GROUND_SEAM_Y,
      band: 'ground',
      scale: 0.68,
      flipX: true,
    },

    // Near-bank reeds, standing in the shallows along the water/road seam.
    { asset: 'flowers/leaf-1-a', x: 220, y: REED_Y - 6, band: 'ground', scale: 0.33 },
    { asset: 'flowers/leaf-1-a', x: 268, y: REED_Y, band: 'ground', scale: 0.3, flipX: true },
    { asset: 'flowers/leaf-1-a', x: 790, y: REED_Y - 10, band: 'ground', scale: 0.32 },
    { asset: 'flowers/leaf-1-a', x: 845, y: REED_Y - 2, band: 'ground', scale: 0.3, flipX: true },
    { asset: 'flowers/leaf-1-a', x: 1310, y: REED_Y - 8, band: 'ground', scale: 0.32 },
    { asset: 'flowers/leaf-1-a', x: 1360, y: REED_Y + 2, band: 'ground', scale: 0.29, flipX: true },
    { asset: 'flowers/leaf-1-a', x: 1880, y: REED_Y - 4, band: 'ground', scale: 0.33 },

    // Foreground. The `front` band draws over the walker, so these are the one thing on
    // the stage that is unambiguously in front of the pond and everyone standing at it.
    { asset: 'flowers/flower-side-1-white', x: 180, y: 1046, band: 'front', scale: FLOWER_SCALE },
    { asset: 'flowers/flower-1-yellow', x: 430, y: 1036, band: 'front', scale: FLOWER_SCALE },
    {
      asset: 'flowers/flower-1-pink',
      x: 700,
      y: 1056,
      band: 'front',
      scale: FLOWER_SCALE,
      flipX: true,
    },
    { asset: 'flowers/flower-side-1-blue', x: 1010, y: 1042, band: 'front', scale: FLOWER_SCALE },
    { asset: 'flowers/flower-1-white', x: 1290, y: 1058, band: 'front', scale: FLOWER_SCALE },
    {
      asset: 'flowers/flower-side-1-yellow',
      x: 1560,
      y: 1040,
      band: 'front',
      scale: FLOWER_SCALE,
      flipX: true,
    },
    { asset: 'flowers/flower-1-red', x: 1820, y: 1052, band: 'front', scale: FLOWER_SCALE },
  ],

  fences: [],

  npcs: [{ characterId: 'hetty', x: HETTY_X, y: HETTY_Y, facing: 'left' }],

  // First visit with no hop: beside Hetty, looking at her — same greeting frame Dot
  // gets on the main road. Portal hops and a saved pose still win over this.
  playerSpawn: { x: HETTY_X - INTRO_SPAWN_GAP, y: HETTY_Y, facing: 'right' },

  portals: [
    {
      id: 'orchard',
      side: 'back',
      x: ORCHARD_PORTAL_X,
      to: { scene: 'eastOrchard', portal: 'pond', label: 'farmSidePortalBackToOrchard' },
    },
  ],
};
