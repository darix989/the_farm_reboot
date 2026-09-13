/**
 * GENERATED FILE — do not edit by hand.
 *
 * Written by `npm run assets:farm-kit`, which scans `public/assets/farm-kit/`
 * and bakes the tiling backdrop bands to power-of-two dimensions. Regenerate
 * rather than editing, or the next run overwrites your change.
 */
export type FarmKitAssetId =
  | 'bg/far-hills'
  | 'bg/foreground-bump'
  | 'bg/foreground-tuft'
  | 'bg/front-grass'
  | 'bg/midground-details'
  | 'bg/midground-fields-large'
  | 'bg/midground-fields-small'
  | 'bg/midground-hill'
  | 'bg/midground-no-details'
  | 'bg/near-grass'
  | 'bg/near-muddy-water'
  | 'bg/puddle-for-road-piece'
  | 'bg/road'
  | 'bg/sky'
  | 'bushes/bush-1-dark-green'
  | 'bushes/bush-1-light-green'
  | 'bushes/bush-1-mid-green'
  | 'bushes/bush-2-dark-green'
  | 'bushes/bush-2-light-green'
  | 'bushes/bush-2-mid-green'
  | 'bushes/bush-3-dark-green'
  | 'bushes/bush-3-light-green'
  | 'bushes/bush-3-mid-green'
  | 'citrus/lemon-tree-bare'
  | 'citrus/lemon-tree-lemons'
  | 'citrus/lime-tree-bare'
  | 'citrus/lime-tree-limes'
  | 'citrus/orange-tree-bare'
  | 'citrus/orange-tree-oranges'
  | 'fence/gate-closed'
  | 'fence/gate-complete'
  | 'fence/gate-open'
  | 'fence/gate-post'
  | 'fence/panel'
  | 'fence/post'
  | 'fence/repeating-piece'
  | 'flowers/flower-1-blue'
  | 'flowers/flower-1-orange'
  | 'flowers/flower-1-pink'
  | 'flowers/flower-1-red'
  | 'flowers/flower-1-white'
  | 'flowers/flower-1-yellow'
  | 'flowers/flower-side-1-blue'
  | 'flowers/flower-side-1-orange'
  | 'flowers/flower-side-1-purple'
  | 'flowers/flower-side-1-red'
  | 'flowers/flower-side-1-white'
  | 'flowers/flower-side-1-yellow'
  | 'flowers/leaf-1-a'
  | 'flowers/leaf-1-b'
  | 'flowers/leaf-2-a'
  | 'flowers/leaf-2-b'
  | 'plants/carrots'
  | 'plants/dirt'
  | 'plants/lettuce'
  | 'plants/sunflower-1'
  | 'plants/sunflower-2'
  | 'plants/sunflower-head'
  | 'plants/sunflowers-group'
  | 'plants/sweet-corn-1'
  | 'plants/sweet-corn-2'
  | 'plants/sweetcorn-group-no-background'
  | 'plants/sweetcorn-group-no-floor'
  | 'plants/sweetcorn-group'
  | 'props/chicken-coop-red'
  | 'props/chicken-coop-wooden'
  | 'props/corn-wall'
  | 'props/haypile'
  | 'props/red-barn'
  | 'props/scarecrow'
  | 'props/silo'
  | 'props/track-to-barn'
  | 'props/windmill-fan'
  | 'props/windmill-no-fan'
  | 'props/windmill'
  | 'trees/tree-five-autumn'
  | 'trees/tree-five-dark-green'
  | 'trees/tree-five-light-green'
  | 'trees/tree-five-mid-green'
  | 'trees/tree-five-spring'
  | 'trees/tree-four-autumn'
  | 'trees/tree-four-dark-green'
  | 'trees/tree-four-light-green'
  | 'trees/tree-four-mid-green'
  | 'trees/tree-four-spring'
  | 'trees/tree-one-autumn'
  | 'trees/tree-one-dark-green'
  | 'trees/tree-one-light-green'
  | 'trees/tree-one-mid-green'
  | 'trees/tree-one-spring'
  | 'trees/tree-three-autumn'
  | 'trees/tree-three-dark-green'
  | 'trees/tree-three-light-green'
  | 'trees/tree-three-mid-green'
  | 'trees/tree-three-spring'
  | 'trees/tree-two-autumn'
  | 'trees/tree-two-dark-green'
  | 'trees/tree-two-light-green'
  | 'trees/tree-two-mid-green'
  | 'trees/tree-two-spring'
  | 'water/pond-muddy';

