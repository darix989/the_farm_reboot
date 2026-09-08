import React from 'react';
import cn from 'classnames';
import styles from '../panels/TrialPanels.module.scss';

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
  unlockHint?: boolean;
  revealFlash?: boolean;
  tutorialOptionId?: string;
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
  unlockHint,
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
        unlockHint && styles.trialChoiceBtnUnlockHint,
        revealFlash && styles.trialChoiceBtnRevealFlash,
      )}
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      data-tutorial-interactive-option-id={tutorialOptionId}
    >
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
