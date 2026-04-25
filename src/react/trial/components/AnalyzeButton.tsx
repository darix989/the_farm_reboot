import React from 'react';
import cn from 'classnames';
import magnifyingIcon from '../../../static/icons/magnifying.svg';
import getLabel from '../../../data/labels';
import styles from '../panels/TrialPanels.module.scss';
import { useTutorialTarget } from '../../tutorial/tutorialTarget';

interface AnalyzeButtonProps {
  onClick: () => void;
  guessState?: 'correct' | 'partial' | 'wrong' | null;
  title?: string;
  /**
   * Round id the button belongs to. Drives both the tutorial target identity
   * (`{ kind: 'debate_log:analyze', roundId }`) and the
   * `data-debate-log-analyze-round-id` data attribute used by the tutorial's
   * artificial-interaction system to synthetically click the button.
   */
  dataRoundId: string;
}

const AnalyzeButton: React.FC<AnalyzeButtonProps> = ({
  onClick,
  guessState,
  title = getLabel('analyzeThisRound'),
  dataRoundId,
}) => {
  const tutorial = useTutorialTarget({ kind: 'debate_log:analyze', roundId: dataRoundId });
  return (
    <button
      type="button"
      className={cn(
        styles.trialAnalyzeBtn,
        {
          [styles.correct]: guessState === 'correct',
          [styles.partial]: guessState === 'partial',
          [styles.wrong]: guessState === 'wrong',
        },
        tutorial.highlightClass,
      )}
      title={title}
      onClick={() => {
        if (tutorial.isBlocked) return;
        onClick();
      }}
      data-debate-log-analyze-round-id={dataRoundId}
    >
      <img src={magnifyingIcon} alt={getLabel('analyzeImageAlt')} />
    </button>
  );
};

export default AnalyzeButton;
