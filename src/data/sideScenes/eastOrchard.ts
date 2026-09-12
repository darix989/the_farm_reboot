/**
 * Off the east end of `greenMeadowsRoad`: citrus trees, bushes, a windmill, a muddy pond
 * sitting back in the middle distance, and Duchess and Tobias, spaced well clear of each
 * other so the 400px talk radius always picks one of them unambiguously.
 *
 * Unlike its siblings, this scene is no longer built strictly from asset ids
 * `greenMeadowsRoad` already uses: the pond (`water/pond-muddy`) and its reeds
 * (`flowers/leaf-1-a`) are new, so the first hop into `eastOrchard` from any other scene
 * fetches those and shows the loading overlay briefly rather than being a warm hop (see
 * `docs/farm_side_scenes.md`). Worth it — the pond is the visual cue for the hop into
 * `oldPond`, which puts the player right at the water's edge.
 */
import type { SideSceneDescriptor } from '../../types/sideScene';
import { STANDARD_FARM_LAYERS } from './greenMeadowsRoad';

const GROUND_SEAM_Y = 796;

// Middle distance: sits on the near-grass band (601.6-795.6 with this scene's
// firstTop/scale), well above GROUND_SEAM_Y, so the tree line plants in front of it.
const POND_Y = 748;
const POND_X = 1560;
/**
 * The far side of the water, high in the near-grass band — the furthest anything in this
 * scene can stand on and still be on the ground plane. Trees here read as a tree line
 * across the pond rather than part of the orchard: they sort behind the pond on `y` alone
 * (`resolveBandDepth`), and at 0.24-0.28 against the orchard's own full-scale seam trees
 * the drop in size is what puts them on the other bank.
 */
const FAR_TREE_Y = 620;

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
    // Shifted left of its original 1450 (which sat 300+px into the pond's own front,
    // not just grazing its end) to clear the water; grazes the lemon tree's canopy
    // instead, which reads as ground-level foliage clumping rather than a floating prop.
    { asset: 'bushes/bush-2-mid-green', x: 1120, y: GROUND_SEAM_Y, band: 'ground' },
    { asset: 'bushes/bush-1-dark-green', x: 2250, y: GROUND_SEAM_Y, band: 'ground' },
    { asset: 'props/windmill', x: 2750, y: GROUND_SEAM_Y, band: 'ground' },

    // The pond, framed so it doesn't float on flat green: a distant tree line and
    // far-bank bushes behind it (smaller `y`, so they sort behind on `y` alone), near-bank
    // reeds in front. Spread wider than the pond's own 0.42-scale first pass to match its
    // bigger footprint.
    //
    // Everything here is placed inside x 1291-1760. That is the only stretch of the far
    // bank the player can actually see: the seam trees and bushes above run 949-1291 and
    // 1760-2040 at full scale, so the pond's two ends emerge from behind them and any
    // background detail out there would be drawn and then covered.
    { asset: 'trees/tree-two-mid-green', x: 1330, y: FAR_TREE_Y, band: 'ground', scale: 0.28 },
    {
      asset: 'trees/tree-five-light-green',
      x: 1520,
      y: FAR_TREE_Y - 4,
      band: 'ground',
      scale: 0.26,
      flipX: true,
    },
    {
      asset: 'trees/tree-three-mid-green',
      x: 1700,
      y: FAR_TREE_Y - 1,
      band: 'ground',
      scale: 0.24,
    },

    // Far-bank scrub. The original pair left the rim reading as two isolated clumps;
    // these two close the gaps either side into one continuous run.
    { asset: 'bushes/bush-2-mid-green', x: 1330, y: 656, band: 'ground', scale: 0.3 },
    { asset: 'bushes/bush-2-mid-green', x: 1450, y: 664, band: 'ground', scale: 0.27 },
    {
      asset: 'bushes/bush-1-dark-green',
      x: 1570,
      y: 660,
      band: 'ground',
      scale: 0.24,
      flipX: true,
    },
    {
      asset: 'bushes/bush-1-dark-green',
      x: 1684,
      y: 666,
      band: 'ground',
      scale: 0.22,
      flipX: true,
    },

    { asset: 'water/pond-muddy', x: POND_X, y: POND_Y, band: 'ground', scale: 0.52 },

    { asset: 'flowers/leaf-1-a', x: 1318, y: 756, band: 'ground', scale: 0.26 },
    { asset: 'flowers/leaf-1-a', x: 1362, y: 760, band: 'ground', scale: 0.22 },
    { asset: 'flowers/leaf-1-a', x: 1461, y: 768, band: 'ground', scale: 0.2, flipX: true },
    { asset: 'flowers/leaf-1-a', x: 1545, y: 764, band: 'ground', scale: 0.23, flipX: true },
    { asset: 'flowers/leaf-1-a', x: 1634, y: 762, band: 'ground', scale: 0.25 },
    { asset: 'flowers/leaf-1-a', x: 1734, y: 770, band: 'ground', scale: 0.21, flipX: true },
  ],

  fences: [],

  // 1200px apart — comfortably clear of the 400px talk radius either one offers, so
  // `resolveFocus` never has to break a tie between them.
  npcs: [
    { characterId: 'tobias', x: 900, y: 952, facing: 'right' },
    { characterId: 'duchess', x: 2100, y: 952, facing: 'left' },
  ],

  portals: [
    {
      id: 'west',
      side: 'left',
      to: { scene: 'greenMeadowsRoad', portal: 'east', label: 'farmSidePortalBackToRoad' },
    },
    {
      id: 'pond',
      side: 'back',
      x: POND_X,
      to: { scene: 'oldPond', portal: 'orchard', label: 'farmSidePortalPond' },
    },
  ],
};
