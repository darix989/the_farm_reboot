# Characters and animations

How Level 1's cast went from six coloured placeholder circles to six animated
spritesheet sprites, shared between the Farm overworld (Phaser) and the Trial debate
stage (also Phaser, labelled by React).

Ported from a sibling prototype (`the_farm`), which built this system against a full
Tiled tilemap and a 16-strong background herd. This repo has neither — the farm is
plain rectangles ([`farmMap.ts`](../src/data/farmMap.ts)) and the Trial stage is a
fixed rect — so the spawn/casting layer was rewritten; the frame-data model and the
weighted idle/alert playback engine were ported close to verbatim.

---

## 1. The cast, today

Since the Level 1 rewrite, **every character is the animal their sprite draws**. The old
"played by" mismatches are gone: the writing was moved onto the art rather than the other
way round, because Level 1 teaches Ad Hominem and needs a cast a farm already has opinions
about.

| Character | Species | Art (`AnimalSpriteId`)           | Role                      |
| --------- | ------- | -------------------------------- | ------------------------- |
| Rue       | raccoon | `raccoon`                        | player                    |
| Hetty     | sheep   | `white-sheep-1`                  | farm NPC                  |
| Cass      | fox     | `fox`                            | farm NPC, coach           |
| Bram      | wolf    | `brown-wolf`                     | farm NPC                  |
| Tobias    | donkey  | `donkey-grey`                    | farm NPC, Trial opponent  |
| Duchess   | owl     | `owl`                            | farm NPC, Trial moderator |
| Dot       | dog     | `dog` (no emotions)              | farm greeter              |

The three outsiders (raccoon, fox, wolf) are the ones the level's fallacies point at; the
in-group is the sheep and the donkey. See `level_01_the_pond_motion.md`.

Portrait coverage is uneven and falls back silently. `donkey-grey` has only `talking`,
`sneaky` and `angry` cropped — which happens to be everything a boss antagonist derives,
since a statement carrying a fallacy reads as `sneaky`. `dog` has no clips at all, which is
why Dot never debates.

