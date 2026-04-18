import React, { useEffect, useMemo, useState } from 'react';
import type { DebateScenarioJson } from '../../../types/debateEntities';
import type { useTrialRoundWorkflow } from '../../hooks/useTrialRoundWorkflow';
import type { AnalysisTarget } from '../roundAnalysisModal/RoundAnalysisModal';
import type { FallacyGuessSession } from '../utils/fallacyGuessTypes';
import ScrollFadeContainer from '../components/ScrollFadeContainer';
import cn from 'classnames';
import { statementText, shuffleCopyDeterministic } from '../utils/trialHelpers';
import { isPlayerOptionUnlocked, resolvedOptionSentences } from '../utils/optionUnlock';
import styles from './TrialPanels.module.scss';
import shared from '../trialShared.module.scss';

interface InteractiveFooter {
  submitLabel: string;
  submitDisabled: boolean;
  onSubmit?: () => void;
}

interface InteractivePanelProps {
  wf: ReturnType<typeof useTrialRoundWorkflow>;
  /** Passed by `TrialUI`; not used — reading content lives in wizard / debate log. */
  debate: DebateScenarioJson;
  fallacyGuesses: Map<number, FallacyGuessSession>;
  revealedLockedOptionIds: Set<string>;
  onRevealLockedOption: (optionId: string) => void;
  interactiveFooter: InteractiveFooter;
  /** Passed by `TrialUI`; not used in this panel. */
  onOpenAnalysis: (target: AnalysisTarget) => void;
  /** Passed by `TrialUI`; not used in this panel. */
  getNpcGuessState: (npcRoundId: string) => 'correct' | 'partial' | 'wrong' | null;
}

// ---------------------------------------------------------------------------
// Choice button
// ---------------------------------------------------------------------------

function ChoiceButton({
  optionLetter,
  statementText,
  onClick,
  disabled,
  selected,
  unlockHint,
  revealFlash,
}: {
  optionLetter: string;
  statementText: string;
  onClick: () => void;
  disabled?: boolean;
  selected?: boolean;
  /** Unlocked statement not yet revealed — periodic nudge to click */
  unlockHint?: boolean;
  /** One-time emphasis after revealing an unlock-gated statement */
  revealFlash?: boolean;
}) {
  const ariaLabel = `Option ${optionLetter}: ${statementText}`;
  return (
    <button
      type="button"
      className={cn(
        styles.trialChoiceBtn,
        selected && styles.trialChoiceBtnSelected,
        unlockHint && styles.trialChoiceBtnUnlockHint,
        revealFlash && styles.trialChoiceBtnRevealFlash,
      )}
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
    >
      <span className={styles.trialChoiceBtnRow}>
        <span className={styles.trialChoiceLetter} aria-hidden>
          {optionLetter}
        </span>
        <span className={styles.trialChoiceStatement}>{statementText}</span>
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

const InteractivePanel: React.FC<InteractivePanelProps> = ({
  wf,
  debate: _debate,
  fallacyGuesses,
  revealedLockedOptionIds,
  onRevealLockedOption,
  interactiveFooter,
  onOpenAnalysis: _onOpenAnalysis,
  getNpcGuessState: _getNpcGuessState,
}) => {
  const [playthroughShuffleKey] = useState(() =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  const choosingOptionsOrder = useMemo(() => {
    if (wf.gamePhase !== 'player_choosing' || !wf.currentPlayerRound) return null;
    return shuffleCopyDeterministic(
      wf.currentPlayerRound.options,
      playthroughShuffleKey,
      wf.currentPlayerRound.id,
    );
  }, [wf.gamePhase, wf.currentPlayerRound, playthroughShuffleKey]);

  const [revealAnimOptionId, setRevealAnimOptionId] = useState<string | null>(null);

  useEffect(() => {
    if (!revealAnimOptionId) return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ms = reduced ? 480 : 1020;
    const t = window.setTimeout(() => setRevealAnimOptionId(null), ms);
    return () => window.clearTimeout(t);
  }, [revealAnimOptionId]);

  const renderContent = () => {
    /** Only the player-choice grid belongs here; intro / NPC / responses live elsewhere. */
    if (wf.gamePhase !== 'player_choosing') return null;

    const playerRound = wf.currentPlayerRound;
    if (!playerRound || !choosingOptionsOrder) return null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className={styles.trialChoices}>
          {choosingOptionsOrder.map((opt, idx) => {
            const guessUnlocked = isPlayerOptionUnlocked(opt, fallacyGuesses);
            const revealed = !opt.unlockCondition || revealedLockedOptionIds.has(opt.id);
            const locked = !!opt.unlockCondition && !guessUnlocked;
            let body: string;
            if (locked) {
              body = statementText(resolvedOptionSentences(opt, false));
            } else if (opt.unlockCondition && guessUnlocked && !revealed) {
              body = 'Click to unlock';
            } else {
              body = statementText(resolvedOptionSentences(opt, true));
            }
            const awaitingReveal = !!opt.unlockCondition && guessUnlocked && !revealed;
            const revealFlash = revealed && revealAnimOptionId === opt.id && !!opt.unlockCondition;
            const optionLetter = String.fromCharCode(65 + idx);
            return (
              <ChoiceButton
                key={opt.id}
                optionLetter={optionLetter}
                statementText={body}
                disabled={locked}
                selected={wf.selectedOption?.id === opt.id}
                unlockHint={awaitingReveal}
                revealFlash={revealFlash}
                onClick={() => {
                  if (
                    opt.unlockCondition &&
                    guessUnlocked &&
                    !revealedLockedOptionIds.has(opt.id)
                  ) {
                    setRevealAnimOptionId(opt.id);
                    onRevealLockedOption(opt.id);
                    return;
                  }
                  wf.dispatch({ type: 'select_option', optionId: opt.id });
                }}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.trialInteractiveBody}>
      <div className={styles.trialAreaTitle}>
        <h2 className={styles.trialPanelHeading}>Interactive</h2>
      </div>

      <div className={styles.trialInteractiveScrollWrap}>
        <ScrollFadeContainer className={styles.trialScrollArea}>
          {renderContent()}
        </ScrollFadeContainer>

        <div className={styles.trialInteractiveFooter}>
          <div className={styles.trialFooterGrid}>
            <button
              type="button"
              className={shared.trialFooterBtn}
              disabled={
                wf.gamePhase === 'debate_intro' ||
                (wf.gamePhase === 'player_choosing' ? !wf.canUnselect : !wf.canUndo)
              }
              onClick={() => {
                if (wf.gamePhase === 'player_choosing') {
                  wf.unselect();
                  return;
                }
                wf.undo();
              }}
            >
              Back
            </button>
            <button
              type="button"
              className={shared.trialFooterBtn}
              disabled={interactiveFooter.submitDisabled || !interactiveFooter.onSubmit}
              onClick={() => interactiveFooter.onSubmit?.()}
            >
              {interactiveFooter.submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractivePanel;