export interface FarmKitAssetMeta {
  /** Path relative to `public/assets/farm-kit/`. */
  file: string;
  /** Content width/height, before any power-of-two padding. */
  width: number;
  height: number;
  /** On-disk pixel size — differs from width/height only for a padded `bg/*` band. */
  fileWidth: number;
  fileHeight: number;
}

export const FARM_KIT_ASSETS: Record<FarmKitAssetId, FarmKitAssetMeta> = {
  'bg/far-hills': {
    file: 'bg/far-hills.png',
    width: 995,
    height: 102,
    fileWidth: 1024,
    fileHeight: 128,
  },
  'bg/foreground-bump': {
    file: 'bg/foreground-bump.png',
    width: 304,
    height: 59,
    fileWidth: 304,
    fileHeight: 59,
  },
  'bg/foreground-tuft': {
    file: 'bg/foreground-tuft.png',
    width: 234,
    height: 82,
    fileWidth: 234,
    fileHeight: 82,
  },
  'bg/front-grass': {
    file: 'bg/front-grass.png',
    width: 995,
    height: 126,
    fileWidth: 1024,
    fileHeight: 128,
  },
  'bg/midground-details': {
    file: 'bg/midground-details.png',
    width: 995,
    height: 273,
    fileWidth: 1024,
    fileHeight: 512,
  },
  'bg/midground-fields-large': {
    file: 'bg/midground-fields-large.png',
    width: 995,
    height: 204,
    fileWidth: 1024,
    fileHeight: 256,
  },
  'bg/midground-fields-small': {
    file: 'bg/midground-fields-small.png',
    width: 995,
    height: 204,
    fileWidth: 1024,
    fileHeight: 256,
  },
  'bg/midground-hill': {
    file: 'bg/midground-hill.png',
    width: 653,
    height: 55,
    fileWidth: 653,
    fileHeight: 55,
  },
  'bg/midground-no-details': {
    file: 'bg/midground-no-details.png',
    width: 995,
    height: 196,
    fileWidth: 1024,
    fileHeight: 256,
  },
  'bg/near-grass': {
    file: 'bg/near-grass.png',
    width: 995,
    height: 227,
    fileWidth: 1024,
    fileHeight: 256,
  },
  'bg/near-muddy-water': {
    file: 'bg/near-muddy-water.png',
    width: 2048,
    height: 245,
    fileWidth: 2048,
    fileHeight: 256,
  },
  'bg/puddle-for-road-piece': {
    file: 'bg/puddle-for-road-piece.png',
    width: 297,
    height: 45,
    fileWidth: 297,
    fileHeight: 45,
  },
  'bg/road': {
    file: 'bg/road.png',
    width: 995,
    height: 238,
    fileWidth: 1024,
    fileHeight: 256,
  },
  'bg/sky': {
    file: 'bg/sky.png',
    width: 47,
    height: 560,
    fileWidth: 47,
    fileHeight: 560,
  },
  'bushes/bush-1-dark-green': {
    file: 'bushes/bush-1-dark-green.png',
    width: 400,
    height: 255,
    fileWidth: 400,
    fileHeight: 255,
  },
  'bushes/bush-1-light-green': {
    file: 'bushes/bush-1-light-green.png',
    width: 400,
    height: 255,
    fileWidth: 400,
    fileHeight: 255,
  },
  'bushes/bush-1-mid-green': {
    file: 'bushes/bush-1-mid-green.png',
    width: 400,
    height: 255,
    fileWidth: 400,
    fileHeight: 255,
  },
  'bushes/bush-2-dark-green': {
    file: 'bushes/bush-2-dark-green.png',
    width: 400,
    height: 167,
    fileWidth: 400,
    fileHeight: 167,
  },
  'bushes/bush-2-light-green': {
    file: 'bushes/bush-2-light-green.png',
    width: 400,
    height: 167,
    fileWidth: 400,
    fileHeight: 167,
  },
  'bushes/bush-2-mid-green': {
    file: 'bushes/bush-2-mid-green.png',
    width: 400,
    height: 167,
    fileWidth: 400,
    fileHeight: 167,
  },
  'bushes/bush-3-dark-green': {
    file: 'bushes/bush-3-dark-green.png',
    width: 287,
    height: 247,
    fileWidth: 287,
    fileHeight: 247,
  },
  'bushes/bush-3-light-green': {
    file: 'bushes/bush-3-light-green.png',
    width: 287,
    height: 247,
    fileWidth: 287,
    fileHeight: 247,
  },
  'bushes/bush-3-mid-green': {
    file: 'bushes/bush-3-mid-green.png',
    width: 287,
    height: 247,
    fileWidth: 287,
    fileHeight: 247,
  },
  'citrus/lemon-tree-bare': {
    file: 'citrus/lemon-tree-bare.png',
    width: 327,
    height: 537,
    fileWidth: 327,
    fileHeight: 537,
  },
  'citrus/lemon-tree-lemons': {
    file: 'citrus/lemon-tree-lemons.png',
    width: 327,
    height: 532,
    fileWidth: 327,
    fileHeight: 532,
  },
  'citrus/lime-tree-bare': {
    file: 'citrus/lime-tree-bare.png',
    width: 327,
    height: 537,
    fileWidth: 327,
    fileHeight: 537,
  },
  'citrus/lime-tree-limes': {
    file: 'citrus/lime-tree-limes.png',
    width: 327,
    height: 532,
    fileWidth: 327,
    fileHeight: 532,
  },
  'citrus/orange-tree-bare': {
    file: 'citrus/orange-tree-bare.png',
    width: 327,
    height: 537,
    fileWidth: 327,
    fileHeight: 537,
  },
  'citrus/orange-tree-oranges': {
    file: 'citrus/orange-tree-oranges.png',
    width: 327,
    height: 532,
    fileWidth: 327,
    fileHeight: 532,
  },
  'fence/gate-closed': {
    file: 'fence/gate-closed.png',
    width: 701,
    height: 594,
    fileWidth: 701,
    fileHeight: 594,
  },
  'fence/gate-complete': {
    file: 'fence/gate-complete.png',
    width: 990,
    height: 684,
    fileWidth: 990,
    fileHeight: 684,
  },
  'fence/gate-open': {
    file: 'fence/gate-open.png',
    width: 379,
    height: 595,
    fileWidth: 379,
    fileHeight: 595,
  },
  'fence/gate-post': {
    file: 'fence/gate-post.png',
    width: 208,
    height: 684,
    fileWidth: 208,
    fileHeight: 684,
  },
  'fence/panel': {
    file: 'fence/panel.png',
    width: 416,
    height: 419,
    fileWidth: 416,
    fileHeight: 419,
  },
  'fence/post': {
    file: 'fence/post.png',
    width: 202,
    height: 487,
    fileWidth: 202,
    fileHeight: 487,
  },
  'fence/repeating-piece': {
    file: 'fence/repeating-piece.png',
    width: 795,
    height: 498,
    fileWidth: 795,
    fileHeight: 498,
  },
  'flowers/flower-1-blue': {
    file: 'flowers/flower-1-blue.png',
    width: 154,
    height: 260,
    fileWidth: 154,
    fileHeight: 260,
  },
  'flowers/flower-1-orange': {
    file: 'flowers/flower-1-orange.png',
    width: 154,
    height: 260,
    fileWidth: 154,
    fileHeight: 260,
  },
  'flowers/flower-1-pink': {
    file: 'flowers/flower-1-pink.png',
    width: 154,
    height: 260,
    fileWidth: 154,
    fileHeight: 260,
  },
  'flowers/flower-1-red': {
    file: 'flowers/flower-1-red.png',
    width: 154,
    height: 260,
    fileWidth: 154,
    fileHeight: 260,
  },
  'flowers/flower-1-white': {
    file: 'flowers/flower-1-white.png',
    width: 154,
    height: 260,
    fileWidth: 154,
    fileHeight: 260,
  },
  'flowers/flower-1-yellow': {
    file: 'flowers/flower-1-yellow.png',
    width: 154,
    height: 260,
    fileWidth: 154,
    fileHeight: 260,
  },
  'flowers/flower-side-1-blue': {
    file: 'flowers/flower-side-1-blue.png',
    width: 120,
    height: 292,
    fileWidth: 120,
    fileHeight: 292,
  },
  'flowers/flower-side-1-orange': {
    file: 'flowers/flower-side-1-orange.png',
    width: 120,
    height: 292,
    fileWidth: 120,
    fileHeight: 292,
  },
  'flowers/flower-side-1-purple': {
    file: 'flowers/flower-side-1-purple.png',
    width: 120,
    height: 292,
    fileWidth: 120,
    fileHeight: 292,
  },
  'flowers/flower-side-1-red': {
    file: 'flowers/flower-side-1-red.png',
    width: 120,
    height: 292,
    fileWidth: 120,
    fileHeight: 292,
  },
  'flowers/flower-side-1-white': {
    file: 'flowers/flower-side-1-white.png',
    width: 120,
    height: 292,
    fileWidth: 120,
    fileHeight: 292,
  },
  'flowers/flower-side-1-yellow': {
    file: 'flowers/flower-side-1-yellow.png',
    width: 120,
    height: 292,
    fileWidth: 120,
    fileHeight: 292,
  },
  'flowers/leaf-1-a': {
    file: 'flowers/leaf-1-a.png',
    width: 38,
    height: 302,
    fileWidth: 38,
    fileHeight: 302,
  },
  'flowers/leaf-1-b': {
    file: 'flowers/leaf-1-b.png',
    width: 133,
    height: 191,
    fileWidth: 133,
    fileHeight: 191,
  },
  'flowers/leaf-2-a': {
    file: 'flowers/leaf-2-a.png',
    width: 93,
    height: 123,
    fileWidth: 93,
    fileHeight: 123,
  },
  'flowers/leaf-2-b': {
    file: 'flowers/leaf-2-b.png',
    width: 86,
    height: 195,
    fileWidth: 86,
    fileHeight: 195,
  },
  'plants/carrots': {
    file: 'plants/carrots.png',
    width: 603,
    height: 353,
    fileWidth: 603,
    fileHeight: 353,
  },
  'plants/dirt': {
    file: 'plants/dirt.png',
    width: 252,
    height: 28,
    fileWidth: 252,
    fileHeight: 28,
  },
  'plants/lettuce': {
    file: 'plants/lettuce.png',
    width: 662,
    height: 183,
    fileWidth: 662,
    fileHeight: 183,
  },
  'plants/sunflower-1': {
    file: 'plants/sunflower-1.png',
    width: 238,
    height: 617,
    fileWidth: 238,
    fileHeight: 617,
  },
  'plants/sunflower-2': {
    file: 'plants/sunflower-2.png',
    width: 271,
    height: 804,
    fileWidth: 271,
    fileHeight: 804,
  },
  'plants/sunflower-head': {
    file: 'plants/sunflower-head.png',
    width: 126,
    height: 126,
    fileWidth: 126,
    fileHeight: 126,
  },
  'plants/sunflowers-group': {
    file: 'plants/sunflowers-group.png',
    width: 731,
    height: 869,
    fileWidth: 731,
    fileHeight: 869,
  },
  'plants/sweet-corn-1': {
    file: 'plants/sweet-corn-1.png',
    width: 198,
    height: 536,
    fileWidth: 198,
    fileHeight: 536,
  },
  'plants/sweet-corn-2': {
    file: 'plants/sweet-corn-2.png',
    width: 122,
    height: 313,
    fileWidth: 122,
    fileHeight: 313,
  },
  'plants/sweetcorn-group-no-background': {
    file: 'plants/sweetcorn-group-no-background.png',
    width: 1160,
    height: 754,
    fileWidth: 1160,
    fileHeight: 754,
  },
  'plants/sweetcorn-group-no-floor': {
    file: 'plants/sweetcorn-group-no-floor.png',
    width: 1160,
    height: 735,
    fileWidth: 1160,
    fileHeight: 735,
  },
  'plants/sweetcorn-group': {
    file: 'plants/sweetcorn-group.png',
    width: 1114,
    height: 724,
    fileWidth: 1114,
    fileHeight: 724,
  },
  'props/chicken-coop-red': {
    file: 'props/chicken-coop-red.png',
    width: 1099,
    height: 966,
    fileWidth: 1099,
    fileHeight: 966,
  },
  'props/chicken-coop-wooden': {
    file: 'props/chicken-coop-wooden.png',
    width: 1099,
    height: 966,
    fileWidth: 1099,
    fileHeight: 966,
  },
  'props/corn-wall': {
    file: 'props/corn-wall.png',
    width: 2418,
    height: 812,
    fileWidth: 2418,
    fileHeight: 812,
  },
  'props/haypile': {
    file: 'props/haypile.png',
    width: 1048,
    height: 415,
    fileWidth: 1048,
    fileHeight: 415,
  },
  'props/red-barn': {
    file: 'props/red-barn.png',
    width: 692,
    height: 593,
    fileWidth: 692,
    fileHeight: 593,
  },
  'props/scarecrow': {
    file: 'props/scarecrow.png',
    width: 777,
    height: 825,
    fileWidth: 777,
    fileHeight: 825,
  },
  'props/silo': {
    file: 'props/silo.png',
    width: 371,
    height: 811,
    fileWidth: 371,
    fileHeight: 811,
  },
  'props/track-to-barn': {
    file: 'props/track-to-barn.png',
    width: 464,
    height: 142,
    fileWidth: 464,
    fileHeight: 142,
  },
  'props/windmill-fan': {
    file: 'props/windmill-fan.png',
    width: 277,
    height: 279,
    fileWidth: 277,
    fileHeight: 279,
  },
  'props/windmill-no-fan': {
    file: 'props/windmill-no-fan.png',
    width: 206,
    height: 622,
    fileWidth: 206,
    fileHeight: 622,
  },
  'props/windmill': {
    file: 'props/windmill.png',
    width: 277,
    height: 740,
    fileWidth: 277,
    fileHeight: 740,
  },
  'trees/tree-five-autumn': {
    file: 'trees/tree-five-autumn.png',
    width: 499,
    height: 712,
    fileWidth: 499,
    fileHeight: 712,
  },
  'trees/tree-five-dark-green': {
    file: 'trees/tree-five-dark-green.png',
    width: 499,
    height: 712,
    fileWidth: 499,
    fileHeight: 712,
  },
  'trees/tree-five-light-green': {
    file: 'trees/tree-five-light-green.png',
    width: 499,
    height: 712,
    fileWidth: 499,
    fileHeight: 712,
  },
  'trees/tree-five-mid-green': {
    file: 'trees/tree-five-mid-green.png',
    width: 499,
    height: 712,
    fileWidth: 499,
    fileHeight: 712,
  },
  'trees/tree-five-spring': {
    file: 'trees/tree-five-spring.png',
    width: 499,
    height: 712,
    fileWidth: 499,
    fileHeight: 712,
  },
  'trees/tree-four-autumn': {
    file: 'trees/tree-four-autumn.png',
    width: 616,
    height: 737,
    fileWidth: 616,
    fileHeight: 737,
  },
  'trees/tree-four-dark-green': {
    file: 'trees/tree-four-dark-green.png',
    width: 616,
    height: 737,
    fileWidth: 616,
    fileHeight: 737,
  },
  'trees/tree-four-light-green': {
    file: 'trees/tree-four-light-green.png',
    width: 616,
    height: 737,
    fileWidth: 616,
    fileHeight: 737,
  },
  'trees/tree-four-mid-green': {
    file: 'trees/tree-four-mid-green.png',
    width: 616,
    height: 737,
    fileWidth: 616,
    fileHeight: 737,
  },
  'trees/tree-four-spring': {
    file: 'trees/tree-four-spring.png',
    width: 616,
    height: 737,
    fileWidth: 616,
    fileHeight: 737,
  },
  'trees/tree-one-autumn': {
    file: 'trees/tree-one-autumn.png',
    width: 675,
    height: 803,
    fileWidth: 675,
    fileHeight: 803,
  },
  'trees/tree-one-dark-green': {
    file: 'trees/tree-one-dark-green.png',
    width: 675,
    height: 803,
    fileWidth: 675,
    fileHeight: 803,
  },
  'trees/tree-one-light-green': {
    file: 'trees/tree-one-light-green.png',
    width: 675,
    height: 803,
    fileWidth: 675,
    fileHeight: 803,
  },
  'trees/tree-one-mid-green': {
    file: 'trees/tree-one-mid-green.png',
    width: 675,
    height: 803,
    fileWidth: 675,
    fileHeight: 803,
  },
  'trees/tree-one-spring': {
    file: 'trees/tree-one-spring.png',
    width: 675,
    height: 803,
    fileWidth: 675,
    fileHeight: 803,
  },
  'trees/tree-three-autumn': {
    file: 'trees/tree-three-autumn.png',
    width: 632,
    height: 885,
    fileWidth: 632,
    fileHeight: 885,
  },
  'trees/tree-three-dark-green': {
    file: 'trees/tree-three-dark-green.png',
    width: 632,
    height: 885,
    fileWidth: 632,
    fileHeight: 885,
  },
  'trees/tree-three-light-green': {
    file: 'trees/tree-three-light-green.png',
    width: 632,
    height: 885,
    fileWidth: 632,
    fileHeight: 885,
  },
  'trees/tree-three-mid-green': {
    file: 'trees/tree-three-mid-green.png',
    width: 632,
    height: 885,
    fileWidth: 632,
    fileHeight: 885,
  },
  'trees/tree-three-spring': {
    file: 'trees/tree-three-spring.png',
    width: 632,
    height: 885,
    fileWidth: 632,
    fileHeight: 885,
  },
  'trees/tree-two-autumn': {
    file: 'trees/tree-two-autumn.png',
    width: 331,
    height: 486,
    fileWidth: 331,
    fileHeight: 486,
  },
  'trees/tree-two-dark-green': {
    file: 'trees/tree-two-dark-green.png',
    width: 474,
    height: 697,
    fileWidth: 474,
    fileHeight: 697,
  },
  'trees/tree-two-light-green': {
    file: 'trees/tree-two-light-green.png',
    width: 474,
    height: 697,
    fileWidth: 474,
    fileHeight: 697,
  },
  'trees/tree-two-mid-green': {
    file: 'trees/tree-two-mid-green.png',
    width: 474,
    height: 697,
    fileWidth: 474,
    fileHeight: 697,
  },
  'trees/tree-two-spring': {
    file: 'trees/tree-two-spring.png',
    width: 474,
    height: 697,
    fileWidth: 474,
    fileHeight: 697,
  },
  'water/pond-muddy': {
    file: 'water/pond-muddy.png',
    width: 1400,
    height: 260,
    fileWidth: 1400,
    fileHeight: 260,
  },
};
