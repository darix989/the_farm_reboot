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
