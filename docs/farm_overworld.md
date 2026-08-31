# The Farm overworld

How the Phaser gameplay is built and how to extend it.

Level 1's six encounters ([level_01_the_pond_motion.md](./level_01_the_pond_motion.md))
were originally reachable only from a list of buttons on the main menu. The overworld is
the connective tissue: you play Rue, walk around Green Meadows Farm, find an animal, and
talking to it launches the encounter that animal owns. Finish it and you land back on the
spot you left.

Before this, Phaser was decorative — every scene was a template stub, and all real
gameplay was React. This is the first scene that does anything.

---

## The one architectural rule

**Phaser owns simulation. React owns UI.** They meet at a zustand store, never directly.

| | Phaser | React |
|---|---|---|
| Terrain, collision, camera | ✓ | |
| Movement, the virtual joystick | ✓ | |
| Which animal is in range | ✓ | |
| The talk prompt, the dialogue box | | ✓ |
| Encounter copy, buttons, styling | | ✓ |

The joystick is the apparent exception, and it is not: it is a *game control* driving a
velocity vector, not UI. It also could not live in React — the overlay is
`pointer-events: none`, so a React joystick would need a hole punched through it.

Everything else the player reads or clicks is React, which keeps one styling system
(`labels.ts`, the SCSS colour/font tokens, `TrialTextButton`) rather than a second one
drawn in Phaser text objects and re-tuned for every aspect ratio.

---

## File map

```
src/data/farmMap.ts             the world: zones, NPCs, spawn, interact radius
src/phaser/scenes/Farm.ts       the scene (189 lines)
src/phaser/farm/
  farmTextures.ts               placeholder art, generated at runtime
  farmPalette.ts                numeric colours (Phaser cannot read CSS vars)
  farmInput.ts                  arrows + WASD + joystick -> one vector
  VirtualJoystick.ts            touch thumbstick
src/store/farmStore.ts          Phaser <-> React handoff
src/store/progressStore.ts      which encounters are finished (persisted)
src/react/screens/FarmUI.tsx    the overlay
src/react/farm/
  FarmDialogue.tsx              the conversation box
  farmDialogueState.ts          which line an animal says right now
  FarmUI.module.scss
```

`main.ts` gained a `physics` block (Arcade, zero gravity — it had none at all, so
`this.physics` was `undefined` in every scene) and `render: { roundPixels: true }` to stop
sub-pixel shimmer while the camera follows.

---

## The world is rectangles, not a tilemap

`farmMap.ts` authors the farm as a list of `FarmZone` rects painted back-to-front, plus
`FarmNpc` records. No Tiled, no `.tmx`, no tileset — there was no tileset to build one
against, and a farm with four locations does not need one. If real art arrives, this file
is what a tilemap would replace.

The world is **2400×1600**, deliberately larger than the 1920×1080 stage so the camera has
somewhere to travel.

`FarmNpc.scenarios` is typed `DebateScenarioKey`, so the animal→encounter wiring is
checked at compile time against [`levels.ts`](../src/data/levels.ts). A typo is a build
error, not a runtime shrug.

---

## Placeholder art and the texture contract

The repo ships no character or terrain art — only the Phaser template's `bg/logo/star` and
the fallacy SVGs. So every farm texture is drawn with `Graphics` and baked into the texture
manager by `ensureFarmTextures()`. Zero binary assets; it works the day it is written.

The point is the **key contract**. Replacing placeholders with real art means loading images
under these exact keys in `Preloader` and deleting `farmTextures.ts`. No scene code changes:

| Key | Size | Placeholder |
|---|---|---|
| `farm-zone-<kind>` | 64×64, tiled | flat colour + fixed dither |
| `farm-player` | 56×56 | rounded body with a nose |
| `farm-npc` | 56×56 | circle, tinted per animal |
| `farm-shadow` | 56×16 | soft ellipse |
| `farm-stick-base` / `farm-stick-thumb` | 160 / 72 | two rings |

`ensureFarmTextures` is idempotent (it early-returns on `textures.exists`), which matters
because React StrictMode tears the whole game down and rebuilds it in dev.

The tile dither is a **fixed** checker, not random — random noise makes tile seams visible
where they repeat.

> Be honest about what this looks like: coloured blocks and circles. The farm will not read
> as a game until real art lands.

---

## Input: three sources, one vector

There was no input anywhere in the repo before this — not one `this.input`,
`createCursorKeys` or `pointerdown` call. Arrows, WASD and the joystick all collapse into a
single `Vector2` in `movementVector()`, so the scene has one movement path rather than
three:

```ts
const dir = movementVector(this.keys, this.joystick, this.moveVector);
this.player.setVelocity(dir.x * PLAYER_SPEED, dir.y * PLAYER_SPEED);
```

Note it ends `return out.limit(1)` and **not** `.normalize()`. Keyboard diagonals are
(±1, ±1), length 1.41, and must be clamped or diagonal movement is 41% faster. But the
joystick is already ≤ 1 and has to keep its analogue magnitude — a half-pushed stick should
walk slowly. `limit` clamps the long case without inflating the short one.

The joystick **anchors wherever the thumb lands** rather than sitting in a painted corner,
which is far more forgiving on a phone, and stays hidden until the first `pointer.wasTouch`
so desktop never sees it. Both sprites use `setScrollFactor(0)` to stay locked to the camera
while the world scrolls underneath.

---

## Launching an encounter, and coming back