The mapping lives in one place: the optional `animal` field on
[`CHARACTERS`](../src/data/characters.ts). A character with no `animal` entry (every
legacy scenario's speakers — `barnaby`, `pip`, `monty`, `penny`, `bella`, `woolsey`)
keeps the original CSS bust in the Trial (the Farm's corner busts are gone — its dialogue
box shows an `AnimalFace` portrait instead, and nothing where there is no art). Nothing else
needs to know a character has no art — `resolveCharacter()` never throws, and both
scenes check `visual.animal` before doing anything sprite-related.

---

## 2. Assets on disk

Eleven multi-page TexturePacker atlases, copied from the prototype:

```
public/assets/characters/
  donkey-grey.json + donkey-grey/donkey-grey-{0..11}.png
  owl.json         + owl/owl-{0..6}.png
  raccoon.json     + raccoon/raccoon-{0..17}.png
  fox.json         + fox/fox-{0..4}.png
  white-sheep-1.json + white-sheep-1/white-sheep-1-{0..2}.png
  brown-wolf.json  + brown-wolf/brown-wolf-{0..8}.png
  cow.json         + cow/cow-{0..4}.png
  cow-female-001.json + cow_female_001/cow_female_001-{0..5}.png
  dog.json         + dog/dog-{0..11}.png
  mouse.json       + mouse/mouse-{0..7}.png
  pig.json         + pig/pig-{0..1}.png
```

Both the JSON descriptors and the PNG pages live under `public/assets/` (loaded by
Phaser's `this.load.multiatlas` from the scene that needs them — see
[`animalPacks.ts`](../src/phaser/animals/animalPacks.ts)), **not** imported as ES
modules — eleven descriptors have no reason to sit in the main JS bundle and be parsed
on the main menu, even though `resolveJsonModule` is on.

Two naming mismatches, both inherited from the prototype. The `textures[].image` field
inside each descriptor is the ultimate authority:

- `brown-wolf.json` was renamed from the source's `brown_wolf.json` (dashed id, dashed dir).
- `cow-female-001` keeps the source's underscored image directory (`cow_female_001/`) and
  PNG names; only the JSON file was renamed to match the dashed id, so
  `load.multiatlas('cow-female-001', 'characters/cow-female-001.json')` finds it.

**Frame naming — three shapes in this set:**

| Shape                              | Example frame filename                                    | Animals                                                                 | Needs `framePrefix`?                     |
| ---------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------- |
| Flat, dash-separated               | `__red_fox_idle-3.png`                                    | donkey-grey, fox, white-sheep-1, brown-wolf, raccoon, dog, mouse, pig, cow-female-001 | no — matches the default `${frameStem}-` |
| Foldered, dash-separated           | `__black_and_white_cow_die/__black_and_white_cow_die-0.png` | cow                                                                     | yes                                      |
| Foldered, **underscore**-separated | `__owl_no_tail_idle_awake/__owl_no_tail_idle_awake_4.png` | owl                                                                     | yes, on all five animations              |

The owl is the trap: its frame folder ends in `_`, not `-`, so every one of its
`baseAnimations` entries needs an explicit `framePrefix` copied character-for-character.
Get it wrong and `generateFrameNames` silently returns zero frames. The cow is the same
shape with a trailing `-`, so its prefixes are easier to copy but still mandatory.

---

## 3. Five files carry the system

| File                                                                                    | Role                                                                                                               |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| [`src/phaser/animals/animalDescriptors.ts`](../src/phaser/animals/animalDescriptors.ts) | The data. One `AnimalDescriptor` per animal: frame ranges + idle/alert behaviour.                                  |
| [`src/phaser/animals/animalAnimations.ts`](../src/phaser/animals/animalAnimations.ts)   | Turns descriptors into Phaser animations (`ensureAnimalAnimations`) and resolves per-animal setup (`animalSetup`). |
| [`src/phaser/animals/AnimalAnimator.ts`](../src/phaser/animals/AnimalAnimator.ts)       | The playback engine: weighted sequence picking, chaining, self-looping. Drives any `Phaser.GameObjects.Sprite`.    |
| [`src/phaser/animals/animalAtlases.ts`](../src/phaser/animals/animalAtlases.ts)         | Queues a given list of multiatlases (`loadAnimalAtlases(scene, ids)`).                                             |
| [`src/phaser/animals/animalPacks.ts`](../src/phaser/animals/animalPacks.ts)             | Derives which ids a scene needs and queues them. Farm = Level 1 roster; Trial = debate cast; Gallery = every id.   |

Plus [`src/phaser/animals/animalStaging.ts`](../src/phaser/animals/animalStaging.ts) for
per-surface scale, and the three scenes that use all of the above:
[`Farm.ts`](../src/phaser/scenes/Farm.ts) (the overworld),
[`Trial.ts`](../src/phaser/scenes/Trial.ts) (the debate stage), and
[`AnimalGallery.ts`](../src/phaser/scenes/AnimalGallery.ts) (clip review).

### 3.1 `AnimalDescriptor` — the behaviour contract

```ts
export interface AnimalAnimation {
  name: string; // logical name used in behaviour sequences ('idle', 'eat_start')
  frameStem: string; // frame-name stem from the art export. NOT the Phaser key.
  framePrefix?: string; // override when frames don't follow `${frameStem}-`
  startFrameIndex?: number;
  endFrameIndex: number; // INCLUSIVE. 9 means ten frames, 0..9.
  frameRate?: number; // default 12
}

export interface AnimalDescriptor {
  id: AnimalSpriteId;
  baseAnimations: readonly AnimalAnimation[];
  idle?: AnimalBehaviour; // [weight, sequence][], weights cumulative, should sum to 1
  idleTrial?: AnimalBehaviour; // replaces `idle` when staged in a Trial
  alert?: AnimalBehaviour;
  alertTrial?: AnimalBehaviour;
  move?: AnimalBehaviour; // locomotion cycle, held while the character translates
  transitions?: readonly (readonly [string, readonly string[]])[];
}
```

Renamed from the prototype's `CharacterInfo` / `CharacterAnimation`: `id` → `frameStem`
(it was both the Phaser animation key _and_ the frame-name prefix there — the root of a
global-key collision risk, fixed here — see §5), `prefix` → `framePrefix`. `scale` and
`manualPivot` were dropped from the type entirely — see §4.

Registration is a plain `Record<AnimalSpriteId, AnimalDescriptor>`
(`ANIMAL_DESCRIPTORS`), not the prototype's `ANIMALS.push(...)` side effects — the
compiler enforces that every `AnimalSpriteId` has a descriptor, instead of a silently
unregistered entry producing zero animations.

Every animal has a `move` except two: Duchess (`owl`), whose atlas has none and who flies
(`flap_wings`) rather than walks, and `cow-female-001`, whose atlas is idle plus two speak
loops. Unlike `idle`, a `move` sequence should loop (`repeat: -1`) — movement ends when
the _character_ stops, not when the clip does. Only the player translates today; the field
is on the descriptor rather than in `Farm.ts` so a wandering NPC or a cutscene tween gets
the same cycle for free.

Two animals use `idleTrial`:

- **Rue (`raccoon`)** must. Every raccoon emotion clip was generated from
  `__raccoon_sitting_up_idle-0.png`, so standing him at the podium would pop him from a
  four-legged crouch to sitting upright the moment he speaks. `usesTrialIdle` is a
  **casting** field on `CharacterVisual` (default `true`), not a property of the sprite —
  the Trial scene passes `staging: visual.usesTrialIdle ? 'trial' : 'farm'`.
- **Duchess (`donkey-grey`)** got a standing `idleTrial` because the donkey's field `idle`
  grazes 70% of the time, which is wrong for anyone at a podium. Its emotion clips
  come from `__grey_donkey_idle-0.png`, so the standing trial idle is consistent with them.
  Tobias the owl has no `idleTrial`; his field idle is already an awake perch.

No animal uses `alertTrial`. The dog is the one user of `transitions`: a sitting dog must
stand up before it can bark.

### 3.2 Building animations — `ensureAnimalAnimations`

Called from the scene that just loaded its animal pack — `Farm.create()`,
`Trial.create()`, `AnimalGallery.create()` — **not** from `Preloader`. Animation keys are
global to the Phaser game; the source prototype builds them in its Trial scene and
re-registers every key on each entry (a documented bug). Here the function is
idempotent (`anims.exists(key)` guards each animation, `textures.exists` guards each
animal) and is passed only the ids that scene queued, so a Farm entry does not warn
about gallery-only animals that were never fetched.

`Preloader` no longer touches character art. Each playable scene's `preload()` calls
`queueAnimalPackForScene`, Phaser waits for those files, then `create()` calls
`ensureAnimalPackForScene`. A second visit is a cache hit: `textures.exists` skips the
queue, `anims.exists` skips registration.

The same idempotence matters because React StrictMode tears the Phaser game down and
rebuilds it in dev — the same idiom as `ensureFarmTextures()`.

`repeat` is deliberately **not** set when an animation is created — looping is a
property of the _sequence entry_ (`{ key: 'idle', repeat: -1 }`), so the same clip can
loop in one context and play once in another.

### 3.3 Playback — `AnimalAnimator`

A controller, not a sprite subclass — attach it to any existing
`Phaser.GameObjects.Sprite`:

```ts
const setup = animalSetup('donkey-grey');
const sprite = this.add.sprite(x, y, setup.textureKey, setup.restFrameName);
const animator = attachAnimalAnimator(sprite, setup, { staging: 'farm' });
animator?.playIdle();
```

`playIdle()` picks a weighted sequence from `idle` (or `idleTrial` if
`staging: 'trial'`) and starts it with `playAfterRepeat` — the sprite eases out of
whatever it was doing. `playAlert()` does the same from `alert`/`alertTrial` but with
`stop()` + `play()` — a reaction must land immediately, on the beat of dialogue.

On `ANIMATION_COMPLETE`, guarded so it fires only once the whole chained sequence has
finished, the animator re-rolls a fresh weighted sequence and keeps going — this is
what keeps an idling animal varying its behaviour forever with no per-frame update code.

`playMove(speed01)` holds the `move` cycle while the character is translating. It is meant
to be called **every frame** from a scene's `update` — once the cycle is running, further
calls only retune playback rate — and `speed01` is the fraction of top speed the character
is travelling at, so a half-pushed joystick steps at half rate (`Farm.update` passes the
movement vector's length, which keeps the stick's analogue magnitude). At full speed the
cycle plays at `MOVE_RATE_AT_TOP_SPEED` (0.52): the cast's clips were authored at a stroll —
15 frames at 12fps — and the overworld moves Rue at 167px/s, so at rate 1 his paws skate.
That constant tracks `PLAYER_SPEED` — the skate is a ratio of stride length to ground
speed, and it was retuned from 0.77 when the player swapped from donkey to raccoon. The
floor is `MIN_MOVE_RATE` (0.28) so a barely-pushed joystick still reads as a walk.
Changing one number without the other reintroduces the skate.
Nothing ends the cycle by itself, because nothing but the caller knows the character has
stopped: the scene calls `playIdle(true)` on that frame. That `immediate` argument (default
off) cuts straight to idle instead of easing in after the current repeat, which for a
looping stride would leave the animal marching in place for up to a second after the key
was released. An animal with no `move` behaviour idles instead of freezing on a missing key.

**Why not the prototype's `HerdAnimal extends Phaser.GameObjects.Sprite`:** Rue needs an
Arcade physics body, and these atlases' frames vary wildly in trimmed size (the donkey
runs up to 784×702px). A body attached straight to an animated sprite would have its
collider change shape every frame. So in `Farm.ts` the physics body stays on the
original invisible 56×56 placeholder sprite, and the animated art is a separate
follower sprite positioned each frame from the body — see that file's `spawnPlayer` /
`update`.

