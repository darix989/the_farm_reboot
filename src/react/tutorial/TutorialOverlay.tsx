import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import cn from 'classnames';
import { useTutorialStore } from '../../store/tutorialStore';
import { useStageRect } from './useStageRect';
import TrialTextButton from '../trial/components/TrialTextButton';
import ScrollFadeContainer from '../trial/components/ScrollFadeContainer';
import panelStyles from '../trial/panels/TrialPanels.module.scss';
import shared from '../trial/trialShared.module.scss';
import getLabel from '../../data/labels';
import { debateEventBus } from '../trial/utils/debateEventBus';
import { scheduleArtificialInteractions } from './artificialInteractions';
import styles from './TutorialOverlay.module.scss';
import { TutorialModalRichBody } from './tutorialRichMessage';
import { isButtonTutorialTarget } from '../../types/debateEntities';

declare global {
  interface Window {
    /**
     * Dev-only: force `TutorialOverlay` to re-render so any change to
     * `window.modalOverride` is picked up immediately. Only defined while
     * the overlay is mounted.
     */
    forceTutorialRender?: () => void;
    /**
     * Reset all tutorial render overrides to their default values.
     */
    resetTutorialRenderOverrides?: () => void;
    /**
     * Dev-only: partial modal rect (stage-normalized fractions, 0–1) merged
     * over the current step's `modal`. Missing keys inherit from the step; if
     * the step has no `modal` spec, all four fields must be supplied for the
     * override to take effect (otherwise the CSS default placement is used).
     */
    modalOverride?: {
      /** Left edge / stage width. */
      x?: number;
      /** Top edge / stage height. */
      y?: number;
      /** Width / stage width. */
      width?: number;
      /** Height / stage height. */
      height?: number;
    };
  }
}

