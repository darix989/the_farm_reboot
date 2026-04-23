import { create } from 'zustand';
import type { DebateTutorialArea } from '../types/debateEntities';
import { FULL_STAGE_SPOTLIGHT_RATIOS } from '../react/tutorial/spotlightRect';
import { debateEventBus } from '../react/trial/utils/debateEventBus';

export type { TutorialSpotlightRect } from '../react/tutorial/spotlightRect';

/** One tutorial step after open; spotlight stays as stage ratios until the overlay resolves to px. */
export interface TutorialStepResolved {
  message: string;
  spotlightSpec: DebateTutorialArea;
  /** Optional stage-normalized rect for the dialog itself; when absent, the overlay uses its CSS default. */
  modalSpec?: DebateTutorialArea;
  /**
   * When `true`, keep the Continue / Got it button even if the step has a
   * spotlight. Without this flag, spotlighted steps hide the button and
   * auto-conclude on the next `EventTrigger` fired from the debate event bus.
   */
  showContinueWithSpotlight?: boolean;
}

export type TutorialStepInput = {
  message: string;
  spotlight?: DebateTutorialArea;
  modal?: DebateTutorialArea;
  showContinueWithSpotlight?: boolean;
};

export interface OpenTutorialPayload {
  steps: readonly TutorialStepInput[];
  /**
   * Optional stable id for this tutorial. Included in the
   * `tutorial:start` / `tutorial:next` / `tutorial:end` event payloads so
   * listeners can pin a specific tutorial via `where: { tutorialId: 'foo' }`.
   * Typically copied from `DebateScenarioTutorialEntry.id`.
   */
  id?: string;
  /** Called only after the user finishes with **Got it** on the final step (or the only step). */
  onComplete?: () => void;
}

interface TutorialState {
  isOpen: boolean;
  steps: TutorialStepResolved[];
  stepIndex: number;
  onComplete: (() => void) | undefined;
  /** Id of the currently open tutorial, mirrored onto lifecycle event payloads. */
  tutorialId: string | undefined;
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
  tutorialId: undefined,
};

export const useTutorialStore = create<TutorialStore>((set, get) => ({
  ...initial,

  openTutorial: (payload) => {
    const steps: TutorialStepResolved[] = payload.steps
      .map((step) => ({
        message: step.message.trim(),
        spotlightSpec: step.spotlight ?? FULL_STAGE_SPOTLIGHT_RATIOS,
        modalSpec: step.modal,
        showContinueWithSpotlight: step.showContinueWithSpotlight,
      }))
      .filter((s) => s.message.length > 0);
    if (steps.length === 0) return;
    set({
      isOpen: true,
      steps,
      stepIndex: 0,
      onComplete: payload.onComplete,
      tutorialId: payload.id,
    });
    debateEventBus.emit('tutorial:start', {
      tutorialId: payload.id,
      stepIndex: 0,
      totalSteps: steps.length,
    });
  },

  resetTutorial: () => set({ ...initial }),

  finishTutorial: () => {
    const s = get();
    const wasOpen = s.isOpen;
    const endPayload = wasOpen
      ? {
          tutorialId: s.tutorialId,
          stepIndex: s.stepIndex,
          totalSteps: s.steps.length,
        }
      : null;
    const cb = s.onComplete;
    set({ ...initial });
    if (endPayload) {
      debateEventBus.emit('tutorial:end', endPayload);
    }
    cb?.();
  },

  setStepIndex: (index) =>
    set((s) => {
      if (!s.isOpen || s.steps.length === 0) return s;
      const clamped = Math.max(0, Math.min(s.steps.length - 1, index));
      return { stepIndex: clamped };
    }),

  stepForward: () => {
    const s = get();
    if (!s.isOpen || s.steps.length === 0) return;
    const next = Math.min(s.steps.length - 1, s.stepIndex + 1);
    if (next === s.stepIndex) return;
    set({ stepIndex: next });
    debateEventBus.emit('tutorial:next', {
      tutorialId: s.tutorialId,
      stepIndex: next,
      totalSteps: s.steps.length,
    });
  },

  stepBack: () =>
    set((s) => {
      if (!s.isOpen) return s;
      return { stepIndex: Math.max(0, s.stepIndex - 1) };
    }),
}));
