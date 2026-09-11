import React from 'react';
import cn from 'classnames';
import type { DebateScenarioJson } from '../../../types/debateEntities';
import DebateLogToggleButton from './DebateLogToggleButton';
import { ModeratorOpinionInline } from '../utils/ModeratorOpinionInline';
import type { ResolvedMechanics } from '../utils/scenarioMechanics';
import styles from './DebateLogRecapChip.module.scss';
import getLabel from '../../../data/labels';

export interface DebateLogRecapChipProps {
  debate: DebateScenarioJson;
  /** 1-based active round from `activeRoundNumber`; `null` when the scenario has no rounds. */
  roundNumber: number | null;
  totalRounds: number;
  /** Moderator opinion, i.e. `wf.totalScore`. */
  totalScore: number;
  insightPoints: number;
  mechanics: ResolvedMechanics;
  /**
   * `TrialUI`'s `analysisGatePending`: the round demands an analysis the player has not done,
   * so Continue is disabled and the only way forward is inside the collapsed log. Draws
   * attention to the chip instead of expanding the log over the player's decision.
   */
  needsAttention: boolean;
}

/**
 * The Debate Log while collapsed: round counter, the same moderator/insight strip the log
 * header shows, and the button back into the full panel.
 *
 * The chip and the expanded panel are mutually exclusive in the DOM (`TrialLayout` unmounts
 * one to mount the other), and the two moderator hooks are distinct kinds
 * (`debate_log_recap_moderator_score` here, `debate_log_moderator_score` on the header), so a
 * tutorial can target either state on purpose. `resolveTutorialTargetElement` is still a
 * bare `querySelector`; that stays unambiguous because only one of the two is mounted.
 */
const DebateLogRecapChip: React.FC<DebateLogRecapChipProps> = ({
  debate,
  roundNumber,
  totalRounds,
  totalScore,
  insightPoints,
  mechanics,
  needsAttention,
}) => {
  return (
    <div
      className={cn(styles.recapChip, needsAttention && styles.needsAttention)}
      data-debate-log-recap-chip
      title={needsAttention ? getLabel('debateLogRecapAnalysisPending') : undefined}
    >
      {roundNumber !== null && (
        <span className={styles.recapRound}>
          {getLabel('debateLogRecapRound', {
            replacements: { roundNumber, totalRounds },
          })}
        </span>
      )}
      <span className={styles.recapOpinionHook} data-tutorial-debate-log-recap-moderator-score>
        <ModeratorOpinionInline
          className={styles.recapOpinion}
          score={totalScore}
          // Same gating as the log header, from the same flags — the two must never disagree.
          insightPoints={mechanics.showInsightPoints ? insightPoints : undefined}
          showOpinion={mechanics.showModeratorOpinion}
        />
      </span>
      <DebateLogToggleButton debate={debate} roundNumber={roundNumber} />
    </div>
  );
};

export default DebateLogRecapChip;
