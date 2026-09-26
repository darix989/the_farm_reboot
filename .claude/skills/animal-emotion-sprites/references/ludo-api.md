# Ludo.ai REST API — the contract this pipeline is built on

Read this when debugging `scripts/ludo/ludoClient.mjs`, extending the pipeline to a new
endpoint, switching a failed clip to Hydra, or preparing the approved image-edit fallback
after two failed animation attempts.

**Authoritative source is the OpenAPI document**, not the prose docs — they have drifted:

```
https://api.ludo.ai/api-documentation/swagger.json
```

Re-read it before changing a payload field. The human-readable page at
`api.ludo.ai/api-documentation` is a Redoc shell that renders that same file.

## Basics

- Base URL: `https://api.ludo.ai/api`
- Auth header: `Authorization: ApiKey <key>` — **`ApiKey`, not `Bearer`**
- Key comes from app.ludo.ai; the plan must include API access

## Endpoints this pipeline uses

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/auth/validate-api-key` | Free preflight. **Returns `204`, not the documented `200`** — accept any 2xx; rejection is `403` |
| `POST` | `/assets/sprite/animate` | The generation call |
| `GET` | `/assets/jobs/{id}?wait=<0-60>` | Long-poll one job to a terminal state |
| `GET` | `/assets/jobs?limit=n` | List recent jobs — how to audit `credits_charged` after a run |

Other sprite endpoints exist and may be worth reaching for: `/assets/sprite/animate-keyframes`
(interpolate through up to 3 fixed poses — the better tool if a posture proves hard to hit with
prose alone), `/assets/sprite/transfer-motion` (retarget one clip's motion onto another
sprite, e.g. to give the whole cast an identical "thinking" rhythm), `/assets/sprite/pose`,
`/assets/sprite/edit`.

## Image-edit fallback after two failed attempts

Verified 2026-09-13 against the [official OpenAPI schema](https://api.ludo.ai/api-documentation/swagger.json).
The [Image Generator guide](https://ludo.ai/docs/image-generator) describes the UI modes;
the [official MCP reference](https://github.com/Ludo-AI/ludo-mcp#edit-image-editimage) also
documents `editImage`. API support is confirmed from the contract; this documentation update
did not submit a paid test.

Use **`POST /assets/image/edit`** for a still image. This is distinct from editing an animated
spritesheet via `/assets/sprite/edit`. The existing `submitGeneration` helper accepts
`'image/edit'` and supplies authentication and `async: true`; no new SDK is needed.

| Field | Fallback use |
|---|---|
| `image` | Required source still as URL or PNG data URI; use locally saved bytes |
| `prompt` | Required, exact user-approved edit instructions |
| `reference_image` | Optional second image for style/content guidance |
| `n` | Set `1`; API permits 1–4 |
| `augment_prompt` | Set `false` to preserve the reviewed wording |
| `request_id` | Unique to the approved image/prompt/settings; reuse only to recover that job |

Inputs over 15 MB are rejected. Editing costs **0.5 credits per successful output**. Poll a
`202` job with `awaitJob`; both its completed `result` and a direct `200` response contain an
**array** of image results. Download `result[0].url` with `downloadAsset` immediately.

### Preparing the fallback request

Follow the confirmation gate in [SKILL.md](../SKILL.md#after-two-failed-animation-attempts-stop-and-review-an-image-edit-fallback)
before executing a paid request. Prepare the payload and provenance locally first. Save the
original still, proposed edit and motion prompts, settings, attempt history, and input hashes
under `.ludo-review/<animal>/<emotion>/image-edit/`. Record approval scope and job IDs there
when available; retain downloaded bytes rather than expiring URLs.

Use this as a prompt structure, replacing every bracketed phrase for the actual animal and
defect before showing it to the user:

> Edit this full-body sprite so [specific expression or small pose adjustment]. Preserve
> [character's identifying features], its palette, outlines, proportions, camera view,
> facing, canvas framing, and foot positions. Keep the surroundings transparent. Hold
> [unchanged body parts] in their reference positions. Depict [precise stable mouth/eye
> details, if relevant].

Describe a single still pose in the edit prompt. Put movement, timing, and the return to that
pose in the separate animation prompt. Inspect the edit for identity drift, framing and alpha
before using it; failed inspection stops the approved sequence before the animation charge.

The current CLI has **no edited-reference flag**: it extracts the atlas frame on each run.
Do not replace the atlas or assume overwriting `reference.png` changes the next generation.
For an approved fallback, prepare a separate request through `submitGeneration`:

- Use `'image/edit'` with the payload above, then download and review the still.
- Use `'sprite/animate'` with the reviewed still as `initial_image` and, when `closeLoop` is
  enabled, the same still as `final_image`. Carry over the frame count, duration, model and
  other animation settings named in that approved proposal. The proposal's default is the
  pipeline's Blitz settings (~4 credits). Name Hydra in it only when the approved scope is
  the 9-credit Hydra retry, not by habit. Set `augment_prompt: false`, and use a new request
  ID derived from the edited image bytes, motion prompt and settings.
- Preserve the original atlas `reference.png` for `measureNormalization`; save the edited
  generation input separately. Before promotion, bring the output through the existing
  quality/review and metadata flow in `scripts/generate-emotion-sprites.mjs`, recording the
  edit provenance alongside the motion prompt. Do not hand-edit generated runtime metadata.

An edited pose can change the cut against idle even when its loop is clean. Review with smooth
transitions off, at stage scale and in enlarged facial frames. Promotion still requires human
visual review. Any further edit, retry, or different prompt requires renewed approval when it
falls outside the confirmed scope.

## Hydra retry after the first attempt fails

Verified 2026-09-26 against the [official OpenAPI schema](https://api.ludo.ai/api-documentation/swagger.json).
`hydra` is the API's current default and its most capable sprite-animation model. This
pipeline does **not** start on it.

The committed manifest default stays `blitz` (25 frames, duration 2, about 4 credits). That
first attempt is the one to run. Switch to `hydra` only as the **second** paid attempt for
that same animal/emotion, and only after the first one has failed: a terminal generation
failure, or a clip rejected on visual review. A dry run, a poll of an existing job, a cache
hit, and an unresolved timeout do not count — inspect a timed-out job before resubmitting.

Do not open with Hydra, and do not change `defaults.model` in `scripts/ludo/emotion-manifest.json`.
A shared default would send every later first attempt to Hydra. The CLI has no model flag.
`planJobs` spreads a per-emotion `overrides` entry over the defaults, so set `model`,
`duration`, and `frames` on that one animal/emotion override for the retry. Leave any
existing `prompt` as it is unless the failure was the prompt. Remove those three fields
after the run, and do not commit them: the next first attempt for that clip has to be
Blitz again.

| Field | First attempt (keep) | Hydra retry |
|---|---|---|
| `model` | `blitz` | `hydra` |
| `duration` | `2` | `3` (shortest Hydra allows) |
| `frames` | `25` | `36` |
| Playback | 25/2 → 12.5 fps | 36/3 → 12 fps |
| Cost | 4-credit Blitz floor | **9 credits** (3 credits/s × 3s) |

Hydra rejects the pipeline's duration of 2. Allowed values are `3`, `3.5`, `4`, `4.5`, `5`.
Duration 3 with 36 frames is the retry to propose: it is the cheapest Hydra clip and stays
near the atlas tempo. `Math.round(25 / 3)` would store 8 fps and play the same motion too
slowly. Longer durations cost 3 credits per extra second (4s is 12 credits) and are not the
default retry.

Hydra also returns `audio_url`. This pipeline does not use it. Download the spritesheet (and
the gif, as the client already does) inside the run; do not persist the audio URL.

The settings change is a new `request_id`, so the retry is a real generation, not a cache
hit. Archive the failed review directory first. If its `meta.json` is still in place the CLI
skips the clip unless `--force` is set. Keep `closeLoop`, `crop: false`, and the same motion
prompt unless the failure was the prompt itself.

State the 9-credit cost, the duration and frame change, and the failure reason, then wait
for a yes. Permission for the original Blitz clip does not cover this charge.

If the Hydra retry also fails, stop. That is the second unsuccessful attempt, so the next
step is the image-edit gate above — not another model, and not a second Hydra call. The
image-edit animation stays on the approved settings in that proposal; do not assume it is
Hydra unless that proposal says so.

Hydra is for full-body sprite animation only. It does not reopen the abandoned headshot
path below.

## Do not use this endpoint for headshots

Recorded so nobody spends the credits again. Generating face-only clips from a head crop was
tried three times and abandoned after 12 credits:

| attempt | model | eyelid aperture swing over the clip | invented teeth |
|---|---|---|---|
| 1 | `blitz` | 165% | 16 of 25 frames |
| 2 | `blitz`, aperture pinned in the prompt | 196% | 11 of 25 |
| 3 | `forge` | 458% | 16 of 25, plus a full toothy grin |

The cause is `margin_ratio_mode: auto` reframing the input: a head submitted at a 485×363
bounding box came back at 257×192, so the endpoint is not animating the pixels it was given, it
redraws the head smaller from scratch in every frame. No prompt makes a redrawn eye match the
one before it, and `blitz` really is the most predictable of the models — `forge` was four times
worse and ignored an explicit "no teeth, no tongue and no fangs" instruction outright.

Note also that the churn quality check reported **nothing** on the worst of the three: it
compares consecutive frames, so a six-frame slow eye closure registers as no change at all. It
catches pops, not ramps.

Dialogue portraits are now cut locally out of the body clips for free — see the `--faces`
section of SKILL.md and `scripts/ludo/cropFace.mjs`.

## `AnimateSpritePayload`

Required: `motion_prompt`, `initial_image` (URL **or** `data:image/png;base64,...`).

| Field | Default | Notes |
|---|---|---|
| `final_image` | — | Ending frame for interpolation. The pipeline pins this to the same reference as `initial_image` to force a clean loop (`closeLoop`) |
| `frames` | 36 | One of 4, 9, 16, 25, 36, 49, 64. The pipeline's first attempt uses 25; a Hydra retry uses 36 |
| `frame_size` | 0 (max) | 32/64/96/128/192/256/384, `0` max, `-1` AI 1.5× upscale, `-9` match input. **Advisory** — requesting 256 returned 512 cells in practice, so always derive real frame size from the returned `num_cols`/`num_rows` and the actual image dimensions |
| `model` | `hydra` on the API; this pipeline's first attempt sends `blitz` | Current: `hydra` (most capable, with audio), `forge`, `forge-pixel`. Legacy since 2026-09-17, still accepted: `blitz`, `eagle`, `eagle-audio` (`standard` aliases `blitz`). Switch to `hydra` only after the first attempt fails — see above |
| `duration` | 3 | Depends on the model. Blitz: 1.2–4s, and the first attempt uses 2. Hydra: 3, 3.5, 4, 4.5, 5 only — duration 2 is a 400. A Hydra retry uses 3 |
| `loop` | true | A hint the generator can miss — see `final_image` |
| `crop` | false | **Keep false.** Cropping gives per-frame sizes, and a uniform grid is the whole reason `load.spritesheet` can read these without an atlas |
| `image_type` | `sprite` | |
| `margin_ratio_mode` | `auto` | `manual` uses `margin_ratio_horizontal`/`_vertical`; the deprecated uniform `margin_ratio` cannot be combined with them (400) |
| `augment_prompt` | true | Expands the motion prompt behind the scenes |
| `gif` | false | Pipeline sets true — free, and the review dir keeps it |
| `individual_frames` | false | |
| `request_id` | — | **Idempotency key.** See below |
| `async` | false today | Pipeline always sends `true` |

## Responses

- `200` → `SpriteResult` (a synchronous answer)
- `202` → `PublicJob` `{ id, status: 'queued' }` — poll `/assets/jobs/{id}`
- `400` → `ErrorResponse` `{ message, ... }`

`SpriteResult`: `spritesheet_url`, `video_url`, `gif_url`, `individual_frame_urls`,
`num_frames`, `num_cols`, `num_rows`, `spritesheet_with_background_url`, `duration`,
`request_id`, `created_at`, and `audio_url` (Hydra only; absent for Forge and Forge Pixel).
The pipeline does not download `audio_url`.

`PublicJob`: `id`, `task_type`, `status` (`queued` | `running` | `succeeded` | `failed` |
`canceled`), `result`, `error`, `credits_charged`, `poll_after_ms`.

## `request_id` is an idempotency key

The single most misleading thing in the docs. They describe it as a tag for finding a result
again via `listGenerations`. It is also a cache key: **re-submitting an id the account has
already used returns that earlier generation verbatim — no new job, no charge.**

Discovered by "regenerating" two clips with a corrected prompt and getting byte-identical
output back, for free, with the job list still showing only the original five jobs.

The pipeline therefore builds the id as
`farm-emotion-<animal>-<emotion>-<sha1(prompt, reference, settings)[0..8]>`, which turns the
behaviour into a feature — an unchanged manifest re-runs free, an edited prompt regenerates —
and `--force` appends `Date.now().toString(36)` to escape it entirely.

## Asset URLs expire after 7 days

Every returned URL is a signed GCS link. Download inside the run that generated it; never
persist a URL anywhere.

## Async transition

Synchronous is the REST default **until 2026-09-10**, after which requests default to async and
return a job id. `async: false` keeps synchronous behaviour and stays supported indefinitely.
The client sends `async: true` and long-polls, so it behaves identically on both sides of that
date and never holds a socket open for the 30–90s a generation takes. A synchronous call would
have to handle the `202` anyway — the API falls back to queueing whenever a sync generation is
still running after 15 minutes.

## Limits and cost

- **50 generations queued or running per account.** Beyond that: `429` / `PENDING_JOBS_LIMIT`
- **150 requests per 5 minutes** on read endpoints, per key; `429` carries `Retry-After`. The
  client's server-side `wait` long-poll makes roughly one request per minute of generation, so
  a whole cast in flight stays clear of this
- Credits are per model-second. Sprite animation, verified 2026-09-26: **Hydra 3/s with a
  shortest duration of 3s, so 9 credits minimum**, and it generates audio. Forge and
  Forge Pixel 1.5/s with a 4-credit minimum. Legacy, still priced but scheduled for removal:
  Blitz 1.9/s, Eagle 2.6/s, Eagle+Audio 3.1/s, each with a 4-credit minimum. The pipeline's
  first attempt (Blitz, 2s) hits that 4-credit floor. A Hydra retry is 9 credits at 3s, not
  another 4
- Audit a run: `GET /assets/jobs?limit=n` and sum `credits_charged`

## MCP alternative

Ludo also exposes `https://mcp.ludo.ai/mcp` (same `Authorization: ApiKey` header), which the
project deliberately does **not** use. Conversational generation leaves no record of which
prompt produced which sprite and cannot be re-run by anyone but the agent that did it. The
committed manifest is that record. Note that over MCP every generation is async with no flag to
set, so the job-polling client would be required regardless.