---

## 4. Scale and placement — `animalStaging.ts`

Two approaches were tried before this one and both looked wrong:

1. **The prototype's own `CharacterInfo.scale`** (donkey-grey 0.7, owl 0.4, raccoon 0.4,
   fox 0.6, white-sheep-1 1.0, brown-wolf 0.7) applied directly. It was tuned against a
   Tiled world with 256px tiles and a Trial camera that zooms between 0.6 and 0.85 —
   nothing here has either, so the absolute numbers are meaningless in this repo.
2. **Normalising every animal to the same apparent height**, ignoring the prototype's
   scale entirely. This fights the art: a raccoon is small and a donkey is not, and the
   prototype's scale already encodes that (donkey-grey/brown-wolf, at 0.7, are the two
   biggest; owl/raccoon, at 0.4, the smallest). Forcing the raccoon's low, wide crouching
   idle pose up to donkey height rendered it nearly as wide as an entire Trial stage slot,
   overlapping its neighbours there.

So `animalStaging.ts` **keeps the prototype's relative scale ratios** — they are the
actual art direction — and applies one flat multiplier per surface:
`farmScale = sourceScale * 0.377`, `trialScale = sourceScale * 0.807`, chosen so the
donkey landed at roughly 140px tall on the farm (next to the 56px placeholder NPCs) and
roughly 300px in the 1920×540 Trial hole, back when the donkey was the player. That
preserves the designed size hierarchy — donkey/wolf biggest, sheep mid-sized, fox/owl
smaller, raccoon smallest and widest — while fitting this repo's very different pixel
budget.

Rue wears the raccoon now. Unadjusted, its farm crouch renders 135×56 — exactly as tall
as the 56px placeholder NPC boxes it is meant to be the protagonist among. Matching the
donkey's old 140px height is not the fix either: at 2.4:1 the crouch would come out
336px wide. `MANUAL_ADJUST` therefore accepts either a bare number (both surfaces, as
before) or `{ farm?, trial? }`. The raccoon is `{ farm: 1.5 }` (~202×85 on the farm);
`trial` stays at 1 because there Rue *sits up*, a taller and much narrower pose, and that
is the pose the existing trial multiplier was already staging Tobias in.

Measured visible pixel bounds of each animal's idle rest frame (`spriteSourceSize` in the
descriptor JSON — what actually renders, not the shared `sourceSize` export canvas, which
can hugely overstate a crouching or narrow pose — the raccoon's idle crouch fills only
~40% of its canvas height) — multiplying by the prototype's scale gives the "as designed"
apparent size the two multipliers above were fit to:

