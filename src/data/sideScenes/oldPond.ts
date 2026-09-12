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
 * Hetty lives here — Level 1's gossip stand, reached by walking up to the pond in the
 * orchard. The first hop in from `eastOrchard` fetches `bg/near-muddy-water`, which none
 * of its siblings load (see `docs/farm_side_scenes.md`).
 */
import type { SideSceneDescriptor, SideSceneLayer } from '../../types/sideScene';

/** Near-grass / road seam — the near shore, between the water band and the walkable dirt. */
const GROUND_SEAM_Y = 796;
const HETTY_X = 1400;
const HETTY_Y = 952;
const INTRO_SPAWN_GAP = 360;
const ORCHARD_PORTAL_X = 360;

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
    // Near shore — the water is a backdrop band, so any ground prop composites in
    // front of it. Planting on the seam (not up in the water's y-range) reads as
    // bushes between the pond and the road rather than sitting in the mud.
    { asset: 'bushes/bush-2-mid-green', x: 420, y: GROUND_SEAM_Y, band: 'ground', scale: 0.27 },
    {
      asset: 'bushes/bush-1-dark-green',
      x: 980,
      y: GROUND_SEAM_Y,
      band: 'ground',
      scale: 0.22,
      flipX: true,
    },
    {
      asset: 'bushes/bush-2-mid-green',
      x: 1580,
      y: GROUND_SEAM_Y,
      band: 'ground',
      scale: 0.25,
      flipX: true,
    },

    // Near-bank reeds, along the water/road seam.
    { asset: 'flowers/leaf-1-a', x: 220, y: 768, band: 'ground', scale: 0.22 },
    { asset: 'flowers/leaf-1-a', x: 510, y: 776, band: 'ground', scale: 0.2, flipX: true },
    { asset: 'flowers/leaf-1-a', x: 860, y: 762, band: 'ground', scale: 0.25 },
    { asset: 'flowers/leaf-1-a', x: 1180, y: 770, band: 'ground', scale: 0.21, flipX: true },
    { asset: 'flowers/leaf-1-a', x: 1720, y: 766, band: 'ground', scale: 0.23 },
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
