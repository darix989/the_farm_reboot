import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import cn from 'classnames';
import { useTutorialStore } from '../../store/tutorialStore';
import {
  isFullStageSpotlight,
  resolveStageSpotlightToViewport,
  spotlightCoversEntireViewport,
  type TutorialSpotlightRect,
} from './spotlightRect';
import TrialTextButton from '../trial/components/TrialTextButton';
import ScrollFadeContainer from '../trial/components/ScrollFadeContainer';
import panelStyles from '../trial/panels/TrialPanels.module.scss';
import shared from '../trial/trialShared.module.scss';
import getLabel from '../../data/labels';
import { debateEventBus } from '../trial/utils/debateEventBus';
import styles from './TutorialOverlay.module.scss';

declare global {
  interface Window {
    /**
     * Dev-only: force `TutorialOverlay` to re-render so any change to
     * `window.spotlightOverride` is picked up immediately. Only defined while
     * the overlay is mounted.
     */
    forceTutorialRender?: () => void;
    /**
     * Reset all tutorial render overrides to their default values.
     */
    resetTutorialRenderOverrides?: () => void;
    /**
     * Dev-only: partial spotlight rect (stage-normalized fractions, 0–1) merged
     * over the current step's `spotlight`. Missing keys inherit from the step.
     */
    spotlightOverride?: {
      /** Left edge / stage width. */
      x?: number;
      /** Top edge / stage height. */
      y?: number;
      /** Width / stage width. */
      width?: number;
      /** Height / stage height. */
      height?: number;
    };
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

/**
 * Pulsing amber glow traced around the spotlight hole. Rendered as a separate,
 * click-through overlay so it can sit above the shutter panes (and therefore
 * blend its outer glow into the dimmed area) without interfering with clicks
 * on the underlying UI. Uses tutorial-only colors (not the cyan UI accent) so
 * focused controls are not mistaken for the tutorial chrome.
 */
function SpotlightGlow({
  spotlight,
  vw,
  vh,
}: {
  spotlight: TutorialSpotlightRect;
  vw: number;
  vh: number;
}) {
  const left = Math.max(0, Math.min(vw, spotlight.x));
  const top = Math.max(0, Math.min(vh, spotlight.y));
  const right = Math.max(0, Math.min(vw, spotlight.x + spotlight.width));
  const bottom = Math.max(0, Math.min(vh, spotlight.y + spotlight.height));
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);
  if (width <= 0 || height <= 0) return null;
  return <div className={styles.spotlightGlow} style={{ left, top, width, height }} aria-hidden />;
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

  // Dev-only: bump a render tick from the console so `window.spotlightOverride`
  // can be tweaked live. The spotlight spec is derived on every render, so
  // triggering a re-render is enough to merge in the latest override values.
  const [, setRenderTick] = useState(0);
  useEffect(() => {
    window.forceTutorialRender = () => setRenderTick((n) => n + 1);
    window.resetTutorialRenderOverrides = () => {
      window.spotlightOverride = undefined;
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
  const hasFocusedSpotlight = step ? !isFullStageSpotlight(step.spotlightSpec) : false;
  const autoConcludeOnEvent =
    step !== null && hasFocusedSpotlight && !step.showContinueWithSpotlight;

  // When the current step auto-concludes on any debate event, advance or finish
  // on the next emit. The hint text takes the place of the Continue / Got it
  // button, so the spotlighted button in the underlying UI drives the flow.
  //
  // Ignore the tutorial's own lifecycle events (`tutorial:start/next/end`) —
  // `stepForward` / `finishTutorial` below emit them synchronously, so without
  // this guard we would recursively advance/finish on our own emission before
  // React reruns this effect with the new `stepIndex`.
  useEffect(() => {
    if (!autoConcludeOnEvent) return;
    const unsubscribe = debateEventBus.onAny((event) => {
      if (event === 'tutorial:start' || event === 'tutorial:next' || event === 'tutorial:end') {
        return;
      }
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

  const body = step.message;
  // Merge dev-time `window.spotlightOverride` (partial) over the step's spec so
  // individual fractions can be tweaked live from the browser console.
  const override = window.spotlightOverride;
  const effectiveSpotlightSpec = override
    ? {
        x: override.x ?? step.spotlightSpec.x,
        y: override.y ?? step.spotlightSpec.y,
        width: override.width ?? step.spotlightSpec.width,
        height: override.height ?? step.spotlightSpec.height,
      }
    : step.spotlightSpec;
  const spotlightPx = resolveStageSpotlightToViewport(effectiveSpotlightSpec);
  const blockClicksBehindModal =
    isFullStageSpotlight(effectiveSpotlightSpec) ||
    spotlightCoversEntireViewport(spotlightPx, viewport.w, viewport.h);
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
  const modalPx = effectiveModalSpec ? resolveStageSpotlightToViewport(effectiveModalSpec) : null;
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
    if (isSingle || isLast) {
      finishTutorial();
    } else {
      stepForward();
    }
  };

  const primaryLabel = isSingle || isLast ? getLabel('tutorialGotIt') : getLabel('continue');

  // Footer layout:
  //  - Normal: single primary (isSingle) or Back + primary grid
  //  - Auto-conclude + single step: no footer buttons (hint alone drives the step)
  //  - Auto-conclude + multi-step: Back stays (so users can revisit earlier steps);
  //    the primary cell is empty because the spotlighted button concludes the step.
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
    );
  };

  const ui = (
    <div className={styles.root} role="presentation">
      <SpotlightShutters spotlight={spotlightPx} vw={viewport.w} vh={viewport.h} />
      {!blockClicksBehindModal ? (
        <SpotlightGlow spotlight={spotlightPx} vw={viewport.w} vh={viewport.h} />
      ) : null}
      {blockClicksBehindModal ? (
        <div className={styles.clickBlocker} aria-hidden role="presentation" />
      ) : null}

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
            <p className={cn(panelStyles.trialWizardGuidanceText, styles.messageBody)}>{body}</p>
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
