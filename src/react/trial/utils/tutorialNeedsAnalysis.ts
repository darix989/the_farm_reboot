import type { TutorialStepInput } from '../../../store/tutorialStore';

/** Avoid tutorials that require hidden analysis controls when previewing later encounters. */
export function tutorialNeedsAnalysis(steps: readonly TutorialStepInput[]): boolean {
  return steps.some((step) => {
    const target = step.targetComponent;
    if (
      target &&
      (target.kind.startsWith('analysis_') ||
        target.kind === 'debate_log_round_analyze' ||
        (target.kind === 'interactive_action' && target.action === 'analyze'))
    ) {
      return true;
    }
    return step.artificialInteractions?.some(
      ({ action }) => action.type === 'debate_log:round:analyze',
    );
  });
}
