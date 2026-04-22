import React, { useRef } from 'react';
import cn from 'classnames';
import { useScrollFade } from '../../hooks/useScrollFade';
import { useTutorialStore } from '../../../store/tutorialStore';
import shared from '../trialShared.module.scss';

interface ScrollFadeContainerProps {
  /** External ref to attach to the scrollable div. Pass one when the parent
   *  also needs direct access to the element (e.g. for programmatic scrolling). */
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  /** CSS module class applied to the inner scrollable div. */
  className?: string;
  /** When true, applies the modal-variant fade gradient colours. */
  isModal?: boolean;
  /** Opt out of the tutorial scroll-lock. Set on the overlay's own dialog body so it stays scrollable while every other ScrollFadeContainer is frozen. */
  ignoreTutorialScrollLock?: boolean;
  children: React.ReactNode;
}

/**
 * Wraps children in the standard scroll-fade shell:
 * a fade overlay at the top, the scrollable content div, and a fade overlay at the bottom.
 * Fade opacity is driven by `useScrollFade` so it transitions automatically.
 *
 * While `TutorialOverlay` is open, the scrollable div is locked with `overflow: hidden`
 * unless `ignoreTutorialScrollLock` is set — this keeps the spotlight target stable and
 * funnels the lock through the app's single scroll surface.
 */
const ScrollFadeContainer: React.FC<ScrollFadeContainerProps> = ({
  scrollRef: externalRef,
  className,
  isModal,
  ignoreTutorialScrollLock,
  children,
}) => {
  const internalRef = useRef<HTMLDivElement>(null);
  const activeRef = externalRef ?? internalRef;
  const fade = useScrollFade(activeRef);
  const tutorialOpen = useTutorialStore((s) => s.isOpen);
  const locked = tutorialOpen && !ignoreTutorialScrollLock;

  return (
    <div className={shared.trialScrollFadeWrap}>
      <div
        className={cn(shared.scrollFadeOverlay, shared.fadeTop, {
          [shared.fadeModal]: isModal,
        })}
        style={{ opacity: fade.top ? 1 : 0 }}
      />
      <div
        className={className}
        ref={activeRef}
        style={locked ? { overflow: 'hidden' } : undefined}
      >
        {children}
      </div>
      <div
        className={cn(shared.scrollFadeOverlay, shared.fadeBottom, {
          [shared.fadeModal]: isModal,
        })}
        style={{ opacity: fade.bottom ? 1 : 0 }}
      />
    </div>
  );
};

export default ScrollFadeContainer;
