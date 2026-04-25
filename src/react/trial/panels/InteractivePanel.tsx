import React, { useEffect, useMemo, useState } from 'react';
import type { DebateScenarioJson } from '../../../types/debateEntities';
import type { useTrialRoundWorkflow } from '../../hooks/useTrialRoundWorkflow';
import type { AnalysisTarget } from '../roundAnalysisModal/RoundAnalysisModal';
import type { FallacyGuessSession } from '../utils/fallacyGuessTypes';
import ScrollFadeContainer from '../components/ScrollFadeContainer';
import TrialTextButton from '../components/TrialTextButton';
import cn from 'classnames';
import {
  statementText,
  shuffleCopyDeterministic,
  truncateStatementPreview,
} from '../utils/trialHelpers';
import { isPlayerOptionUnlocked, resolvedOptionSentences } from '../utils/optionUnlock';
import { debateEventBus } from '../utils/debateEventBus';
import styles from './TrialPanels.module.scss';
import getLabel from '../../../data/labels';
import { useTutorialHighlight, useTutorialTarget } from '../../tutorial/tutorialTarget';

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
  optionId,
  optionLetter,
  statementText,
  accessibilityStatement,
  onClick,
  disabled,
  selected,
  unlockHint,
  revealFlash,
}: {
  /** Stable id of the option this button represents — drives tutorial targeting. */
  optionId: string;
  optionLetter: string;
  /** Truncated label shown in the button */
  statementText: string;
  /** Full statement for screen readers (defaults to `statementText`) */
  accessibilityStatement?: string;
  onClick: () => void;
  disabled?: boolean;
  selected?: boolean;
  /** Unlocked statement not yet revealed — periodic nudge to click */
  unlockHint?: boolean;
  /** One-time emphasis after revealing an unlock-gated statement */
  revealFlash?: boolean;
}) {
  const ariaLabel = getLabel('optionAriaLabel', {
    replacements: {
      optionLetter,
      statement: accessibilityStatement ?? statementText,
    },
  });
  const tutorial = useTutorialTarget({ kind: 'interactive:option', optionId });
  return (
    <button
      type="button"
      className={cn(
        styles.trialChoiceBtn,
        selected && styles.trialChoiceBtnSelected,
        unlockHint && styles.trialChoiceBtnUnlockHint,
        revealFlash && styles.trialChoiceBtnRevealFlash,
        tutorial.highlightClass,
      )}
      aria-label={ariaLabel}
      onClick={() => {
        // Tutorial guard: while a tutorial step is active and this option is
        // not its target, ignore the click entirely. The user is meant to
        // interact with the highlighted target (or use the dialog buttons).
        if (tutorial.isBlocked) return;
        onClick();
      }}
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
    if (wf.currentPlayerRound.preventOptionsShuffle) {
      return [...wf.currentPlayerRound.options];
    }
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

  // Container highlights for tutorial steps anchored to whole panel regions.
  const panelHighlight = useTutorialHighlight({ kind: 'panel:interactive' });
  const optionsHighlight = useTutorialHighlight({ kind: 'panel:interactive_options' });

  const renderContent = () => {
    /** Only the player-choice grid belongs here; intro / NPC / responses live elsewhere. */
    if (wf.gamePhase !== 'player_choosing') return null;

    const playerRound = wf.currentPlayerRound;
    if (!playerRound || !choosingOptionsOrder) return null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className={cn(styles.trialChoices, optionsHighlight.highlightClass)}>
          {choosingOptionsOrder.map((opt, idx) => {
            const guessUnlocked = isPlayerOptionUnlocked(opt, fallacyGuesses);
            const revealed = !opt.unlockCondition || revealedLockedOptionIds.has(opt.id);
            const locked = !!opt.unlockCondition && !guessUnlocked;
            let body: string;
            if (locked) {
              body = statementText(resolvedOptionSentences(opt, false));
            } else if (opt.unlockCondition && guessUnlocked && !revealed) {
              body = getLabel('clickToUnlock');
            } else {
              body = statementText(resolvedOptionSentences(opt, true));
            }
            const awaitingReveal = !!opt.unlockCondition && guessUnlocked && !revealed;
            const revealFlash = revealed && revealAnimOptionId === opt.id && !!opt.unlockCondition;
            const optionLetter = String.fromCharCode(65 + idx);
            return (
              <ChoiceButton
                key={opt.id}
                optionId={opt.id}
                optionLetter={optionLetter}
                statementText={truncateStatementPreview(body)}
                accessibilityStatement={body}
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
                    debateEventBus.emit('interactive:statement_unlocked', {
                      roundNumber: playerRound.roundNumber,
                      roundId: playerRound.id,
                      optionId: opt.id,
                    });
                    onRevealLockedOption(opt.id);
                    return;
                  }
                  if (wf.selectedOption?.id === opt.id) {
                    wf.unselect();
                    return;
                  }
                  if (playerRound) {
                    debateEventBus.emit('interactive:statement_selected', {
                      roundNumber: playerRound.roundNumber,
                      roundId: playerRound.id,
                      optionId: opt.id,
                    });
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

  // Tutorial guards for the interactive footer's two singleton buttons.
  const backTutorial = useTutorialTarget({ kind: 'interactive:back' });
  const submitTutorial = useTutorialTarget({ kind: 'interactive:submit' });

  return (
    <div className={cn(styles.trialInteractiveBody, panelHighlight.highlightClass)}>
      <div className={styles.trialAreaTitle}>
        <h2 className={styles.trialPanelHeading}>{getLabel('interactive')}</h2>
      </div>

      <div className={styles.trialInteractiveScrollWrap}>
        <ScrollFadeContainer className={styles.trialScrollArea}>
          {renderContent()}
        </ScrollFadeContainer>

        <div className={styles.trialInteractiveFooter}>
          <div className={styles.trialFooterGrid}>
            <TrialTextButton
              className={backTutorial.highlightClass}
              disabled={
                wf.gamePhase === 'debate_intro' ||
                (wf.gamePhase === 'player_choosing' ? !wf.canUnselect : !wf.canUndo)
              }
              onClick={() => {
                if (backTutorial.isBlocked) return;
                debateEventBus.emit('interactive:back', {
                  fromPhase: wf.gamePhase,
                  roundNumber: wf.currentRound?.roundNumber ?? null,
                });
                if (wf.gamePhase === 'player_choosing') {
                  wf.unselect();
                  return;
                }
                wf.undo();
              }}
            >
              {getLabel('back')}
            </TrialTextButton>
            <TrialTextButton
              className={submitTutorial.highlightClass}
              disabled={interactiveFooter.submitDisabled || !interactiveFooter.onSubmit}
              onClick={() => {
                if (submitTutorial.isBlocked) return;
                interactiveFooter.onSubmit?.();
              }}
            >
              {interactiveFooter.submitLabel}
            </TrialTextButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractivePanel;
