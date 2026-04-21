import { create } from 'zustand';
import type { DebateTutorialSpotlightJson } from '../types/debateEntities';
import { FULL_STAGE_SPOTLIGHT_RATIOS } from '../react/tutorial/spotlightRect';

export type { TutorialSpotlightRect } from '../react/tutorial/spotlightRect';

/** One tutorial step after open; spotlight stays as stage ratios until the overlay resolves to px. */
export interface TutorialStepResolved {
  message: string;
  spotlightSpec: DebateTutorialSpotlightJson;
}

export type TutorialStepInput = {
  message: string;
  spotlight?: DebateTutorialSpotlightJson;
};

export interface OpenTutorialPayload {
  steps: readonly TutorialStepInput[];
  /** Called only after the user finishes with **Got it** on the final step (or the only step). */
  onComplete?: () => void;
}

interface TutorialState {
  isOpen: boolean;
  steps: TutorialStepResolved[];
  stepIndex: number;
  onComplete: (() => void) | undefined;
}

interface TutorialStore extends TutorialState {
  openTutorial: (payload: OpenTutorialPayload) => void;
  /** Clears UI without invoking `onComplete`. */
  resetTutorial: () => void;
  /** Invokes `onComplete` then clears. */
  finishTutorial: () => void;
  setStepIndex: (index: number) => void;
  stepForward: () => void;
  stepBack: () => void;
}

const initial: TutorialState = {
  isOpen: false,
  steps: [],
  stepIndex: 0,
  onComplete: undefined,
};

export const useTutorialStore = create<TutorialStore>((set, get) => ({
  ...initial,

  openTutorial: (payload) => {
    const steps: TutorialStepResolved[] = payload.steps
      .map((step) => ({
        message: step.message.trim(),
        spotlightSpec: step.spotlight ?? FULL_STAGE_SPOTLIGHT_RATIOS,
      }))
      .filter((s) => s.message.length > 0);
    if (steps.length === 0) return;
    set({
      isOpen: true,
      steps,
      stepIndex: 0,
      onComplete: payload.onComplete,
    });
  },

  resetTutorial: () => set({ ...initial }),

  finishTutorial: () => {
    const cb = get().onComplete;
    set({ ...initial });
    cb?.();
  },

  setStepIndex: (index) =>
    set((s) => {
      if (!s.isOpen || s.steps.length === 0) return s;
      const clamped = Math.max(0, Math.min(s.steps.length - 1, index));
      return { stepIndex: clamped };
    }),

  stepForward: () =>
    set((s) => {
      if (!s.isOpen || s.steps.length === 0) return s;
      return {
        stepIndex: Math.min(s.steps.length - 1, s.stepIndex + 1),
      };
    }),

  stepBack: () =>
    set((s) => {
      if (!s.isOpen) return s;
      return { stepIndex: Math.max(0, s.stepIndex - 1) };
    }),
}));
