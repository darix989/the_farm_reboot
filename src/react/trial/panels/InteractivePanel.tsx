import React, { useEffect, useMemo, useState } from 'react';
import type { DebateScenarioJson } from '../../../types/debateEntities';
import type { useTrialRoundWorkflow } from '../../hooks/useTrialRoundWorkflow';
import {
  analysisTargetStatementId,
  type AnalysisTarget,
} from '../roundAnalysisModal/RoundAnalysisModal';
import type { FallacyGuessSession } from '../utils/fallacyGuessTypes';
import type { ResolvedMechanics } from '../utils/scenarioMechanics';
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
import { prefersReducedMotion } from '../../../utils/reducedMotion';
import {
  canRunTutorialTargetAction,
  notifyTutorialTargetAction,
} from '../../tutorial/tutorialInteractionGuard';
import styles from './TrialPanels.module.scss';
import getLabel from '../../../data/labels';

import magnifyingIcon from '../../../static/icons/magnifying.svg';
import backIcon from '../../../static/icons/back.svg';
import continueIcon from '../../../static/icons/continue.svg';
import confirmIcon from '../../../static/icons/confirm.svg';
import leaveIcon from '../../../static/icons/leave.svg';

const SUBMIT_ICON_SRC: Record<'continue' | 'confirm' | 'leave', string> = {
  continue: continueIcon,
  confirm: confirmIcon,
  leave: leaveIcon,
};

/** Per-kind title for the footer analyze button; falls back to `analyzeThisRound` when disabled. */
function analyzeTitleForTarget(target: AnalysisTarget | null): string {
  if (!target) return getLabel('analyzeThisRound');
  switch (target.kind) {
    case 'opponent_prompt':
      return getLabel('analyzeThisQuestion');
    case 'opponent_response':
      return getLabel('analyzeThisResponse');
    default:
      return getLabel('analyzeThisStatement');
  }
}

export interface InteractiveFooter {
  submitLabel: string;
  submitDisabled: boolean;
  submitIcon: 'continue' | 'confirm' | 'leave';
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
  /**
   * True while the wizard is still revealing the opponent's question. The options stay
   * mounted but invisible and unclickable, so the panel does not resize under the player
   * when they appear.
   */
  hideOptions?: boolean;
  onOpenAnalysis: (target: AnalysisTarget) => void;
  getNpcGuessState: (npcRoundId: string) => 'correct' | 'partial' | 'wrong' | null;
  /** Mode flags — gates whether the footer analyze button renders at all. */
  mechanics: ResolvedMechanics;
  /** The current round's line to analyze, or `null` when there is none (renders disabled). */
  analyzeTarget: AnalysisTarget | null;
}

// ---------------------------------------------------------------------------
// Choice button
// ---------------------------------------------------------------------------