| Animal          | Source scale | Idle frame visible (w×h) | As-designed apparent (w×h)     |
| --------------- | ------------ | ------------------------ | ------------------------------ |
| `donkey-grey`   | 0.7          | 561×531                  | 393×372                        |
| `owl`           | 0.4          | 448×587                  | 179×235                        |
| `raccoon`       | 0.4          | 896×373                  | **358×149 — wide, low crouch** |
| `fox`           | 0.6          | 598×391                  | 359×235                        |
| `white-sheep-1` | 1.0          | 311×267                  | 311×267                        |
| `brown-wolf`    | 0.7          | 589×468                  | 412×328                        |
| `cow`           | 1.0          | 479×383                  | 479×383                        |
| `cow-female-001`| 1.3          | 406×330                  | **528×429 — largest in the set** |
| `dog`           | 0.6          | 700×568                  | 420×341                        |
| `mouse`         | 0.35         | 735×469                  | 257×164                        |
| `pig`           | 1.0          | 419×229                  | 419×229                        |

Recomputing: pick a target donkey height for the surface, divide by 372 (its as-designed
apparent height above) to get that surface's multiplier, then multiply every animal's
source scale by it.

`TRIAL_SCALE_BY_CAST_SIZE` shrinks the whole cast a little further when three characters
share the stage instead of one or two (Duchess vs Rue, moderated by Tobias, is the only
three-character scenario today) — with the ratios above, even the tightest neighbouring
pair (donkey next to raccoon) clears the gap between adjacent stage slots without it, but
it also just reads better than three animals crowding the full width of the hole.

Every atlas except the mouse draws its animal facing **left**. The mouse faces **right**
(`isFlipped` on its descriptor). `animalArtFacesLeft()` in `animalStaging.ts` is the
single check; Farm, Trial and the gallery consult it rather than assuming the whole
cast matches. A sprite that should face inward/right still `setFlipX(true)` when the
art faces left, and the opposite when it faces right.

**Feet origin, not canvas bottom.** TexturePacker trims transparent pixels but Phaser
still sizes the sprite to the untrimmed `sourceSize`. `setOrigin(0.5, 1)` therefore
pins the export-canvas bottom, which only matches the feet for the owl — everyone else
has 55–198px of padding below the hooves (the raccoon is worst: its canvas is sized for
the sitting-up pose). `applyAtlasFeetOrigin` reads the current frame's trim and sets
`originY` at the visible bottom, so Farm shadows, the Trial floor line and the gallery
floor all sit under the feet. Generated emotion clips get a matching origin from
`normalize.mjs` (§9.4).

The dog atlas is the one extra trap: every frame carries a TexturePacker `anchor` at
the visual centre (`{x:0.5,y:0.5}` on idle). Phaser copies that onto the sprite on
every `setFrame`, which undoes the feet origin the moment a clip plays. The helper
clears `customPivot` on the whole texture so those anchors are ignored.

---

## 5. Two bugs the prototype had, fixed here

**Global (non-namespaced) animation keys.** The prototype's Phaser animation key was the
art-export frame stem (`__grey_donkey_idle`) — global across the whole game, unique only
by accident. Here the key is namespaced: `animalAnimKey(animalId, name)` →
`"donkey-grey/idle"`. Two animals can never collide, and name→key lookup is a pure
string build instead of a `.find()` over `baseAnimations`.

**Silent freeze on a typo'd sequence key.** In the prototype, a `key` in an `idle`/`alert`
sequence that didn't match any `baseAnimations[].name` resolved to `''`, and
`play({ key: '' })` failed with no error — the animal just stopped moving, forever.
Here, `AnimalAnimator` checks `anims.animationManager.exists(key)` before playing;
an unresolved key logs `console.warn('[animals] "<animal>" has no animation named
"<name>"')` and is dropped from the sequence. If every key in a sequence is dropped,
the animal falls back to looping its rest pose rather than freezing outright.

**Kept, deliberately:** `pickSequence`'s fallback when a behaviour's weights sum to less
than 1 — it returns the first sequence rather than throwing. This is graceful
degradation for a mis-authored descriptor, not a bug, and the port keeps it.

---

## 6. `prefers-reduced-motion`

