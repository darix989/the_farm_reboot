import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  optionLockHint,
  optionLockNeedsAnalyzePulse,
  optionLockPhase,
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
  const [lockFeedback, setLockFeedback] = useState<{ optionId: string; hint: string } | null>(null);
  const [denyShake, setDenyShake] = useState<{ optionId: string; token: number } | null>(null);
  const [becameReadyOptionId, setBecameReadyOptionId] = useState<string | null>(null);
  const [analyzePulse, setAnalyzePulse] = useState(false);
  const prevUnlockedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setLockFeedback(null);
    setDenyShake(null);
    setBecameReadyOptionId(null);
    setAnalyzePulse(false);
    prevUnlockedIdsRef.current = new Set();
  }, [wf.currentPlayerRound?.id]);

  useEffect(() => {
    if (!revealAnimOptionId) return;
    const ms = prefersReducedMotion() ? 480 : 1020;
    const t = window.setTimeout(() => setRevealAnimOptionId(null), ms);
    return () => window.clearTimeout(t);
  }, [revealAnimOptionId]);

  useEffect(() => {
    if (!denyShake) return;
    const t = window.setTimeout(() => setDenyShake(null), 420);
    return () => window.clearTimeout(t);
  }, [denyShake]);

  useEffect(() => {
    if (!becameReadyOptionId) return;
    const t = window.setTimeout(() => setBecameReadyOptionId(null), 700);
    return () => window.clearTimeout(t);
  }, [becameReadyOptionId]);

  useEffect(() => {
    if (!analyzePulse) return;
    const t = window.setTimeout(() => setAnalyzePulse(false), 1100);
    return () => window.clearTimeout(t);
  }, [analyzePulse]);

  useEffect(() => {
    if (!choosingOptionsOrder) return;
    const next = new Set<string>();
    let newlyReadyId: string | null = null;
    for (const opt of choosingOptionsOrder) {
      if (!isOptionGated(opt)) continue;
      const unlocked = isPlayerOptionUnlocked(opt, fallacyGuesses, conditions);
      if (unlocked) next.add(opt.id);
      if (
        unlocked &&
        !prevUnlockedIdsRef.current.has(opt.id) &&
        !revealedLockedOptionIds.has(opt.id)
      ) {
        newlyReadyId = opt.id;
      }
    }
    prevUnlockedIdsRef.current = next;
    if (!newlyReadyId) return;
    setBecameReadyOptionId(newlyReadyId);
    setLockFeedback((prev) => {
      if (!prev || prev.optionId !== newlyReadyId) return prev;
      const opt = choosingOptionsOrder.find((o) => o.id === newlyReadyId);
      if (!opt) return prev;
      const hint = optionLockHint(opt, 'ready', fallacyGuesses, conditions);
      return hint ? { optionId: newlyReadyId, hint } : prev;
    });
  }, [choosingOptionsOrder, fallacyGuesses, conditions, revealedLockedOptionIds]);

  const activateChoice = (opt: PlayerOption) => {
    const playerRound = wf.currentPlayerRound;
    if (!playerRound) return;
    const revealed = revealedLockedOptionIds.has(opt.id);
    const phase = optionLockPhase(opt, fallacyGuesses, revealed, conditions);
    const target = { kind: 'interactive_option', optionId: opt.id } as const;
    if (!canRunTutorialTargetAction(target)) return;

    if (phase === 'shut') {
      const why = optionLockHint(opt, phase, fallacyGuesses, conditions);
      if (why) setLockFeedback({ optionId: opt.id, hint: why });
      setDenyShake(null);
      requestAnimationFrame(() => {
        setDenyShake({ optionId: opt.id, token: Date.now() });
      });
      if (optionLockNeedsAnalyzePulse(opt, phase, conditions) && analyzeTarget) {
        setAnalyzePulse(false);
        requestAnimationFrame(() => setAnalyzePulse(true));
      }
      return;
    }

    if (phase === 'ready') {
      setBecameReadyOptionId(null);
      setRevealAnimOptionId(opt.id);
      debateEventBus.emit('interactive:statement_unlocked', {
        roundNumber: playerRound.roundNumber,
        roundId: playerRound.id,
        optionId: opt.id,
      });
      onRevealLockedOption(opt.id);
      setLockFeedback({
        optionId: opt.id,
        hint: getLabel('workflowStatementOpened'),
      });
      notifyTutorialTargetAction(target);
      return;
    }

    if (wf.selectedOption?.id === opt.id) {
      wf.unselect();
      if (phase === 'opened') {
        setLockFeedback({
          optionId: opt.id,
          hint: getLabel('workflowStatementOpened'),
        });
      } else {
        setLockFeedback(null);
      }
      notifyTutorialTargetAction(target);
      return;
    }

    setLockFeedback(null);
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
    if (!opt || hideOptions) return;
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
          const revealed = revealedLockedOptionIds.has(opt.id);
          const phase = optionLockPhase(opt, fallacyGuesses, revealed, conditions);
          let body: string;
          if (phase === 'shut') {
            body = statementText(resolvedOptionSentences(opt, false));
          } else if (phase === 'ready') {
            body = getLabel('optionReadyToOpen');
          } else {
            body = statementText(resolvedOptionSentences(opt, true));
          }
          const lockState = phase === 'shut' || phase === 'ready' ? phase : undefined;
          const revealFlash = phase === 'opened' && revealAnimOptionId === opt.id;
          const optionLetter = String.fromCharCode(65 + idx);
          return (
            <TrialChoiceButton
              key={opt.id}
              content={optionLetter}
              ariaLabel={getLabel('optionAriaLabel', {
                replacements: { optionLetter, statement: body },
              })}
              disabled={!!hideOptions}
              selected={wf.selectedOption?.id === opt.id}
              lockState={lockState}
              denyShake={denyShake?.optionId === opt.id}
              becameReady={phase === 'ready' && becameReadyOptionId === opt.id}
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
      <p className={styles.trialActionsHint}>{lockFeedback?.hint ?? hint}</p>

      <div className={styles.trialActionsCenter}>
        <TrialActionRow
          analyze={
            mechanics.analysisEnabled
              ? {
                  disabled: !analyzeTarget,
                  label: analyzeTitle,
                  guessState: analyzeGuessState,
                  attentionPulse: analyzePulse,
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
              wf.gamePhase === 'moderator_speaking' ||
              (wf.gamePhase === 'player_choosing' ? !wf.canUnselect : !wf.canUndo),
            label: getLabel('back'),
            onClick: () => {
              debateEventBus.emit('interactive:back', {
                fromPhase: wf.gamePhase,
                roundNumber: wf.currentRound?.roundNumber ?? null,
              });
              if (wf.gamePhase === 'player_choosing') {
                const selected = wf.selectedOption;
                wf.unselect();
                if (selected) {
                  const revealed = revealedLockedOptionIds.has(selected.id);
                  const phase = optionLockPhase(selected, fallacyGuesses, revealed, conditions);
                  if (phase === 'opened') {
                    setLockFeedback({
                      optionId: selected.id,
                      hint: getLabel('workflowStatementOpened'),
                    });
                  } else {
                    setLockFeedback(null);
                  }
                }
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
