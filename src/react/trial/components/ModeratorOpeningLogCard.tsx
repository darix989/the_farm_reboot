import React, { useId } from 'react';
import cn from 'classnames';
import type { DebateScenarioJson } from '../../../types/debateEntities';
import type { useTrialRoundWorkflow } from '../../hooks/useTrialRoundWorkflow';
import {
  canRunTutorialTargetAction,
  notifyTutorialTargetAction,
} from '../../tutorial/tutorialInteractionGuard';
import styles from '../panels/TrialPanels.module.scss';
import { uiColor } from '../../uiColor';
import getLabel from '../../../data/labels';
import { debateModeratorId } from '../../../data/debateCast';
import { getSpeakerName, statementText } from '../utils/trialHelpers';

type Wf = ReturnType<typeof useTrialRoundWorkflow>;

export const MODERATOR_OPENING_LOG_CARD_ID = '__moderator_opening';

type OpeningStatus = 'active' | 'upcoming' | 'completed';

function openingStatus(wf: Wf): OpeningStatus {
  if (wf.gamePhase === 'moderator_speaking') return 'active';
  if (wf.gamePhase === 'debate_intro') return 'upcoming';
  return 'completed';
}

interface ModeratorOpeningLogCardProps {
  wf: Wf;
  debate: DebateScenarioJson;
  expandOverride: boolean | undefined;
  onExpandToggle: () => void;
}

/**
 * Debate log row for the moderator's opening of the floor — same shell as the intro card
 * (no analysis, no score). Active only during `moderator_speaking`.
 */
const ModeratorOpeningLogCard: React.FC<ModeratorOpeningLogCardProps> = ({
  wf,
  debate,
  expandOverride,
  onExpandToggle,
}) => {
  const bodyId = useId();
  const status = openingStatus(wf);
  const effectiveExpanded = expandOverride ?? false;
  const opening = debate.moderatorOpening;
  const speakerId = debateModeratorId(debate);
  const speakerName = getSpeakerName(debate, speakerId);
  const body = opening ? statementText(opening.sentences) : '';

  const statusLabel =
    status === 'active'
      ? getLabel('statusActive')
      : status === 'upcoming'
        ? getLabel('statusUpcoming')
        : getLabel('statusCompleted');

  return (
    <div className={styles.debateLogRound} data-debate-log-moderator-opening>
      <div className={styles.debateLogRoundHeader}>
        <div className={styles.debateLogRoundLead}>
          <div className={styles.debateLogRoundNumber} aria-label={getLabel('theFloor')}>
            —
          </div>
          <div className={styles.debateLogRoundStack}>
            <div
              className={`${styles.debateLogRoundSideLine} ${styles.debateLogRoundSideLineModerator}`}
            >
              {speakerName}
            </div>
            <div className={styles.debateLogRoundTypeLine}>{getLabel('theFloor')}</div>
          </div>
        </div>

        <div className={styles.debateLogRoundHeaderEnd}>
          <span
            className={cn(
              status === 'active' && styles.debateLogStatusActive,
              status === 'upcoming' && styles.debateLogStatusUpcoming,
              status === 'completed' && styles.debateLogStatusCompleted,
            )}
          >
            <span className={cn(status === 'active' && styles.debateLogStatusActivePulse)}>
              {statusLabel}
            </span>
          </span>
          <button
            type="button"
            className={styles.debateLogExpandBtn}
            aria-expanded={effectiveExpanded}
            aria-controls={bodyId}
            data-tutorial-debate-log-toggle-round-id={MODERATOR_OPENING_LOG_CARD_ID}
            onClick={() => {
              if (status === 'upcoming') return;
              const target = {
                kind: 'debate_log_round_toggle',
                roundId: MODERATOR_OPENING_LOG_CARD_ID,
              } as const;
              if (!canRunTutorialTargetAction(target)) return;
              onExpandToggle();
              notifyTutorialTargetAction(target);
            }}
            title={effectiveExpanded ? getLabel('minimize') : getLabel('expand')}
          >
            {effectiveExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      <div
        className={cn(
          styles.debateLogRoundBodyShell,
          effectiveExpanded && styles.debateLogRoundBodyShellExpanded,
        )}
      >
        <div className={styles.debateLogRoundBodyInner} aria-hidden={!effectiveExpanded}>
          <div id={bodyId} className={styles.debateLogRoundBody}>
            <div className={styles.debateLogStatementBlock}>
              <p style={{ marginTop: 0, color: uiColor.textMuted }}>{body}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModeratorOpeningLogCard;
