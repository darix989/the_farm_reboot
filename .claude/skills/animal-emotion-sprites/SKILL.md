---
name: animal-emotion-sprites
argument-hint: "[--faces] [--animal <id>] [--emotion <name>] [--dry-run|--promote|--reindex|--remeasure|--force]"
description: Ship the cast's animation registers — whole-body per-emotion clips (talking, doubtful, angry, thinking, sneaky, approving) generated via the Ludo.ai API, the dialogue portraits cropped locally out of those clips for free with --faces, and the still frames the debate's moderator status face holds. Use when asked to generate, regenerate, add or fix an animal's emotion animation or spritesheet, to add a new emotion to the vocabulary, to give a newly added animal its emotion art, to author or retune a head crop for a dialogue portrait, or when a clip or portrait looks wrong in game (wrong size, floating off the floor, popping on loop, head drifting inside its portrait). Also covers the Animation Gallery used to review the results.
---

# Animal emotion sprites

The cast's emotion clips are **generated**, not exported from the source art pack. This skill
is the operating manual for `npm run sprites:emotions`, which drives the Ludo.ai API from a
committed prompt manifest into reviewable art and then into the game.

Design rationale for the runtime side lives in `docs/characters-and-animations.md` §9. This
file is about *running* the pipeline.

## ⚠️ Generation costs real money

Every clip costs credits from the user's Ludo.ai balance (~4 per clip at the default
settings). **Never run a generating command without the user having asked for that specific
generation, and confirm the scope first if they gave a budget or an ambiguous "do the rest".**
`--dry-run` is free and needs no key — start there, always.

State the projected cost before generating: `clips × 4 credits`. The four imported animals
that still have no emotion art (`cow`, `cow-female-001`, `mouse`, `pig`) are 20 clips,
~80 credits. Do not generate them until asked.

## The pipeline in one screen

```bash
# 1. Free. No key needed. Extracts reference frames, prints the exact payloads.
npm run sprites:emotions -- --dry-run --animal fox

# 2. Costs credits. Writes to the gitignored .ludo-review/, never to public/.
npm run sprites:emotions -- --animal fox

# 3. Look at them. Contact sheet plays every clip at stage scale with its quality numbers.
open .ludo-review/index.html

# 4. Reject by deleting. That is the entire approval mechanism.
rm -rf .ludo-review/fox/angry

# 5. Ship what is left. Measures normalization, copies PNGs, rewrites the generated TS.
npm run sprites:emotions -- --promote
```

Flags: `--animal a,b` and `--emotion x,y` restrict scope (default: everything in the
manifest). `--force` regenerates a clip that already exists locally **and** bypasses the API's
result cache — see "request_id is an idempotency key" below. `--reindex` rebuilds the generated
module from `promoted-clips.json` alone, with no review dir and no API calls. `--remeasure`
re-runs the origin/scale maths against the shipped PNGs (also free) after a change to
`normalize.mjs`.

Generation and promotion are separate on purpose: diffusion output is not deterministic and
not always usable, so nothing reaches `public/assets/` without a human having watched it loop.

## Prerequisites

