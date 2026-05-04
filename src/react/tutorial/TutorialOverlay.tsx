import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import cn from 'classnames';
import { useTutorialStore } from '../../store/tutorialStore';
import { resolveStageSpotlightToViewport } from './spotlightRect';
import { useStageRect } from './useStageRect';
import TrialTextButton from '../trial/components/TrialTextButton';
import ScrollFadeContainer from '../trial/components/ScrollFadeContainer';
import panelStyles from '../trial/panels/TrialPanels.module.scss';
import shared from '../trial/trialShared.module.scss';
import getLabel from '../../data/labels';
import { scheduleArtificialInteractions } from './artificialInteractions';
import { resolveTutorialTargetElement } from './tutorialTarget';
import highlightStyles from './tutorialHighlight.module.scss';
import styles from './TutorialOverlay.module.scss';
import { TutorialModalRichBody } from './tutorialRichMessage';
import { GameManager } from '../../utils/gameManager';
import type { TutorialModalAnchor } from '../../types/tutorialModalLayout';
import {
  mergeTutorialModalSpecWithDevOverride,
  normalizeTutorialModalSpecToArea,
} from './tutorialModalLayout';

declare global {
  interface Window {
    forceTutorialRender?: () => void;
    resetTutorialRenderOverrides?: () => void;
    modalOverride?: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      pivot?: TutorialModalAnchor;
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

  const { stageRect } = useStageRect();

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
  // Missing `interactionMode` is treated as `'modal_only'` (matches the resolve
  // step in `tutorialStore.openTutorial` and the JSDoc on `DebateTutorialStep`),
  // so an authored step without the field never enters target-only mode.
  const stepInteractionMode = step?.interactionMode ?? 'modal_only';
  const isTargetOnlyStep = !!(step?.targetComponent && stepInteractionMode === 'target_only');
  const disableBackButton = !!step?.onlyForward;
  const exitsToMainMenu = step?.onFinish === 'exit';

  useEffect(() => {
    if (!isOpen || !step) return;
    const interactions = step.artificialInteractions;
    if (!interactions || interactions.length === 0) return;
    return scheduleArtificialInteractions(interactions);
  }, [isOpen, step, stepIndex]);

  useEffect(() => {
    if (!isOpen || !step?.targetComponent) return;
    const targetEl = resolveTutorialTargetElement(step.targetComponent);
    if (!targetEl) return;
    const className = step.targetClassName ?? highlightStyles.tutorialTargetHighlight;
    targetEl.classList.add(className);
    return () => {
      targetEl.classList.remove(className);
    };
  }, [isOpen, step]);

  if (!isOpen || !step) {
    return null;
  }

  const mergedModalSpec = mergeTutorialModalSpecWithDevOverride(
    step.modalSpec,
    window.modalOverride,
  );
  const modalArea = mergedModalSpec ? normalizeTutorialModalSpecToArea(mergedModalSpec) : null;
  const modalPx = modalArea ? resolveStageSpotlightToViewport(modalArea, stageRect) : null;
  const dialogStyle: React.CSSProperties | undefined = modalPx
    ? {
        position: 'fixed',
        left: modalPx.x,
        top: modalPx.y,
        width: modalPx.width,
        height: modalPx.height,
        maxWidth: 'none',
        maxHeight: 'none',
      }
    : undefined;

  const onPrimary = () => {
    if (exitsToMainMenu) {
      finishTutorial();
      GameManager.switchScene('MainMenu');
      return;
    }
    if (isSingle || isLast) {
      finishTutorial();
    } else {
      stepForward();
    }
  };

  const primaryLabel = exitsToMainMenu
    ? getLabel('tutorialFinish')
    : isSingle || isLast
      ? getLabel('tutorialGotIt')
      : getLabel('continue');
  const dialogTitle = isSingle
    ? getLabel('tutorialDialogTitleSingle')
    : getLabel('tutorialDialogTitle', {
        replacements: {
          currentStep: stepIndex + 1,
          totalSteps: steps.length,
        },
      });

  const renderFooter = () => {
    if (exitsToMainMenu) {
      return (
        <div className={cn(styles.footer, styles.footerSingle)}>
          <TrialTextButton
            type="button"
            variant="solid"
            className={styles.primaryActionGlow}
            onClick={onPrimary}
          >
            {primaryLabel}
          </TrialTextButton>
        </div>
      );
    }
    if (isTargetOnlyStep) {
      return (
        <div className={cn(styles.footer, isSingle && styles.footerSingle)}>
          {isSingle ? (
            <TrialTextButton
              type="button"
              variant="solid"
              className={styles.primaryActionGlow}
              onClick={onPrimary}
              disabled
            >
              {primaryLabel}
            </TrialTextButton>
          ) : (
            <div className={panelStyles.trialFooterGrid}>
              <TrialTextButton
                type="button"
                variant="solid"
                onClick={stepBack}
                disabled={disableBackButton || stepIndex === 0}
              >
                {getLabel('back')}
              </TrialTextButton>
              <TrialTextButton
                type="button"
                variant="solid"
                className={styles.primaryActionGlow}
                onClick={onPrimary}
                disabled
              >
                {primaryLabel}
              </TrialTextButton>
            </div>
          )}
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
              disabled={disableBackButton || stepIndex === 0}
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
                {dialogTitle}
              </h2>
            </div>
          </div>
          <ScrollFadeContainer isModal className={styles.dialogBody}>
            <TutorialModalRichBody message={step.message} />
          </ScrollFadeContainer>
          {renderFooter()}
        </div>
      </div>
    </div>
  );

  return createPortal(ui, document.body);
};

export default TutorialOverlay;
