import type { LogicalFallacy, Sentence, Statement } from '../../types/debateEntities';
import { DEBATES } from '../../data/levels';
import { logicalFallacyById } from '../../data/fallacyCatalog';
import { PLAYER_CHARACTER_ID, resolveCharacter } from '../../data/characters';
import { getSpeakerName } from '../trial/utils/trialHelpers';
import { resolvedOptionSentences } from '../trial/utils/optionUnlock';
import type { SpottedFallacy } from '../../store/codexStore';

/**
 * Turns a stored spot back into something readable.
 *
 * `codexStore` keeps ids only, so the line has to be found again in the scenario. The four
 * places a `statementId` can come from are the four analysis targets `TrialUI` builds: an NPC
 * round, an opponent's crossfire question, an opponent's response to a choice, and the player's
 * own chosen line.
 */
export interface ResolvedSpot {
  /** Stable across the (statement, sentence) pair, for React keys. */
  key: string;
  text: string;
  speakerName: string;
}

export interface SpottedFallacyGroup {
  fallacy: LogicalFallacy;
  spots: ResolvedSpot[];
}

function findSentence(sentences: readonly Sentence[], sentenceId: string): Sentence | null {
  return sentences.find((sentence) => sentence.id === sentenceId) ?? null;
}

function resolveSpot(spot: SpottedFallacy): ResolvedSpot | null {
  const scenario = DEBATES[spot.scenarioKey];
  if (!scenario) return null;

  const key = `${spot.scenarioKey}:${spot.statementId}:${spot.sentenceId}`;
  const fromStatement = (statement: Statement): ResolvedSpot | null => {
    const sentence = findSentence(statement.sentences, spot.sentenceId);
    if (!sentence) return null;
    return { key, text: sentence.text, speakerName: getSpeakerName(scenario, statement.speakerId) };
  };

  for (const round of scenario.rounds) {
    if (round.kind === 'npc') {
      if (round.id === spot.statementId) return fromStatement(round.statement);
      continue;
    }

    if (round.opponentPrompt?.id === spot.statementId) {
      return fromStatement(round.opponentPrompt);
    }
    for (const response of round.opponentResponses ?? []) {
      if (response.statement.id === spot.statementId) return fromStatement(response.statement);
    }
    for (const option of round.options) {
      if (option.id !== spot.statementId) continue;
      // Always the unlocked copy: the player has already played this line, so the placeholder
      // would be a lie, and there is nothing left to spoil.
      const sentence = findSentence(resolvedOptionSentences(option, true), spot.sentenceId);
      if (!sentence) return null;
      return {
        key,
        text: sentence.text,
        speakerName: resolveCharacter(PLAYER_CHARACTER_ID).displayName,
      };
    }
  }

  return null;
}

/**
 * Spots grouped by fallacy, in catalog order within each group and first-spotted order overall.
 *
 * Drops anything that no longer resolves — a line that has been rewritten since it was tagged.
 * The alternative is a Codex entry quoting text that is not in the game any more.
 */
export function groupSpottedByFallacy(spots: readonly SpottedFallacy[]): SpottedFallacyGroup[] {
  const groups = new Map<string, SpottedFallacyGroup>();

  for (const spot of spots) {
    const fallacy = logicalFallacyById(spot.fallacyId);
    if (!fallacy) continue;
    const resolved = resolveSpot(spot);
    if (!resolved) continue;

    const group = groups.get(fallacy.id);
    if (group) {
      if (!group.spots.some((existing) => existing.key === resolved.key)) {
        group.spots.push(resolved);
      }
    } else {
      groups.set(fallacy.id, { fallacy, spots: [resolved] });
    }
  }

  return [...groups.values()];
}
