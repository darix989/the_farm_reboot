# Lateral farm scenes — authoring guide

How the `FarmSide` scene assembly kit works, and how to author scene #2 through #10.

One scene so far (`greenMeadowsRoad`) with the real cast on it: Rue walks the road, the
scene's authored NPCs stand on it, and walking up to one opens the overworld's own talk
chrome. No Trial routing and no scene-to-scene portals yet. `Farm.ts`, the top-down
overworld, is untouched and stays the live scene.

Iteration 1's debug walker is gone — the traversal contract it proved (a scene carries a
character from one entrance to one or more exits, walking on the road only) is carried by
the cast now. `DEBUG_SIDE_SCENE` in `FarmSide.ts` still draws the road band and the portal
markers over it.

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

## The cast: who stands on the road

`SideSceneDescriptor.npcs` names characters, never sprites — `{ characterId, x, y?,
facing?, talkSuffix }`, resolved through `src/data/characters.ts` exactly the way
`FARM_NPCS` is in the top-down farm. `animalPacks.ts` reads the same list to work out which
atlases `FarmSide` has to fetch (`farmSideAnimalIds`), so adding an animal to a scene is one
edit, not two. Rue is not in the list: the player is spawned by the scene, at the west
portal.

`sideSceneActors.ts` owns everything about standing on a road — scale, depth, facing, and
Rue's movement — including **`SIDE_SCALE`**, one flat multiplier on
`ANIMAL_STAGING.farmScale` that decides how big the cast reads here. That staging was fit
against the top-down farm's 56px placeholder NPCs; this world is drawn from the kit at a
scale where a picket fence is ~190 stage px tall. Keeping the cast's *relative* sizes and
applying one factor is the same approach `animalStaging.ts` itself documents — so an animal
that reads wrong here reads wrong on the top-down farm too, and the fix belongs in that
file's `MANUAL_ADJUST`, not in a side-scene special case.

Nothing on the road is solid: not the props, not the animals. It is a lane, not a maze.

## The talk camera

A walk-up talk runs *on this scene* (no `scene.start`), the same way a farm talk runs on
`Farm`: the scene writes `nearbyNpcId` to `farmStore`, `FarmSideUI` opens the shared
`FarmDialogue`, and the scene reads `talkingToNpcId` back to freeze Rue and move the camera.
The beats are a fixed `FARM_TALK` slot (`{characterId}{talkSuffix}`, e.g. `hettySide`) via
`sideSceneDialogue` — deliberately not `farmDialogueFor`, which resolves an encounter ladder
this scene cannot start yet.

The camera move itself is `sideSceneCamera.ts`. Two things about it are worth knowing before
changing it:

**It aims, it does not clip.** A frame says "put this world point *here* on the stage, at
this zoom", and a talk aims the middle of the two animals at the middle of
`TRIAL_STAGE_HOLE` — the band the Dialog and Actions panels leave clear. The zoom is
*fitted* to the pair's drawn boxes (`TALK_FILL`, capped by `TALK_MAX_ZOOM`) rather than
fixed: the cast's drawn sizes differ by a factor of three or more, and two animals may be
standing anywhere from nose to nose to the length of the interact radius apart, so a
constant that frames one pair crops the next. `Farm` gets the same
result by clipping its camera viewport to that rect, which it can do because it cuts
instantly. Clipping cannot be animated: shrinking the viewport moves Phaser's camera origin,
so the picture slides as the rect closes, and on the way back out the panels unmount before
the rect has grown again, leaving a band of empty canvas under a live scene.

**Aiming down means looking past the bottom of the layer stack**, which is built to fill the
stage and no further. `sideSceneLayers` answers that with a flat **ground fill** under the
front grass, in the colour that art's bottom rows already are. It also overlaps the band by
a few px: a `TileSprite`'s bottom edge samples across the texture's wrap, which lets a
one-pixel line of sky through — invisible at zoom 1, a hairline across the stage once a talk
pushes in.

The move is one linear tween (`TALK_CAMERA_MS`, 1.5s) read through *two* curves — the aim
leads, the zoom follows. On one clock the pair would spend most of the move hidden behind
the Dialog panel and then pop into frame at the end, because free roam leaves them near the
bottom of the stage. `prefers-reduced-motion` cuts straight to the framing instead.

Because the camera can now zoom and tilt, the backdrop bands are `scrollFactor(0, 1)`, not
`scrollFactor(0)` — their `y` is a world coordinate and has to move with the camera. At
`scrollY === 0`, which is everything but a talk, that is identical to pinning them.

## Authoring a new scene

1. Add a file under `src/data/sideScenes/`, following `greenMeadowsRoad.ts`: pick
   `scale`/`firstTop`, reuse `STANDARD_FARM_LAYERS` (or a variant), author `road`,
   `props`, `fences`, `npcs`, `portals`.
2. Register it in `src/data/sideScenes/index.ts`'s `SideSceneId` union and `SIDE_SCENES`
   registry. `FARM_SIDE_SCENE_ID` there is the one `FarmSide` boots into — and the one
   `animalPacks.ts` fetches art for.
3. Author each NPC's beats in `src/data/farmTalk.ts` under `{characterId}{talkSuffix}`, and
   their lines in `src/data/labels.ts`. A slot with no beats falls back to a single
   `farmDialog<Npc><Suffix>` label, so a new animal is never silent.
4. `validateSideSceneDescriptor` (`sideSceneAssets.ts`) catches the two authoring
   mistakes that are easy to make by hand: a fence gap outside its own run, and a
   `back`/`front` portal `x` outside the scene width.
5. New art: drop PNGs into `public/assets/farm-kit/` and run `npm run assets:farm-kit`.

`SidePortalSpec.to` is authored now but unused until iteration 2 wires up scene-to-scene
routing.
