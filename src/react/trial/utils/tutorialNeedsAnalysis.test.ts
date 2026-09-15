import { describe, expect, it } from 'vitest';
import { DEBATES } from '../../../data/levels';
import { tutorialNeedsAnalysis } from './tutorialNeedsAnalysis';

describe('tutorialNeedsAnalysis', () => {
  it('recognises Cass teaching the hidden control and declaring its unlock', () => {
    const tutorial = DEBATES['020_cass_teaches_ad_hominem'].tutorials!.find(
      (entry) => entry.id === 'teach-spot-it',
    )!;
    expect(tutorialNeedsAnalysis(tutorial.tutorial.steps)).toBe(true);
    expect(tutorial.unlocksFeatures).toContain('analysis');
    expect(tutorial.trigger).toEqual({ event: 'round:start', where: { roundId: 'round-5' } });
  });

  it('recognises log analysis and synthetic clicks but leaves ordinary tutorials alone', () => {
    expect(
      tutorialNeedsAnalysis([
        {
          message: 'Open the log entry.',
          targetComponent: { kind: 'debate_log_round_analyze', roundId: 'round-1' },
        },
      ]),
    ).toBe(true);
    expect(
      tutorialNeedsAnalysis([
        {
          message: 'Select a sentence.',
          targetComponent: { kind: 'analysis_sentence', sentenceId: 'sentence-1' },
        },
      ]),
    ).toBe(true);
    expect(
      tutorialNeedsAnalysis([
        {
          message: 'Watch the log.',
          artificialInteractions: [
            { action: { type: 'debate_log:round:analyze', roundId: 'round-1' } },
          ],
        },
      ]),
    ).toBe(true);
    expect(
      tutorialNeedsAnalysis([
        {
          message: 'Continue the dialogue.',
          targetComponent: { kind: 'interactive_action', action: 'continue' },
        },
      ]),
    ).toBe(false);
  });
});
