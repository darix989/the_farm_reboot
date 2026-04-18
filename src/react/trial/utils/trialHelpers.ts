import type { DebateScenarioJson, PlayerOption, Sentence } from '../../../types/debateEntities';
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
