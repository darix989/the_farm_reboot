import React from 'react';
import cn from 'classnames';
import type { AnalysisGuessState } from '../utils/fallacyGuessTypes';
import magnifyingIcon from '../../../static/icons/magnifying.svg';
import getLabel from '../../../data/labels';
import styles from '../panels/TrialPanels.module.scss';

interface AnalyzeButtonProps {
  onClick: () => void;
  guessState?: AnalysisGuessState | null;
  title?: string;
  /**
   * Optional debate-log round id the button belongs to. Emitted as
   * `data-debate-log-analyze-round-id` so tutorial `artificialInteractions`
   * can synthetically click the analyze button for a specific round.
   */
  dataRoundId?: string;
}

const AnalyzeButton: React.FC<AnalyzeButtonProps> = ({
  onClick,
  guessState,
  title = getLabel('analyzeThisRound'),
  dataRoundId,
}) => (
  <button
    type="button"
    className={cn(styles.trialAnalyzeBtn, {
      [styles.correct]: guessState === 'correct',
      [styles.extras]: guessState === 'extras',
      [styles.partial]: guessState === 'partial',
      [styles.wrong]: guessState === 'wrong',
    })}
    title={title}
    onClick={onClick}
    data-debate-log-analyze-round-id={dataRoundId}
    data-tutorial-debate-log-analyze-round-id={dataRoundId}
  >
    <img src={magnifyingIcon} alt={getLabel('analyzeImageAlt')} />
  </button>
);

export default AnalyzeButton;
