import { PLAYER_CHARACTER_ID } from '../../../data/characters';
import getLabel from '../../../data/labels';
import type { GamePhase } from '../../hooks/useTrialRoundWorkflow';
import {
  PLAYER_OPTION_IMPACT_ABS_MAX,
  type DebateScenarioJson,
  type NpcRoundEntry,
  type OpponentResponse,
  type PlayerOption,
  type PlayerRoundEntry,
  type RoundEntry,
  type Sentence,
  type Side,
  type Statement,
} from '../../../types/debateEntities';
import { uiColor } from '../../uiColor';
import type { AnimalEmotion } from '../../../phaser/animals/animalEmotions';

export function getSpeakerName(debate: DebateScenarioJson, speakerId: string): string {
  return debate.characters?.[speakerId] ?? speakerId.charAt(0).toUpperCase() + speakerId.slice(1);
}

/** Current speaker for CharacterStage highlighting. Intro/complete/recap leave everyone equal. */
export function activeSpeakerIdForWorkflow(
  gamePhase: GamePhase,
  currentNpcRound: NpcRoundEntry | null,
  currentPlayerRound: PlayerRoundEntry | null,
  selectedOption: PlayerOption | null,
  activeOpponentResponse: OpponentResponse | null,
): string | null {
  switch (gamePhase) {
    case 'npc_speaking':
      return currentNpcRound?.speakerId ?? null;
    case 'player_choosing':
      if (!selectedOption && currentPlayerRound?.opponentPrompt) {
        return currentPlayerRound.opponentPrompt.speakerId;
      }
      return PLAYER_CHARACTER_ID;
    case 'player_confirming':
      return PLAYER_CHARACTER_ID;
    case 'npc_responding':
      return activeOpponentResponse?.statement.speakerId ?? null;
    default:
      return null;
  }
}

/**
 * Emotional register for whoever `activeSpeakerIdForWorkflow` just returned.
 *
 * Kept as a sibling of that function, and given the identical argument list, because the two
 * are read together on every render and must be derived from exactly the same snapshot: a
 * speaker paired with the previous line's emotion is worse than no emotion at all.
 *
 * Derivation over authoring, by default. An authored `Statement.emotion` always wins, but
 * every existing scenario predates this field, and the shape of the data already carries the
 * intent:
 *   - A line whose sentences carry `logicalFallacies` is a line the speaker is trying to slip
 *     past the player. That is `sneaky` — no re-authoring needed to make every dirty argument
 *     in the game look dirty.
 *   - `crossfire` is the adversarial format; its questions are put skeptically (`doubtful`).
 *   - While the player is picking, Rue is not speaking — he is deliberating (`thinking`).
 * Everything else is plain `talking`, which is the honest answer rather than a guess.
 */
export function activeEmotionForWorkflow(
  gamePhase: GamePhase,
  currentNpcRound: NpcRoundEntry | null,
  currentPlayerRound: PlayerRoundEntry | null,
  selectedOption: PlayerOption | null,
  activeOpponentResponse: OpponentResponse | null,
): AnimalEmotion | null {
  switch (gamePhase) {
    case 'npc_speaking':
      if (!currentNpcRound) return null;
      return emotionFromStatement(currentNpcRound.statement);
    case 'player_choosing':
      if (!selectedOption && currentPlayerRound?.opponentPrompt) {
        return emotionFromStatement(currentPlayerRound.opponentPrompt);
      }
      // The player holds the floor but has not committed to a line yet.
      return 'thinking';
    case 'player_confirming':
      return selectedOption?.emotion ?? emotionFromOptionQuality(selectedOption);
    case 'npc_responding': {
      const statement = activeOpponentResponse?.statement ?? null;
      return statement ? emotionFromStatement(statement) : null;
    }
    default:
      return null;
  }
}

/** Shared tail of the derivation above; see its docstring for the reasoning. */
function emotionFromStatement(statement: Statement): AnimalEmotion {
  if (statement.emotion) return statement.emotion;
  const hidesAFallacy = statement.sentences.some((s) => (s.logicalFallacies?.length ?? 0) > 0);
  if (hidesAFallacy) return 'sneaky';
  if (statement.type === 'crossfire') return 'doubtful';
  return 'talking';
}

/**
 * How Rue delivers the line he just committed to. A knowingly bad choice is played `sneaky`
 * rather than `talking`: the player chose it on purpose, and the sprite selling it as a dirty
 * move is the feedback that a quality badge alone does not give.
 */
function emotionFromOptionQuality(option: PlayerOption | null): AnimalEmotion {
  if (option?.quality === 'logical_fallacy') return 'sneaky';
  return 'talking';
}

/**
 * Resolves the player's starting Insight Points balance for a debate.
 * Reads `startingInsightPoints` from the scenario JSON, falling back to 0 when omitted
 * or set to a negative value.
 */
