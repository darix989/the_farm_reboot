# The Farm overworld

How the Phaser gameplay is built and how to extend it.

Level 1's encounters ([level_01_the_pond_motion.md](./level_01_the_pond_motion.md))
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
| The talk prompt, the talk screen | | ✓ |
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
src/data/farmMap.ts             the world: zones, NPCs (`gateTalk` / `talkStages`), spawn
src/utils/farmTalkGate.ts       conversation-level lock (`gateTalk`)
src/phaser/scenes/Farm.ts       the scene
src/phaser/farm/
  farmTextures.ts               placeholder art, generated at runtime
  farmPalette.ts                numeric colours (Phaser cannot read CSS vars)
  farmInput.ts                  arrows + WASD + joystick -> one vector
  VirtualJoystick.ts            touch thumbstick
src/store/farmStore.ts          Phaser <-> React handoff
src/store/progressStore.ts      which encounters are finished (persisted)
src/react/screens/FarmUI.tsx    the overlay
src/react/farm/
  FarmDialogue.tsx              talk screen: TrialLayout + Dialog / Actions, no log
  FarmTalkActionsPanel.tsx      Actions panel for a talk (Talk / Leave as word squares)
  farmDialogueState.ts          which conversation an animal offers right now
  CharacterStage.tsx            placeholder busts — Trial hole only, mounted by TrialUI
  FarmUI.module.scss
src/data/farmTalk.ts            beat lists keyed by npc + offer slot
src/phaser/animals/              placeholder animal spritesheets — see
                                  docs/characters-and-animations.md
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

Terrain still ships no art of its own — only the Phaser template's `bg/logo/star` and the
fallacy SVGs. Every zone texture is drawn with `Graphics` and baked into the texture
manager by `ensureFarmTextures()`. Zero binary assets; it works the day it is written.

The point is the **key contract**. Replacing a placeholder with real art means loading an
image under its exact key in `Preloader` and deleting the matching line from
`farmTextures.ts`. No scene code changes:

| Key | Size | Placeholder |
|---|---|---|
| `farm-zone-<kind>` | 64×64, tiled | flat colour + fixed dither |
| `farm-player` | 56×56 | rounded body with a nose (now hidden — see below) |
| `farm-npc` | 56×56 | circle, tinted per animal (fallback when a character has no `animal`) |
| `farm-shadow` | 56×16 | soft ellipse |
| `farm-stick-base` / `farm-stick-thumb` | 160 / 72 | two rings |

`ensureFarmTextures` is idempotent (it early-returns on `textures.exists`), which matters
because React StrictMode tears the whole game down and rebuilds it in dev.

The tile dither is a **fixed** checker, not random — random noise makes tile seams visible
where they repeat.

**Rue and the six Level 1 animals are no longer placeholders.** Any character with an
`animal` entry in `CHARACTERS` (`src/data/characters.ts`) is drawn as a real spritesheet
sprite instead of a tinted circle — see
[characters-and-animations.md](./characters-and-animations.md) for the whole pipeline. The
`farm-player` / `farm-npc` textures still exist and are still the fallback for any character
without an `animal` entry (today: none in Level 1, but the mechanism stays for whatever is
added next). Terrain is still coloured blocks.

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

The vector's *length* is reused as the animation's pace: `Farm.update` calls
`playerAnimator.playMove(dir.length())` while it is non-zero and `playIdle(true)` on the
frame it hits zero, so Rue walks when he moves, steps at half rate on a half-pushed stick,
and drops back to idling (and eating) the moment he stops. See
[characters-and-animations.md](./characters-and-animations.md) §3.3.

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
> values — `015_tobias_vs_rue` vs `level1-boss-pond-motion` — and only the former is a
> `DebateScenarioKey`.

**Why debates `scene.start` and not `sleep`/`pause`:** the Phaser canvas is full-stage at
all times (`.phaser-container` is `position: absolute; inset: 0`), and `TrialLayout`'s
"game hole" is just an empty `pointer-events: none` div, **not a clip**. A Farm scene
left running underneath a *debate* would paint the farm behind the Debate Log and Dialog
panels, not only in the hole. Stopping the scene sidesteps that; the player's position is
written to `gameStore` on `SHUTDOWN` and read back in `create`, so the round trip is
seamless.

A **normal talk** stays on the Farm scene. `talkingToNpcId` reframes
`cameras.main.setViewport(TRIAL_STAGE_HOLE)` so only the top band draws, centred on Rue
and the animal, and `TrialLayout` is mounted without a log — Dialog and Actions cover
the bottom half, the farm shows through the hole, and the top-right cell is empty. The
clear colour behind the rounded panel corners is the game's `#1a1a1a` (same as Trial's
camera), not the old Phaser-template blue.

---

## Progression

