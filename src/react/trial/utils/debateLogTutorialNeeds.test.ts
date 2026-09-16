import { describe, expect, it } from 'vitest';
import { DEBATES } from '../../../data/levels';
import { tutorialNeedsDebateLog } from './debateLogTutorialNeeds';

describe('tutorialNeedsDebateLog', () => {
  it('leaves Bram teaching the recap chip collapsed so its first step can resolve', () => {
    const tutorial = DEBATES['030_bram_teaches_dialog'].tutorials!.find(
      (entry) => entry.id === 'dialog-the-face',
    )!;
    expect(tutorialNeedsDebateLog(tutorial.tutorial.steps)).toBe(false);
    expect(tutorial.tutorial.steps).toHaveLength(3);
    expect(tutorial.tutorial.steps[0]?.targetComponent).toEqual({
      kind: 'debate_log_recap_moderator_score',
    });
    expect(tutorial.tutorial.steps[1]?.interactionMode).toBe('target_only');
    expect(tutorial.tutorial.steps[1]?.targetComponent).toEqual({
      kind: 'debate_log_panel_toggle',
    });
    expect(tutorial.tutorial.steps[2]?.interactionMode).toBe('target_only');
    expect(tutorial.tutorial.steps[2]?.onlyForward).toBe(true);
    expect(tutorial.tutorial.steps[2]?.targetComponent).toEqual({
      kind: 'debate_log_panel_toggle',
    });
  });

  it('recognises expanded-log targets and leaves chip / panel-toggle steps alone', () => {
    expect(
      tutorialNeedsDebateLog([
        {
          message: 'Read the log.',
          targetComponent: { kind: 'panel', panel: 'debate_log' },
        },
      ]),
    ).toBe(true);
    expect(
      tutorialNeedsDebateLog([
        {
          message: 'Watch the face.',
          targetComponent: { kind: 'debate_log_moderator_score' },
        },
      ]),
    ).toBe(true);
    expect(
      tutorialNeedsDebateLog([
        {
          message: 'Open the chip.',
          targetComponent: { kind: 'debate_log_panel_toggle' },
        },
        {
          message: 'Shrink it again.',
          targetComponent: { kind: 'debate_log_panel_toggle' },
        },
      ]),
    ).toBe(false);
    expect(
      tutorialNeedsDebateLog([
        {
          message: 'Look at the recap face.',
          targetComponent: { kind: 'debate_log_recap_moderator_score' },
        },
      ]),
    ).toBe(false);
  });
});