`AnimalAnimator` checks `prefersReducedMotion()` (see
[`src/utils/reducedMotion.ts`](../src/utils/reducedMotion.ts), the one shared definition
InteractivePanel's reveal animation also uses) before playing anything. With the
preference on, every animal freezes on its rest frame instead of animating, and resumes
if the preference is toggled off mid-session. The active-speaker cue in a Trial then
relies entirely on static properties — depth and alpha, both already part of
`Trial.applyActiveSpeaker` — never a tween.

---

## 7. Debug aids

Two flags at the top of [`Trial.ts`](../src/phaser/scenes/Trial.ts), both off by
default:

- **`DEBUG_TRIAL_STAGE`** — strokes the `TRIAL_STAGE_HOLE` rect (from
  [`src/utils/constants.ts`](../src/utils/constants.ts)) and drops a marker at each
  computed cast slot. Nothing enforces that this rect and the `.trialGameHole` CSS grid
  cell agree — if they ever drift, turning this on shows it immediately. The same goes for
  `CharacterStage`'s nameplates, which place each label at the identical `(i + 1) / (n + 1)`
  slot so it sits over its own animal.
- **`DEBUG_STAGE_KEYS`** — `A` forces the whole Trial cast to alert, `S` back to idle,
  and `1`..`5` play each `ANIMAL_EMOTIONS` entry in order (§9). Off by default because
  the Trial screen has focusable React inputs and an always-on key handler would fire
  while typing; flip it on locally when tuning a descriptor's sequences, or to check a
  freshly promoted emotion clip without playing a debate to the beat that triggers it.

For looking at the animals themselves rather than at a scene, the **Animation Gallery**
(main menu) is a better tool than either flag — see §9.6.

`arcade: { debug: true }` in [`main.ts`](../src/phaser/main.ts) still draws physics
body outlines, which is how you confirm Rue's invisible collider is tracking correctly
underneath the animated follower sprite (see §3.3).

---

## 8. Adding a new animal

1. **Assets.** Export the atlas (pages + TexturePacker JSON). Put the PNG pages and the
   descriptor JSON under `public/assets/characters/<id>/` and
   `public/assets/characters/<id>.json`. Confirm the descriptor's `textures[].image`
   paths actually match the directory name you used.
2. **`AnimalSpriteId`** — add the id to the union in
   [`src/data/characters.ts`](../src/data/characters.ts).
3. **`animalDescriptors.ts`** — add an `AnimalDescriptor` and register it in
   `ANIMAL_DESCRIPTORS`. Derive `baseAnimations` from the atlas's actual frame names; set
   `framePrefix` unless they follow `<frameStem>-<n>.png` exactly. `endFrameIndex` is
   inclusive.
   Give it a `move` behaviour if it will ever translate (the player, or a future wandering
   NPC) — a looping walk cycle from its atlas.
4. **`animalAnimations.ts`** — add the animal's resting-pose name to `REST_POSE`.
5. **`animalStaging.ts`** — add a `farmScale` / `trialScale` entry. Start from a
   measured max frame size and tune by eye.
6. **`characters.ts`** — set `animal: '<id>'` on whichever `CHARACTERS` entry should wear
   this skin.
7. **Loading.** `animalAtlases.ts` needs no change — it loads whatever ids it is given.
   [`animalPacks.ts`](../src/phaser/animals/animalPacks.ts) derives those ids:
   - **Gallery** loads every `ANIMAL_SPRITE_IDS` entry on open, so a descriptor with no
     character is still previewable.
   - **Farm** loads whoever `CHARACTERS` + `FARM_NPCS` (plus the player) name. Set
     `animal: '<id>'` on a farm character and the atlas is queued the next time the
     overworld starts.
   - **Trial** loads the active debate's cast the same way. From the farm this is a
     cache hit; from the main menu it fetches only that scenario's animals.

**Verify.** `npm run dev-nolog`, enter the Farm, and look for the new sprite idling near
its zone. If it is cast as a Trial participant, launch that scenario and check it lands
in the right stage slot, faces the right way, and reacts to being the active speaker.

---

## 9. Emotions — generated clips

`idle` and `alert` are all the ported cast knows. That is enough for a background herd and
not enough for a debate: every speaker "reacts" identically whether they are conceding a
point, sneering at one, or slipping a fallacy past the player. Emotions are the second
register, and unlike everything in §1–§8 the art for them is **generated**, not exported
from the source pack.

### 9.1 The vocabulary

[`animalEmotions.ts`](../src/phaser/animals/animalEmotions.ts) owns `ANIMAL_EMOTIONS`:
`talking`, `doubtful`, `angry`, `thinking`, `sneaky`. Each names a **posture**, not a facial
expression — a Trial sprite is ~300px tall, so its face is 50–80px and a raised eyebrow does
not survive the downscale. Anything that has to read on the stage has to read in the
silhouette.

That module imports no Phaser deliberately: the vocabulary is shared. Scenarios author it,
the React overlay derives it, `trialStageStore` carries it, and only then does Phaser play it.

### 9.2 Which emotion plays, and when

`activeEmotionForWorkflow()` in
[`trialHelpers.ts`](../src/react/trial/utils/trialHelpers.ts) sits next to
`activeSpeakerIdForWorkflow()` and takes the identical arguments, so both come off the same
workflow snapshot — a speaker paired with the previous line's emotion is worse than no
emotion. `TrialUI` pushes the pair through `trialStageStore` in one setter, for the same
reason.

Derivation over authoring, by default. No existing scenario has an `emotion` field, but the
data already carries the intent:

| Signal                                             | Emotion    |
| -------------------------------------------------- | ---------- |
| Statement whose sentences carry `logicalFallacies` | `sneaky`   |
| `crossfire` statement                              | `doubtful` |
| Player round, nothing picked yet                   | `thinking` |
| Player confirming a `logical_fallacy` option       | `sneaky`   |
| Anything else                                      | `talking`  |

An authored `Statement.emotion` / `PlayerOption.emotion` overrides all of it. Reach for one
only where the derived emotion is wrong for the beat.

### 9.3 Assets, and why they are not atlases

Generated clips are uniform-grid spritesheets (`load.spritesheet`), not trimmed
multiatlases. Ludo returns a fixed grid; repacking it into an atlas would buy nothing since
the frames are already uniform, and two loaders side by side is less code than a repack step.
So [`animalEmotionAnimations.ts`](../src/phaser/animals/animalEmotionAnimations.ts) sits
parallel to `animalAtlases.ts` + `animalAnimations.ts` rather than inside them — a broken
generated clip cannot take the base cast down with it.

Keys are namespaced: texture `emotion/<animal>/<emotion>`, animation
`<animal>/emotion_<emotion>`.

[`emotionSheets.generated.ts`](../src/phaser/animals/emotionSheets.generated.ts) is written
by the promote step and lists what actually exists on disk. **Empty is a valid state**, and
so is a partly-generated cast: `AnimalAnimator.playEmotion()` falls back to `playAlert()`
for any pairing with no clip, so callers never check first and an un-generated animal behaves
exactly as it did before emotions existed.

### 9.4 The scale trap

A generated cell is **not** the atlas canvas. An atlas idle frame is a large export canvas
with the animal filling most of it; a generated clip is a grid of 256×256 cells with the
animal somewhere inside at whatever size the generator chose. `ANIMAL_STAGING` (§4) assumes
the frame _is_ the export canvas. Staging used to also assume the feet sat at that canvas
bottom (`setOrigin(0.5, 1)`); that is only true of the owl, so Farm shadows and the Trial
floor line floated below everyone else. Atlas sprites now call `applyAtlasFeetOrigin`,
which pins `originY` at the rest-frame trim. A generated cell matches neither atlas scale
nor that feet origin, so playing one unchanged shrinks the animal by ~3× and floats it
off the floor the moment it reacts.

So `scripts/ludo/normalize.mjs` measures, at promote time, the character's alpha bounding box
in the clip against the same box in the atlas frame it was generated from, and stores a
`scale` multiplier and an `originX`/`originY` on the sheet. `originY` is the bottom of the
generated union box — the same place the atlas rest-frame trim puts the feet — so switching
from idle to an emotion does not jump. `AnimalAnimator` applies them on `ANIMATION_START` of
the emotion clip and restores the staged values on `ANIMATION_START` of anything else —
never in `playEmotion` / `playIdle` themselves. Phaser can delay the first frame (`delay`,
`playAfterRepeat`), and putting emotion scale on an atlas texture (or atlas scale on a
generated cell) is a ~2× size flash the moment a debate changes phase. The runtime measures
nothing.

The union box across all frames is used, not a per-frame box: a per-frame origin would make
the character twitch as its box changed shape between frames.

If the origin/scale maths change, re-run `npm run sprites:emotions -- --remeasure` against
the shipped PNGs — no API, no regeneration.

### 9.5 Generating a clip

> The full operating manual is
> [`.claude/skills/animal-emotion-sprites/SKILL.md`](../.claude/skills/animal-emotion-sprites/SKILL.md)
> — prompt rules, quality thresholds, API gotchas, troubleshooting. **Read that file**: Claude
> Code loads it as a skill, and every other tool can simply open it. What follows is the shape
> of it.
>
> One thing worth knowing before you run anything: **flags must come after `--`**.
> `npm run sprites:emotions --dry-run` is not a dry run — npm swallows the flag, the script
> receives no arguments, and no arguments means the entire manifest.
>
> For the measurement side specifically — what a loop _seam_ is, how each quality number is
> computed and what it cannot catch — the skill's
> [`references/measuring-animations.md`](../.claude/skills/animal-emotion-sprites/references/measuring-animations.md)
> explains it from first principles, assuming no sprite-animation background.

```
export LUDO_API_KEY=...                                   # never a flag; argv leaks
npm run sprites:emotions -- --dry-run                     # free: payloads + reference frames
npm run sprites:emotions -- --animal donkey-grey          # generate into .ludo-review/
open .ludo-review/index.html                              # every clip, at stage scale
rm -rf .ludo-review/donkey-grey/angry                     # reject one
npm run sprites:emotions -- --promote                     # ship what is left
```

Generation and promotion are two commands on purpose. Diffusion output is not deterministic
and not always usable — Ludo's own docs warn that seamless looping is never guaranteed and
that colour drifts between the input frame and the animation — so nothing reaches
`public/assets/` without a human having watched it loop. Deleting a directory is the entire
approval mechanism; there is no approval state to fall out of sync with the files.

Prompts live in [`emotion-manifest.json`](../scripts/ludo/emotion-manifest.json), which
carries its own authoring rules. The one that costs credits when ignored: **framing comes
from each animal's `view`, never from the prompt text.** The cast is not uniformly side-on —
the owl is drawn front-facing and the raccoon's staged pose is a three-quarter, and telling
either "side view, facing left" asks the generator to turn the character, after which the
clip will not cut against its own idle loop.

Every clip is generated **from a frame of the animal's own shipped idle loop**
(`scripts/ludo/referenceFrame.mjs` cuts it out of the atlas and un-trims it back onto its
export canvas). That is what keeps a generated emotion on-model, and it is why the reference
frame is un-trimmed first: handed a hard-cropped sprite, the generator composes as if the
character filled the frame and clips its legs and ears.

`scripts/ludo/promoted-clips.json` is the committed record of everything promoted so far;
`--promote` merges into it and generates the TS module from the merged whole, so promoting one
animal never drops another's clips.

Asset URLs from the API **expire after 7 days**, so the pipeline downloads inside the run
that generated them and the review directory holds bytes, never URLs.

### 9.6 The gallery scene

`AnimalGallery` (main menu → **Animation Gallery**) is where you actually look at any of
this. Pick an animal, hold any one of its clips on a loop, switch between them faster than a
debate ever would.

It deliberately does **not** use `AnimalAnimator`. That class plays animations the way the
_game_ wants them — weighted, random, interrupted by whatever the debate is doing — which
makes it a poor instrument for judging a single clip. The gallery plays one key and holds it.

What it does share is staging: it calls the same `applyEmotionStaging` / `restoreStaging`
(§9.4) that `AnimalAnimator` calls, so a clip previewed here is placed exactly as the Trial
will place it. A gallery that staged clips its own way would be worse than no gallery.

Three things worth knowing:

- **Switching animal keeps the clip you were looking at.** The question a reviewer actually has
  is "how does _this_ emotion read on each animal", so the selection carries across the cast
  rather than resetting to idle every time. Emotion names exist for every animal, so an emotion
  stays selected the whole way round and lands on the "no art yet" state where the art is
  missing. Base animations are per-animal, so carrying `buck` from the donkey to the fox falls
  back to the fox's rest pose.
- **Clips with no art are listed, not hidden.** `animalClipCatalogue.ts` returns every
  `ANIMAL_EMOTIONS` entry with an `available` flag, and the UI shows the missing ones dashed
  and labelled "no art yet". With the cast generated one animal at a time, the gap between the
  vocabulary and the art is the thing you most need to see.
- **Both registers are in the panel.** Under the body emotions sits a **Dialogue portraits**
  section listing the same five emotions again, each with a live thumbnail of the crop, and a
  large preview over the stage at the two sizes `.ludo-review-faces/boxes.html` uses — 112px as
  it ships and 224px for a 2× display, where softness actually shows (§10). Portrait selection
  is independent of clip selection on purpose: a portrait is cut from the body clip of the same
  name, so you want them playing side by side, not one replacing the other.
- **The portraits section is the one place React draws its own art.** Face clips are DOM-played
  (§10), so there is no scene to delegate to — it mounts the game's own `FaceClip` with the
  game's own `faceBoxTransform`, for the same reason the body clips share `applyEmotionStaging`.
  A gallery that framed a portrait its own way would be worse than no gallery.
- **The smooth-transition toggle is a diagnostic, not decoration.** Switching from an atlas
  clip to a generated one changes the sprite's texture, scale and origin on a single frame.
  The crossfade hides that; turning it off is how you check whether a switch that looks fine
  actually is fine.
- **React never touches Phaser.** Every control is a write to `animalGalleryStore`, which the
  scene subscribes to — the same split, for the same reason, as `trialStageStore`.

The panel width is a two-place contract: `ANIMAL_GALLERY_PANEL_WIDTH` in `constants.ts` and
`.panel`'s width in `AnimalGalleryUI.module.scss`. Nothing enforces that they agree, exactly
like `TRIAL_STAGE_HOLE` vs `.trialGameHole`.

### 9.7 Adding an emotion

1. Add the name to `ANIMAL_EMOTIONS` in `animalEmotions.ts`.
2. Add a prompt for it under `emotions` in `emotion-manifest.json`, plus any per-animal
   `overrides` where the generic posture makes no sense for that body (see the owl).
3. Teach `activeEmotionForWorkflow()` when it fires, or author it on statements directly.
4. Generate, review, promote.

The generator refuses a manifest emotion that is not in `ANIMAL_EMOTIONS`, so step 1 cannot
be skipped silently.

## 10. Dialogue portraits — the second register

Head-and-shoulders loops played by **React, in the DOM**, in the farm talk Dialog panel and the
debate log. Not a second generated vocabulary: they are **cropped out of the §9 body clips**
locally, cost nothing, and call no API.

### 10.1 Why crops, and why the old reasoning was wrong

§9 explains that a Trial sprite is ~300px tall so its face is 50-80px, which is why every
emotion is a whole-body posture. A dialogue box asks the opposite question, so the first attempt
generated face-only clips from a head crop of the atlas idle frame.

That failed three times for 12 credits, identically each time — the eyelid aperture swung 165%,
196% and 458% across the clip, and two attempts invented teeth the reference does not have. The
cause is structural, not a prompt problem: a head submitted at a 485×363 bounding box came back
at 257×192, so the endpoint reframes its input and redraws the head from scratch every frame
rather than animating the pixels it was given.

`animalFaces.ts` also used to argue that a portrait *could not* be cropped from a body clip —
"the head is 90-110px of real pixels… blown up to a 112px portrait that is mush". That was
measured against a 512px generator target rather than the **112px a portrait actually ships at**.
Heads run ~100-150px, so a crop *downscales* into the box at 1× and upscales ~1.2-2.2× at 2× DPR.
The body clips' faces also hold still, because the generator was animating posture and left the
face alone — which is exactly the property a portrait needs.

### 10.2 How a portrait is cut

`scripts/ludo/cropFace.mjs`, driven by `--faces`:

1. **One `headCrop` per animal** in the manifest, in fractions of the character's union alpha box
   across all frames of its `talking` clip. Never one per emotion: all five play in the same box
   in the same dialogue, so a per-emotion rect would make the head jump size between beats.
2. **One alignment template per animal**, also from `talking` — the rect's rigid top 55% (skull,
   ears, eye). The bottom is excluded because the mouth is the thing the clip is *for* and would
   fight the match.
