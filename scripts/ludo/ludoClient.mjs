/**
 * Minimal Ludo.ai REST client — only the three calls the emotion pipeline makes.
 *
 * Contract source: the OpenAPI (Swagger 2.0) document served at
 * `https://api.ludo.ai/api-documentation/swagger.json`, not the prose docs. Re-read it
 * before changing a payload field; the prose and the spec have drifted before.
 *
 * Two deliberate choices:
 *
 * 1. **Always `async: true`.** The REST default is synchronous *today*, but per Ludo's own
 *    MCP README that flips on 2026-09-10, after which a request without the flag returns a
 *    job id instead of a result. Submitting async and polling works identically on both
 *    sides of that date, and does not hold a socket open for the 30-90s a generation takes.
 *    A synchronous call would also have to handle the 202 anyway — the API falls back to
 *    queueing whenever a sync generation is still running after 15 minutes.
 *
 * 2. **No SDK.** `fetch` is built in; a dependency here would be one more thing to keep
 *    current for four HTTP calls.
 */

const BASE_URL = 'https://api.ludo.ai/api';

/** Long-poll ceiling the API accepts on `GET /assets/jobs/{id}` (seconds). */
const MAX_WAIT_SECONDS = 60;

export class LudoError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = 'LudoError';
    this.status = status;
    this.body = body;
  }
}

function authHeaders(apiKey) {
  return {
    // Note: `ApiKey <key>`, not `Bearer <key>`.
    Authorization: `ApiKey ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

async function readBody(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * `GET /auth/validate-api-key` — free, and the only way to tell "bad key" apart from "bad
 * payload" before spending credits. Worth the extra round trip at the top of a run that may
 * be about to submit thirty generations.
 */
export async function validateApiKey(apiKey) {
  const response = await fetch(`${BASE_URL}/auth/validate-api-key`, {
    headers: authHeaders(apiKey),
  });
  if (response.status === 200) return;
  throw new LudoError(
    `API key rejected (HTTP ${response.status}). Check LUDO_API_KEY — it is the key from app.ludo.ai, and the plan must include API access.`,
    { status: response.status, body: await readBody(response) },
  );
}

/**
 * Submits one generation and returns its job id.
 *
 * `endpoint` is a path under `/assets`, e.g. `sprite/animate`. Returns `{ id }` from the 202;
 * a 200 (a server that still answered synchronously despite `async: true`) is normalised to
 * the same shape by wrapping the result in a synthetic already-finished job.
 */
export async function submitGeneration(apiKey, endpoint, payload) {
  const response = await fetch(`${BASE_URL}/assets/${endpoint}`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({ ...payload, async: true }),
  });

  const body = await readBody(response);

  if (response.status === 202 && body?.id) return { id: body.id, result: null };
  if (response.status === 200) return { id: body?.request_id ?? null, result: body };

  const detail = typeof body === 'string' ? body : (body?.message ?? JSON.stringify(body));
  throw new LudoError(`POST /assets/${endpoint} failed (HTTP ${response.status}): ${detail}`, {
    status: response.status,
    body,
  });
}

/**
 * Long-polls `GET /assets/jobs/{id}` until the job reaches a terminal state, and returns its
 * `result`.
 *
 * The API's own `wait` parameter does the waiting server-side (up to 60s per call), so this
 * loop makes one request per minute of generation rather than one every few seconds — which
 * also keeps it clear of the 150-requests-per-5-minutes read limit even with a whole cast in
 * flight. `poll_after_ms` on a non-terminal response is respected when present.
 */
export async function awaitJob(apiKey, jobId, { timeoutMs = 10 * 60 * 1000, onTick } = {}) {
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    if (Date.now() > deadline) {
      throw new LudoError(`Job ${jobId} did not finish within ${Math.round(timeoutMs / 1000)}s`);
    }

    const remainingSeconds = Math.max(1, Math.round((deadline - Date.now()) / 1000));
    const wait = Math.min(MAX_WAIT_SECONDS, remainingSeconds);
    const response = await fetch(`${BASE_URL}/assets/jobs/${jobId}?wait=${wait}`, {
      headers: authHeaders(apiKey),
    });
    const job = await readBody(response);

    if (!response.ok) {
      throw new LudoError(`GET /assets/jobs/${jobId} failed (HTTP ${response.status})`, {
        status: response.status,
        body: job,
      });
    }

    if (job.status === 'succeeded') return job.result;
    if (job.status === 'failed' || job.status === 'canceled') {
      throw new LudoError(
        `Job ${jobId} ${job.status}: ${job.error?.message ?? 'no error message given'}`,
        { body: job },
      );
    }

    onTick?.(job.status);
    if (job.poll_after_ms) await new Promise((r) => setTimeout(r, job.poll_after_ms));
  }
}

/**
 * Downloads a generated asset.
 *
 * Every URL the API returns is a signed GCS link that **expires after 7 days**, so nothing
 * downstream may store one — the pipeline downloads inside the same run that generated it,
 * and the review directory holds bytes, never URLs.
 */
export async function downloadAsset(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new LudoError(`Downloading ${url} failed (HTTP ${response.status})`, {
      status: response.status,
    });
  }
  return Buffer.from(await response.arrayBuffer());
}
