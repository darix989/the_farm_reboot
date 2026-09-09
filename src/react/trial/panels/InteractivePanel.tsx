import React, { useEffect, useMemo, useState } from 'react';
import type { DebateScenarioJson, PlayerOption } from '../../../types/debateEntities';
import type { useTrialRoundWorkflow } from '../../hooks/useTrialRoundWorkflow';
import {
  analysisTargetStatementId,
  type AnalysisTarget,
} from '../roundAnalysisModal/RoundAnalysisModal';
import type { FallacyGuessSession } from '../utils/fallacyGuessTypes';
import type { ResolvedMechanics } from '../utils/scenarioMechanics';
import TrialActionRow from '../components/TrialActionRow';
import TrialChoiceButton from '../components/TrialChoiceButton';
import { statementText, shuffleCopyDeterministic } from '../utils/trialHelpers';
import {
  isOptionGated,
  isPlayerOptionUnlocked,
  resolvedOptionSentences,
} from '../utils/optionUnlock';
import { useConditionContext } from '../../hooks/useGameConditions';
import { debateEventBus } from '../utils/debateEventBus';
import { prefersReducedMotion } from '../../../utils/reducedMotion';
import {
  canRunTutorialTargetAction,
  notifyTutorialTargetAction,
} from '../../tutorial/tutorialInteractionGuard';
import { useWindowKeyDown } from '../../hooks/useWindowKeyDown';
import { optionIndexForCode, shouldIgnoreActionShortcut } from '../utils/trialActionShortcuts';
import styles from './TrialPanels.module.scss';
import getLabel from '../../../data/labels';

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
  /**
   * `'reveal'` is the lesser, momentary step — pacing the wizard's typewriter forward a
   * sentence at a time — rendered dashed with a single chevron. The other three are the
   * real round/phase advance, rendered solid with their own icon.
   */
  submitIcon: 'reveal' | 'continue' | 'confirm' | 'leave';
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
  /** 1-2 line "what do I do now" guidance, shown under the panel title above the icons. */
  hint: string;
  /**
   * When false, footer and option shortcuts are off so an overlay (analysis, intro
   * summary) can own the keyboard.
   */
  shortcutsEnabled?: boolean;
}

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
  hint,
  shortcutsEnabled = true,
}) => {
  const analyzeTargetId = analyzeTarget ? analysisTargetStatementId(analyzeTarget) : null;
  const analyzeGuessState = analyzeTargetId ? getNpcGuessState(analyzeTargetId) : null;
  const analyzeTitle = analyzeTitleForTarget(analyzeTarget);
  // Subscribed, so an option gated on the wider game stops being locked the moment its last
  // requirement is met — including mid-round, when the requirement is spotting a fallacy here.
  const conditions = useConditionContext();
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

  const isChoiceDisabled = (opt: PlayerOption): boolean => {
    const gated = isOptionGated(opt);
    const conditionsMet = isPlayerOptionUnlocked(opt, fallacyGuesses, conditions);
    const locked = gated && !conditionsMet;
    return locked || !!hideOptions;
  };

  const activateChoice = (opt: PlayerOption) => {
    const playerRound = wf.currentPlayerRound;
    if (!playerRound) return;
    const gated = isOptionGated(opt);
    const conditionsMet = isPlayerOptionUnlocked(opt, fallacyGuesses, conditions);
    const target = { kind: 'interactive_option', optionId: opt.id } as const;
    if (!canRunTutorialTargetAction(target)) return;
    if (gated && conditionsMet && !revealedLockedOptionIds.has(opt.id)) {
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
    debateEventBus.emit('interactive:statement_selected', {
      roundNumber: playerRound.roundNumber,
      roundId: playerRound.id,
      optionId: opt.id,
    });
    wf.dispatch({ type: 'select_option', optionId: opt.id });
    notifyTutorialTargetAction(target);
  };

  useWindowKeyDown((event) => {
    if (shouldIgnoreActionShortcut(event)) return;
    const index = optionIndexForCode(event.code);
    if (index == null) return;
    if (wf.gamePhase !== 'player_choosing') return;
    const opt = choosingOptionsOrder?.[index];
    if (!opt || isChoiceDisabled(opt)) return;
    event.preventDefault();
    activateChoice(opt);
  }, shortcutsEnabled);

  const renderChoices = () => {
    /** Only the player-choice grid belongs here; intro / NPC / responses live elsewhere. */
    if (wf.gamePhase !== 'player_choosing') return null;

    const playerRound = wf.currentPlayerRound;
    if (!playerRound || !choosingOptionsOrder) return null;

    return (
      <div
        className={styles.trialChoices}
        data-tutorial-panel="interactive"
        aria-hidden={hideOptions || undefined}
        style={hideOptions ? { visibility: 'hidden' } : undefined}
      >
        {choosingOptionsOrder.map((opt, idx) => {
          const gated = isOptionGated(opt);
          const conditionsMet = isPlayerOptionUnlocked(opt, fallacyGuesses, conditions);
          const revealed = !gated || revealedLockedOptionIds.has(opt.id);
          const locked = gated && !conditionsMet;
          let body: string;
          if (locked) {
            body = statementText(resolvedOptionSentences(opt, false));
          } else if (gated && conditionsMet && !revealed) {
            body = getLabel('clickToUnlock');
          } else {
            body = statementText(resolvedOptionSentences(opt, true));
          }
          const awaitingReveal = gated && conditionsMet && !revealed;
          const revealFlash = revealed && revealAnimOptionId === opt.id && gated;
          const optionLetter = String.fromCharCode(65 + idx);
          return (
            <TrialChoiceButton
              key={opt.id}
              content={optionLetter}
              ariaLabel={getLabel('optionAriaLabel', {
                replacements: { optionLetter, statement: body },
              })}
              disabled={locked || hideOptions}
              selected={wf.selectedOption?.id === opt.id}
              unlockHint={awaitingReveal}
              revealFlash={revealFlash}
              tutorialOptionId={opt.id}
              onClick={() => activateChoice(opt)}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className={styles.trialInteractiveBody}>
      <div className={styles.trialAreaTitle}>
        <h2 className={styles.trialPanelHeading}>{getLabel('interactive')}</h2>
      </div>
      <p className={styles.trialActionsHint}>{hint}</p>

      <div className={styles.trialActionsCenter}>
        <TrialActionRow
          analyze={
            mechanics.analysisEnabled
              ? {
                  disabled: !analyzeTarget,
                  label: analyzeTitle,
                  guessState: analyzeGuessState,
                  onClick: () => {
                    if (!analyzeTarget) return;
                    debateEventBus.emit('interactive:analyze', {
                      fromPhase: wf.gamePhase,
                      roundNumber: wf.currentRound?.roundNumber ?? null,
                      targetKind: analyzeTarget.kind,
                    });
                    onOpenAnalysis(analyzeTarget);
                  },
                }
              : null
          }
          back={{
            disabled:
              wf.gamePhase === 'debate_intro' ||
              (wf.gamePhase === 'player_choosing' ? !wf.canUnselect : !wf.canUndo),
            label: getLabel('back'),
            onClick: () => {
              debateEventBus.emit('interactive:back', {
                fromPhase: wf.gamePhase,
                roundNumber: wf.currentRound?.roundNumber ?? null,
              });
              if (wf.gamePhase === 'player_choosing') {
                wf.unselect();
                return;
              }
              wf.undo();
            },
          }}
          submit={{
            disabled: interactiveFooter.submitDisabled || !interactiveFooter.onSubmit,
            label: interactiveFooter.submitLabel,
            icon: interactiveFooter.submitIcon,
            onClick: () => {
              interactiveFooter.onSubmit?.();
            },
          }}
          submitTutorialAction={wf.gamePhase === 'player_confirming' ? 'confirm' : 'continue'}
          shortcutsEnabled={shortcutsEnabled}
        />
        {renderChoices()}
      </div>
    </div>
  );
};

export default InteractivePanel;