const TutorialOverlay: React.FC = () => {
  const isOpen = useTutorialStore((s) => s.isOpen);
  const steps = useTutorialStore((s) => s.steps);
  const stepIndex = useTutorialStore((s) => s.stepIndex);
  const stepForward = useTutorialStore((s) => s.stepForward);
  const stepBack = useTutorialStore((s) => s.stepBack);
  const finishTutorial = useTutorialStore((s) => s.finishTutorial);

  // Stage rect is still consulted for converting `modalSpec` ratios into pixel
  // coordinates; the spotlight system has been retired.
  const { stageRect } = useStageRect();

  // Dev-only: bump a render tick from the console so `window.modalOverride`
  // can be tweaked live. The modal spec is derived on every render, so
  // triggering a re-render is enough to merge in the latest override values.
  const [, setRenderTick] = useState(0);
  useEffect(() => {
    window.forceTutorialRender = () => setRenderTick((n) => n + 1);
    window.resetTutorialRenderOverrides = () => {
      window.modalOverride = undefined;
    };
    return () => {
      delete window.forceTutorialRender;
    };
  }, []);

  const lastIndex = steps.length > 0 ? steps.length - 1 : 0;
  const isLast = stepIndex >= lastIndex;
  const isSingle = steps.length === 1;
  const step = isOpen && steps.length > 0 ? steps[stepIndex]! : null;
  // Scenario 2.2: a *button* target is defined and the author has not asked
  // for the dialog's primary button to remain. The step concludes when the
  // targeted button emits its event onto the bus. Container targets (panels,
  // sections, cards) never auto-conclude — they only highlight, and the user
  // advances via the dialog Continue / Got it.
  const autoConcludeOnEvent =
    step !== null &&
    !!step.targetComponent &&
    isButtonTutorialTarget(step.targetComponent) &&
    !step.showContinueWithTarget;

  // Schedule the step's artificial interactions (scroll / click the debate log)
  // when the step becomes active. Cumulative `delayTimeMs` values are honored by
  // `scheduleArtificialInteractions`. The cleanup clears every still-pending
  // timer on step change, tutorial close, or overlay unmount so a late timer
  // can never fire against the wrong step or a dismounted UI.
  useEffect(() => {
    if (!isOpen || !step) return;
    const interactions = step.artificialInteractions;
    if (!interactions || interactions.length === 0) return;
    return scheduleArtificialInteractions(interactions);
  }, [isOpen, step, stepIndex]);

  // Auto-conclude listener.
  //
  // Ignore the tutorial's own lifecycle events (`tutorial:start/next/end`) —
  // `stepForward` / `finishTutorial` below emit them synchronously, so without
  // this guard we would recursively advance/finish on our own emission before
  // React reruns this effect with the new `stepIndex`.
  //
  // Stale-listener guard (`armedFor`): a single user click can emit several
  // debate events synchronously (e.g. `analysis:guess_submitted` →
  // `analysis:guess_partially_correct`). Once the first event auto-concludes
  // the current tutorial, the React effect cleanup hasn't run yet, so this
  // listener is still live when the second event arrives. Without a guard it
  // would re-enter `finishTutorial` / `stepForward` against whatever tutorial
  // / step the store has since moved to — which manifests as a chained
  // `tutorial:end → openTutorial(...)` tutorial immediately closing itself.
  useEffect(() => {
    if (!autoConcludeOnEvent) return;
    const armedFor = {
      tutorialId: useTutorialStore.getState().tutorialId,
      stepIndex,
    };
    const unsubscribe = debateEventBus.onAny((event) => {
      if (event === 'tutorial:start' || event === 'tutorial:next' || event === 'tutorial:end') {
        return;
      }
      const current = useTutorialStore.getState();
      if (!current.isOpen) return;
      if (current.tutorialId !== armedFor.tutorialId) return;
      if (current.stepIndex !== armedFor.stepIndex) return;
      if (isSingle || isLast) {
        finishTutorial();
      } else {
        stepForward();
      }
    });
    return unsubscribe;
  }, [autoConcludeOnEvent, isSingle, isLast, finishTutorial, stepForward, stepIndex]);

  if (!isOpen || !step) {
    return null;
  }

  // Merge dev-time `window.modalOverride` (partial) over the step's `modalSpec`
  // when present. If the step has no `modalSpec`, the override only takes effect
  // when all four fractions are supplied — otherwise we fall through to the
  // overlay's CSS default placement.
  const modalOverride = window.modalOverride;
  let effectiveModalSpec = step.modalSpec;
  if (step.modalSpec && modalOverride) {
    effectiveModalSpec = {
      x: modalOverride.x ?? step.modalSpec.x,
      y: modalOverride.y ?? step.modalSpec.y,
      width: modalOverride.width ?? step.modalSpec.width,
      height: modalOverride.height ?? step.modalSpec.height,
    };
  } else if (
    !step.modalSpec &&
    modalOverride &&
    modalOverride.x !== undefined &&
    modalOverride.y !== undefined &&
    modalOverride.width !== undefined &&
    modalOverride.height !== undefined
  ) {
    effectiveModalSpec = {
      x: modalOverride.x,
      y: modalOverride.y,
      width: modalOverride.width,
      height: modalOverride.height,
    };
  }
  const dialogStyle: React.CSSProperties | undefined = effectiveModalSpec
    ? {
        position: 'fixed',
        left: stageRect.left + effectiveModalSpec.x * stageRect.width,
        top: stageRect.top + effectiveModalSpec.y * stageRect.height,
        width: effectiveModalSpec.width * stageRect.width,
        height: effectiveModalSpec.height * stageRect.height,
        maxWidth: 'none',
        maxHeight: 'none',
      }
    : undefined;

  const onPrimary = () => {
    if (isSingle || isLast) {
      finishTutorial();
    } else {
      stepForward();
    }
  };

  const primaryLabel = isSingle || isLast ? getLabel('tutorialGotIt') : getLabel('continue');

  // Footer layout:
  //  - Auto-conclude + single step: no footer buttons (hint alone drives the step)
  //  - Auto-conclude + multi-step: Back stays (so users can revisit earlier steps);
  //    the primary cell is empty because the targeted button concludes the step.
  //  - Otherwise: single primary (isSingle) or Back + primary grid
  const renderFooter = () => {
    if (autoConcludeOnEvent) {
      if (isSingle) return null;
      return (
        <div className={styles.footer}>
          <div className={panelStyles.trialFooterGrid}>
            <TrialTextButton
              type="button"
              variant="solid"
              onClick={stepBack}
              disabled={stepIndex === 0}
            >
              {getLabel('back')}
            </TrialTextButton>
            <span aria-hidden />
          </div>
        </div>
      );
    }
    return (
      <div className={cn(styles.footer, isSingle && styles.footerSingle)}>
        {isSingle ? (
          <TrialTextButton
            type="button"
            variant="solid"
            className={styles.primaryActionGlow}
            onClick={onPrimary}
          >
            {primaryLabel}
          </TrialTextButton>
        ) : (
          <div className={panelStyles.trialFooterGrid}>
            <TrialTextButton
              type="button"
              variant="solid"
              onClick={stepBack}
              disabled={stepIndex === 0}
            >
              {getLabel('back')}
            </TrialTextButton>
            <TrialTextButton
              type="button"
              variant="solid"
              className={styles.primaryActionGlow}
              onClick={onPrimary}
            >
              {primaryLabel}
            </TrialTextButton>
          </div>
        )}
      </div>
    );
  };

  // The overlay no longer dims the screen or blocks pointer events outside the
  // dialog. Click-blocking responsibility moved to each interactive button via
  // `useTutorialTarget` (`tutorial/tutorialTarget.ts`), so the user can scroll
  // and explore freely; only the targeted control reacts.
  const ui = (
    <div className={styles.root} role="presentation">
      <div className={styles.dialogWrap}>
        <div
          className={cn(shared.trialModalFontScope, styles.dialog)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tutorial-dialog-title"
          style={dialogStyle}
        >
          <div className={styles.dialogTitleWrap}>
            <div className={panelStyles.trialAreaTitle}>
              <h2 id="tutorial-dialog-title" className={panelStyles.trialPanelHeading}>
                {getLabel('tutorialDialogTitle', {
                  replacements: {
                    currentStep: stepIndex + 1,
                    totalSteps: steps.length,
                  },
                })}
              </h2>
            </div>
          </div>
          <ScrollFadeContainer isModal ignoreTutorialScrollLock className={styles.dialogBody}>
            <TutorialModalRichBody message={step.message} />
          </ScrollFadeContainer>
          {autoConcludeOnEvent ? (
            <p className={styles.spotlightHint} role="status" aria-live="polite">
              {getLabel('tutorialSpotlightHint')}
            </p>
          ) : null}
          {renderFooter()}
        </div>
      </div>
    </div>
  );

  return createPortal(ui, document.body);
};

export default TutorialOverlay;
