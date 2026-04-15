import type { DebateScenarioJson, PlayerOption, Sentence } from '../../../types/debateEntities';

export function getSpeakerName(debate: DebateScenarioJson, speakerId: string): string {
  return debate.characters?.[speakerId] ?? speakerId.charAt(0).toUpperCase() + speakerId.slice(1);
}

export function qualityColor(quality: PlayerOption['quality']): string {
  if (quality === 'effective') return '#22d3ee';
  if (quality === 'logical_fallacy') return '#f87171';
  return 'rgba(255,255,255,0.50)';
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
  if (score > 0) return '#67e8f9';
  if (score < 0) return '#f87171';
  return 'rgba(255,255,255,0.90)';
}

export function statementTypeLabel(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