3. **Per-frame tracking.** The head bobs through a body clip (the fox's by 30px, its `thinking`
   by 40px), so a fixed rect drifts. Frame 0 searches the whole window; later frames search only
   within 20px of where the head was, while still scoring against the fixed template — so the
   appearance reference never drifts and the trajectory cannot teleport to a similar-looking
   feature elsewhere, which it did before the constraint (a sheep's body wool looks much like its
   head wool).
4. **Cut, contain-fit to a 256px square** with `lanczos3`, assemble on the source's `cols`.
5. **`fit` is arithmetic on the rect**, not measured from the art — see `fitForRect`. Measured, it
   differed per emotion (an open snarl reaches further than a shut mouth) and became a 3%
   head-size difference between beats.

The record is `scripts/ludo/promoted-faces.json` and the generated index
`src/phaser/animals/faceSheets.generated.ts`, both siblings of the body register's and never
merged with them. `AnimalFace.tsx` renders nothing for an animal with no entry, so the register
ships one animal at a time.

To look at the result, the gallery (§9.6) now has a **Dialogue portraits** section beside the
body clips — the in-game counterpart to `boxes.html`, and the only place the two registers can be
compared without walking into a conversation and hoping the right beat comes up. It renders
through `FaceClip`, the presentational half of `AnimalFace`: `AnimalFace` resolves a *character*
and asks for the game's forgiving behaviour (fall back to `talking`, render nothing at all when
there is no art), which is exactly wrong for a review tool, so the gallery addresses sheets
directly and shows "no portrait yet" where none was cropped.