`LUDO_API_KEY` in `.env.local` at the repo root (gitignored; `npm run sprites:emotions` loads
it via Node's `--env-file-if-exists`). An exported shell variable works too.

**Never name it `VITE_LUDO_API_KEY`** — Vite inlines every `VITE_`-prefixed variable into the
client bundle, publishing the key to anyone who opens the game.

## Playback speed: `frames / duration`, never a hard-coded rate

The API is asked for `duration` seconds of motion sampled into `frames` frames, so the **only**
rate that plays a clip at the speed it was generated is `frames / duration`. `playbackFrameRate()`
derives it; the manifest sets no `frameRate` at all.

This was originally hard-coded to 12 to match the hand-authored atlas clips, which silently ran
every generated clip **1.5× too fast** — 16 frames of a 2s motion crammed into 1.33s. It reads
as rushed and it is invisible in a spritesheet; only playback shows it. The first fifteen clips
shipped that way before it was caught.

Hence the defaults: **25 frames over 2 seconds**, landing on ~12.5fps — correctly paced *and*
close to the atlas tempo, where 16 frames would have forced a choppy 8fps. Frame count does not
affect cost (credits are `duration × model rate`), so more frames is free smoothness.

If you inherit clips at the wrong rate, fix `frameRate` in `promoted-clips.json` and run
`--reindex`. No credits, no regeneration.

## Reading the quality numbers

> **New to this?** [references/measuring-animations.md](references/measuring-animations.md)
> explains all of it from scratch — what a frame, a spritesheet, a loop *seam*, an alpha channel
> and a bounding box are, exactly how each number is computed, what it can and cannot catch, and
> where to find the numbers. Start there; this section is the short form.

Generation prints three metrics per clip, and they are also stored in each clip's `meta.json`
and shown on the contact sheet. They exist because each caught a real failure that is hard to
see in a single loop and obvious once the clip is in the game.

| Metric | Warns above | What it means | What to do |
|---|---|---|---|
| `loop seam` | 2% | Last frame differs from the first, so it jumps on every repeat | Confirm `closeLoop` is on; regenerate with `--force` |
| `height swing` | 20% | Character's height wanders across frames | Check it is motion (a head dipping) and not a pose collapse (lying down). See the prompt rules |
| `drift ±px` | 20px | Character slides horizontally | Add "in place, no travel" emphasis; regenerate |

A clip can also be **rushed without tripping any of these** — the metrics measure the frames,
not the tempo. If motion looks hurried or snaps between poses, check the frame rate maths above
first, then ask the prompt for "ONE slow continuous glide from start to finish, no sudden jumps,
no fast beats".

These are thresholds for *attention*, not rejection. A clip can exceed one and still be the
right clip — `sneaky` legitimately swings 28% because the donkey's head dips a long way.

Height swing matters more than it looks: `normalize.mjs` derives one scale from the **union**
bounding box, so a character whose height wanders renders smaller than the atlas art for most
of the clip.

## Writing prompts

Prompts live in `scripts/ludo/emotion-manifest.json`: a generic prompt per emotion using
`{species}` and `{view}` tokens, plus per-animal `overrides` where the generic one makes no
sense for that body. The file carries these rules in its own `$comment`; they are repeated
here because ignoring them costs credits.

1. **Lead with whatever carries the most silhouette signal for *that* animal.** A Trial sprite
   is ~300px tall, so anything that does not change the outline or a large high-contrast area
   is invisible. Which feature that is differs per animal, and picking wrong is the single
   biggest cause of a clip that technically loops but reads as nothing:

   | Animal | Carrier | Evidence |
   |---|---|---|
   | donkey | whole-body posture | no strong facial or ear features; body lean is all there is |
   | owl | **eyes** (~40% of body area, high-contrast yellow) | body-posture `angry` read as a surprised owl talking; narrowed-eye `sneaky` was the best clip of the project until the fox |
   | fox | **ears + bushy tail + snarl** | ears pinned flat back plus an open snarl produced the strongest `angry` generated so far, first try |
   | sheep | **contrast**: solid black head + black ears on pale fleece | head height and tilt read at any size; the fleece is a fluffy oval that turns to mush if asked to deform. Its ears are black on a black head and barely read — its *eyes* are the white-on-black signal |
   | wolf | **ears + bushy tail + snarl + white neck ruff** | the fox's carriers plus a high-contrast ruff that bristles; produced the strongest `angry` in the project, first try, with textbook-stable fangs |
   | raccoon | **brows + big white eyes in a dark mask**, and **free forepaws** | staged sitting up, so it is the only character with hands — it can gesture, point and clench, which nothing else in the cast can |
   | cow | **huge pink snout + googly eyes + golden cowbell** | grazing prior (atlas ships `eat`); hold the head UP at the reference height |
   | cow-female-001 | **two long black braids** (plus the bell and eyes) | same grazing prior, plus a speaking prior (`speak_angry` / `speak_worried` in the atlas) |
   | dog | **pointed ears + tail**, dark saddle | sitting prior (`sit` / `sit_idle`) and a bark; keep it standing |
   | mouse | **huge pink-lined ears + arched pink tail + buck teeth** | source art faces **right** (`isFlipped`); lying-down prior (`lie`) |
   | pig | **round snout + corkscrew tail** | low wide oval that wants to lie down; hold the four short legs planted |

   Before writing prompts for a new animal, look at its reference frame and ask what changes
   the outline. Ears and tails are the quadruped equivalent of the owl's eyes: real visual
   weight, and they move without disturbing the body. Strong *value* contrast counts too — the
   sheep has no expressive shape at all, but a black head on white fleece means its head
   position reads from across the stage.

   Ask the same question about **priors**, because each animal brings one that will wreck a
   loop if unaddressed: the owl wants to blink and flare its wings, the sheep wants to graze
   (the atlas ships `eating`), the wolf wants to howl (the atlas ships `howl`, and a howl
   hijacks any open-mouth prompt by tipping the head at the sky), the raccoon wants to hold
   food (its paws rest in exactly the carrying pose and the atlas ships `eat_nut`/`throw_nut`,
   so a nut appears unless the paws are described as empty) and to drop back onto all fours,
   and any quadruped will walk out of frame. Suppress it with rule 6, positively — "its head stays UP at the height it is
   in the reference" beat "never grazes" for the sheep, and "its muzzle stays level and pointed
   forward" kept the wolf snarling instead of howling. Both held first try.

   Check the **resting face** too. The wolf's idle already scowls, so its calm emotions have to
   say "brow eased and smooth rather than furrowed" or `talking` reads as quietly cross — and
   even then it only half-takes, which for this character is arguably correct rather than a
   defect.
2. **Never name a posture the animal must change state to reach.** "Crouched low and drawn in"
   made the generator lie the donkey down over the clip and never stand it back up — a
   transition, not a held attitude, and one that cannot loop. Say what the body does while it
   stays where it is, and say outright what it must not do ("it never lies down, never sits").
3. **Framing comes from the animal's `view` field, never from the prompt text.** The cast is
   **not** uniformly side-on: the owl is drawn front-facing and the raccoon's staged pose is a
   three-quarter. Telling either "side view, facing left" asks the generator to turn the
   character, after which the clip will not cut against its own idle loop.
4. **Say "in place", "no travel".** Left unsaid, the model walks the animal out of frame.
5. **Keep the silhouette.** The reference frame carries the character; the prompt should only
   ever move it.
6. **To suppress a motion, assert stillness — do not forbid the motion.** Negations hold only
   when the model had no strong prior pulling the other way. "Never lies down", "never takes
   off" and "no perch appears" all held. "The eyes never close" and "the wings stay folded,
   never spread, never flared" were both ignored, because *angry bird* carries a wing-display
   prior and *owl* carries a blink prior. What finally worked was describing the still parts
   positively and dropping the emotion word that summoned the motion: "its body, wings and feet
   stay exactly as in the reference image and do not move at all — ONLY THE FACE MOVES". Name
   what holds, not what must not happen.

7. **Pin the inside of an open mouth, or it will flicker.** The generator invents mouth
   interiors frame by frame and does not keep them consistent: the sheep's `angry` grew a
   white wedge, then a split blocky shape, then a tooth-and-tongue, all different sizes, on an
   animal whose source art has no teeth at all. It reads as flashing. Anything that opens its
   mouth is exposed to this, so say what the open mouth *shows*: "one clean smooth rounded
   patch of flat pink inside a plain dark muzzle, drawn identically in every frame it appears".
   The positive description is what fixes it; "no teeth" on its own is a negation (rule 6) and
   will be ignored.

   **The defect is instability, not presence.** Pinning the interior works while the mouth
   stays small, and the sheep's first fix over-corrected into a nearly shut mouth that killed
   the emotion entirely — an `angry` clip with no anger left in it. A wide-open shout brings
   teeth back whatever the prompt says, and that is fine: a consistent pair of white blocks
   that scale with the mouth reads as a cartoon shout. Judge it on consecutive frames, not on
   whether teeth appear at all. What you are hunting is a shape that changes every frame.

   Zoom in before judging: crop the head from a handful of frames, scale it up and lay them
   side by side. Per-frame detail defects are invisible in a full spritesheet and obvious at
   4x.

**`angry` is the hardest emotion — but only when the animal has no carrier for it.** It came out
weak first-try on the donkey and took five attempts on the owl. The fox nailed it first try,
because ears-pinned-back plus a snarl is an unambiguous canid anger signal that survives the
downscale. If `angry` is not landing, the fix is usually a better carrier, not a stronger
adjective.

8. **A carrier can only be spent once.** The owl's eyes belong to `angry` (slits under a hard V)
   and `sneaky` (narrowed, glancing). `approving` was added later and asked for the inverse —
   brow lifting, eyes curving into happy upward crescents — and the generator read the crescent
   as **pupil dilation**, blacking out the owl's signature yellow mid-clip and leaving every
   other frame an ordinary wide-eyed owl, indistinguishable from the neutral state it exists to
   contrast with. Every metric was clean: seam 0.1%, swing 5.8%, drift 0.8px. The second attempt
   moved the signal onto the **silhouette** (whole head cocking over with the ear tufts, eyes
   pinned wide and round) and held first try. When two emotions have to read differently at icon
   size, one of them needs a different carrier entirely — and the numbers cannot tell you it
   failed, only your eyes can.

## Things about the Ludo API that will bite you

Full contract in [references/ludo-api.md](references/ludo-api.md). The four that cost time:

- **`request_id` is an idempotency key, not a label.** The docs sell it as a tag for finding a
  result later. Re-submitting one returns the earlier generation verbatim — no new job, no
  charge. The script hashes prompt + reference + settings into the id, so an unchanged manifest
  re-runs free and an edited prompt really regenerates; `--force` appends a timestamp to escape
  the cache. **If a "regenerated" clip has byte-identical metrics, this is why.**
- **Asset URLs expire after 7 days.** The pipeline downloads inside the run that generated
  them. Never store a returned URL anywhere.
- **`loop: true` is a hint the generator can miss.** `closeLoop` in the manifest defaults on and
  pins `final_image` to the same reference the clip starts from, which closes the loop by
  construction (measured 5.88% → 0.22% seam).
- **The REST default flips from synchronous to async on 2026-09-10.** The client already sends
  `async: true` and long-polls, so it is unaffected. Do not "simplify" that away.

### The third register: the moderator status face

The debate's moderator status is **one still frame** of an existing portrait sheet — no separate
asset, no export step. `moderatorOpinionFace()` in `src/react/trial/utils/trialHelpers.ts` maps a
score to a frame index and `FaceStill` holds that frame in an `em`-sized box. Duchess (the
default) uses three frames of the owl's **`approving`** clip, which opens its eyes from nearly
shut to fully round: frame 20 (open) / 6 (half) / 4 (nearly shut). Cass wears the 1.7 fence-skirmish stills (`moderatorId`, not on stage) with three fox
portraits instead: `sneaky` 17 / `doubtful` 9 / `angry` 3.

**The frame indices are part of the art.** If you regenerate a source clip, open the new frames
and re-pick — a diffusion clip's frames are in no fixed order across generations, so an index
means nothing once the pixels change. `docs/characters-and-animations.md` §11 has the rest.

**Seven animals are generated** (`donkey-grey`, `owl`, `raccoon`, `fox`, `white-sheep-1`,
`brown-wolf`, `dog`). Four more atlases are imported (`cow`, `cow-female-001`, `mouse`,
`pig`) and listed in the emotion manifest, but they have no generated clips yet — do not
generate them until asked. `dog` has all five body clips and four portraits (`talking`,
`doubtful`, `angry`, `thinking`); sneaky was not cropped, because the head dip saturates
the aligner. Reach for this skill to regenerate a clip that reads wrong, add an emotion
to the vocabulary, or give art to a newly added animal.

## `scripts/ludo/promoted-clips.json` is the source of truth

Committed record of every clip ever promoted. `--promote` **merges** into it and generates the
TS module from the merged whole. Each entry also stores the exact `prompt` the clip was
generated from, its `quality` numbers, optional `reviewNotes`, and `generatedAt` — provenance
the runtime has no use for, but which the manifest stops carrying the moment someone edits a
generic prompt or adds an override. `--promote` and `--remeasure` keep existing `reviewNotes`.

This exists because promote used to rebuild the module from whatever was in the review
directory, which made it silently destructive: promoting the owl after clearing the review dir
dropped every donkey entry, leaving five orphaned PNGs in `public/` the game no longer knew
about. Nothing failed — the clips just stopped existing. The metadata cannot be recovered from
a promoted PNG alone (grid shape and frame rate are not derivable from the image), so it has to
be written down.

**If you ever see the generated module lose an animal, check this file first.**

## Never hand-edit the generated art metadata

`src/phaser/animals/emotionSheets.generated.ts` is written by `--promote`. Its `scale`,
`originX` and `originY` are **measured**, not chosen: a generated 512px cell is not the atlas
export canvas the staging was tuned against, and without those numbers the animal renders ~3×
too small and floats off the floor line. If they look wrong, fix the measurement in
`scripts/ludo/normalize.mjs` and run `--remeasure` against the shipped PNGs — never patch the
output. Re-promote is only needed when the PNG itself changed.

## Reviewing in game

**Main menu → Animation Gallery** (`AnimalGallery` scene). Pick an animal, hold any clip on a
loop, compare generated clips against the atlas clips they sit beside. Emotions with no art are
listed dashed and marked "no art yet". Clip and animal badges are **OK** / **check** / **?**.
A clip is **check** if metrics trip, the frame count is not 25, or it has `reviewNotes`. The
animal is **OK** only when all five emotions pass.

When a clip looks wrong but the numbers are clean, add `reviewNotes` on that clip in
`promoted-clips.json` and `--reindex`. Do not hand-edit the generated TS.

Turn **off** the smooth-transition toggle to see the raw cut — switching between an atlas clip
and a generated one changes texture, scale and origin on one frame, and the crossfade hides
whether that switch is actually clean.

The panel's **Dialogue portraits** section does the same job for the crop register: the five
emotions again, each with a live thumbnail, and a large preview over the stage at 112px (as it
ships) and 224px (a 2x display). It is the in-game counterpart to `boxes.html` and uses the
game's own `FaceClip`, so what you approve there is framed exactly as it ships. Portrait
selection is independent of clip selection — a portrait plays beside the body clip it was cut
from, which is the comparison worth having. Badges use the crop thresholds, so **no height-swing
gate**: a crop cannot zoom.

## Dialogue portraits (`--faces`) — cropped, never generated

The second register: head-and-shoulders loops played by React in the farm dialogue box and the
debate log. **They cost nothing and call no API** — they are cut out of the promoted body clips
by `scripts/ludo/cropFace.mjs`.

```bash
# 1. Free. Cuts every portrait, writes a review page, promotes nothing.
npm run sprites:emotions -- --faces --dry-run [--animal fox]
open .ludo-review-faces/boxes.html

# 2. Approve the box, then ship. Measures, copies PNGs, rewrites faceSheets.generated.ts.
npm run sprites:emotions -- --faces --promote [--animal fox]
open .ludo-review-faces/index.html
```

**Do not try to generate these.** It was attempted three times for 12 credits and failed the
same way each time: the eyelid aperture swung 165%, 196% and 458% across the clip, and two
attempts invented teeth the reference does not have. It is not a prompt problem — a head
submitted at a 485x363 bounding box came back at 257x192, so the endpoint reframes its input and
redraws the head from scratch in every frame. The body clips' faces hold still because the
generator was animating posture and left the face alone.

### Authoring a head box

One `headCrop` per animal in the manifest, in fractions of the character's **union alpha box
across all frames of its `talking` clip** — not of the cell, and not of the reference frame the
retired `face` rect used. Rules C1-C6 are in the manifest's `$faceComment`. The short version:

- **One rect per animal, never per emotion.** All five portraits play in the same box in the
  same dialogue, so a tighter `angry` rect makes the head jump size when the beat changes.
- **Negative x/y are normal**, and values past 1.0 are fine and get clamped.
- **Part of the neck and chest in shot is correct.** It is what makes a portrait read as a
  portrait instead of a floating head.
- **Judge at both sizes the review page shows.** 112px is what ships; 224px is a 2x display, and
  softness only shows at the second. Upscales run x1.23 (owl, best) to x2.21 (brown-wolf, worst).
  The gallery's portraits section shows the same pair, so this check can also be done in game.
- **Read the alignment numbers, not the height swing.** The head bobs through a body clip — the
  fox's by 30px, its `thinking` by 40px — and the cropper tracks it per frame.

### Known limitation: the face translates

Human review of the shipped crops: they are **glitch-free** — no strobing eye, no flickering
tooth, none of what generation produced — but it is obvious the source was not authored for a
head-only crop. A portrait wants the face to hold still with only the mouth and eyes moving;
here the face translates slightly, because the body clip is animating the whole animal and the
head travels as part of that performance. The aligner removes most of it, not all.

The cause is not a bug: **every `talking` prompt asks for "head bobbing gently in time with
speech"**, deliberately, because at 300px a bobbing head is what reads as talking and a
motionless one reads as idle. The crop faithfully reproduces a bob that was requested.

**Accepted, not fixed.** If it needs improving, the lever is the **cropper**, not the prompt:
the aligner matches the rect's rigid top 55% (skull, ears and eye), so when the head *rotates*
the best translation-only match is a compromise that leaves the face offset. Narrowing the
template to just the facial region would pin what the viewer actually looks at and let the ears
drift instead; sub-pixel refinement and a small rotation search would take the rest. The
structural answer is that head travel *is* part of a posture animation, so a portrait cut from
one always inherits some.

### `_still` variants: tried, and they do not do what their name says

There is a `talking_still` emotion in the vocabulary and the cropper prefers `<emotion>_still`
as its source when one has been promoted. It asks for the body and head locked with only the
face moving. **It does not deliver a stiller head.** Measured on `donkey-grey/talking_still`,
change per frame in the skull-and-ears band of the finished portrait — a band with no speech
animation in it, so anything moving there is pose change the aligner cannot remove:

| portrait cut from | skull+ears change/frame | crop loop seam |
|---|---|---|
| `talking` (bobbing) | 1.07% | 4.15% — fails the gate |
| `talking_still` | **2.54%** | **0.56%** — passes |

Twice as unstable, plus a ~22px lateral slide the bobbing clip did not have: with the body
pinned, the generator moved the head instead. The shipped cast runs 0.53% (owl) to 2.12%
(white-sheep-1), so it is the wobbliest portrait in the game.

It shipped for a different reason than intended — the fresh generation **fixed the loop seam**,
which is what had kept `donkey-grey` out of the register entirely. **Do not generate the other
four still variants expecting stillness.** Generate one only when an animal's body clip has a
seam bad enough to disqualify its portrait.

### Cropping amplifies the source clip's loop seam

Consistently **2-8x, mostly 3.5-5x** — the head fills the portrait where it was a fraction of the
body frame, so a seam that is invisible at body scale is loud at portrait scale. This decides
which animals work. Everything lands under the 2% gate except **`donkey-grey`**, whose
`doubtful` goes 2.52% → 11.22% because its body clips are the cast's weakest. Its portraits are
**deliberately not promoted**, which matters more than for the others: the donkey is Rue, so its
portrait would be on screen most. `AnimalFace` renders nothing without art, so Rue stays
text-only. Fixing it means regenerating those three body clips — that costs credits.

Two other things worth knowing before authoring a box:

- **The sheep has no mouth drawn at its angle.** `white-sheep-1`'s head is a black mass with a
  wool tuft and two small eyes. Its portrait animates but reads as a head bob, not speech.
- **Portraits are palettised PNG**, ~410-480KB each, and honestly named — unlike the body clips,
  which are WebP under a `.png` extension. A lossless write was 1.8MB a sheet; lossy WebP would
  halve the current size again and is avoided because ringing around hard black outlines is what
  lossy codecs do worst at this size. The 25 shipped portraits are 12MB.

## Adding a new emotion to the vocabulary

1. Add the name to `ANIMAL_EMOTIONS` in `src/phaser/animals/animalEmotions.ts`.
2. Add a prompt under `emotions` in the manifest, plus any per-animal `overrides`.
3. Teach `activeEmotionForWorkflow()` in `src/react/trial/utils/trialHelpers.ts` when it fires,
   or author it directly on a statement via `Statement.emotion`.
4. Generate → review → promote.

The generator refuses a manifest emotion that is not in `ANIMAL_EMOTIONS`, so step 1 cannot be
skipped silently.

## Giving a newly added animal its emotion art

Add an entry under `animals` in the manifest with `species`, `view`, and `reference` (the exact
frame filename from that animal's atlas JSON — check it, the owl's are foldered). Add
`overrides` for any emotion whose generic posture prompt makes no sense for that body. Then
dry-run, look at the extracted `reference.png` to confirm the pose and facing, and generate.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `API key rejected (HTTP 403)` | Bad key, or the plan lacks API access |
| `Frame "..." is not in ...` | `reference` does not match a `filename` in that animal's atlas JSON |
| Regenerated clip is byte-identical | `request_id` cache — use `--force` |
| Animal renders tiny / floats off the floor | Promoted without normalization, or hand-edited generated TS. If atlas idle sits on the floor but emotion clips float, re-run `--remeasure` after a `normalize.mjs` change. |
| Emotion does nothing in game | No art for that pairing; it falls back to `playAlert()` by design |
| `defines emotion(s) the game does not know` | Manifest names an emotion missing from `ANIMAL_EMOTIONS` |
