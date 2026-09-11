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

/** Material fullscreen: arrows out. Shown on the collapsed recap chip. */
const ICON_MAXIMIZE =
  'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z';

/** Material fullscreen: arrows in. Shown on the expanded panel header. */
const ICON_MINIMIZE =
  'M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z';

/**
 * Collapses / expands the Debate Log as a whole. Rendered twice — in the collapsed recap chip
 * (as the only way back in) and in the expanded panel's title strip — from one component, so
 * the two can never disagree about glyph, copy or bus payload.
 *
 * Reuses `.debateLogExpandBtn` (same chrome as the per-round toggles) but a maximize /
 * minimize SVG so the two controls do not share a chevron.
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
      <svg viewBox="0 0 24 24" aria-hidden>
        <path fill="currentColor" d={isExpanded ? ICON_MINIMIZE : ICON_MAXIMIZE} />
      </svg>
    </button>
  );
};

export default DebateLogToggleButton;
