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

## Rendering: one recipe for every band

`sideSceneLayers.ts` builds the stack. Every band — backdrop or road — is
viewport-pinned (`scrollFactor(0)`, sized to its own band height, not the full
viewport, since a `TileSprite`'s fill canvas is real GPU + CPU memory) with
`tilePositionX` driven from the scene's own `scrollX` each frame:
`tilePositionX = (scrollX * parallax) / scale`. A backdrop band's `parallax < 1` scrolls
it slower than the camera; the road and front-grass (`parallax === 1`) scroll at exactly
the camera's own rate, which is what "pixel-locked to world coordinates" means for a
`scrollFactor(0)` object — there is nothing world-space about them.

This only works lag-free because `FarmSide` never reads `camera.scrollX` back out of
the camera (that value is one frame stale — Phaser assigns it during its own render
pass, *after* `update()` runs). Instead the scene computes `scrollX` itself once per
frame (`FarmSide.updateCamera`) and both assigns it to `cam.scrollX` and passes the same
local value to `sceneLayers.update()`, so every band's `tilePositionX` and the camera
agree in the same tick. An earlier version gave `parallax === 1` bands a different,
"world-space `TileSprite` re-snapped to a tile boundary every frame" recipe instead —
the textbook fix for that one-frame lag, and unnecessary here since there's no lag to
fix — and its re-snap math used the band's native content width rather than the
power-of-two width the file is actually padded to, so the road's texture visibly jumped
a few pixels out of phase each time the snap point was crossed. Don't reintroduce it.

## The fence run isn't tiled at its own width

`sideSceneFence.ts` places `fence/repeating-piece.png` at a pitch of
`FENCE_PIECE_TILE_WIDTH_NATIVE_PX` (753 native px), not the file's own 795px width.
Column-by-column opaque-pixel coverage on the source art shows why: it's one post
followed by 5 picket boards at a ~118px rhythm, and the last picket ends around x=753 —
the remaining ~42px to the file's edge is bare horizontal rail with no picket
silhouette over it, there so the rail has somewhere to run into the *next* piece's
post. Placing pieces at the full 795px width leaves that stub exposed as a real,
visible hole (grass showing clean through) every ~795 native px, not a rounding
artifact — pitching at the picket rhythm's own repeat distance instead lands the next
post exactly where the stub was heading, covering it. If the fence art is ever
re-exported, remeasure this the same way (per-column opaque pixel count; look for where
it drops to a flat low baseline and stays there) rather than assuming the file width.

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
