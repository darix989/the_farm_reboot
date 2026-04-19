import React from 'react';
import { MODERATOR_OPINION_LABEL, moderatorOpinionEmoji, scoreColor } from './trialHelpers';

export function ModeratorOpinionInline({ score }: { score: number }) {
  const emoji = moderatorOpinionEmoji(score);
  return (
    <span
      style={{ color: scoreColor(score) }}
      aria-label={`${score > 0 ? '+' : ''}${score}: ${MODERATOR_OPINION_LABEL}`}
    >
      <span aria-hidden="true">{emoji}</span> {MODERATOR_OPINION_LABEL}
    </span>
  );
}
