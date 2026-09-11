import cn from 'classnames';
import inspectIcon from '../../../static/icons/inspect.svg';
import getLabel from '../../../data/labels';
import { MODERATOR_OPINION_LABEL } from './trialHelpers';
import ModeratorStatusFace from '../components/ModeratorStatusFace';
import shared from '../trialShared.module.scss';

export function ModeratorOpinionInline({
  score,
  insightPoints,
  className,
  showOpinion = true,
}: {
  score: number;
  /** When set (e.g. debate log header), shows inspect icon and balance to the left of the moderator's face. */
  insightPoints?: number;
  className?: string;
  /** `false` hides the moderator's face (scenarios with no moderator). Defaults to `true`. */
  showOpinion?: boolean;
}) {
  // Nothing left to render once both halves are suppressed — a speaking-only rung has
  // neither an Insight economy nor a moderator.
  if (!showOpinion && insightPoints === undefined) return null;

  const scoreBit = `${score > 0 ? '+' : ''}${score}`;
  const opinionAria = showOpinion ? `${MODERATOR_OPINION_LABEL}: ${scoreBit}` : '';
  const insightAria =
    insightPoints !== undefined
      ? getLabel('insightPointsRecapCompact', { replacements: { count: insightPoints } })
      : '';
  const ariaLabel = [insightAria, opinionAria].filter(Boolean).join(', ');

  return (
    <span className={cn(shared.moderatorOpinionInline, className)} aria-label={ariaLabel}>
      {insightPoints !== undefined && (
        <>
          <span className={shared.moderatorOpinionInsights} aria-hidden="true">
            <img src={inspectIcon} alt="" className={shared.moderatorOpinionInsightsIcon} />
            <span className={shared.moderatorOpinionInsightsCount}>{insightPoints}</span>
          </span>
          {showOpinion && (
            <span className={shared.moderatorOpinionSeparator} aria-hidden="true">
              |
            </span>
          )}
        </>
      )}
      {showOpinion && <ModeratorStatusFace score={score} />}
    </span>
  );
}
