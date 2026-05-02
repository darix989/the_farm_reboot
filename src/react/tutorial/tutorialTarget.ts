import type { TutorialTargetRef } from '../../types/debateEntities';

function esc(value: string): string {
  return CSS.escape(value);
}

export function tutorialTargetEquals(a: TutorialTargetRef, b: TutorialTargetRef): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'panel':
      return a.panel === (b as TutorialTargetRef & { kind: 'panel' }).panel;
    case 'modal_round_recap_score':
      return true;
    case 'intro_summary_action':
      return a.action === (b as TutorialTargetRef & { kind: 'intro_summary_action' }).action;
    case 'interactive_action':
      return a.action === (b as TutorialTargetRef & { kind: 'interactive_action' }).action;
    case 'interactive_option':
      return a.optionId === (b as TutorialTargetRef & { kind: 'interactive_option' }).optionId;
    case 'debate_log_round_analyze':
      return a.roundId === (b as TutorialTargetRef & { kind: 'debate_log_round_analyze' }).roundId;
    case 'debate_log_round_toggle':
      return a.roundId === (b as TutorialTargetRef & { kind: 'debate_log_round_toggle' }).roundId;
    case 'analysis_sentence':
      return a.sentenceId === (b as TutorialTargetRef & { kind: 'analysis_sentence' }).sentenceId;
    case 'analysis_fallacy':
      return a.fallacyId === (b as TutorialTargetRef & { kind: 'analysis_fallacy' }).fallacyId;
    case 'analysis_action':
      return a.action === (b as TutorialTargetRef & { kind: 'analysis_action' }).action;
    case 'analysis_resources':
      return true;
    default: {
      const _never: never = a;
      return _never;
    }
  }
}

export function tutorialTargetSelector(target: TutorialTargetRef): string {
  switch (target.kind) {
    case 'panel':
      return `[data-tutorial-panel="${esc(target.panel)}"]`;
    case 'modal_round_recap_score':
      return '[data-tutorial-recap-section="main"]';
    case 'intro_summary_action':
      return `[data-tutorial-intro-summary-action="${esc(target.action)}"]`;
    case 'interactive_action':
      return `[data-tutorial-interactive-action="${esc(target.action)}"]`;
    case 'interactive_option':
      return `[data-tutorial-interactive-option-id="${esc(target.optionId)}"]`;
    case 'debate_log_round_analyze':
      return `[data-tutorial-debate-log-analyze-round-id="${esc(target.roundId)}"]`;
    case 'debate_log_round_toggle':
      return `[data-tutorial-debate-log-toggle-round-id="${esc(target.roundId)}"]`;
    case 'analysis_sentence':
      return `[data-tutorial-analysis-sentence-id="${esc(target.sentenceId)}"]`;
    case 'analysis_fallacy':
      return `[data-tutorial-analysis-fallacy-id="${esc(target.fallacyId)}"]`;
    case 'analysis_action':
      return `[data-tutorial-analysis-action="${esc(target.action)}"]`;
    case 'analysis_resources':
      return '[data-tutorial-analysis-resources]';
    default: {
      const _never: never = target;
      return _never;
    }
  }
}

export function resolveTutorialTargetElement(target: TutorialTargetRef): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector<HTMLElement>(tutorialTargetSelector(target));
}
