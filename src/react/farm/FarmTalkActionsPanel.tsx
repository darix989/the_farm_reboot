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
  /**
   * Why this animal's encounter cannot be started yet, or null when it can. When set, Talk is
   * disabled and this replaces the actions hint — the panel says what to go and do instead of
   * leaving a greyed button unexplained.
   */
  lockedHint: string | null;
  onRevealAdvance: () => void;
  onAdvanceBeat: () => void;
  onStart: (scenario: DebateScenarioKey) => void;
  onClose: () => void;
}

function hintFor(
  revealActive: boolean,
  isLastBeat: boolean,
  hasScenario: boolean,
  lockedHint: string | null,
): string {
  if (revealActive) return getLabel('workflowRevealing');
  if (!isLastBeat) return getLabel('farmTalkHintContinue');
  if (hasScenario && lockedHint) return lockedHint;
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
  lockedHint,
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
      <p className={styles.trialActionsHint}>
        {hintFor(revealActive, isLastBeat, !!scenario, lockedHint)}
      </p>

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
                ariaLabel={lockedHint ? `${talkLabel} — ${lockedHint}` : talkLabel}
                disabled={revealActive || !!lockedHint}
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
