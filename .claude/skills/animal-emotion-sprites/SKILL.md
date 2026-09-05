---
name: animal-emotion-sprites
argument-hint: "[--animal <id>] [--emotion <name>] [--dry-run|--promote|--reindex|--remeasure|--force]"
description: Generate, review and ship the cast's per-emotion animation clips (talking, doubtful, angry, thinking, sneaky) via the Ludo.ai API. Use when asked to generate, regenerate, add or fix an animal's emotion animation or spritesheet, to add a new emotion to the vocabulary, to give a newly added animal its emotion art, or when a generated clip looks wrong in game (wrong size, floating off the floor, popping on loop). Also covers the Animation Gallery used to review the results.
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

State the projected cost before generating: `clips × 4 credits`. The five imported animals
that still have no emotion art (`cow`, `cow-female-001`, `dog`, `mouse`, `pig`) are 25 clips,
~100 credits. Do not generate them until asked.

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

**The original six are generated** (`donkey-grey`, `owl`, `raccoon`, `fox`, `white-sheep-1`,
`brown-wolf` — 30 clips). Five more atlases are imported (`cow`, `cow-female-001`, `dog`,
`mouse`, `pig`) and listed in the emotion manifest, but they have no generated clips yet —
do not generate them until asked. Reach for this skill to regenerate a clip that reads
wrong, add an emotion to the vocabulary, or give art to a newly added animal.

## `scripts/ludo/promoted-clips.json` is the source of truth

Committed record of every clip ever promoted. `--promote` **merges** into it and generates the
TS module from the merged whole. Each entry also stores the exact `prompt` the clip was
generated from, its `quality` numbers and `generatedAt` — provenance the runtime has no use
for, but which the manifest stops carrying the moment someone edits a generic prompt or adds
an override.

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
listed dashed and marked "no art yet".

Turn **off** the smooth-transition toggle to see the raw cut — switching between an atlas clip
and a generated one changes texture, scale and origin on one frame, and the crossfade hides
whether that switch is actually clean.

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
