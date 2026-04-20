import React from 'react';
import cn from 'classnames';
import ModeratorOpinionGauge, {
  type ModeratorOpinionGaugeVariant,
} from '../components/ModeratorOpinionGauge';
import { MODERATOR_OPINION_LABEL, moderatorOpinionEmoji } from './trialHelpers';
import shared from '../trialShared.module.scss';

export function ModeratorOpinionInline({
  score,
  min,
  max,
  variant = 'default',
  className,
}: {
  score: number;
  min: number;
  max: number;
  variant?: ModeratorOpinionGaugeVariant;
  className?: string;
}) {
  const emoji = moderatorOpinionEmoji(score);
  const scoreBit = `${score > 0 ? '+' : ''}${score}`;
  const ariaLabel = `${MODERATOR_OPINION_LABEL}: ${scoreBit}`;

  return (
    <span className={cn(shared.moderatorOpinionInline, className)}>
      <span aria-hidden="true">{emoji}</span>
      <ModeratorOpinionGauge
        value={score}
        min={min}
        max={max}
        variant={variant}
        ariaLabel={ariaLabel}
      />
    </span>
  );
}
