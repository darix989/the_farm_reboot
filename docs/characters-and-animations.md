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

Every Level 1 character is a real animal wearing a different animal's skin, because no
matching art exists yet:

| Character | Real species | Placeholder art (`AnimalSpriteId`) | Role |
|---|---|---|---|
| Rue | donkey | `donkey-grey` (exact match) | player |
| Hetty | hen | `white-sheep-1` | farm NPC |
| Cass | rooster | `fox` | farm NPC |
| Bram | drake | `brown-wolf` | farm NPC |
| Duchess | goose | `owl` | farm NPC, Trial opponent |
| Tobias | tortoise | `raccoon` | farm NPC, Trial moderator |

The mapping lives in one place: the optional `animal` field on
[`CHARACTERS`](../src/data/characters.ts). A character with no `animal` entry (every
legacy scenario's speakers — `barnaby`, `pip`, `monty`, `penny`, `bella`, `woolsey`)
keeps the original tinted-circle placeholder (Farm) or CSS bust (Trial). Nothing else
needs to know a character has no art — `resolveCharacter()` never throws, and both
scenes check `visual.animal` before doing anything sprite-related.

---

## 2. Assets on disk

Six multi-page TexturePacker atlases, copied from the prototype:

```
public/assets/characters/
  donkey-grey.json + donkey-grey/donkey-grey-{0..11}.png
  owl.json         + owl/owl-{0..6}.png
  raccoon.json     + raccoon/raccoon-{0..17}.png
  fox.json         + fox/fox-{0..4}.png
  white-sheep-1.json + white-sheep-1/white-sheep-1-{0..2}.png
  brown-wolf.json  + brown-wolf/brown-wolf-{0..8}.png
```

Both the JSON descriptors and the PNG pages live under `public/assets/` (loaded by
Phaser's `this.load.multiatlas`), **not** imported as ES modules — six descriptors are
~310 KB of JSON that has no reason to sit in the main JS bundle and be parsed on the
main menu, even though `resolveJsonModule` is on.

`brown-wolf.json` was renamed from the source's `brown_wolf.json` — the only naming
mismatch between animal id, descriptor filename and image directory in this subset. The
`textures[].image` field inside each descriptor is still the ultimate authority if you
add a seventh animal and its naming doesn't match its id.

**Frame naming — two shapes in this set:**

| Shape | Example frame filename | Animals | Needs `framePrefix`? |
|---|---|---|---|
| Flat, dash-separated | `__red_fox_idle-3.png` | donkey-grey, fox, white-sheep-1, brown-wolf, raccoon | no — matches the default `${frameStem}-` |
| Foldered, **underscore**-separated | `__owl_no_tail_idle_awake/__owl_no_tail_idle_awake_4.png` | owl | yes, on all five animations |

The owl is the trap: its frame folder ends in `_`, not `-`, so every one of its
`baseAnimations` entries needs an explicit `framePrefix` copied character-for-character.
Get it wrong and `generateFrameNames` silently returns zero frames.

---

## 3. Four files carry the system

| File | Role |
|---|---|
| [`src/phaser/animals/animalDescriptors.ts`](../src/phaser/animals/animalDescriptors.ts) | The data. One `AnimalDescriptor` per animal: frame ranges + idle/alert behaviour. |
| [`src/phaser/animals/animalAnimations.ts`](../src/phaser/animals/animalAnimations.ts) | Turns descriptors into Phaser animations (`ensureAnimalAnimations`) and resolves per-animal setup (`animalSetup`). |
| [`src/phaser/animals/AnimalAnimator.ts`](../src/phaser/animals/AnimalAnimator.ts) | The playback engine: weighted sequence picking, chaining, self-looping. Drives any `Phaser.GameObjects.Sprite`. |
| [`src/phaser/animals/animalAtlases.ts`](../src/phaser/animals/animalAtlases.ts) | Loads the six multiatlases. |

Plus [`src/phaser/animals/animalStaging.ts`](../src/phaser/animals/animalStaging.ts) for
per-surface scale, and the two scenes that use all of the above:
[`Farm.ts`](../src/phaser/scenes/Farm.ts) (the overworld) and
[`Trial.ts`](../src/phaser/scenes/Trial.ts) (the debate stage).

### 3.1 `AnimalDescriptor` — the behaviour contract

```ts
export interface AnimalAnimation {
  name: string;            // logical name used in behaviour sequences ('idle', 'eat_start')
  frameStem: string;       // frame-name stem from the art export. NOT the Phaser key.
  framePrefix?: string;    // override when frames don't follow `${frameStem}-`
  startFrameIndex?: number;
  endFrameIndex: number;   // INCLUSIVE. 9 means ten frames, 0..9.
  frameRate?: number;      // default 12
}

export interface AnimalDescriptor {
  id: AnimalSpriteId;
  baseAnimations: readonly AnimalAnimation[];
  idle?: AnimalBehaviour;       // [weight, sequence][], weights cumulative, should sum to 1
  idleTrial?: AnimalBehaviour;  // replaces `idle` when staged in a Trial
  alert?: AnimalBehaviour;
  alertTrial?: AnimalBehaviour;
  move?: AnimalBehaviour;       // locomotion cycle, held while the character translates
  transitions?: readonly (readonly [string, readonly string[]])[];
}
```

Renamed from the prototype's `CharacterInfo` / `CharacterAnimation`: `id` → `frameStem`
(it was both the Phaser animation key *and* the frame-name prefix there — the root of a
global-key collision risk, fixed here — see §5), `prefix` → `framePrefix`. `scale` and
`manualPivot` were dropped from the type entirely — see §4.

Registration is a plain `Record<AnimalSpriteId, AnimalDescriptor>`
(`ANIMAL_DESCRIPTORS`), not the prototype's `ANIMALS.push(...)` side effects — the
compiler enforces that every `AnimalSpriteId` has a descriptor, instead of a silently
unregistered entry producing zero animations.

Every animal has a `move`: the walk cycle from its atlas, except Duchess (`owl`), whose
atlas has none and who flies (`flap_wings`) rather than walks. Unlike `idle`, a `move`
sequence should loop (`repeat: -1`) — movement ends when the *character* stops, not when
the clip does. Only the player translates today; the field is on the descriptor rather
than in `Farm.ts` so a wandering NPC or a cutscene tween gets the same cycle for free.

Only Tobias (`raccoon`) uses `idleTrial`: he stands in the field but sits up
(`sitting_up_idle`) once staged in a Trial. No animal uses `alertTrial` or
`transitions` today — both exist in the type for a future animal that needs them (the
prototype's dog needed `transitions` to stand up before barking).

### 3.2 Building animations — `ensureAnimalAnimations`

Called once, from `Preloader.create()`, **not** from `Farm.create()` or
`Trial.create()`. Animation keys are global to the Phaser game; building them per-scene
would re-register every key on each scene entry (this is a real bug in the source
prototype, which builds them in its Trial scene). `Preloader` always runs before both
Farm and Trial, and its `create()` runs after `preload()` has finished loading every
atlas, so every texture is already in the TextureManager.

The function is idempotent (`anims.exists(key)` guards each animation, `textures.exists`
guards each animal), which matters because React StrictMode tears the Phaser game down
and rebuilds it in dev — the same idiom as `ensureFarmTextures()`.

`repeat` is deliberately **not** set when an animation is created — looping is a
property of the *sequence entry* (`{ key: 'idle', repeat: -1 }`), so the same clip can
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
cycle plays at `MOVE_RATE_AT_TOP_SPEED` (0.77): the cast's clips were authored at a stroll —
15 frames at 12fps — and the overworld moves Rue at 167px/s, so at rate 1 his feet skate.
That constant tracks `PLAYER_SPEED` — the skate is a ratio of stride length to ground
covered, so changing one without the other reintroduces it.
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
donkey (the player, the most-seen animal) lands at roughly 140px tall on the farm (next to
the 56px placeholder NPCs) and roughly 300px in the 1152×540 Trial hole. That preserves
the designed size hierarchy — donkey/wolf biggest, sheep mid-sized, fox/owl smaller,
raccoon smallest and widest — while fitting this repo's very different pixel budget.

Measured visible pixel bounds of each animal's idle rest frame (`spriteSourceSize` in the
descriptor JSON — what actually renders, not the shared `sourceSize` export canvas, which
can hugely overstate a crouching or narrow pose — the raccoon's idle crouch fills only
~40% of its canvas height) — multiplying by the prototype's scale gives the "as designed"
apparent size the two multipliers above were fit to:

| Animal | Source scale | Idle frame visible (w×h) | As-designed apparent (w×h) |
|---|---|---|---|
| `donkey-grey` | 0.7 | 561×531 | 393×372 |
| `owl` | 0.4 | 448×587 | 179×235 |
| `raccoon` | 0.4 | 896×373 | **358×149 — wide, low crouch** |
| `fox` | 0.6 | 598×391 | 359×235 |
| `white-sheep-1` | 1.0 | 311×267 | 311×267 |
| `brown-wolf` | 0.7 | 589×468 | 412×328 |

Recomputing: pick a target donkey height for the surface, divide by 372 (its as-designed
apparent height above) to get that surface's multiplier, then multiply every animal's
source scale by it.

`TRIAL_SCALE_BY_CAST_SIZE` shrinks the whole cast a little further when three characters
share the stage instead of one or two (Duchess vs Rue, moderated by Tobias, is the only
three-character scenario today) — with the ratios above, even the tightest neighbouring
pair (donkey next to raccoon) clears the gap between adjacent stage slots without it, but
it also just reads better than three animals crowding the full width of the hole.

All six atlases draw their animal facing **left**. A sprite placed on the left half of
a scene should `setFlipX(true)` to face inward/right; one on the right keeps
`flipX = false`. `Farm.ts` flips the player based on movement direction; `Trial.ts`
flips based on which side of centre a cast member's slot falls on.

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
  cell agree — if they ever drift, turning this on shows it immediately.
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
7. **`animalAtlases.ts`** needs no change — it iterates `ANIMAL_SPRITE_IDS`, derived from
   `ANIMAL_DESCRIPTORS`, automatically.

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

| Signal | Emotion |
|---|---|
| Statement whose sentences carry `logicalFallacies` | `sneaky` |
| `crossfire` statement | `doubtful` |
| Player round, nothing picked yet | `thinking` |
| Player confirming a `logical_fallacy` option | `sneaky` |
| Anything else | `talking` |

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

A generated cell is **not** the atlas canvas. Rue's idle frame is a 784×702 export canvas
with the donkey filling most of it; a generated clip is a grid of 256×256 cells with the
donkey somewhere inside at whatever size the generator chose. `ANIMAL_STAGING` (§4) assumes
the frame *is* the export canvas and `Trial` anchors with `setOrigin(0.5, 1)` assuming the
feet are near the canvas bottom. Neither holds. Played unchanged, the animal shrinks by ~3×
and floats off the floor line the moment it reacts.

So `scripts/ludo/normalize.mjs` measures, at promote time, the character's alpha bounding box
in the clip against the same box in the atlas frame it was generated from, and stores a
`scale` multiplier and an `originX`/`originY` on the sheet. `AnimalAnimator` applies them on
`playEmotion` and restores the staged values on `playIdle` / `playAlert`. The runtime measures
nothing.

The union box across all frames is used, not a per-frame box: a per-frame origin would make
the character twitch as its box changed shape between frames.

### 9.5 Generating a clip

> The full operating manual is the **`animal-emotion-sprites` skill**
> (`.claude/skills/animal-emotion-sprites/`) — prompt rules, quality thresholds, API
> gotchas, troubleshooting. What follows is the shape of it.
>
> For the measurement side specifically — what a loop *seam* is, how each quality number is
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
*game* wants them — weighted, random, interrupted by whatever the debate is doing — which
makes it a poor instrument for judging a single clip. The gallery plays one key and holds it.

What it does share is staging: it calls the same `applyEmotionStaging` / `restoreStaging`
(§9.4) that `AnimalAnimator` calls, so a clip previewed here is placed exactly as the Trial
will place it. A gallery that staged clips its own way would be worse than no gallery.

Three things worth knowing:

- **Switching animal keeps the clip you were looking at.** The question a reviewer actually has
  is "how does *this* emotion read on each animal", so the selection carries across the cast
  rather than resetting to idle every time. Emotion names exist for every animal, so an emotion
  stays selected the whole way round and lands on the "no art yet" state where the art is
  missing. Base animations are per-animal, so carrying `buck` from the donkey to the fox falls
  back to the fox's rest pose.
- **Clips with no art are listed, not hidden.** `animalClipCatalogue.ts` returns every
  `ANIMAL_EMOTIONS` entry with an `available` flag, and the UI shows the missing ones dashed
  and labelled "no art yet". With the cast generated one animal at a time, the gap between the
  vocabulary and the art is the thing you most need to see.
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
