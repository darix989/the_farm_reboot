import React, { useRef } from 'react';
import cn from 'classnames';
import { useScrollFade } from '../../hooks/useScrollFade';
import shared from '../trialShared.module.scss';

interface ScrollFadeContainerProps {
  /** External ref to attach to the scrollable div. Pass one when the parent
   *  also needs direct access to the element (e.g. for programmatic scrolling). */
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  /** CSS module class applied to the inner scrollable div. */
  className?: string;
  /** When true, applies the modal-variant fade gradient colours. */
  isModal?: boolean;
  /**
   * Retained for callsite compatibility. The tutorial system no longer locks
   * scroll while open — every interactable control silences itself via
   * `useTutorialTarget` instead — so this prop is now a no-op. Passing it
   * does nothing.
   */
  ignoreTutorialScrollLock?: boolean;
  /**
   * Optional stable identifier emitted as `data-scroll-key` on the inner
   * scrollable div. Used by tutorial `artificialInteractions` and other
   * external automation to locate the right scroll container without
   * relying on hashed CSS-module class names.
   */
  scrollElementDataKey?: string;
  children: React.ReactNode;
}

/**
 * Wraps children in the standard scroll-fade shell:
 * a fade overlay at the top, the scrollable content div, and a fade overlay at the bottom.
 * Fade opacity is driven by `useScrollFade` so it transitions automatically.
 */
const ScrollFadeContainer: React.FC<ScrollFadeContainerProps> = ({
  scrollRef: externalRef,
  className,
  isModal,
  ignoreTutorialScrollLock: _ignoreTutorialScrollLock,
  scrollElementDataKey,
  children,
}) => {
  const internalRef = useRef<HTMLDivElement>(null);
  const activeRef = externalRef ?? internalRef;
  const fade = useScrollFade(activeRef);

  return (
    <div className={shared.trialScrollFadeWrap}>
      <div
        className={cn(shared.scrollFadeOverlay, shared.fadeTop, {
          [shared.fadeModal]: isModal,
        })}
        style={{ opacity: fade.top ? 1 : 0 }}
      />
      <div className={className} ref={activeRef} data-scroll-key={scrollElementDataKey}>
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
