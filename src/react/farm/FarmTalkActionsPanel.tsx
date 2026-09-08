import React from 'react';
import getLabel from '../../data/labels';
import type { DebateScenarioKey } from '../../data/levels';
import TrialActionRow from '../trial/components/TrialActionRow';
import TrialChoiceButton from '../trial/components/TrialChoiceButton';
import styles from '../trial/panels/TrialPanels.module.scss';

interface FarmTalkActionsPanelProps {
  revealActive: boolean;
  isLastBeat: boolean;
  scenario: DebateScenarioKey | null;
  onRevealAdvance: () => void;
  onAdvanceBeat: () => void;
  onStart: (scenario: DebateScenarioKey) => void;
  onClose: () => void;
}

function hintFor(revealActive: boolean, isLastBeat: boolean, hasScenario: boolean): string {
  if (revealActive) return getLabel('workflowRevealing');
  if (!isLastBeat) return getLabel('farmTalkHintContinue');
  if (hasScenario) return getLabel('farmTalkHintChoose');
  return getLabel('farmTalkHintNothingMore');
}

/**
 * Actions panel for a farm talk. Same chrome as the debate's `InteractivePanel`
 * (title, hint, Analyze / Back / Continue, then Talk / Leave on the last beat),
 * with Analyze and Back always greyed and Talk / Leave firing immediately.
 */
const FarmTalkActionsPanel: React.FC<FarmTalkActionsPanelProps> = ({
  revealActive,
  isLastBeat,
  scenario,
  onRevealAdvance,
  onAdvanceBeat,
  onStart,
  onClose,
}) => {
  const talkLabel = getLabel('farmTalk');
  const leaveLabel = getLabel('farmLeave');
  const continueLabel = getLabel('continue');

  return (
    <div className={styles.trialInteractiveBody}>
      <div className={styles.trialAreaTitle}>
        <h2 className={styles.trialPanelHeading}>{getLabel('interactive')}</h2>
      </div>
      <p className={styles.trialActionsHint}>{hintFor(revealActive, isLastBeat, !!scenario)}</p>

      <div className={styles.trialActionsCenter}>
        <TrialActionRow
          analyze={{
            disabled: true,
            label: getLabel('analyzeThisStatement'),
            onClick: () => {},
          }}
          back={{
            disabled: true,
            label: getLabel('back'),
            onClick: () => {},
          }}
          submit={{
            disabled: isLastBeat && !revealActive,
            label: continueLabel,
            icon: revealActive ? 'reveal' : 'continue',
            onClick: () => {
              if (revealActive) {
                onRevealAdvance();
                return;
              }
              if (!isLastBeat) onAdvanceBeat();
            },
          }}
          submitTutorialAction="continue"
        />
        {isLastBeat && (
          <div
            className={styles.trialChoices}
            aria-hidden={revealActive || undefined}
            style={revealActive ? { visibility: 'hidden' } : undefined}
          >
            {scenario && (
              <TrialChoiceButton
                content={talkLabel}
                shape="word"
                ariaLabel={talkLabel}
                disabled={revealActive}
                onClick={() => onStart(scenario)}
              />
            )}
            <TrialChoiceButton
              content={leaveLabel}
              shape="word"
              ariaLabel={leaveLabel}
              disabled={revealActive}
              onClick={onClose}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default FarmTalkActionsPanel;
