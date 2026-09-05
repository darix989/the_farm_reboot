# Ludo.ai REST API — the contract this pipeline is built on

Only read this when debugging `scripts/ludo/ludoClient.mjs` or extending the pipeline to a new
endpoint. The day-to-day workflow needs none of it.

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

## `AnimateSpritePayload`

Required: `motion_prompt`, `initial_image` (URL **or** `data:image/png;base64,...`).

| Field | Default | Notes |
|---|---|---|
| `final_image` | — | Ending frame for interpolation. The pipeline pins this to the same reference as `initial_image` to force a clean loop (`closeLoop`) |
| `frames` | 36 | One of 4, 9, 16, 25, 36, 49, 64. The pipeline uses 16 |
| `frame_size` | 0 (max) | 32/64/96/128/192/256/384, `0` max, `-1` AI 1.5× upscale, `-9` match input. **Advisory** — requesting 256 returned 512 cells in practice, so always derive real frame size from the returned `num_cols`/`num_rows` and the actual image dimensions |
| `model` | `blitz` | `blitz` (most predictable), `forge`, `eagle` (complex motion), `eagle-audio`, `forge-pixel` |
| `duration` | 3 | Blitz: 1.2–4s. The pipeline uses 2 |
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
`request_id`, `created_at`.

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
- Credits are per model-second with a **4-credit minimum**: Forge 1.5/s, Blitz 1.9/s, Eagle
  2.6/s, Eagle+Audio 3.1/s. The pipeline's default (Blitz, 2s) hits the 4-credit floor
- Audit a run: `GET /assets/jobs?limit=n` and sum `credits_charged`

## MCP alternative

Ludo also exposes `https://mcp.ludo.ai/mcp` (same `Authorization: ApiKey` header), which the
project deliberately does **not** use. Conversational generation leaves no record of which
prompt produced which sprite and cannot be re-run by anyone but the agent that did it. The
committed manifest is that record. Note that over MCP every generation is async with no flag to
set, so the job-polling client would be required regardless.
