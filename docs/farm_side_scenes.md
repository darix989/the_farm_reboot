# Lateral farm scenes — authoring guide

How the `FarmSide` scene assembly kit works, and how to author scene #6 and beyond.

Five scenes so far — `greenMeadowsRoad` (the main road), `hettysBarn`, `gateLane`,
`eastOrchard` and `oldPond` — with the real Level 1 cast on them: Rue walks each road, the scene's
authored NPCs stand on it, walking up to one opens the overworld talk chrome and can
start a Trial, and walking up to a portal fades to black and lands you on the neighbouring
scene. **Enter the Farm** boots `FarmSide`. `Farm.ts`, the top-down overworld, remains as
a secondary menu path.

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
facing? }`, resolved through `src/data/characters.ts` exactly the way
`FARM_NPCS` is in the top-down farm. `animalPacks.ts` reads the same list to work out which
atlases `FarmSide` has to fetch (`sideSceneAnimalIds(descriptor)`), so adding an animal to
a scene is one edit, not two. Rue is not in the list: the player is spawned by the scene.
Portal hops use `resolveEntrySpawn`. A first visit (no portal, no saved pose) uses an
authored `playerSpawn` when the scene has one — on `greenMeadowsRoad` that is beside Dot,
facing her, so her auto-opening greeting frames the pair rather than a raccoon at the west
edge and a dog by the barn. Scenes without `playerSpawn` still fall back to the first
portal (see "Travelling between scenes" below).

Level 1's homes: Dot and Cass on `greenMeadowsRoad` (Dot on the west approach, guardian of
the entrance; Cass west of the picket gate), Bella in `hettysBarn` (a sheep-sprite
placeholder until a cow lands), Bram in `gateLane`, Duchess and Tobias in `eastOrchard`,
Hetty at the water's edge in `oldPond`.

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
`FarmDialogue` through `farmDialogueFor` — the same encounter ladder, follow-ups and
Field Notes spine as the top-down farm. Talk can start a Trial; Leave returns to
`FarmSide` and restores Rue's last pose on that road (`gameStore.sideSceneResume`).

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

1. Add a file under `src/data/sideScenes/`, following `greenMeadowsRoad.ts` (or one of
   the smaller pocket scenes, `hettysBarn.ts`/`gateLane.ts`/`eastOrchard.ts`/`oldPond.ts`,
   for a scene with only a return portal): pick `scale`/`firstTop`, reuse
   `STANDARD_FARM_LAYERS` (or a variant — `oldPond` swaps `bg/near-grass` for
   `bg/near-muddy-water`), author `road`, `props`, `fences`, `npcs`, optional
   `playerSpawn`, `portals`.
2. Widen the `SideSceneId` union in `src/types/sideScene.ts` with the new scene's id, and
   register the descriptor in `src/data/sideScenes/index.ts`'s `SIDE_SCENES` registry.
   `DEFAULT_SIDE_SCENE_ID` there is only the *initial value* of `gameStore.activeSideSceneId`
   — the store field `FarmSide.init()` actually reads a scene's descriptor from (see
   "Travelling between scenes" below) — and it is also the one `animalPacks.ts` and
   `sceneAssets.ts` fall back to for a scene that hasn't set the store field explicitly
   (a fresh boot, or Reset Progress).
3. Place the character in `npcs`. Their talks, encounters and follow-ups come from the
   same `farmTalk.ts` / `farmMap.ts` ladder the top-down farm uses — do not author a
   separate `*Side` slot. A first-visit player pose belongs on `playerSpawn` (used when
   there is no portal hop and no saved resume), not as a dummy portal. A portal's own
   prompt label (`SidePortalLink.label`) is a plain `Labels` key too — author one per
   *direction of travel*, since a symmetric pair of portals reads differently depending
   which side of it you're standing on ("Enter the barn" one way, "Back to the road" the
   other).
4. `validateSideSceneDescriptor(descriptor, SIDE_SCENES)` (`sideSceneAssets.ts`) catches
   every authoring mistake that's easy to make by hand: a fence gap outside its own run; a
   `back`/`front` portal `x` outside the scene width; a duplicate portal id within one
   scene; a scene with no portals at all; and a portal's `to` link pointing at a scene or
   portal id that doesn't exist, or at one that doesn't point straight back (a one-way
   door is a soft lock — the player would have no way back). `src/data/sideScenes/
   sideScenes.test.ts` runs this against every registered scene, so a bad link fails
   `npm test` rather than surfacing as a stuck player in a manual playtest — that test is
   the authoring feedback loop for this step; run it after adding a scene, not just at the
   end.
5. New art: drop PNGs into `public/assets/farm-kit/` and run `npm run assets:farm-kit`.
   Reusing an asset id an existing scene already loads keeps every hop into the new scene
   warm (see the texture budget below); reaching for a brand new one is fine, but costs a
   cold load the first time any scene that references it is visited.

## Travelling between scenes

`FarmSide` is **one scene class, restarted onto a different descriptor** — there is no
`HettysBarn` scene class, no `GateLane` scene class. Every neighbouring scene is the same
`FarmSide` instance, told which `SIDE_SCENES` entry to read this time.

**Why one class.** The scene was already fully data-driven before this: the only thing
that changes between levels is which `SideSceneDescriptor` it reads. Four classes would
mean four copies of the same `create()`/`update()`/talk-camera/travel wiring, kept in sync
by hand.

**The one constraint that shapes the whole scene.** Phaser does **not** re-construct a
scene on restart. `scene.scene.start('FarmSide', data)` looks the existing `FarmSide`
instance up, then calls `sys.shutdown()` → `sys.start(data)` → `init(data)` → `preload()` →
`create()` on that *same* instance. **Class field initializers run once, at game boot, and
never again** — so a field like `private descriptor = SIDE_SCENES[...]` would stay pinned
to whichever level the game first booted into, forever. Every piece of instance state that
has to be right on every visit — `descriptor`, `sceneLayers`, `npcs`, the talk camera's
`blend` and `talkFrame`, `travelling`, the portal-disarm state — is instead assigned in
`init()`, the one lifecycle method Phaser re-runs on every restart. `teardown()` (on
`Phaser.Scenes.Events.SHUTDOWN`) additionally nulls `talkFrame` and resets `talkCamera.blend`
as a second line of defence, since a stale `talkFrame` would frame the *next* level's
first talk push against a point in the *previous* level's world coordinates.

**Which descriptor loads is a store field, not a scene constant.** `gameStore.
activeSideSceneId` (initial value `DEFAULT_SIDE_SCENE_ID`) is read by `FarmSide.init()` —
`this.descriptor = SIDE_SCENES[useGameStore.getState().activeSideSceneId]` — and by
`animalPacks.ts` / `sceneAssets.ts`, which need to know which descriptor's cast and kit
assets to fetch with no Phaser scene in hand yet (the loading-overlay gate runs *before*
the destination scene exists). Enter the Farm starts `FarmSide` without forcing
`DEFAULT_SIDE_SCENE_ID`, so a later visit resumes the last pocket (`sideSceneResume`).
`beginSideSceneTravel` sets `activeSideSceneId` before restarting onto the target.
Reset Progress clears the resume pose and returns the store field to the default road.
`scene.scene.start('FarmSide', { sceneId, entryPortalId })` also carries
`sceneId` in the start data, but `init()` doesn't read it back out — the store is the one
source of truth, and every caller keeps it in sync before starting the scene.

**The fade contract.** `create()` registers `cameras.main.fadeIn(...)` immediately after
`resetFarmUi()`, before anything else is built — a camera fade does not survive a restart
(`CameraManager.shutdown` destroys every camera and `start()` builds a fresh one), so
without this the first frame of a new level would show whatever the last frame of the old
one left behind, unfaded. `startTravel()` fades out, waits for
`Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE`, and only then calls
`beginSideSceneTravel` (`sideSceneTravel.ts`) — which validates the target scene/portal,
decides whether a loading overlay is owed (`sideSceneNeedsLoad`, against the *explicit*
target descriptor, never the store — see below), sets `activeSideSceneId`, and restarts.
If the hop is refused (the scene already shut down, another load in flight, a malformed
link), it fades back in rather than stranding the player on black. `prefersReducedMotion()`
skips both fades — a cut, not a fade, on the way in and the way out. `FarmSideUI` renders
nothing but its empty root while `farmStore.isTraveling` is set, since the camera fade
only darkens the Phaser canvas — without that the back button and hints would sit at full
brightness over a black screen for the whole transition, and would never even blink on a
warm hop (no fade, no load, near-instant restart).

**The arming rule.** A portal you just arrived through would otherwise immediately be back
in interact range — an edge spawn sits `EDGE_SPAWN_INSET` (120px) inside a 220px portal
radius, and a `back`/`front` spawn lands only a little downstage of the portal itself.
`FarmSide` disarms the entry portal at spawn (`disarmedPortalId`, set from
`init(data).entryPortalId`) and excludes it from `resolveFocus`'s portal candidates until
the player has stepped farther from it than `PORTAL_INTERACT_RADIUS` — at which point it
re-arms itself. Separately, `tryInteract()` ignores every key press for
`INTERACT_ARM_DELAY_MS` (250ms) after `create()`: OS key auto-repeat can fire a fresh `down`
transition on the new scene's brand-new `Key` objects if the player is still physically
holding the interact key when the restart lands, which would otherwise bounce them straight
back through the door they just walked through. The two guards cover different failure
modes — the disarm is positional and can last well past the 250ms window; the arm delay is
temporal and covers *any* interact (an NPC included), not just the entry portal.

**Portal focus vs. NPC focus.** `sideSceneInteractions.ts`'s `resolveFocus` scores every
candidate as `distance / itsOwnRadius`, not raw distance — ties go to the NPC. A flat
"nearest NPC always wins" rule makes some portals unenterable outright: on
`greenMeadowsRoad`, Cass's 400px talk radius reaches every point within 400px of the gate
portal 340px away, so at the gate itself a raw-distance contest would always pick her over
a 220px-radius portal standing right there. Scoring by radius fraction instead lets the
tight, close-in portal win exactly where a player standing at it would expect it to. See
`sideSceneInteractions.test.ts` for the regression, spelled out with the real numbers.

**The texture budget.** `hettysBarn` and `gateLane` are authored strictly from farm-kit
asset ids `greenMeadowsRoad` already uses, so every hop between them and the road is a warm
hop — no new texture ever has to be fetched mid-playthrough. `eastOrchard` breaks that: its
pond (`water/pond-muddy`) and reeds (`flowers/leaf-1-a`) are new asset ids none of its
siblings load, so the first hop into it from any other scene fetches them and shows the
loading overlay briefly. `oldPond` does the same for `bg/near-muddy-water`, the
near-background water band — a deliberate one-time cost for standing at the water's edge,
not an oversight. `src/data/sideScenes/
sideScenes.test.ts` pins the combined decoded-texture footprint of every asset id any
registered scene references; a new scene (or new prop) that reaches for an asset none of
its siblings load will grow that total and can fail the budget test, which is the point —
it is a deliberate prompt to consider whether the new cost is warranted, not a hard ceiling
on ever adding art.
