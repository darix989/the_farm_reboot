import React from 'react';
import cn from 'classnames';
import magnifyingIcon from '../../../static/icons/magnifying.svg';
import styles from '../panels/TrialPanels.module.scss';

interface AnalyzeButtonProps {
  onClick: () => void;
  guessState?: 'correct' | 'partial' | 'wrong' | null;
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
      [styles.partial]: guessState === 'partial',
      [styles.wrong]: guessState === 'wrong',
    })}
    title={title}
    onClick={onClick}
  >
    <img src={magnifyingIcon} alt="Analyze" />
  </button>
);

export default AnalyzeButton;
