import React from 'react';
import cn from 'classnames';
import styles from '../panels/TrialPanels.module.scss';

export type ChoiceLockState = 'shut' | 'ready';

export interface TrialChoiceButtonProps {
  /** The glyph in the middle: an option letter ("A"), or a short word ("Talk"). */
  content: string;
  /** `word` lets the button grow past the square; `letter` keeps it square. */
  shape?: 'letter' | 'word';
  /** Full text for screen readers — the button itself shows only `content`. */
  ariaLabel: string;
  onClick: () => void;
  disabled?: boolean;
  selected?: boolean;
  /** Gated option still locked (`shut`) or unlocked but not yet opened (`ready`). */
  lockState?: ChoiceLockState;
  /** One-shot shake when the player clicks a still-shut option. */
  denyShake?: boolean;
  /** One-shot flash when the tag lands and the option becomes ready. */
  becameReady?: boolean;
  revealFlash?: boolean;
  tutorialOptionId?: string;
}

function LockBadge() {
  return (
    <svg className={styles.trialChoiceLockBadge} viewBox="0 0 16 16" aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M8 1.75A3.25 3.25 0 0 0 4.75 5v1.25H4A1.75 1.75 0 0 0 2.25 8v5A1.75 1.75 0 0 0 4 14.75h8A1.75 1.75 0 0 0 13.75 13V8A1.75 1.75 0 0 0 12 6.25h-.75V5A3.25 3.25 0 0 0 8 1.75Zm1.75 4.5H6.25V5a1.75 1.75 0 1 1 3.5 0v1.25Z"
      />
    </svg>
  );
}

/**
 * The A/B/C (or Talk/Leave) square. Rendered by both the debate Actions panel and the
 * overworld talk, so glyph, chrome and selected-state cannot drift.
 */
const TrialChoiceButton: React.FC<TrialChoiceButtonProps> = ({
  content,
  shape = 'letter',
  ariaLabel,
  onClick,
  disabled,
  selected,
  lockState,
  denyShake,
  becameReady,
  revealFlash,
  tutorialOptionId,
}) => {
  return (
    <button
      type="button"
      className={cn(
        styles.trialChoiceBtn,
        shape === 'word' && styles.trialChoiceBtnWord,
        selected && styles.trialChoiceBtnSelected,
        lockState === 'shut' && styles.trialChoiceBtnLockShut,
        lockState === 'ready' && styles.trialChoiceBtnLockReady,
        denyShake && styles.trialChoiceBtnDenyShake,
        becameReady && styles.trialChoiceBtnBecameReady,
        revealFlash && styles.trialChoiceBtnRevealFlash,
      )}
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      data-tutorial-interactive-option-id={tutorialOptionId}
    >
      {lockState ? <LockBadge /> : null}
      <span
        className={shape === 'word' ? styles.trialChoiceWord : styles.trialChoiceLetter}
        aria-hidden
      >
        {content}
      </span>
    </button>
  );
};

export default TrialChoiceButton;