export function getStartingInsightPoints(debate: DebateScenarioJson): number {
  const value = debate.startingInsightPoints;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

/**
 * Colour for an option's quality badge.
 *
 * `targetQuality` is the quality the scenario rewards (see `DebateScenarioMechanics`).
 * It is `'effective'` for every debate, so the default arm reproduces the original
 * behaviour; inoculation scenarios pass `'logical_fallacy'` so the deliberately dirty
 * line reads as the win rather than as a mistake.
 */
export function qualityColor(
  quality: PlayerOption['quality'],
  targetQuality: PlayerOption['quality'] = 'effective',
): string {
  if (quality === targetQuality) return uiColor.info;
  if (quality === 'logical_fallacy') return uiColor.danger;
  return uiColor.textHint;
}

export function qualityLabel(quality: PlayerOption['quality']): string {
  if (quality === 'effective') return getLabel('qualityEffective');
  if (quality === 'logical_fallacy') return getLabel('qualityLogicalFallacy');
  return getLabel('qualityIneffective');
}

export function statementText(sentences: Sentence[]): string {
  return sentences.map((s) => s.text).join(' ');
}

/**
 * One block of recap copy: the authored `summary` when there is one, the spoken text
 * otherwise. `isSummary` tells the caller whether it may clamp the paragraph — the
 * fallback is full-length prose and must not be cut.
 */
export function recapText(
  summary: string | undefined,
  fullText: string,
): { text: string; isSummary: boolean } {
  const authored = summary?.trim() ?? '';
  return authored ? { text: authored, isSummary: true } : { text: fullText, isSummary: false };
}

/** Preview line for compact UI (e.g. choice buttons); full text stays in aria-label. */
export function truncateStatementPreview(text: string, maxChars = 80): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}...`;
}

/** Returns a CSS color string for a numeric score or impact value. */
export function scoreColor(score: number): string {
  if (score > 0) return uiColor.infoBright;
  if (score < 0) return uiColor.danger;
  return uiColor.textEmphasis;
}

export const MODERATOR_OPINION_LABEL = getLabel('moderatorsOpinion');

export function moderatorOpinionEmoji(score: number): string {
  if (score > 0) return '😊';
  if (score < 0) return '😠';
  return '😐';
}

/** Plain text for wizard strings and similar (emoji is first for quick scanning). */
export function moderatorOpinionPlainText(score: number): string {
  return `${moderatorOpinionEmoji(score)} ${MODERATOR_OPINION_LABEL}`;
}

/** Symmetric bounds for one player round's impact (moderator gauge). */
export function perRoundImpactScoreBounds(): { min: number; max: number } {
  return { min: -PLAYER_OPTION_IMPACT_ABS_MAX, max: PLAYER_OPTION_IMPACT_ABS_MAX };
}

/** Min/max possible cumulative score for a debate (one ±max per player round). */
export function debateTotalScoreBounds(debate: DebateScenarioJson): { min: number; max: number } {
  const playerRounds = debate.rounds.filter((r) => r.kind === 'player').length;
  const cap = Math.max(1, playerRounds) * PLAYER_OPTION_IMPACT_ABS_MAX;
  return { min: -cap, max: cap };
}

export function statementTypeLabel(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function opponentSide(playerSide: Side): Side {
  return playerSide === 'proposition' ? 'opposition' : 'proposition';
}

/** First NPC round's speaker is treated as the opponent in 1v1 debates. */
export function firstNpcSpeakerId(debate: DebateScenarioJson): string | null {
  const npc = debate.rounds.find((r) => r.kind === 'npc');
  return npc?.kind === 'npc' ? npc.speakerId : null;
}

/** Which debate side a statement's speaker is on. */
export function sideForStatementSpeaker(debate: DebateScenarioJson, speakerId: string): Side {
  const oppId = firstNpcSpeakerId(debate);
  if (oppId && speakerId === oppId) return opponentSide(debate.playerSide);
  return debate.playerSide;
}

/**
 * Side badge for the debate log round header.
 * - NPC round: the speaker's side.
 * - Player round with `opponentPrompt` (NPC asks first in crossfire): the asker's side so the
 *   stripe matches who speaks first; the player's reply is labeled inline ("You").
 * - Other player rounds: the player's side (they lead the exchange).
 */
export function sideForRoundHeader(debate: DebateScenarioJson, round: RoundEntry): Side {
  if (round.kind === 'npc') return sideForStatementSpeaker(debate, round.speakerId);
  if (round.kind === 'player' && round.opponentPrompt) {
    return sideForStatementSpeaker(debate, round.opponentPrompt.speakerId);
  }
  return debate.playerSide;
}

export function sideDisplayLabel(side: Side): string {
  return side === 'proposition' ? getLabel('sideProposition') : getLabel('sideOpposition');
}

function deriveShuffleSeed(playthroughKey: string, roundId: string): number {
  const str = `${playthroughKey}\x1e${roundId}`;
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)!;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle; order depends only on `playthroughKey` and `roundId` (stable across re-renders and undo). */
export function shuffleCopyDeterministic<T>(
  items: readonly T[],
  playthroughKey: string,
  roundId: string,
): T[] {
  const arr = [...items];
  const rng = mulberry32(deriveShuffleSeed(playthroughKey, roundId));
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}