### 10.3 What it costs

**Cropping amplifies the source clip's loop seam 2-8×, mostly 3.5-5×** — the head fills the
portrait where it was a fraction of the body frame, so a seam invisible at body scale is loud at
portrait scale. This decides which animals work:

| animal | worst source seam | worst crop seam | upscale |
|---|---|---|---|
| owl | 0.43% | 0.77% | ×1.23 |
| raccoon | 0.17% | 0.66% | ×1.72 |
| fox | 0.20% | 0.93% | ×1.94 |
| white-sheep-1 | 0.32% | 1.26% | ×1.92 |
| brown-wolf | 0.33% | 1.83% | ×2.21 |
| **donkey-grey** | **2.52%** | **11.22%** | ×1.86 |

Everything lands under the 2% gate except the donkey, whose body clips are the cast's weakest —
the only ones that ever carried a loop-seam warning of their own. Its portraits are deliberately
**not promoted**, which matters for Duchess: the donkey is her placeholder, and she is the
boss opponent, so her debate-log portrait stays text-only until those body clips are
regenerated. Tobias wears the owl, whose crops are among the cast's cleanest.

Two more things worth knowing:

- **`white-sheep-1` has no mouth drawn at its angle** — a black mass, a wool tuft, two small
  eyes. Its portrait animates but reads as a head bob rather than speech. Source art, not the crop.
