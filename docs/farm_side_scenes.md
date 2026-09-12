# Lateral farm scenes — authoring guide

How the `FarmSide` scene assembly kit works, and how to author scene #2 through #10.

This is iteration 1: one scene (`greenMeadowsRoad`), no gameplay, no characters, no
Trial routing. The one thing it proves is the traversal contract — a scene carries a
character from one entrance to one or more exits, walking on the road only — via the
debug walker (`DEBUG_SIDE_SCENE` in `FarmSide.ts`). `Farm.ts`, the top-down overworld,
is untouched and stays the live scene until characters land here.

---

## The art kit

`public/assets/farm-kit/` is the Megafarm Scene Construction Kit, copied in with
normalised kebab-case names (typos in the original fixed along the way). Every asset is
listed in the generated manifest, `src/phaser/sideScene/farmKit.generated.ts` — run
`npm run assets:farm-kit` after adding new art to `public/assets/farm-kit/` to
regenerate it. That script also bakes the tiling backdrop bands (`bg/far-hills.png` and
friends) to power-of-two dimensions, edge-replicated rather than stretched, so Phaser's
`TileSprite` never has to resample them at runtime — see the comment at the top of
`build-farm-kit-manifest.mjs` for why that resample is otherwise a real (and blurry)
problem.

## The layer stack — no gaps by construction

A scene's backdrop is five bands, far to near: far hills, one midground variant, near
grass, the road, and a front-grass occluder. Each band's screen position is *computed*,
never hand-placed, by `stackLayers` (`sideSceneLayerStack.ts`):

```
top[0]    = firstTop
top[i]    = bottom[i-1] - opaqueFromRow[i] * scale      for i > 0
bottom[i] = top[i] + nativeHeight[i] * scale
```

`opaqueFromRow` is the first native row where a band's silhouette becomes a solid fill
(measured once per asset — see the numbers already in `STANDARD_FARM_LAYERS`,
`src/data/sideScenes/greenMeadowsRoad.ts`). Because band *i*'s solid fill starts exactly
`opaqueFromRow[i] * scale` above its own top, and that is defined to land on band
*i-1*'s bottom, there is never a gap between bands — regardless of how jagged either
band's silhouette is. `sideSceneLayerStack.test.ts` checks this invariant against the
kit's real measured fixtures.

`firstTop` (horizon height) and `scale` are the only two authored numbers a scene picks;
everything else follows. Reuse `STANDARD_FARM_LAYERS` for the standard five-band stack
rather than retyping it — swap in a different midground (`bg/midground-details`,
`bg/midground-no-details`, `bg/midground-fields-small`) for variety.

The **walkable band** (`descriptor.road`) is narrower than the road layer's own
`[top, bottom]`: the road art has a ~48-native-px grass fringe painted on before the
dirt starts (see the asset-analysis notes in the plan). It is authored by hand per
scene, not derived at runtime — keep it in agreement with the placed layer stack (the
`greenMeadowsRoad` numbers, `{ top: 837, bottom: 999 }`, match `firstTop: 400,
scale: 0.8543` exactly; if you change either, recompute the walkable band too).

## Rendering: two recipes, not one

`sideSceneLayers.ts` builds the stack. Bands with `parallax < 1` are viewport-pinned
(`scrollFactor(0)`, sized to their own band height, not the full viewport — a
`TileSprite`'s fill canvas is real GPU memory) and their `tilePositionX` is driven from
the scene's own `scrollX` each frame. The road and front-grass (`parallax === 1`) are the
opposite: ordinary **world-space** tile sprites, `scrollFactor(1)`, re-snapped to a whole
tile boundary once a frame instead of ever touching `tilePositionX`. That makes anything
standing on the road pixel-locked to it with no one-frame lag — see the big comment at
the top of `sideSceneLayers.ts` for the Phaser-internals reasons both recipes exist.

The scene drives its own camera (`FarmSide.updateCamera`) rather than `startFollow`, so
every parallax calculation reads the same locally-computed `scrollX` in the same tick
Phaser will render it — no `PRE_RENDER` hook, no one-frame stale read.

## The depth model

`Farm.ts`'s `setDepth(y)` doesn't transfer: the walkable band's `y` only spans ~837-999,
all positive, so it can never place anything *behind* a backdrop band. Instead every
prop and fence piece names a `band` (`'backdrop' | 'ground' | 'front'`,
`SidePropSpec.band`), and `sideSceneProps.ts` resolves depth as
`BAND_DEPTH[band] + y * 0.001` — a large fixed offset per band (so bands never
interleave) plus a tiny per-`y` nudge (so objects in the same band still sort against
each other and the walker). `BAND_DEPTH.front` sits above every ground-plane depth,
which is what makes the front-grass "grass passes in front of feet" trick work — and
also why a fence (anchored at the near-grass/road seam, above the walkable band) sorts
behind the walker without a special case.

## Authoring a new scene

1. Add a file under `src/data/sideScenes/`, following `greenMeadowsRoad.ts`: pick
   `scale`/`firstTop`, reuse `STANDARD_FARM_LAYERS` (or a variant), author `road`,
   `props`, `fences`, `portals`.
2. Register it in `src/data/sideScenes/index.ts`'s `SideSceneId` union and `SIDE_SCENES`
   registry.
3. `validateSideSceneDescriptor` (`sideSceneAssets.ts`) catches the two authoring
   mistakes that are easy to make by hand: a fence gap outside its own run, and a
   `back`/`front` portal `x` outside the scene width.
4. New art: drop PNGs into `public/assets/farm-kit/` and run `npm run assets:farm-kit`.

`SidePortalSpec.to` is authored now but unused until iteration 2 wires up scene-to-scene
routing.
