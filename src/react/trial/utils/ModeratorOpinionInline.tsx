import React from 'react';
import cn from 'classnames';
import inspectIcon from '../../../static/icons/inspect.svg';
import getLabel from '../../../data/labels';
import { MODERATOR_OPINION_LABEL, moderatorOpinionEmoji } from './trialHelpers';
import shared from '../trialShared.module.scss';

export function ModeratorOpinionInline({
  score,
  insightPoints,
  className,
}: {
  score: number;
  /** When set (e.g. debate log header), shows inspect icon and balance to the left of the opinion emoji. */
  insightPoints?: number;
  className?: string;
}) {
  const emoji = moderatorOpinionEmoji(score);
  const scoreBit = `${score > 0 ? '+' : ''}${score}`;
  const opinionAria = `${MODERATOR_OPINION_LABEL}: ${scoreBit}`;
  const ariaLabel =
    insightPoints !== undefined
      ? `${getLabel('insightPointsRecapCompact', { replacements: { count: insightPoints } })}, ${opinionAria}`
      : opinionAria;

  return (
    <span className={cn(shared.moderatorOpinionInline, className)} aria-label={ariaLabel}>
      {insightPoints !== undefined && (
        <>
          <span className={shared.moderatorOpinionInsights} aria-hidden="true">
            <img src={inspectIcon} alt="" className={shared.moderatorOpinionInsightsIcon} />
            <span className={shared.moderatorOpinionInsightsCount}>{insightPoints}</span>
          </span>
          <span className={shared.moderatorOpinionSeparator} aria-hidden="true">
            |
          </span>
        </>
      )}
      <span aria-hidden="true">{emoji}</span>
    </span>
  );
}
