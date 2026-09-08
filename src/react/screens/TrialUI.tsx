import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTutorialStore } from '../../store/tutorialStore';
import { useDebateLogStore } from '../../store/debateLogStore';
import type { DebateScenarioJson, LogicalFallacy, Sentence } from '../../types/debateEntities';
import { ALL_LOGICAL_FALLACIES, isCatalogedFallacyId } from '../../data/fallacyCatalog';
import TrialLayout from '../trial/TrialLayout';
import { useTrialRoundWorkflow } from '../hooks/useTrialRoundWorkflow';
import { useWizardReveal, type WizardRevealSource } from '../hooks/useWizardReveal';
import RoundAnalysisModal, {
  HELP_INSIGHT_COST,
  analysisTargetStatementId,
  type AnalysisTarget,
} from '../trial/roundAnalysisModal/RoundAnalysisModal';
import type {
  FallacyGuessSession,
  GuessPayload,
  GuessRecord,
} from '../trial/utils/fallacyGuessTypes';
import {
  computeMissedPairs,
  correctIntersectionMultiset,
  guessMultisetFromPicks,
  hasCorrectPairOverlap,
  isSessionTerminal,
  multisetToPairList,
  multisetsEqual,
  truthMultisetFromSentences,
  guessStateFromAttempts,
  spottedFallacies,
} from '../trial/utils/fallacyGuessUtils';
import FeedbackPanel from '../trial/panels/FeedbackPanel';
import WizardPanel, {
  type WizardPanelDetail,
  type WizardPanelReveal,
} from '../trial/panels/WizardPanel';
import InteractivePanel, { type InteractiveFooter } from '../trial/panels/InteractivePanel';
import RoundRecapModal from '../trial/roundRecapModal/RoundRecapModal';
import IntroSummaryModal from '../trial/introSummaryModal/IntroSummaryModal';
import FallacyInfoModal from '../trial/fallacyInfoModal/FallacyInfoModal';
import {
  activeEmotionForWorkflow,
  activeRoundNumber,
  activeSpeakerIdForWorkflow,
  emotionForOption,
  emotionFromStatement,
  getSpeakerName,
  getStartingInsightPoints,
  moderatorOpinionPlainText,
  splitIntoSentences,
  statementText,
} from '../trial/utils/trialHelpers';
import { debateParticipantIds, stageOrder } from '../../data/debateCast';
import {
  isOptionGated,
  isPlayerOptionUnlocked,
  resolvedOptionSentences,
} from '../trial/utils/optionUnlock';
import { useConditionContext } from '../hooks/useGameConditions';
import { encounterLabels, resolveMechanics } from '../trial/utils/scenarioMechanics';
import { debateEventBus, type AnalysisTargetKind } from '../trial/utils/debateEventBus';
import { useScenarioTutorials } from '../hooks/useScenarioTutorials';
import CharacterStage from '../farm/CharacterStage';
import DebateLogRecapChip from '../trial/components/DebateLogRecapChip';
import getLabel from '../../data/labels';
import { useGameStore } from '../../store/gameStore';
import { useCodexStore } from '../../store/codexStore';
import { useTrialStageStore } from '../../store/trialStageStore';
import { PLAYER_CHARACTER_ID, resolveCharacter } from '../../data/characters';
import { GameManager } from '../../utils/gameManager';
import { applyEncounterRewards } from '../../utils/encounterRewards';

interface TrialUIProps {
  debate: DebateScenarioJson;
}

/**
 * A wizard reveal source plus the id the analysis modal reports for the same line, so
 * `TrialUI` can tell when the player has opened analysis on the line being revealed.
 */
type RevealSource = WizardRevealSource & { analysisTargetId: string | null };

/** Map key for `fallacyGuesses`: the player round that owns this analysis target, not the workflow's current round. */
function guessStorageRoundNumberForTarget(target: AnalysisTarget): number {
  if (target.kind === 'npc' || target.kind === 'player') return target.round.roundNumber;
  return target.playerRound.roundNumber;
}