Launching already worked; **returning did not exist and had to be built.**

**Out** — `FarmUI.startEncounter`:

```ts
store.setActiveDebate(scenario);   // must precede the scene switch, or TrialUI
store.setReturnSceneKey('Farm');   // mounts with the previous encounter for a frame
GameManager.switchScene('Trial');
```

**Back** — `gamePhase === 'debate_complete'` used to fall through to `default:` in
`TrialUI`'s footer, leaving Continue disabled forever with no way out of a finished
encounter. It now has a real case: a **Leave** button that records the completion and
returns to `returnSceneKey`.

`returnSceneKey` (on `gameStore`, default `'MainMenu'`) is what lets both entry points
coexist: the menu's direct-launch buttons return to the menu, the farm returns to the farm.
The tutorial's `onFinish: 'exit'` reads the same field instead of hard-coding `'MainMenu'`.

> Mark completion with the store's **`activeDebateId`**, not `debate.id`. They are different
> values — `015_duchess_vs_rue` vs `level1-boss-pond-motion` — and only the former is a
> `DebateScenarioKey`.

**Why `scene.start` and not `sleep`/`pause`:** the Phaser canvas is full-stage at all times
(`.phaser-container` is `position: absolute; inset: 0`), and `TrialLayout`'s "game hole" is
just an empty `pointer-events: none` div, **not a clip**. A scene left running underneath
would paint the farm behind the Debate Log and Wizard panels, not only in the hole.
Stopping the scene sidesteps that; the player's position is written to `gameStore` on
`SHUTDOWN` and read back in `create`, so the round trip is seamless.

Showing the farm inside the hole later would need
`cameras.main.setViewport(0, 0, 1152, 540)` — a deliberate change, not a side effect.

---

## Progression

`progressStore` is the repo's first use of zustand's `persist` middleware. It exists because
Cass and Bram each own **two** encounters, so an animal has to know which one to offer next
— it is load-bearing, not a nicety.

`farmDialogueState.ts` derives the line from progress: an animal offers the first scenario
the player has not finished, and the dialogue key is built from the animal's id plus how far
down its list we are (`farmDialogHetty1`, `farmDialogCass2`, `farmDialogBramDone`). Adding
an encounter to an animal means adding one label, not editing logic.

Nothing is locked. The order is the animals' own, not a gate, so every rung stays testable
out of sequence and the menu buttons still work.

The `merge` handler drops any saved key not in `DEBATES`, so a stale `localStorage` value
naming a scenario that no longer exists cannot brick the farm.

---

## Two bugs worth remembering

Both were found by **running the game**, not by reading the code. Neither produced a type
error, a lint warning, or a console message.

### `GameManager.switchScene` did not switch

It used `game.scene.start()` — the SceneManager — which *starts* a scene without stopping
the current one. The farm stayed alive under the debate, updating and rendering; its
`SHUTDOWN` never fired so the position was never saved; and returning to it was silently
refused by the `isActive` guard.

The fix is to switch through the **running scene's ScenePlugin** (`current.scene.start(key)`),
which stops the caller first. This also fixed a pre-existing latent case: a tutorial exit
left the Trial scene running underneath the main menu.

```
game.scene.start(key)     // SceneManager: starts target, leaves caller running
scene.scene.start(key)    // ScenePlugin:  stops caller, then starts target  <- what "switch" means
```

### Static bodies sat where the rectangle was centred

Zones are authored as top-left rects, and the obvious code is wrong:

```ts
this.add.rectangle(zone.x, zone.y, w, h).setOrigin(0, 0);  // WRONG
```

`add.rectangle` **centres** on its coordinates, and the static body is built from that
centre. `setOrigin(0, 0)` moves the drawing but not the collider, so the pond's collision
sat 200px above the water and Rue kept snagging on invisible walls. Compute the centre
explicitly instead.

Turning on `arcade: { debug: true }` in `main.ts` draws every body outline and makes this
class of bug obvious in one screenshot.

---

## Adding a location or an animal

1. Add `FarmZone` rects to `FARM_ZONES` (later entries paint over earlier ones; set
   `solid: true` to block the player; `label` draws a world caption).
2. Add a `FarmNpc` to `FARM_NPCS` with its `scenarios` in the order it should offer them.
3. Add labels: the name (`farmNpc<Name>`), one dialogue line per scenario
   (`farmDialog<Name>1`, `2`, …) and a closing line (`farmDialog<Name>Done`).

No scene changes. Give an animal room to be approached — the interact radius is 170 and
NPCs pinched between two solid zones are awkward to reach.

---

## What is not here

No pathfinding, no NPC schedules, no day/night, no inventory, no animations, no audio. The
player is a sprite with a velocity and a depth sort.

Known rough edges:

- **The Trial scene's placeholder.** `Trial.ts` still draws "This is where the trial gameplay
  would be implemented" across the whole canvas — visible through the top-left hole and,
  dimmed, behind the panels. Increasingly odd next to a real overworld.
- **Placeholder art**, as above.
- **`GameManager.whenReady` / `whenSceneReady` are broken** and were left alone. They pass a
  `(selector, listener)` pair to `useGameStore.subscribe`, which is the zustand v3/v4
  signature; this repo is on v5 without `subscribeWithSelector`, so the selector is invoked
  as the listener and the real callback is silently dropped. They are the source of 4 of the
  7 pre-existing `tsc` errors. **Do not use them** — the Farm scene reads the store directly
  in `create()`.
