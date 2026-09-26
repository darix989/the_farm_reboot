import { describe, expect, it } from 'vitest';
import { planTransition, type PhaseSet } from './emotionTransitions';

const FULL: PhaseSet = { in: true, out: true };
const LOOP_ONLY: PhaseSet = { in: false, out: false };

describe('planTransition', () => {
  it('is empty when no phased clip is involved, so the animator behaves as before', () => {
    expect(planTransition(null, null, null)).toEqual({
      exit: [],
      entry: null,
      waitForCurrent: false,
    });
  });

  it('eases into a phased emotion after the current clip reaches rest', () => {
    expect(planTransition(null, null, { emotion: 'angry', phases: FULL })).toEqual({
      exit: [],
      entry: [
        { emotion: 'angry', phase: 'in', repeat: 0 },
        { emotion: 'angry', phase: 'loop', repeat: -1 },
      ],
      waitForCurrent: true,
    });
  });

  it('eases out of a held emotion before a plain target', () => {
    const plan = planTransition({ emotion: 'angry', phase: 'loop' }, FULL, null);
    expect(plan).toEqual({
      exit: [{ emotion: 'angry', phase: 'out', repeat: 0 }],
      entry: null,
      waitForCurrent: true,
    });
  });

  it('goes out of one phased emotion and into another', () => {
    const plan = planTransition({ emotion: 'angry', phase: 'loop' }, FULL, {
      emotion: 'doubtful',
      phases: FULL,
    });
    expect(plan.exit).toEqual([{ emotion: 'angry', phase: 'out', repeat: 0 }]);
    expect(plan.entry).toEqual([
      { emotion: 'doubtful', phase: 'in', repeat: 0 },
      { emotion: 'doubtful', phase: 'loop', repeat: -1 },
    ]);
    expect(plan.waitForCurrent).toBe(true);
  });

  it('keeps holding when asked for the emotion already held', () => {
    for (const phase of ['in', 'loop'] as const) {
      expect(
        planTransition({ emotion: 'angry', phase }, FULL, { emotion: 'angry', phases: FULL }),
      ).toEqual({
        exit: [],
        entry: [{ emotion: 'angry', phase: 'loop', repeat: -1 }],
        waitForCurrent: true,
      });
    }
  });

  it('lets an ease-in finish, then eases out, when retargeted mid-ramp', () => {
    const plan = planTransition({ emotion: 'angry', phase: 'in' }, FULL, null);
    expect(plan.exit).toEqual([{ emotion: 'angry', phase: 'out', repeat: 0 }]);
    expect(plan.waitForCurrent).toBe(true);
  });

  it('lets an ease-out finish before anything else, even a plain target', () => {
    expect(planTransition({ emotion: 'angry', phase: 'out' }, FULL, null)).toEqual({
      exit: [],
      entry: null,
      waitForCurrent: true,
    });
  });

  it('re-enters through the ease-in when the emotion comes back during its ease-out', () => {
    const plan = planTransition({ emotion: 'angry', phase: 'out' }, FULL, {
      emotion: 'angry',
      phases: FULL,
    });
    expect(plan.exit).toEqual([]);
    expect(plan.entry?.map((step) => step.phase)).toEqual(['in', 'loop']);
    expect(plan.waitForCurrent).toBe(true);
  });

  it('cuts into and out of a loop-only emotion, like a plain clip', () => {
    expect(planTransition(null, null, { emotion: 'angry', phases: LOOP_ONLY })).toEqual({
      exit: [],
      entry: [{ emotion: 'angry', phase: 'loop', repeat: -1 }],
      waitForCurrent: false,
    });
    expect(planTransition({ emotion: 'angry', phase: 'loop' }, LOOP_ONLY, null)).toEqual({
      exit: [],
      entry: null,
      waitForCurrent: false,
    });
  });
});
