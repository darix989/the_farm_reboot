import React from 'react';
import cn from 'classnames';
import magnifyingIcon from '../../../static/icons/magnifying.svg';
import styles from '../TrialUI.module.scss';

interface AnalyzeButtonProps {
  onClick: () => void;
  guessState?: 'correct' | 'wrong' | null;
  title?: string;
}

const AnalyzeButton: React.FC<AnalyzeButtonProps> = ({
  onClick,
  guessState,
  title = 'Analyze this round',
}) => (
  <button
    type="button"
    className={cn(styles.trialAnalyzeBtn, {
      [styles.correct]: guessState === 'correct',
      [styles.wrong]: guessState === 'wrong',
    })}
    title={title}
    onClick={onClick}
  >
    <img src={magnifyingIcon} alt="Analyze" />
  </button>
);

export default AnalyzeButton;
