#!/usr/bin/env node
/**
 * Authoring lint for `src/data/debates/*.json`.
 *
 * The recap surfaces (the introduction summary modal and the round recap modal) must not
 * repeat the wording the player has just read. Every line those modals show therefore
 * needs an authored `summary` / `introductionSummary`, and each one has to stay inside the
 * two-line budget the recap clamps to.
 *
 * Run with `npm run lint:scenarios`.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Keep in sync with `RECAP_SUMMARY_MAX_CHARS` in `src/types/debateEntities.ts`. */
const MAX_CHARS = 160;

const DEBATES_DIR = 'src/data/debates';

const errors = [];

function fail(file, where, message) {
  errors.push(`${file} → ${where}: ${message}`);
}

/** Everything the recap modals render, normalised for comparison. */
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

function checkSummary(file, where, summary, fullText) {
  if (typeof summary !== 'string' || !summary.trim()) {
    fail(file, where, 'missing `summary` — the recap would fall back to the spoken line');
    return;
  }
  const s = summary.trim();
  if (s.length > MAX_CHARS) {
    fail(file, where, `summary is ${s.length} chars; the two-line budget is ${MAX_CHARS}`);
  }
  if (s.includes('\n')) {
    fail(file, where, 'summary contains a newline; write it as one clamped paragraph');
  }
  if (!fullText) return;
  const a = normalize(s);
  const b = normalize(fullText);
  if (a === b || b.startsWith(a)) {
    fail(file, where, 'summary repeats the spoken wording; paraphrase it instead');
  }
}

function statementText(statement) {
  return (statement.sentences ?? []).map((sentence) => sentence.text).join(' ');
}

for (const name of readdirSync(DEBATES_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()) {
  const scenario = JSON.parse(readFileSync(join(DEBATES_DIR, name), 'utf8'));
  const mechanics = scenario.mechanics ?? {};

  if (scenario.introduction?.trim() && mechanics.showIntroSummary !== false) {
    checkSummary(name, 'introductionSummary', scenario.introductionSummary, scenario.introduction);
  }

  if (mechanics.showRoundRecap === false) continue;

  for (const round of scenario.rounds ?? []) {
    const at = `round ${round.roundNumber} (${round.id})`;
    if (round.kind === 'npc') {
      checkSummary(
        name,
        `${at} statement`,
        round.statement?.summary,
        statementText(round.statement ?? {}),
      );
      continue;
    }
    if (round.opponentPrompt) {
      checkSummary(
        name,
        `${at} opponentPrompt`,
        round.opponentPrompt.summary,
        statementText(round.opponentPrompt),
      );
    }
    for (const option of round.options ?? []) {
      // `summary` paraphrases the unlocked copy when the option is gated.
      const spoken = statementText({ sentences: option.unlockedSentences ?? option.sentences });
      checkSummary(name, `${at} option ${option.id}`, option.summary, spoken);
    }
    for (const response of round.opponentResponses ?? []) {
      checkSummary(
        name,
        `${at} response for ${response.forOptionId}`,
        response.statement?.summary,
        statementText(response.statement ?? {}),
      );
    }
  }
}

if (errors.length) {
  console.error(`Scenario lint failed — ${errors.length} problem(s):\n`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

console.log('Scenario lint passed.');
