import React from 'react';
import cn from 'classnames';
import type { DebateScenarioJson } from '../../../types/debateEntities';
import { useDebateLogStore } from '../../../store/debateLogStore';
import { debateEventBus } from '../utils/debateEventBus';
import { encounterLabels } from '../utils/scenarioMechanics';
import styles from '../panels/TrialPanels.module.scss';
import getLabel from '../../../data/labels';

/** Id of the log panel this button controls, for `aria-controls` on both call sites. */
export const DEBATE_LOG_PANEL_ID = 'trial-debate-log-panel';

export interface DebateLogToggleButtonProps {
  debate: DebateScenarioJson;
  /** Active workflow round for the bus payload; `null` outside a round (intro / complete). */
  roundNumber: number | null;
  className?: string;
}

/**
 * Collapses / expands the Debate Log as a whole. Rendered twice — in the collapsed recap chip
 * (as the only way back in) and in the expanded panel's title strip — from one component, so
 * the two can never disagree about glyph, copy or bus payload.
 *
 * Reuses `.debateLogExpandBtn`, the same icon-button class the per-round toggles use, and the
 * same text-glyph convention (this project ships no icon library). The arrows read
 * horizontally rather than vertically, because this panel slides in from the right edge
 * instead of revealing a body downwards.
 */
const DebateLogToggleButton: React.FC<DebateLogToggleButtonProps> = ({
  debate,
  roundNumber,
  className,
}) => {
  const isExpanded = useDebateLogStore((s) => s.isExpanded);
  const toggleExpanded = useDebateLogStore((s) => s.toggleExpanded);

  const logTitle = getLabel(encounterLabels(debate).logTitle);
  const actionLabel = getLabel(isExpanded ? 'collapseDebateLog' : 'expandDebateLog', {
    replacements: { logTitle },
  });

  return (
    <button
      type="button"
      className={cn(styles.debateLogExpandBtn, className)}
      aria-expanded={isExpanded}
      aria-controls={DEBATE_LOG_PANEL_ID}
      aria-label={actionLabel}
      title={actionLabel}
      data-debate-log-toggle-panel
      onClick={() => {
        // `isExpanded` is the state *before* the toggle, so the event we emit names the
        // intended transition — matching how the per-round toggle reports itself.
        debateEventBus.emit(isExpanded ? 'debate_log:collapse' : 'debate_log:expand', {
          roundNumber,
        });
        toggleExpanded();
      }}
    >
      <span aria-hidden="true">{isExpanded ? '▶' : '◀'}</span>
    </button>
  );
};

export default DebateLogToggleButton;