`progressStore` is the repo's first use of zustand's `persist` middleware. It exists because
an animal can own more than one encounter, so it has to know which one to offer next — Cass
owns three, Hetty two, Bram five, Duchess the boss. Tobias and Dot have no encounters;
their farm talk advances on `talkStages` (Tobias until the boss is done; Dot through the
welcome, then Cass, then Hetty, then the debate). Dot's first stage sets `completesFlag:
'dot-welcomed'` when the last beat's reveal settles, which is what unlocks Bram. It is
load-bearing, not a nicety — which is why `FarmTalkActionsPanel` mounts Talk / Lessons /
Leave only once that last beat has settled. Leave was previously offered on its own while
the line was still revealing, so ending the conversation one sentence early threw the whole
talk away and left the next animal locked with nothing to explain why.

`farmDialogueState.ts` derives the conversation from progress: an animal offers the first
scenario the player has not finished, and the slot key is the animal's id plus how far
down its list we are (`hetty1`, `cass2`, `bramDone`). Beats for that slot live in
[`farmTalk.ts`](../src/data/farmTalk.ts). Adding an encounter to an animal means adding
beats (and labels), not editing logic. Lengthening a list silently re-points every existing
beat row — the old `cass1` copy described the sparring bout, which became `#2`.

The first time the farm overlay mounts, `FarmUI` opens Dot's conversation and writes
`level1Started` to `progressStore`. Returning from a debate, from the menu, or a reload
does not force it again.

### Farm overlay tutorials

After Bram's first lesson, `useFarmTutorials` opens the same `TutorialOverlay` used in
debates, triggered by `GameCondition`s in [`farmTutorials.ts`](../src/data/farmTutorials.ts)
rather than the debate bus. Completing an entry writes `tutorial_completed` into
`progressStore` so it does not replay. Field Notes (`codex_open`, tabs, content) are
spotlight targets; `interactionMode: 'highlight'` keeps those controls usable. Rue is
frozen for the same reason a talk freezes him.

### Encounter gates

`ScenarioEntry.requires` (on the entry in `levels.ts`) is the overworld gate. The chain is:

```
requires → farmDialogueState.scenarioRequires → useUnmetConditionsHint → disabled Talk button
```

A gated encounter is still *offered*, by default. The animal talks; only Talk is disabled, and
the conversation is where the reason is given. Set `gateTalk: true` on the NPC to close the
conversation itself until the next encounter's `requires` are met (Hetty until Ad Hominem is
known; Bram until Dot has welcomed you; Cass until Bram has taught crossfire). `Farm.ts`
`tryInteract` and the overworld prompt both consult `farmNpcTalkLocked`. The main menu is
ungated.

The Level 1 unlock chain is Dot → Bram → Bram → Cass → Hetty → Duchess. Lesson 2 (`031`)
unlocks round-type labels and is required for Cass — she will not speak until
`bram-taught-crossfire` is set.

Bram's farm talk offers a **Lessons** menu once he has taught at least one lesson. Last beat,
once it has been read in full: Talk / Lessons / Leave (collapsing to Lessons / Leave when he
is finished). Picking a lesson
replays it; Back returns to the talk menu. Cap is three lettered buttons (Z / X / C).

Leaving a finished encounter goes through `applyEncounterRewards`, which marks it complete
and grants `teachesFallacies` / `setsDialogFlags` / `unlocksFeatures` in one write. Mark completion with the
store's **`activeDebateId`**, not `debate.id` — they are different values
(`015_tobias_vs_rue` vs `level1-boss-pond-motion`) and only the former is a
`DebateScenarioKey`.

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
2. Add a `FarmNpc` to `FARM_NPCS`. Animals with encounters list them in `scenarios` in the
   order they should be offered. A greeter with no encounter uses `talkStages` instead
   (condition → suffix, then `Done`). Set `gateTalk: true` if the conversation itself should
   stay closed until the next encounter's `requires` are met.
3. Add labels: the name (`farmNpc<Name>`), then sequential talk beats in
   [`src/data/farmTalk.ts`](../src/data/farmTalk.ts) plus the copy in `labels.ts`
   (`farmDialog<Name>1a`, `1b`, … and a `Done` conversation). A missing table row
   still falls back to a single `farmDialog<Name>1` / `Done` line.

No scene changes. Give an animal room to be approached — the interact radius is 170 and
NPCs pinched between two solid zones are awkward to reach.

---

## What is not here

No pathfinding, no NPC schedules, no day/night, no inventory, no audio. The player is a
sprite with a velocity and a depth sort — animated, as of
[characters-and-animations.md](./characters-and-animations.md), but not pathfinding.

Known rough edges:

- **Terrain is still coloured blocks.** Only characters have real art.
- **Rue walks, but never runs.** Movement plays the `move` behaviour (the raccoon's
  `walk_to_left` cycle, slowed to match his shorter stride); each animal's `run` clip is still
  unused, so there is no second gait above a threshold speed.
- **NPCs never move.** They stand on their spawn point and idle. The `move` behaviour is on
  the descriptor, not in the player code, so a wandering NPC would animate correctly the day
  one is given somewhere to wander.
- **`GameManager.whenReady` / `whenSceneReady` are broken** and were left alone. They pass a
  `(selector, listener)` pair to `useGameStore.subscribe`, which is the zustand v3/v4
  signature; this repo is on v5 without `subscribeWithSelector`, so the selector is invoked
  as the listener and the real callback is silently dropped. They are the source of 4 of the
  7 pre-existing `tsc` errors. **Do not use them** — the Farm scene reads the store directly
  in `create()`.
