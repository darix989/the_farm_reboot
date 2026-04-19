import type {
  DebateScenarioJson,
  PlayerOption,
  RoundEntry,
  Sentence,
  Side,
} from '../../../types/debateEntities';
import { uiColor } from '../../uiColor';

export function getSpeakerName(debate: DebateScenarioJson, speakerId: string): string {
  return debate.characters?.[speakerId] ?? speakerId.charAt(0).toUpperCase() + speakerId.slice(1);
}

export function qualityColor(quality: PlayerOption['quality']): string {
  if (quality === 'effective') return uiColor.info;
  if (quality === 'logical_fallacy') return uiColor.danger;
  return uiColor.textHint;
}

export function qualityLabel(quality: PlayerOption['quality']): string {
  if (quality === 'effective') return 'Effective';
  if (quality === 'logical_fallacy') return 'Logical Fallacy';
  return 'Ineffective';
}

export function statementText(sentences: Sentence[]): string {
  return sentences.map((s) => s.text).join(' ');
}

/** Returns a CSS color string for a numeric score or impact value. */
export function scoreColor(score: number): string {
  if (score > 0) return uiColor.infoBright;
  if (score < 0) return uiColor.danger;
  return uiColor.textEmphasis;
}

export const MODERATOR_OPINION_LABEL = "Moderator's opinion";

export function moderatorOpinionEmoji(score: number): string {
  if (score > 0) return '😊';
  if (score < 0) return '😠';
  return '😐';
}

/** Plain text for wizard strings and similar (emoji is first for quick scanning). */
export function moderatorOpinionPlainText(score: number): string {
  return `${moderatorOpinionEmoji(score)} ${MODERATOR_OPINION_LABEL}`;
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

/** Side badge for the round header (NPC = speaker's side; player round = player's side). */
export function sideForRoundHeader(debate: DebateScenarioJson, round: RoundEntry): Side {
  if (round.kind === 'npc') return sideForStatementSpeaker(debate, round.speakerId);
  return debate.playerSide;
}

export function sideDisplayLabel(side: Side): string {
  return side === 'proposition' ? 'Proposition' : 'Opposition';
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
