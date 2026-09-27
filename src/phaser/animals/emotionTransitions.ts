/**
 * How an animal gets from the clip it is playing to the one it has been asked for, when a
 * phased emotion (`EmotionPhases`) is on either side of the change.
 *
 * Pure and Phaser-free on purpose, so every rule below is covered by `emotionTransitions.test.ts`
 * rather than by eyeballing a debate. `AnimalAnimator` turns the plan into Phaser calls.
 *
 * The one idea behind every rule: **each clip ends on a known pose, and the next clip must
 * start from it.**
 *
 * | clip that is playing          | pose it ends on          |
 * |-------------------------------|--------------------------|
 * | `E.in`, `E.loop`              | holding E                |
 * | `E.out`, plain emotion, atlas | rest (the idle frame 0)  |
 *
 * `E.out` starts from "holding E" and `T.in` starts from rest, so a smooth change has to let the
 * current clip reach its end pose first — the loop's current cycle, or the rest of an ease —
 * which is what `waitForCurrent` asks for. When no phased clip is involved the plan is empty
 * and the animator does exactly what it did before phases existed.
 */
import type { AnimalEmotion, EmotionPhase } from './animalEmotions';

/** Which optional phases a phased emotion carries. `loop` is implied — it is what makes it phased. */
export interface PhaseSet {
  in: boolean;
  out: boolean;
}

/** The phase clip currently on the sprite, or null for anything else (atlas or plain emotion). */
export interface CurrentPhaseClip {
  emotion: AnimalEmotion;
  phase: EmotionPhase;
}

/** A phased emotion to go to, or null when the target is anything else. */
export interface PhasedTarget {
  emotion: AnimalEmotion;
  phases: PhaseSet;
}

export interface PhaseStep {
  emotion: AnimalEmotion;
  phase: EmotionPhase;
  /** `0` plays once (an ease), `-1` holds (a loop). */
  repeat: 0 | -1;
}

export interface TransitionPlan {
  /** Played first: the ease-out of the emotion being left, when it has one. */
  exit: PhaseStep[];
  /** The phased target's own clips; null means "play the caller's plain sequence". */
  entry: PhaseStep[] | null;
  /**
   * Start after the current clip reaches its end pose instead of cutting: the loop finishes its
   * cycle, an ease finishes playing.
   */
  waitForCurrent: boolean;
}

/**
 * `currentPhases` is the phase set of `current.emotion` (ignored when `current` is null).
 * `target` is null for idle, alert, a plain emotion or a fallback clip — the caller already
 * has that sequence and just needs to know what, if anything, goes around it.
 */
export function planTransition(
  current: CurrentPhaseClip | null,
  currentPhases: PhaseSet | null,
  target: PhasedTarget | null,
): TransitionPlan {
  const holding = current && current.phase !== 'out' ? current.emotion : null;

  // Asked for the emotion already being held: carry on with its loop once the current clip
  // ends. Also the path that cancels a pending ease-out when the debate flips straight back.
  if (target && holding === target.emotion) {
    return {
      exit: [],
      entry: [{ emotion: target.emotion, phase: 'loop', repeat: -1 }],
      waitForCurrent: true,
    };
  }

  const exit: PhaseStep[] =
    holding && currentPhases?.out ? [{ emotion: holding, phase: 'out', repeat: 0 }] : [];

  const entry: PhaseStep[] | null = target
    ? [
        ...(target.phases.in
          ? [{ emotion: target.emotion, phase: 'in' as const, repeat: 0 as const }]
          : []),
        { emotion: target.emotion, phase: 'loop', repeat: -1 },
      ]
    : null;

  const waitForCurrent = exit.length > 0 || current?.phase === 'out' || Boolean(target?.phases.in);

  return { exit, entry, waitForCurrent };
}
