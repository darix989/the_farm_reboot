import React, { useMemo } from 'react';
import type { DebateScenarioJson } from '../../../types/debateEntities';
import ScrollFadeContainer from '../components/ScrollFadeContainer';
import TrialTextButton from '../components/TrialTextButton';
import { sideDisplayLabel } from '../utils/trialHelpers';
import {
  canRunTutorialTargetAction,
  notifyTutorialTargetAction,
} from '../../tutorial/tutorialInteractionGuard';
import shared from '../trialShared.module.scss';
import cn from 'classnames';
import recapStyles from '../roundRecapModal/RoundRecapModal.module.scss';
import getLabel from '../../../data/labels';

const INTRO_SUMMARY_MAX_CHARS = 320;

function summarizeIntroduction(text: string, maxLen: number): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  const slice = t.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace > maxLen * 0.5 ? slice.slice(0, lastSpace) : slice;
  return `${cut.trim()}…`;
}

interface IntroSummaryModalProps {
  debate: DebateScenarioJson;
  onClose: () => void;
}

const IntroSummaryModal: React.FC<IntroSummaryModalProps> = ({ debate, onClose }) => {
  const introSummary = useMemo(
    () => summarizeIntroduction(debate.introduction ?? '', INTRO_SUMMARY_MAX_CHARS),
    [debate.introduction],
  );

  const sideLabel = sideDisplayLabel(debate.playerSide);
  const closeTarget = { kind: 'intro_summary_action', action: 'close' } as const;
  const beginRoundTarget = { kind: 'intro_summary_action', action: 'begin_round_1' } as const;

  return (
    <div
      className={recapStyles.recapOverlay}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        if (!canRunTutorialTargetAction(closeTarget)) return;
        onClose();
        notifyTutorialTargetAction(closeTarget);
      }}
    >
      <div
        className={cn(shared.trialModalFontScope, recapStyles.recapBox)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="intro-summary-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={recapStyles.recapHeader}>
          <div>
            <h2 id="intro-summary-title" className={recapStyles.recapTitle}>
              {getLabel('beforeTheDebate')}
            </h2>
            <p className={recapStyles.recapSubtitle}>{getLabel('introductionSummary')}</p>
          </div>
          <button
            type="button"
            className={recapStyles.recapCloseBtn}
            onClick={() => {
              if (!canRunTutorialTargetAction(closeTarget)) return;
              onClose();
              notifyTutorialTargetAction(closeTarget);
            }}
            aria-label={getLabel('close')}
            data-tutorial-intro-summary-action="close"
          >
            ✕
          </button>
        </div>

        <ScrollFadeContainer isModal className={recapStyles.recapContent}>
          <div className={recapStyles.recapSection}>
            <p className={recapStyles.recapSectionLabel}>{getLabel('yourSide')}</p>
            <p className={recapStyles.recapBody}>
              {getLabel('youWillArgueAsThe')} <strong>{sideLabel}</strong>{' '}
              {getLabel('debateSideNoun')}
            </p>
          </div>
          <div className={recapStyles.recapSection}>
            <p className={recapStyles.recapSectionLabel}>{getLabel('introduction')}</p>
            <p className={recapStyles.recapBody}>{introSummary}</p>
          </div>
        </ScrollFadeContainer>

        <div className={recapStyles.recapFooter}>
          <TrialTextButton
            onClick={() => {
              if (!canRunTutorialTargetAction(beginRoundTarget)) return;
              onClose();
              notifyTutorialTargetAction(beginRoundTarget);
            }}
            data-tutorial-intro-summary-action="begin_round_1"
          >
            {getLabel('beginRound1')}
          </TrialTextButton>
        </div>
      </div>
    </div>
  );
};

export default IntroSummaryModal;
