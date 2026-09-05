---
name: animal-emotion-sprites
argument-hint: "[--animal <id>] [--emotion <name>] [--dry-run|--promote|--force]"
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

State the projected cost before generating: `clips × 4 credits`. A full uncovered cast is
~100 credits.

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
result cache — see "request_id is an idempotency key" below.

Generation and promotion are separate on purpose: diffusion output is not deterministic and
not always usable, so nothing reaches `public/assets/` without a human having watched it loop.

## Prerequisites

`LUDO_API_KEY` in `.env.local` at the repo root (gitignored; `npm run sprites:emotions` loads
it via Node's `--env-file-if-exists`). An exported shell variable works too.

**Never name it `VITE_LUDO_API_KEY`** — Vite inlines every `VITE_`-prefixed variable into the
client bundle, publishing the key to anyone who opens the game.

## Reading the quality numbers

Generation prints three metrics per clip, and they are also stored in each clip's `meta.json`
and shown on the contact sheet. They exist because each caught a real failure that is hard to
see in a single loop and obvious once the clip is in the game.

| Metric | Warns above | What it means | What to do |
|---|---|---|---|
| `loop seam` | 2% | Last frame differs from the first, so it jumps on every repeat | Confirm `closeLoop` is on; regenerate with `--force` |
| `height swing` | 20% | Character's height wanders across frames | Check it is motion (a head dipping) and not a pose collapse (lying down). See the prompt rules |
| `drift ±px` | 20px | Character slides horizontally | Add "in place, no travel" emphasis; regenerate |

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

1. **Describe posture, not expression.** A Trial sprite is ~300px tall, so its face is 50–80px.
   A raised eyebrow is invisible and asking for one wastes the model's attention.
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

## Never hand-edit the generated art metadata

`src/phaser/animals/emotionSheets.generated.ts` is written by `--promote`. Its `scale`,
`originX` and `originY` are **measured**, not chosen: a generated 512px cell is not the atlas
export canvas the staging was tuned against, and without those numbers the animal renders ~3×
too small and floats off the floor line. If they look wrong, fix the measurement in
`scripts/ludo/normalize.mjs` and re-promote — never patch the output.

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
| Animal renders tiny / floats off the floor | Promoted without normalization, or hand-edited generated TS |
| Emotion does nothing in game | No art for that pairing; it falls back to `playAlert()` by design |
| `defines emotion(s) the game does not know` | Manifest names an emotion missing from `ANIMAL_EMOTIONS` |
