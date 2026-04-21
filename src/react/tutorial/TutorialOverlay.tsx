import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import cn from 'classnames';
import { useTutorialStore } from '../../store/tutorialStore';
import { resolveStageSpotlightToViewport, type TutorialSpotlightRect } from './spotlightRect';
import TrialTextButton from '../trial/components/TrialTextButton';
import panelStyles from '../trial/panels/TrialPanels.module.scss';
import shared from '../trial/trialShared.module.scss';
import getLabel from '../../data/labels';
import styles from './TutorialOverlay.module.scss';

/** Dim everything outside `spotlight`; the hole stays bright and receives clicks through to the UI below. */
function SpotlightShutters({
  spotlight,
  vw,
  vh,
}: {
  spotlight: TutorialSpotlightRect;
  vw: number;
  vh: number;
}) {
  const { x, y, width: spotW, height: spotH } = spotlight;
  const holeTop = Math.max(0, Math.min(vh, y));
  const holeBottom = Math.max(0, Math.min(vh, y + spotH));
  const holeLeft = Math.max(0, Math.min(vw, x));
  const holeRight = Math.max(0, Math.min(vw, x + spotW));
  const midH = Math.max(0, holeBottom - holeTop);
  const topH = holeTop;
  const bottomTop = holeBottom;
  const bottomH = Math.max(0, vh - holeBottom);
  const leftW = holeLeft;
  const rightLeft = holeRight;
  const rightW = Math.max(0, vw - holeRight);

  return (
    <>
      <div className={cn(styles.shutter, styles.shutterTop)} style={{ height: topH }} aria-hidden />
      <div
        className={cn(styles.shutter, styles.shutterBottom)}
        style={{ top: bottomTop, height: bottomH }}
        aria-hidden
      />
      <div
        className={cn(styles.shutter, styles.shutterLeft)}
        style={{ top: holeTop, width: leftW, height: midH }}
        aria-hidden
      />
      <div
        className={cn(styles.shutter, styles.shutterRight)}
        style={{ top: holeTop, left: rightLeft, width: rightW, height: midH }}
        aria-hidden
      />
    </>
  );
}

const TutorialOverlay: React.FC = () => {
  const isOpen = useTutorialStore((s) => s.isOpen);
  const steps = useTutorialStore((s) => s.steps);
  const stepIndex = useTutorialStore((s) => s.stepIndex);
  const stepForward = useTutorialStore((s) => s.stepForward);
  const stepBack = useTutorialStore((s) => s.stepBack);
  const finishTutorial = useTutorialStore((s) => s.finishTutorial);

  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1920,
    h: typeof window !== 'undefined' ? window.innerHeight : 1080,
  }));

  useEffect(() => {
    if (!isOpen) return;
    const sync = () => {
      const vv = window.visualViewport;
      setViewport({
        w: vv?.width ?? window.innerWidth,
        h: vv?.height ?? window.innerHeight,
      });
    };
    sync();
    window.addEventListener('resize', sync);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', sync);
    vv?.addEventListener('scroll', sync);
    return () => {
      window.removeEventListener('resize', sync);
      vv?.removeEventListener('resize', sync);
      vv?.removeEventListener('scroll', sync);
    };
  }, [isOpen]);

  if (!isOpen || steps.length === 0) {
    return null;
  }

  const lastIndex = steps.length - 1;
  const isLast = stepIndex >= lastIndex;
  const isSingle = steps.length === 1;
  const step = steps[stepIndex]!;
  const body = step.message;
  const spotlightPx = resolveStageSpotlightToViewport(step.spotlightSpec);

  const onPrimary = () => {
    if (isSingle || isLast) {
      finishTutorial();
    } else {
      stepForward();
    }
  };

  const primaryLabel = isSingle || isLast ? getLabel('tutorialGotIt') : getLabel('continue');

  const ui = (
    <div className={styles.root} role="presentation">
      <SpotlightShutters spotlight={spotlightPx} vw={viewport.w} vh={viewport.h} />

      <div className={styles.dialogWrap}>
        <div
          className={cn(shared.trialModalFontScope, styles.dialog)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tutorial-dialog-title"
        >
          <div className={panelStyles.trialAreaTitle}>
            <h2 id="tutorial-dialog-title" className={panelStyles.trialPanelHeading}>
              {getLabel('tutorialDialogTitle')}
            </h2>
          </div>
          <div className={styles.dialogBody}>
            <p className={cn(panelStyles.trialWizardGuidanceText, styles.messageBody)}>{body}</p>
          </div>
          <div className={cn(styles.footer, isSingle && styles.footerSingle)}>
            {isSingle ? (
              <TrialTextButton type="button" variant="solid" onClick={onPrimary}>
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
                <TrialTextButton type="button" variant="solid" onClick={onPrimary}>
                  {primaryLabel}
                </TrialTextButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(ui, document.body);
};

export default TutorialOverlay;
