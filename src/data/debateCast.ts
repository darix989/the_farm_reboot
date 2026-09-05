/**
 * Who belongs on the character stage for a given scenario.
 *
 * Split out of `src/react/trial/utils/trialHelpers.ts` so the Phaser `Trial` scene can
 * derive its cast without importing from `src/react/` (see AGENTS.md's layering rules) —
 * this is a pure function over scenario content, not React-side logic.
 */
import { PLAYER_CHARACTER_ID } from './characters';
import type { DebateScenarioJson } from '../types/debateEntities';

export function debateParticipantIds(debate: DebateScenarioJson): string[] {
  const fromMap = debate.characters ? Object.keys(debate.characters) : [];
  if (fromMap.length > 0) return fromMap;

  const ids = new Set<string>([PLAYER_CHARACTER_ID]);
  for (const round of debate.rounds) {
    if (round.kind === 'npc') {
      ids.add(round.speakerId);
      continue;
    }
    if (round.opponentPrompt) ids.add(round.opponentPrompt.speakerId);
    for (const response of round.opponentResponses ?? []) {
      ids.add(response.statement.speakerId);
    }
  }
  return [...ids];
}

/** Puts a moderator, if present, in the centre slot of a 3+ cast; otherwise player-first,
 *  then scenario order. The schema has no explicit moderator flag, so this is a short list. */
const MODERATOR_IDS = new Set(['tobias']);

/**
 * Left-to-right stage order for a cast. Shared by the Phaser `Trial` scene (which lays
 * sprites out along this order) and `TrialUI`'s `CharacterStage` (which labels them along
 * the same order) — the two must agree, or nameplates end up over the wrong sprite.
 */
export function stageOrder(ids: readonly string[]): string[] {
  const player = ids.filter((id) => id === PLAYER_CHARACTER_ID);
  const moderator = ids.filter((id) => MODERATOR_IDS.has(id));
  const rest = ids.filter((id) => id !== PLAYER_CHARACTER_ID && !MODERATOR_IDS.has(id));
  if (moderator.length > 0 && ids.length >= 3) {
    const ordered = [...player, ...rest];
    const midIndex = Math.floor((ordered.length + moderator.length) / 2);
    ordered.splice(midIndex, 0, ...moderator);
    return ordered;
  }
  return [...player, ...rest, ...moderator];
}