const TrialUI: React.FC<TrialUIProps> = ({ debate }) => {
  // Mode flags for this scenario. A scenario with no `mechanics` block resolves to
  // full-debate defaults, so every existing debate is unaffected.
  const mechanics = useMemo(() => resolveMechanics(debate), [debate]);
  const [fallacyGuesses, setFallacyGuesses] = useState<Map<number, FallacyGuessSession>>(new Map());
  const [revealedLockedOptionIds, setRevealedLockedOptionIds] = useState<Set<string>>(
    () => new Set(),
  );
  // Insight Points (per-debate, transient): seeded from the scenario's `startingInsightPoints`
  // (fallback 0). +1 awarded on the first fully-correct analysis of each analysis target;
  // spendable to reveal which sentences contain fallacies on the active target.
  const [insightPoints, setInsightPoints] = useState<number>(() =>
    getStartingInsightPoints(debate),
  );
  const [awardedInsightTargetIds, setAwardedInsightTargetIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [insightRevealedTargetIds, setInsightRevealedTargetIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [introSummaryOpen, setIntroSummaryOpen] = useState(false);
  const introStartEmittedRef = useRef(false);
  const conditions = useConditionContext();
  const wf = useTrialRoundWorkflow(debate, fallacyGuesses, revealedLockedOptionIds, conditions);

  // Opens scenario-defined tutorial overlays in response to bus events,
  // including the onboarding overlay wired to `introduction:start`.
  useScenarioTutorials(debate.tutorials);

  // While any tutorial overlay is visible, we gate the `debate_intro` Continue
  // button until the tutorial is finished.
  const isTutorialOpen = useTutorialStore((s) => s.isOpen);

  useEffect(() => {
    setIntroSummaryOpen(false);
    introStartEmittedRef.current = false;
    setInsightPoints(getStartingInsightPoints(debate));
    setAwardedInsightTargetIds(new Set());
    setInsightRevealedTargetIds(new Set());
    useTutorialStore.getState().resetTutorial();
    // Every encounter opens on the full-width cast, with the Debate Log collapsed.
    useDebateLogStore.getState().resetDebateLog();
    // Reset is keyed on scenario identity, not reference equality — the parent may
    // re-create the `debate` object on each render. `getStartingInsightPoints` reads
    // from `debate` but is pure, so capturing it via closure is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debate.id]);

  // Emit `introduction:start` once per scenario when we enter `debate_intro`.
  // `useScenarioTutorials` listens for this and opens any tutorial entry whose
  // `trigger.event === 'introduction:start'` matches.
  useEffect(() => {
    if (wf.gamePhase !== 'debate_intro') return;
    if (introStartEmittedRef.current) return;

    // In React StrictMode (dev), mount effects run in a probe cycle and are then
    // immediately cleaned up before the real mount. Deferring to a microtask and
    // cancelling on cleanup prevents a duplicate `introduction:start` emit.
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled || introStartEmittedRef.current) return;
      introStartEmittedRef.current = true;
      debateEventBus.emit('introduction:start', { debateId: debate.id });
    });

    return () => {
      cancelled = true;
    };
  }, [wf.gamePhase, debate.id]);

  // Emit when `IntroSummaryModal` is shown (same condition as its render guard).
  useEffect(() => {
    if (!introSummaryOpen || wf.gamePhase !== 'debate_intro') return;
    debateEventBus.emit('introduction:summary', { debateId: debate.id });
  }, [introSummaryOpen, wf.gamePhase, debate.id]);

  useEffect(() => {
    setRevealedLockedOptionIds(new Set());
  }, [wf.currentPlayerRound?.id]);

  const allFallacies = ALL_LOGICAL_FALLACIES;
  const fallacyById = useMemo(
    () => new Map(allFallacies.map((fallacy) => [fallacy.id, fallacy])),
    [allFallacies],
  );

  // -----------------------------------------------------------------------
  // Modal + fallacy-guess state
  // -----------------------------------------------------------------------
  const [analysisTarget, setAnalysisTarget] = useState<AnalysisTarget | null>(null);
  /** The fallacy `FallacyInfoModal` is describing, or `null` when it is closed. */
  const [fallacyInfoTarget, setFallacyInfoTarget] = useState<LogicalFallacy | null>(null);

  /**
   * Map key for in-progress fallacy sessions. Matches `currentRound.roundNumber` whenever the
   * player can react to the debate (including `npc_speaking`, so analysis opens as soon as the
   * opponent line appears in the log — not only after advancing the round).
   */
  const fallacyGuessBucketRoundNumber = useMemo(() => {
    if (
      wf.gamePhase === 'npc_speaking' ||
      wf.gamePhase === 'player_choosing' ||
      wf.gamePhase === 'player_confirming' ||
      wf.gamePhase === 'npc_responding' ||
      wf.gamePhase === 'round_recap'
    ) {
      return wf.currentRound?.roundNumber ?? null;
    }
    return null;
  }, [wf.gamePhase, wf.currentRound]);

  const analysisStatementTargetId = useMemo(() => {
    return analysisTarget ? analysisTargetStatementId(analysisTarget) : null;
  }, [analysisTarget]);

  const analysisGuessStorageRoundNumber = useMemo((): number | null => {
    return analysisTarget ? guessStorageRoundNumberForTarget(analysisTarget) : null;
  }, [analysisTarget]);

  const activeSession = useMemo((): FallacyGuessSession | null => {
    if (!analysisStatementTargetId || analysisGuessStorageRoundNumber === null) return null;
    const byKey = fallacyGuesses.get(analysisGuessStorageRoundNumber);
    if (byKey && byKey.npcRoundId === analysisStatementTargetId) return byKey;
    for (const sess of fallacyGuesses.values()) {
      if (sess.npcRoundId === analysisStatementTargetId) return sess;
    }
    return null;
  }, [analysisStatementTargetId, analysisGuessStorageRoundNumber, fallacyGuesses]);

  const canGuess = useMemo(() => {
    if (!analysisStatementTargetId || analysisGuessStorageRoundNumber === null) return false;

    if (
      wf.gamePhase === 'npc_speaking' &&
      wf.currentNpcRound &&
      analysisTarget &&
      analysisTarget.kind === 'npc' &&
      analysisTarget.round.id !== wf.currentNpcRound.id
    ) {
      return false;
    }

    const sess = fallacyGuesses.get(analysisGuessStorageRoundNumber);
    if (!sess) return true;
    if (sess.npcRoundId !== analysisStatementTargetId) return true;
    if (isSessionTerminal(sess)) return false;
    return sess.attempts.length < sess.maxAttempts;
  }, [
    analysisGuessStorageRoundNumber,
    analysisStatementTargetId,
    analysisTarget,
    wf.gamePhase,
    wf.currentNpcRound,
    fallacyGuesses,
  ]);

  const getNpcGuessState = useCallback(
    (npcRoundId: string): 'correct' | 'partial' | 'wrong' | null => {
      for (const sess of fallacyGuesses.values()) {
        if (sess.npcRoundId !== npcRoundId) continue;
        return guessStateFromAttempts(sess.attempts);
      }
      return null;
    },
    [fallacyGuesses],
  );

  /** Fallacies correctly spotted so far in one statement, for the Debate Log's icon badge. */
  const getSpottedFallacies = useCallback(
    (statementId: string, sentences: Sentence[]): LogicalFallacy[] => {
      for (const sess of fallacyGuesses.values()) {
        if (sess.npcRoundId !== statementId) continue;
        return spottedFallacies(sentences, sess, fallacyById);
      }
      return [];
    },
    [fallacyGuesses, fallacyById],
  );

  const handleGuess = (payload: GuessPayload) => {
    if (!analysisTarget) return;
    const guessStorageRoundNumber = guessStorageRoundNumberForTarget(analysisTarget);

    if (analysisTarget.kind !== 'player') {
      if (
        wf.gamePhase === 'npc_speaking' &&
        wf.currentNpcRound &&
        analysisTarget.kind === 'npc' &&
        analysisTarget.round.id !== wf.currentNpcRound.id
      ) {
        return;
      }
    }

    let sentences: Sentence[];
    let targetId: string;
    if (analysisTarget.kind === 'player') {
      sentences = resolvedOptionSentences(analysisTarget.chosenOption, true);
      targetId = analysisTarget.chosenOption.id;
    } else if (analysisTarget.kind === 'npc') {
      sentences = analysisTarget.round.statement.sentences;
      targetId = analysisTarget.round.id;
    } else {
      sentences = analysisTarget.statement.sentences;
      targetId = analysisTarget.statement.id;
    }

    let record: GuessRecord;
    /** (sentence, fallacy) pairs this attempt got right, for the Codex. */
    let correctPairs: { sentenceId: string; fallacyId: string }[] = [];

    if (payload.type === 'no_fallacies') {
      const correct = sentences.every((s) => s.logicalFallacies.length === 0);
      const seen = new Set<string>();
      const actualFallacies = sentences
        .flatMap((s) => s.logicalFallacies)
        .map((f) => fallacyById.get(f.id))
        .filter((f): f is LogicalFallacy => {
          if (!f) return false;
          if (seen.has(f.id)) return false;
          seen.add(f.id);
          return true;
        });
      record = {
        kind: 'no_fallacies',
        npcRoundId: targetId,
        correct,
        actualFallacies,
      };
    } else {
      const picks = payload.picks;
      if (picks.length === 0) return;

      const truth = truthMultisetFromSentences(sentences);
      const guess = guessMultisetFromPicks(picks);
      const missedPairs = computeMissedPairs(sentences, truth, guess, fallacyById);
      correctPairs = multisetToPairList(correctIntersectionMultiset(truth, guess));

      let outcome: 'perfect' | 'partial' | 'none';
      if (multisetsEqual(truth, guess)) {
        outcome = 'perfect';
      } else if (hasCorrectPairOverlap(truth, guess)) {
        outcome = 'partial';
      } else {
        outcome = 'none';
      }

      record = {
        kind: 'multi',
        npcRoundId: targetId,
        picks,
        outcome,
        missedPairs,
      };
    }

    // Bus emits must not run inside the `setFallacyGuesses` updater: React treats that
    // updater as TrialUI render work, and synchronous listeners call `openTutorial` /
    // `stepForward` on the tutorial store → "Cannot update TutorialOverlay while rendering TrialUI".
    let sessionAfterCommit: FallacyGuessSession | null = null;
    setFallacyGuesses((prev) => {
      const next = new Map(prev);
      const existing = prev.get(guessStorageRoundNumber);
      let session: FallacyGuessSession;

      if (!existing || existing.npcRoundId !== targetId) {
        session = {
          npcRoundId: targetId,
          maxAttempts: mechanics.maxAnalysisAttempts,
          attempts: [record],
        };
      } else {
        session = {
          ...existing,
          attempts: [...existing.attempts, record],
        };
      }
      next.set(guessStorageRoundNumber, session);
      sessionAfterCommit = session;
      return next;
    });

    // `useState` functional updaters run synchronously for this dispatch; the assignment
    // above always runs before we continue (TS does not model that flow).
    const session = sessionAfterCommit!;

    // A correct tag is the one thing the player keeps after the encounter ends: it lands in the
    // Codex and marks the fallacy known, which can open a gate elsewhere on the farm. Recorded
    // per correct pair rather than only on a perfect guess — a partially correct attempt still
    // spotted the pairs it got right, the same rule `pinnedMultisetFromAttempts` uses to keep
    // them highlighted across retries. Written before the bus emits so a tutorial listening for
    // `analysis:guess_correct` sees a Codex that already agrees with the screen.
    if (correctPairs.length > 0) {
      const { recordSpottedFallacy } = useCodexStore.getState();
      const { activeDebateId } = useGameStore.getState();
      for (const pair of correctPairs) {
        if (!isCatalogedFallacyId(pair.fallacyId)) continue;
        recordSpottedFallacy({
          fallacyId: pair.fallacyId,
          scenarioKey: activeDebateId,
          statementId: targetId,
          sentenceId: pair.sentenceId,
        });
      }
    }

    const targetKind: AnalysisTargetKind = analysisTarget.kind;
    const roundNumberForEvent =
      analysisTarget.kind === 'opponent_prompt' || analysisTarget.kind === 'opponent_response'
        ? analysisTarget.playerRound.roundNumber
        : analysisTarget.round.roundNumber;

    debateEventBus.emit('analysis:guess_submitted', {
      targetId,
      targetKind,
      roundNumber: roundNumberForEvent,
      payload,
    });

    const attemptsUsed = session.attempts.length;
    const maxAttempts = session.maxAttempts;
    const outcomePayload = {
      targetId,
      targetKind,
      roundNumber: roundNumberForEvent,
      record,
      attemptsUsed,
      maxAttempts,
    };

    const isCorrect =
      record.kind === 'no_fallacies' ? record.correct : record.outcome === 'perfect';
    const isPartial = record.kind === 'multi' && record.outcome === 'partial';

    if (isCorrect) {
      // Award 1 Insight point the first time this analysis target is solved correctly.
      // Reading `awardedInsightTargetIds` from closure (latest render snapshot) — using a
      // flag captured inside the functional updater is unreliable because React does not
      // guarantee the updater runs synchronously during dispatch (concurrent mode).
      if (!awardedInsightTargetIds.has(targetId)) {
        setAwardedInsightTargetIds((prev) => {
          if (prev.has(targetId)) return prev;
          const next = new Set(prev);
          next.add(targetId);
          return next;
        });
        setInsightPoints((p) => p + 1);
      }
      debateEventBus.emit('analysis:guess_correct', outcomePayload);
    } else if (isPartial) {
      debateEventBus.emit('analysis:guess_partially_correct', outcomePayload);
    } else {
      debateEventBus.emit('analysis:guess_incorrect', outcomePayload);
    }

    // Terminal success (correct) doesn't count as "max attempts reached" — only emit
    // when the player exhausted attempts without landing a perfect / correct guess.
    if (!isCorrect && attemptsUsed >= maxAttempts) {
      debateEventBus.emit('analysis:guess_max_attempts_reached', {
        targetId,
        targetKind,
        roundNumber: roundNumberForEvent,
        attemptsUsed,
        maxAttempts,
      });
    }
  };

  /**
   * True while an NPC round marked `requiresAnalysis` has not been resolved yet — the
   * player has neither landed a correct guess nor spent every attempt. Spotting-only
   * rungs use this to hold the Continue button until the statement has actually been
   * analysed, which is the whole gameplay of those scenarios.
   */
  const analysisGatePending = useMemo(() => {
    if (wf.gamePhase !== 'npc_speaking') return false;
    const round = wf.currentNpcRound;
    if (!round?.requiresAnalysis) return false;
    for (const session of fallacyGuesses.values()) {
      if (session.npcRoundId !== round.id) continue;
      return !isSessionTerminal(session) && session.attempts.length < session.maxAttempts;
    }
    return true;
  }, [wf.gamePhase, wf.currentNpcRound, fallacyGuesses]);

  /**
   * The opponent's current line, for the footer analyze button — current-round only, so it
   * never competes with the debate log's `AnalyzeButton` lenses, which cover history. `null`
   * means "nothing to analyze right now" (the footer renders disabled, not absent — see
   * `mechanics.analysisEnabled` for the absent case).
   */
  const currentAnalysisTarget = useMemo((): AnalysisTarget | null => {
    switch (wf.gamePhase) {
      case 'npc_speaking':
        return wf.currentNpcRound ? { kind: 'npc', round: wf.currentNpcRound } : null;
      case 'player_choosing': {
        const playerRound = wf.currentPlayerRound;
        const prompt = playerRound?.opponentPrompt;
        if (!playerRound || !prompt) return null;
        return { kind: 'opponent_prompt', statement: prompt, playerRound };
      }
      case 'npc_responding': {
        const playerRound = wf.currentPlayerRound;
        const response = wf.activeOpponentResponse;
        if (!playerRound || !response) return null;
        return { kind: 'opponent_response', statement: response.statement, playerRound };
      }
      default:
        return null;
    }
  }, [wf.gamePhase, wf.currentNpcRound, wf.currentPlayerRound, wf.activeOpponentResponse]);

  // -----------------------------------------------------------------------
  // Wizard sentence reveal
  // -----------------------------------------------------------------------

  /**
   * The line the wizard is pacing out one sentence at a time, or `null` when there is nothing
   * to reveal.
   *
   * Incoming speech only. The player's own selected statement, the round recap and the closing
   * verdict are text they chose or have already read, so pacing them out again is pure delay.
   *
   * Switching on `gamePhase` first is load-bearing: `activeOpponentResponse` is also non-null
   * during `round_recap`, where the recap modal owns the screen and Continue belongs to it.
   *
   * `analysisTargetId` is the id the analysis modal reports for the same line, so the two can
   * be compared below. It is the *round* id for an NPC round and the *statement* id elsewhere,
   * matching `analysisStatementTargetId`.
   */
  const revealSource = useMemo((): RevealSource | null => {
    const build = (
      slot: string,
      analysisTargetId: string | null,
      sentences: string[],
    ): RevealSource | null => {
      const chunks = sentences.map((text) => text.trim()).filter(Boolean);
      // An empty line would arm a reveal whose Continue is a permanent no-op.
      if (chunks.length === 0) return null;
      return {
        key: `${debate.id}:${slot}:${analysisTargetId ?? slot}`,
        sentences: chunks,
        analysisTargetId,
      };
    };

    switch (wf.gamePhase) {
      case 'debate_intro': {
        const intro = debate.introduction?.trim();
        if (!intro) return null;
        // The only reveal source authored as prose rather than as `Sentence[]`.
        return build('intro', null, splitIntoSentences(intro));
      }
      case 'npc_speaking': {
        const npc = wf.currentNpcRound;
        if (!npc) return null;
        return build(
          'npc',
          npc.id,
          npc.statement.sentences.map((sentence) => sentence.text),
        );
      }
      case 'player_choosing': {
        const prompt = wf.currentPlayerRound?.opponentPrompt;
        // Only the opponent's question is paced; once an option is picked the wizard shows the
        // player's own line back to them.
        if (!prompt || wf.selectedOption) return null;
        return build(
          'prompt',
          prompt.id,
          prompt.sentences.map((sentence) => sentence.text),
        );
      }
      case 'npc_responding': {
        const response = wf.activeOpponentResponse;
        if (!response) return null;
        return build(
          'response',
          response.statement.id,
          response.statement.sentences.map((sentence) => sentence.text),
        );
      }
      default:
        return null;
    }
  }, [
    wf.gamePhase,
    wf.currentNpcRound,
    wf.currentPlayerRound,
    wf.selectedOption,
    wf.activeOpponentResponse,
    debate.id,
    debate.introduction,
  ]);

  const reveal = useWizardReveal(revealSource, {
    // A tutorial choreographs its own reading pace, and `tutorialStore` blocks Continue for any
    // step that targets something other than it — which would strand the player mid-statement.
    enabled: !isTutorialOpen,
    resetKey: debate.id,
  });
  // Destructured so the effects below can depend on the stable callbacks by name; the reveal
  // object itself is a fresh literal every render.
  const { active: revealActive, advance: revealAdvance, complete: revealComplete } = reveal;

  // Analysis lists every sentence of the line as its own card, and `requiresAnalysis` rounds
  // force the player through it. Clicking a typewriter through text they just analysed is
  // friction, so opening analysis on the revealing line finishes the reveal.
  const revealAnalysisTargetId = revealSource?.analysisTargetId ?? null;
  useEffect(() => {
    if (!revealAnalysisTargetId) return;
    if (analysisStatementTargetId !== revealAnalysisTargetId) return;
    revealComplete();
  }, [revealAnalysisTargetId, analysisStatementTargetId, revealComplete]);

  /**
   * Space / Enter mirror Continue, but only while a line is being revealed: this is a reading
   * pacer, not a way to play the whole debate from the keyboard. The modal checks stop it
   * stealing a press that belongs to the analysis or intro-summary dialog, and the target check
   * leaves a focused button's own Space/Enter activation alone — without it, clicking Continue
   * once and then pressing Space advances twice.
   */
  useEffect(() => {
    if (!revealActive) return;
    if (analysisTarget || introSummaryOpen || isTutorialOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.code !== 'Space' && event.code !== 'Enter') return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('button, a, input, textarea, select, [contenteditable]')) return;
      event.preventDefault();
      revealAdvance();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [revealActive, revealAdvance, analysisTarget, introSummaryOpen, isTutorialOpen]);

  // -----------------------------------------------------------------------
  // Footer action state
  // -----------------------------------------------------------------------
  const interactiveFooter = useMemo((): InteractiveFooter => {
    // While a line is still being paced out, Continue belongs to the reveal: it fills in the
    // rest of the sentence, or steps to the next one. No `interactive:continue` emit and no
    // dispatch — nothing about the debate has moved. This has to sit ahead of
    // `analysisGatePending` below, or a `requiresAnalysis` round deadlocks: the gate disables
    // Continue, and a disabled Continue can never finish the reveal.
    if (revealActive) {
      return {
        submitLabel: getLabel('continue'),
        submitDisabled: false,
        submitIcon: 'reveal',
        onSubmit: () => {
          revealAdvance();
        },
      };
    }

    let submitLabel = getLabel('continue');
    let submitDisabled = true;
    let submitIcon: InteractiveFooter['submitIcon'] = 'continue';
    let onSubmit: (() => void) | undefined;

    const currentRoundNumber = wf.currentRound?.roundNumber ?? null;

    switch (wf.gamePhase) {
      case 'debate_intro': {
        const introGated = isTutorialOpen;
        submitLabel = getLabel('continue');
        submitDisabled = introGated;
        onSubmit = introGated
          ? undefined
          : () => {
              debateEventBus.emit('interactive:continue', {
                fromPhase: 'debate_intro',
                roundNumber: null,
              });
              // Scenarios with `showIntroSummary: false` go straight into round 1;
              // a two-line trough chat does not need a "Before the debate" briefing.
              if (mechanics.showIntroSummary) {
                setIntroSummaryOpen(true);
              } else {
                wf.dispatch({ type: 'continue' });
              }
            };
        break;
      }
      case 'npc_speaking':
      case 'npc_responding':
        submitLabel = getLabel('continue');
        submitDisabled = analysisGatePending;
        onSubmit = () => {
          debateEventBus.emit('interactive:continue', {
            fromPhase: wf.gamePhase,
            roundNumber: currentRoundNumber,
          });
          wf.dispatch({ type: 'continue' });
        };
        break;
      case 'player_choosing':
        submitLabel = getLabel('continue');
        submitDisabled = !wf.selectedOption;
        onSubmit = () => {
          const option = wf.selectedOption;
          const round = wf.currentPlayerRound;
          if (option && round) {
            debateEventBus.emit('interactive:confirm', {
              roundNumber: round.roundNumber,
              roundId: round.id,
              optionId: option.id,
            });
          }
          wf.dispatch({ type: 'confirm_option' });
        };
        break;
      case 'player_confirming':
        submitLabel = getLabel('confirm');
        submitDisabled = false;
        submitIcon = 'confirm';
        onSubmit = () => {
          const option = wf.selectedOption;
          const round = wf.currentPlayerRound;
          if (option && round) {
            debateEventBus.emit('interactive:confirm', {
              roundNumber: round.roundNumber,
              roundId: round.id,
              optionId: option.id,
            });
          }
          wf.dispatch({ type: 'confirm_option' });
        };
        break;
      case 'debate_complete':
        // Until now a finished encounter was a dead end: this case fell through to
        // `default`, leaving Continue disabled forever with no way out.
        submitLabel = getLabel('leaveEncounter');
        submitDisabled = false;
        submitIcon = 'leave';
        onSubmit = () => {
          const { activeDebateId, returnSceneKey } = useGameStore.getState();
          // Mark by the scenario *key*, not `debate.id` — those differ
          // (`015_duchess_vs_rue` vs `level1-boss-pond-motion`) and only the key
          // is a `DebateScenarioKey`.
          //
          // Leaving is also where an encounter pays out what it taught: reaching the round
          // that explains a fallacy is not the same as sitting through the encounter.
          applyEncounterRewards(activeDebateId, debate);
          GameManager.switchScene(returnSceneKey);
        };
        break;
      default:
        submitDisabled = true;
    }

    return { submitLabel, submitDisabled, submitIcon, onSubmit };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- wf.gamePhase + wf.dispatch cover footer behavior; setIntroSummaryOpen is stable
  }, [
    wf.gamePhase,
    wf.dispatch,
    wf.selectedOption,
    wf.currentRound,
    wf.currentPlayerRound,
    isTutorialOpen,
    analysisGatePending,
    mechanics.showIntroSummary,
    revealActive,
    revealAdvance,
  ]);

  const modalSpeakerName = useMemo(() => {
    if (!analysisTarget) return '';
    if (analysisTarget.kind === 'npc')
      return getSpeakerName(debate, analysisTarget.round.speakerId);
    if (analysisTarget.kind === 'opponent_prompt' || analysisTarget.kind === 'opponent_response')
      return getSpeakerName(debate, analysisTarget.statement.speakerId);
    return '';
  }, [analysisTarget, debate]);

  const revealLockedOption = useCallback((optionId: string) => {
    setRevealedLockedOptionIds((prev) => new Set(prev).add(optionId));
  }, []);

  // Spend `HELP_INSIGHT_COST` Insight points to mark the active analysis target as
  // "fallacy-revealed". No-op when the player can't afford it or this target has already
  // been revealed.
  const handleSpendInsightPoint = useCallback(() => {
    if (!analysisStatementTargetId) return;
    if (insightPoints < HELP_INSIGHT_COST) return;
    if (insightRevealedTargetIds.has(analysisStatementTargetId)) return;
    setInsightRevealedTargetIds((prev) => {
      if (prev.has(analysisStatementTargetId)) return prev;
      const next = new Set(prev);
      next.add(analysisStatementTargetId);
      return next;
    });
    setInsightPoints((p) => Math.max(0, p - HELP_INSIGHT_COST));
  }, [analysisStatementTargetId, insightPoints, insightRevealedTargetIds]);

  const insightRevealedForCurrentTarget = useMemo(() => {
    if (!analysisStatementTargetId) return false;
    return insightRevealedTargetIds.has(analysisStatementTargetId);
  }, [analysisStatementTargetId, insightRevealedTargetIds]);

  const wizardDetail = useMemo((): WizardPanelDetail | null => {
    switch (wf.gamePhase) {
      case 'debate_intro': {
        const intro = debate.introduction?.trim();
        if (!intro) return null;
        return {
          title: getLabel('wizardDetailIntroduction'),
          body: intro,
          sentenceCount: splitIntoSentences(intro).length,
        };
      }
      case 'npc_speaking': {
        const npc = wf.currentNpcRound;
        if (!npc) return null;
        return {
          title: getLabel('wizardDetailSpeaks', {
            replacements: {
              name: getSpeakerName(debate, npc.speakerId),
            },
          }),
          body: statementText(npc.statement.sentences),
          sentenceCount: npc.statement.sentences.length,
          speaker: { characterId: npc.speakerId, emotion: emotionFromStatement(npc.statement) },
          spottedFallacies: mechanics.analysisEnabled
            ? getSpottedFallacies(npc.id, npc.statement.sentences)
            : undefined,
        };
      }
      case 'player_choosing': {
        const opt = wf.selectedOption;
        if (!opt) {
          const prompt = wf.currentPlayerRound?.opponentPrompt;
          if (!prompt) return null;
          return {
            title: getLabel('wizardDetailSpeaks', {
              replacements: {
                name: getSpeakerName(debate, prompt.speakerId),
              },
            }),
            body: statementText(prompt.sentences),
            sentenceCount: prompt.sentences.length,
            speaker: { characterId: prompt.speakerId, emotion: emotionFromStatement(prompt) },
            spottedFallacies: mechanics.analysisEnabled
              ? getSpottedFallacies(prompt.id, prompt.sentences)
              : undefined,
          };
        }
        const showResolved =
          !isOptionGated(opt) || isPlayerOptionUnlocked(opt, fallacyGuesses, conditions);
        const resolvedSentences = resolvedOptionSentences(opt, showResolved);
        return {
          title: getLabel('wizardDetailSelectedStatement'),
          body: statementText(resolvedSentences),
          speaker: { characterId: PLAYER_CHARACTER_ID, emotion: emotionForOption(opt) },
          spottedFallacies: mechanics.analysisEnabled
            ? getSpottedFallacies(opt.id, resolvedSentences)
            : undefined,
        };
      }
      case 'player_confirming': {
        const opt = wf.selectedOption;
        if (!opt) return null;
        const showResolved =
          !isOptionGated(opt) || isPlayerOptionUnlocked(opt, fallacyGuesses, conditions);
        const resolvedSentences = resolvedOptionSentences(opt, showResolved);
        return {
          title: getLabel('wizardDetailYourChoice'),
          body: statementText(resolvedSentences),
          speaker: { characterId: PLAYER_CHARACTER_ID, emotion: emotionForOption(opt) },
          spottedFallacies: mechanics.analysisEnabled
            ? getSpottedFallacies(opt.id, resolvedSentences)
            : undefined,
        };
      }
      case 'npc_responding': {
        const response = wf.activeOpponentResponse;
        const playerRound = wf.currentPlayerRound;
        if (!response || !playerRound) return null;
        return {
          title: getLabel('wizardDetailResponse', {
            replacements: {
              name: getSpeakerName(debate, response.statement.speakerId),
            },
          }),
          body: statementText(response.statement.sentences),
          sentenceCount: response.statement.sentences.length,
          speaker: {
            characterId: response.statement.speakerId,
            emotion: emotionFromStatement(response.statement),
          },
          spottedFallacies: mechanics.analysisEnabled
            ? getSpottedFallacies(response.statement.id, response.statement.sentences)
            : undefined,
        };
      }
      case 'round_recap': {
        const response = wf.activeOpponentResponse;
        const playerRound = wf.currentPlayerRound;
        if (response && playerRound) {
          return {
            title: getLabel('wizardDetailResponse', {
              replacements: {
                name: getSpeakerName(debate, response.statement.speakerId),
              },
            }),
            body: statementText(response.statement.sentences),
            sentenceCount: response.statement.sentences.length,
            speaker: {
              characterId: response.statement.speakerId,
              emotion: emotionFromStatement(response.statement),
            },
            spottedFallacies: mechanics.analysisEnabled
              ? getSpottedFallacies(response.statement.id, response.statement.sentences)
              : undefined,
          };
        }
        // NPC rounds also pass through `round_recap` now (after the player clicks
        // Continue on `npc_speaking`). Surface the NPC's line in the wizard so the
        // player can re-read what the moderator just reacted to.
        const npc = wf.currentNpcRound;
        if (npc) {
          return {
            title: getLabel('wizardDetailSpeaks', {
              replacements: {
                name: getSpeakerName(debate, npc.speakerId),
              },
            }),
            body: statementText(npc.statement.sentences),
            sentenceCount: npc.statement.sentences.length,
            speaker: { characterId: npc.speakerId, emotion: emotionFromStatement(npc.statement) },
            spottedFallacies: mechanics.analysisEnabled
              ? getSpottedFallacies(npc.id, npc.statement.sentences)
              : undefined,
          };
        }
        return {
          title: getLabel('roundRecap'),
          body: getLabel('wizardDetailRoundRecapBody'),
        };
      }
      case 'debate_complete':
        return {
          title: getLabel(encounterLabels(debate).finished),
          body: moderatorOpinionPlainText(wf.totalScore),
        };
      default:
        return null;
    }
  }, [
    wf.gamePhase,
    wf.currentNpcRound,
    wf.selectedOption,
    wf.activeOpponentResponse,
    wf.currentPlayerRound,
    wf.totalScore,
    debate,
    fallacyGuesses,
    mechanics.analysisEnabled,
    getSpottedFallacies,
  ]);

  // While a line is still being revealed, Actions shows a generic "keep reading" hint — the
  // full guidance recaps a statement the player has not finished reading yet. The round label
  // itself now lives permanently in the Dialog header (`wf.wizardRoundLabel`), not here.
  //
  // The workflow hook is deliberately unaware of guess state, so the "you must analyse
  // this first" nudge is applied here rather than inside `wizardMessage`.
  const actionsHint = revealActive
    ? getLabel('workflowRevealing')
    : analysisGatePending
      ? getLabel('workflowNpcSpeakingMustAnalyze')
      : wf.wizardMessage;

  const wizardReveal = useMemo(
    (): WizardPanelReveal | null =>
      revealActive
        ? {
            sentence: reveal.sentence,
            sentenceIndex: reveal.sentenceIndex,
            sentenceCount: reveal.sentenceCount,
            skipToken: reveal.skipToken,
            onSentenceTyped: reveal.onSentenceTyped,
          }
        : null,
    [
      revealActive,
      reveal.sentence,
      reveal.sentenceIndex,
      reveal.sentenceCount,
      reveal.skipToken,
      reveal.onSentenceTyped,
    ],
  );

  // `stageOrder` matches the left-to-right order the Phaser `Trial` scene lays its sprites
  // out in (player first, moderator centred in a 3+ cast) — the nameplates below must use
  // the same order or they end up over the wrong sprite.
  const participantIds = useMemo(() => stageOrder(debateParticipantIds(debate)), [debate]);
  const activeSpeakerId = useMemo(
    () =>
      activeSpeakerIdForWorkflow(
        wf.gamePhase,
        wf.currentNpcRound,
        wf.currentPlayerRound,
        wf.selectedOption,
        wf.activeOpponentResponse,
      ),
    [
      wf.gamePhase,
      wf.currentNpcRound,
      wf.currentPlayerRound,
      wf.selectedOption,
      wf.activeOpponentResponse,
    ],
  );

  // Derived from the identical snapshot as `activeSpeakerId` above, and pushed in the same
  // effect, so the scene never sees a new speaker wearing the previous line's emotion.
  const activeEmotion = useMemo(
    () =>
      activeEmotionForWorkflow(
        wf.gamePhase,
        wf.currentNpcRound,
        wf.currentPlayerRound,
        wf.selectedOption,
        wf.activeOpponentResponse,
      ),
    [
      wf.gamePhase,
      wf.currentNpcRound,
      wf.currentPlayerRound,
      wf.selectedOption,
      wf.activeOpponentResponse,
    ],
  );

  // The Phaser `Trial` scene reacts to the active speaker through `trialStageStore` — see
  // that store's docstring for why a store and not `EventBus`. The setter no-ops when
  // neither field changed, so this is safe on every render, including StrictMode's
  // double-mount.
  useEffect(() => {
    useTrialStageStore.getState().setActiveSpeaker(activeSpeakerId, activeEmotion);
  }, [activeSpeakerId, activeEmotion]);

  useEffect(() => {
    return () => useTrialStageStore.getState().resetStage();
  }, []);

  // Only scenarios whose whole cast has sprite art get the nameplate-only stage; legacy
  // debates (no `CHARACTERS.animal` entry for their speakers) keep their CSS busts, since
  // the Phaser scene draws no cast for them.
  const hasPhaserCast = useMemo(
    () => participantIds.some((id) => resolveCharacter(id).animal !== null),
    [participantIds],
  );

  return (
    <div style={{ height: '100%', minHeight: 0, width: '100%' }}>
      <TrialLayout
        stage={
          <CharacterStage
            participantIds={participantIds}
            activeSpeakerId={activeSpeakerId}
            variant={hasPhaserCast ? 'nameplates' : 'busts'}
          />
        }
        log={{
          panel: (
            <FeedbackPanel
              wf={wf}
              debate={debate}
              insightPoints={insightPoints}
              onOpenAnalysis={setAnalysisTarget}
              getNpcGuessState={getNpcGuessState}
              getSpottedFallacies={getSpottedFallacies}
              onOpenFallacyInfo={setFallacyInfoTarget}
              mechanics={mechanics}
            />
          ),
          recap: (
            <DebateLogRecapChip
              debate={debate}
              roundNumber={activeRoundNumber(wf.currentRoundIndex, wf.totalRounds)}
              totalRounds={wf.totalRounds}
              totalScore={wf.totalScore}
              insightPoints={insightPoints}
              mechanics={mechanics}
              needsAttention={analysisGatePending}
            />
          ),
        }}
        wizard={
          <WizardPanel
            detail={wizardDetail}
            reveal={wizardReveal}
            roundLabel={wf.wizardRoundLabel}
            onOpenFallacyInfo={setFallacyInfoTarget}
          />
        }
        interactive={
          <InteractivePanel
            key={debate.id}
            wf={wf}
            debate={debate}
            fallacyGuesses={fallacyGuesses}
            revealedLockedOptionIds={revealedLockedOptionIds}
            onRevealLockedOption={revealLockedOption}
            interactiveFooter={interactiveFooter}
            hideOptions={revealActive}
            onOpenAnalysis={setAnalysisTarget}
            getNpcGuessState={getNpcGuessState}
            mechanics={mechanics}
            // Disabled (not just gated by tutorial) until the line finishes revealing in the
            // Dialog — opening analysis on a statement the player hasn't fully read yet would
            // let them skip the reveal.
            analyzeTarget={revealActive ? null : currentAnalysisTarget}
            hint={actionsHint}
          />
        }
      />
      {analysisTarget && mechanics.analysisEnabled && (
        <RoundAnalysisModal
          target={analysisTarget}
          allFallacies={allFallacies}
          availableLogicalFallacies={debate.availableLogicalFallacies}
          fallacyById={fallacyById}
          speakerName={modalSpeakerName}
          canGuess={canGuess}
          guessSession={activeSession}
          onGuess={handleGuess}
          onClose={() => setAnalysisTarget(null)}
          activeRoundNumber={fallacyGuessBucketRoundNumber}
          insightPoints={insightPoints}
          insightRevealed={insightRevealedForCurrentTarget}
          onSpendInsightPoint={handleSpendInsightPoint}
          maxAnalysisAttempts={mechanics.maxAnalysisAttempts}
        />
      )}
      {introSummaryOpen && mechanics.showIntroSummary && wf.gamePhase === 'debate_intro' && (
        <IntroSummaryModal
          debate={debate}
          onClose={() => {
            setIntroSummaryOpen(false);
            wf.dispatch({ type: 'continue' });
          }}
        />
      )}
      {wf.gamePhase === 'round_recap' && (
        <RoundRecapModal
          debate={debate}
          wf={wf}
          fallacyGuesses={fallacyGuesses}
          revealedLockedOptionIds={revealedLockedOptionIds}
          onClose={() => wf.dispatch({ type: 'continue' })}
          mechanics={mechanics}
        />
      )}
      {fallacyInfoTarget && (
        <FallacyInfoModal fallacy={fallacyInfoTarget} onClose={() => setFallacyInfoTarget(null)} />
      )}
    </div>
  );
};

export default TrialUI;
