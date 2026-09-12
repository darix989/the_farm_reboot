/**
 * Who belongs on the character stage for a given scenario.
 *
 * Split out of `src/react/trial/utils/trialHelpers.ts` so the Phaser `Trial` scene can
 * derive its cast without importing from `src/react/` (see AGENTS.md's layering rules) —
 * this is a pure function over scenario content, not React-side logic.
 */
import { PLAYER_CHARACTER_ID, resolveCharacter, type AnimalSpriteId } from './characters';
import type { DebateScenarioJson } from '../types/debateEntities';

/**
 * Staged ids from `characters` or inferred from rounds — the moderator is not added here.
 * `debateParticipantIds` unions them in when a `moderatorOpening` is authored.
 */
function debateCastIds(debate: DebateScenarioJson): string[] {
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

/** Whether this scenario has a spoken moderator opening (the `moderator_speaking` gate). */
export function scenarioHasModeratorOpening(debate: DebateScenarioJson): boolean {
  return (debate.moderatorOpening?.sentences ?? []).some((s) => Boolean(s.text?.trim()));
}

export function debateParticipantIds(debate: DebateScenarioJson): string[] {
  const ids = debateCastIds(debate);
  if (!scenarioHasModeratorOpening(debate)) return ids;
  const moderatorId = debateModeratorId(debate);
  if (ids.includes(moderatorId)) return ids;
  return [...ids, moderatorId];
}

/**
 * Who the farm's moderator is when nobody is staged as one.
 *
 * Most debates show a moderator's opinion without a moderator on stage — Bram's first
 * lesson has no owl in it — because the score is the room's judgement, not a character's.
 * The status indicator still needs a face to wear, and Duchess is the farm's moderator, so
 * she lends hers unless the scenario names someone else (`moderatorId`) or stages a
 * moderator. See `debateModeratorId`.
 *
 * Formal debates that author `moderatorOpening` also put this animal on stage, so the
 * cone can point at them while they open the floor.
 */
export const DEFAULT_MODERATOR_ID = 'duchess';

/** Puts a moderator, if present, in the centre slot of a 3+ cast; otherwise player-first,
 *  then scenario order. The schema has no explicit moderator flag, so this is a short list. */
const MODERATOR_IDS = new Set([DEFAULT_MODERATOR_ID, 'cass']);

/**
 * Whose face the status stills wear for this debate, and who speaks `moderatorOpening`.
 *
 * An authored `moderatorId` wins — that is how 1.7 gives Cass the floor (and the stills)
 * instead of Duchess. Otherwise a staged moderator in the cast (Duchess in 1.8), otherwise
 * {@link DEFAULT_MODERATOR_ID}. `stageOrder()` still only centres someone who is actually
 * in the cast; `debateParticipantIds` adds them when a `moderatorOpening` is authored.
 */
export function debateModeratorId(debate: DebateScenarioJson): string {
  if (debate.moderatorId) return debate.moderatorId;
  for (const id of debateCastIds(debate)) {
    if (MODERATOR_IDS.has(id)) return id;
  }
  return DEFAULT_MODERATOR_ID;
}

/**
 * Whether the Trial stage should put a theatrical spotlight on the current speaker.
 *
 * Formal debates only — `encounterKind === 'debate'`, which is also the default when
 * `mechanics` is omitted (same default as `resolveMechanics`). Lessons, gossip, sparring
 * and lab keep the milder alpha dim. Lives here (not in `scenarioMechanics.ts`) so the
 * Phaser `Trial` scene can call it without importing from `src/react/`.
 */
export function debateHasSpeakerSpotlight(debate: DebateScenarioJson): boolean {
  return (debate.mechanics?.encounterKind ?? 'debate') === 'debate';
}

/** Which character's stills the Animation Gallery should show for this skin, if any. */
export function moderatorCharacterIdForAnimal(animalId: AnimalSpriteId): string | null {
  for (const id of MODERATOR_IDS) {
    if (resolveCharacter(id).animal === animalId) return id;
  }
  return null;
}

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
