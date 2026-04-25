import { create } from 'zustand';
import type {
  DebateTutorialArea,
  TutorialArtificialInteraction,
  TutorialTargetComponent,
} from '../types/debateEntities';
import { debateEventBus } from '../react/trial/utils/debateEventBus';

/**
 * One tutorial step after open. The store keeps the author-supplied target
 * verbatim — the overlay and individual buttons compare against it via
 * `targetComponentMatches` (see `react/tutorial/tutorialTarget.ts`).
 */
export interface TutorialStepResolved {
  message: string;
  /**
   * When set, identifies the single component this step anchors to (visual
   * highlight + click-allowance). When absent, no underlying control is
   * clickable and the user must advance via the dialog.
   */
  targetComponent?: TutorialTargetComponent;
  /** Optional stage-normalized rect for the dialog itself; when absent, the overlay uses its CSS default. */
  modalSpec?: DebateTutorialArea;
  /**
   * When `true`, keep the Continue / Got it button even if the step has a
   * `targetComponent`. Without this flag, targeted steps hide the button and
   * auto-conclude on the next `EventTrigger` fired from the debate event bus.
   */
  showContinueWithTarget?: boolean;
  /**
   * Ordered sequence of synthetic UI interactions to fire while this step is
   * active. Consumed by `TutorialOverlay`, which schedules each entry's
   * `delayTimeMs` (cumulative) and cancels pending timers when the step
   * changes or the tutorial closes.
   */
  artificialInteractions?: readonly TutorialArtificialInteraction[];
}

export type TutorialStepInput = {
  message: string;
  targetComponent?: TutorialTargetComponent;
  modal?: DebateTutorialArea;
  showContinueWithTarget?: boolean;
  artificialInteractions?: readonly TutorialArtificialInteraction[];
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
        targetComponent: step.targetComponent,
        modalSpec: step.modal,
        showContinueWithTarget: step.showContinueWithTarget,
        artificialInteractions: step.artificialInteractions,
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