function ChoiceButton({
  optionLetter,
  statementText,
  accessibilityStatement,
  onClick,
  disabled,
  selected,
  unlockHint,
  revealFlash,
  tutorialOptionId,
}: {
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
  tutorialOptionId?: string;
}) {
  const ariaLabel = getLabel('optionAriaLabel', {
    replacements: {
      optionLetter,
      statement: accessibilityStatement ?? statementText,
    },
  });
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
      data-tutorial-interactive-option-id={tutorialOptionId}
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
  hideOptions,
  onOpenAnalysis,
  getNpcGuessState,
  mechanics,
  analyzeTarget,
}) => {
  const analyzeTargetId = analyzeTarget ? analysisTargetStatementId(analyzeTarget) : null;
  const analyzeGuessState = analyzeTargetId ? getNpcGuessState(analyzeTargetId) : null;
  const analyzeTitle = analyzeTitleForTarget(analyzeTarget);
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
    const ms = prefersReducedMotion() ? 480 : 1020;
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
        <div
          className={styles.trialChoices}
          data-tutorial-panel="interactive"
          aria-hidden={hideOptions || undefined}
          style={hideOptions ? { visibility: 'hidden' } : undefined}
        >
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
                optionLetter={optionLetter}
                statementText={truncateStatementPreview(body)}
                accessibilityStatement={body}
                disabled={locked || hideOptions}
                selected={wf.selectedOption?.id === opt.id}
                unlockHint={awaitingReveal}
                revealFlash={revealFlash}
                tutorialOptionId={opt.id}
                onClick={() => {
                  const target = { kind: 'interactive_option', optionId: opt.id } as const;
                  if (!canRunTutorialTargetAction(target)) return;
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
                    notifyTutorialTargetAction(target);
                    return;
                  }
                  if (wf.selectedOption?.id === opt.id) {
                    wf.unselect();
                    notifyTutorialTargetAction(target);
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
                  notifyTutorialTargetAction(target);
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
        <h2 className={styles.trialPanelHeading}>{getLabel('interactive')}</h2>
      </div>

      <div className={styles.trialInteractiveScrollWrap}>
        <ScrollFadeContainer className={styles.trialScrollArea}>
          {renderContent()}
        </ScrollFadeContainer>

        <div className={styles.trialInteractiveFooter}>
          <div className={styles.trialInteractiveFooterActions}>
            {mechanics.analysisEnabled && (
              <TrialTextButton
                widthMode="square"
                className={cn(styles.trialFooterAnalyzeBtn, {
                  [styles.correct]: analyzeGuessState === 'correct',
                  [styles.partial]: analyzeGuessState === 'partial',
                  [styles.wrong]: analyzeGuessState === 'wrong',
                })}
                disabled={!analyzeTarget}
                aria-label={analyzeTitle}
                title={analyzeTitle}
                onClick={() => {
                  if (!analyzeTarget) return;
                  const target = { kind: 'interactive_action', action: 'analyze' } as const;
                  if (!canRunTutorialTargetAction(target)) return;
                  debateEventBus.emit('interactive:analyze', {
                    fromPhase: wf.gamePhase,
                    roundNumber: wf.currentRound?.roundNumber ?? null,
                    targetKind: analyzeTarget.kind,
                  });
                  onOpenAnalysis(analyzeTarget);
                  notifyTutorialTargetAction(target);
                }}
                data-tutorial-interactive-action="analyze"
              >
                <img src={magnifyingIcon} alt="" className={styles.trialFooterIcon} />
              </TrialTextButton>
            )}
            <TrialTextButton
              widthMode="square"
              disabled={
                wf.gamePhase === 'debate_intro' ||
                (wf.gamePhase === 'player_choosing' ? !wf.canUnselect : !wf.canUndo)
              }
              aria-label={getLabel('back')}
              title={getLabel('back')}
              onClick={() => {
                const target = { kind: 'interactive_action', action: 'back' } as const;
                if (!canRunTutorialTargetAction(target)) return;
                debateEventBus.emit('interactive:back', {
                  fromPhase: wf.gamePhase,
                  roundNumber: wf.currentRound?.roundNumber ?? null,
                });
                if (wf.gamePhase === 'player_choosing') {
                  wf.unselect();
                  notifyTutorialTargetAction(target);
                  return;
                }
                wf.undo();
                notifyTutorialTargetAction(target);
              }}
              data-tutorial-interactive-action="back"
            >
              <img src={backIcon} alt="" className={styles.trialFooterIcon} />
            </TrialTextButton>
            <TrialTextButton
              widthMode="square"
              disabled={interactiveFooter.submitDisabled || !interactiveFooter.onSubmit}
              aria-label={interactiveFooter.submitLabel}
              title={interactiveFooter.submitLabel}
              onClick={() => {
                const target = {
                  kind: 'interactive_action',
                  action: wf.gamePhase === 'player_confirming' ? 'confirm' : 'continue',
                } as const;
                if (!canRunTutorialTargetAction(target)) return;
                interactiveFooter.onSubmit?.();
                notifyTutorialTargetAction(target);
              }}
              data-tutorial-interactive-action={
                wf.gamePhase === 'player_confirming' ? 'confirm' : 'continue'
              }
            >
              <img
                src={SUBMIT_ICON_SRC[interactiveFooter.submitIcon]}
                alt=""
                className={styles.trialFooterIcon}
              />
            </TrialTextButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractivePanel;