- **Portraits are palettised PNG**, ~410-480KB each and honestly named, unlike the body clips
  which are WebP under a `.png` extension. The 25 shipped are 12MB, which more than doubles the
  project's asset weight; a 192px cell or lossy WebP would each roughly halve it again.

### 10.4 Known limitation: the face translates

Human review of the shipped crops: they are **glitch-free** — no strobing eye, no flickering
tooth, none of the defects generation produced. But it is obvious the source was not authored for
a head-only crop. A portrait wants the face to hold still with only the mouth and eyes moving;
here the face translates slightly, because the body clip is animating the whole animal and the
head travels as part of that performance. The aligner removes most of that, not all.

The cause is not a bug in the crop. **Every `talking` prompt in the manifest asks for "head
bobbing gently in time with speech"** — deliberately, because at 300px a bobbing head is what
reads as talking and a motionless one reads as idle (§9). The crop faithfully reproduces a bob
that was requested.

**Accepted rather than fixed.** If it needs improving, the lever is the cropper: the aligner
matches the rect's rigid top 55%, so when the head *rotates* the best translation-only match is a
compromise that leaves the face offset. Narrowing the template to just the facial region would pin
what the viewer actually looks at and let the ears drift instead; sub-pixel refinement and a small
rotation search would take the rest. The structural answer is that head travel *is* part of a
posture animation, so a portrait cut from one always inherits some of it.

### 10.5 `_still` variants — tried, and they do not do what their name says

`ANIMAL_EMOTIONS` carries a `talking_still` entry and the cropper prefers `<emotion>_still` as
its source when one has been promoted, falling back otherwise so it is an optional per-animal
upgrade rather than a migration. It asks for the body and head locked with only the face moving,
generated at body framing where the generator is reliable.

**It does not deliver a stiller head.** Measured on the one that exists,
`donkey-grey/talking_still` — change per frame in the skull-and-ears band of the finished
portrait, a band with no speech animation in it, so anything moving there is pose change the
aligner cannot remove:

| portrait cut from | skull+ears change/frame | crop loop seam |
|---|---|---|
| `talking` (bobbing) | 1.07% | 4.15% — fails the 2% gate |
| `talking_still` | **2.54%** | **0.56%** — passes |

Twice as unstable, plus a ~22px lateral slide the bobbing clip did not have: with the body pinned,
the generator moved the head instead. Against the shipped cast — owl 0.53%, raccoon 0.94%,
brown-wolf 1.37%, fox 1.40%, white-sheep-1 2.12% — it is the wobbliest portrait in the game.

It shipped anyway, for a reason unrelated to its name: the fresh generation **fixed the loop
seam**, and that was what had kept `donkey-grey` out of the register entirely. A clean loop with a
wobbly head beats a visible jump every two seconds, so Rue now has `talking`, `angry` and
`sneaky` portraits; `doubtful` and `thinking` are still rejected on their source seams (11.73% and
5.76%) and fall back to `talking`.

**Do not generate the other four still variants expecting stillness.** Generate one only when an
animal's body clip has a loop seam bad enough to disqualify its portrait — that is the problem
these actually solve.
