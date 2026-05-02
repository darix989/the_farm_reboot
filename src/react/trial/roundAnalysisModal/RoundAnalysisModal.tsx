import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import cn from 'classnames';
import type {
  LogicalFallacy,
  LogicalFallacyId,
  LogicalFallacyScenario,
  NpcRoundEntry,
  PlayerOption,
  PlayerRoundEntry,
  Sentence,
  Statement,
} from '../../../types/debateEntities';

import magnifyingIcon from '../../../static/icons/magnifying.svg';
import genericFallacyIcon from '../../../static/icons/fallacies/generic_fallacy.svg';
import { getLogicalFallacyIconSrc } from '../utils/logicalFallacyIcons';
import ScrollFadeContainer from '../components/ScrollFadeContainer';
import TrialTextButton from '../components/TrialTextButton';
import { perRoundImpactScoreBounds, statementTypeLabel } from '../utils/trialHelpers';
import { ModeratorOpinionInline } from '../utils/ModeratorOpinionInline';
import { resolvedOptionSentences } from '../utils/optionUnlock';
import type { FallacyGuessSession, GuessPayload, GuessRecord } from '../utils/fallacyGuessTypes';
import { DEFAULT_MAX_ANALYSIS_ATTEMPTS } from '../utils/fallacyGuessTypes';
import {
  guessMultisetFromPicks,
  multisetToPairList,
  pairListToBySentence,
  picksToBySentence,
  pinnedMultisetFromAttempts,
  shouldRevealFullSolution,
  truthMultisetFromSentences,
  correctIntersectionMultiset,
} from '../utils/fallacyGuessUtils';
import { debateEventBus, type AnalysisTargetKind } from '../utils/debateEventBus';
import {
  canRunTutorialTargetAction,
  notifyTutorialTargetAction,
} from '../../tutorial/tutorialInteractionGuard';
import styles from './RoundAnalysisModal.module.scss';
import shared from '../trialShared.module.scss';
import { uiColor } from '../../uiColor';
import getLabel from '../../../data/labels';

export type { FallacyGuessSession, GuessPayload, GuessRecord } from '../utils/fallacyGuessTypes';
export { DEFAULT_MAX_ANALYSIS_ATTEMPTS } from '../utils/fallacyGuessTypes';

/** Insight points required to reveal which sentences contain fallacies on the active target. */
export const HELP_INSIGHT_COST = 2;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnalysisTarget =
  | { kind: 'npc'; round: NpcRoundEntry }
  | { kind: 'player'; round: PlayerRoundEntry; chosenOption: PlayerOption }
  | { kind: 'opponent_prompt'; statement: Statement; playerRound: PlayerRoundEntry }
  | { kind: 'opponent_response'; statement: Statement; playerRound: PlayerRoundEntry };

interface RoundAnalysisModalProps {
  target: AnalysisTarget;
  allFallacies: LogicalFallacy[];
  /** Fallacy ids the player may choose in this scenario (catalog order preserved). */
  availableLogicalFallacies: readonly LogicalFallacyId[];
  fallacyById: Map<string, LogicalFallacy>;
  speakerName: string;
  /** True when the player may still submit for this analysis target. */
  canGuess: boolean;
  guessSession: FallacyGuessSession | null;
  onGuess: (payload: GuessPayload) => void;
  onClose: () => void;
  /** Workflow round from `TrialUI` (null when intro/complete); see `analysis:open` payload. */
  activeRoundNumber: number | null;
  /** Current Insight point balance — drives the `Help (n)` button label and enabled state. */
  insightPoints: number;
  /** True when an Insight point has already been spent on the current analysis target. */
  insightRevealed: boolean;
  /** Spend 1 Insight point to reveal which sentences contain logical fallacies. */
  onSpendInsightPoint: () => void;
}

// ---------------------------------------------------------------------------
// FallacyPicker
// ---------------------------------------------------------------------------

function FallacyPicker({
  fallacies,
  selectedIds,
  onSelect,
  disabled,
  compactGrid,
}: {
  fallacies: LogicalFallacy[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  disabled?: boolean;
  /** Denser 3-column grid for the modal right-hand column. */
  compactGrid?: boolean;
}) {
  return (
    <div
      className={cn(styles.trialFallacyGrid, {
        [styles.trialFallacyGridAside]: compactGrid,
      })}
    >
      {fallacies.map((f) => (
        <button
          key={f.id}
          type="button"
          className={cn(styles.trialFallacyItem, {
            [styles.selected]: selectedIds.includes(f.id),
          })}
          onClick={() => onSelect(f.id)}
          title={f.description}
          disabled={disabled}
          data-tutorial-analysis-fallacy-id={f.id}
        >
          <img
            src={getLogicalFallacyIconSrc(f.id)}
            alt=""
            className={styles.trialFallacyItemIcon}
          />
          <span className={styles.trialFallacyItemLabel}>{f.label}</span>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GuessResultBanner
// ---------------------------------------------------------------------------

function joinFallacyLabels(nodes: React.ReactNode[]): React.ReactNode[] {
  return nodes.reduce<React.ReactNode[]>((acc, el, i) => (i === 0 ? [el] : [...acc, ', ', el]), []);
}

function GuessResultBanner({
  guess,
  statement,
  spoilerSafe,
  shouldRevealFullSolution,
  fallacyById,
}: {
  guess: GuessRecord;
  statement: Statement;
  spoilerSafe: boolean;
  shouldRevealFullSolution: boolean;
  fallacyById: Map<string, LogicalFallacy>;
}) {
  const sentenceIndex = (sentenceId: string) =>
    Math.max(
      0,
      statement.sentences.findIndex((s) => s.id === sentenceId),
    ) + 1;

  if (guess.kind === 'no_fallacies') {
    return (
      <div
        className={cn(styles.trialGuessResult, {
          [styles.correct]: guess.correct,
          [styles.wrong]: !guess.correct,
        })}
      >
        {guess.correct ? (
          <>
            <span className={styles.trialGuessResultIcon}>✓</span>
            <div>
              <p className={styles.trialGuessResultHeadline}>{getLabel('guessHeadlineCorrect')}</p>
              <p className={styles.trialGuessResultBody}>
                {getLabel('guessNoFallaciesCorrectBody')}
              </p>
            </div>
          </>
        ) : (
          <>
            <span className={styles.trialGuessResultIcon}>✗</span>
            <div>
              <p className={styles.trialGuessResultHeadline}>
                {getLabel('guessHeadlineIncorrect')}
              </p>
              <p className={styles.trialGuessResultBody}>
                {spoilerSafe && !shouldRevealFullSolution ? (
                  <>{getLabel('guessNoFallaciesWrongBodySpoiler')}</>
                ) : (
                  <>
                    {getLabel('guessNoFallaciesWrongBodyRevealPrefix')}{' '}
                    {joinFallacyLabels(
                      guess.actualFallacies.map((f) => <strong key={f.id}>{f.label}</strong>),
                    )}
                    .
                  </>
                )}
              </p>
            </div>
          </>
        )}
      </div>
    );
  }

  const { outcome, missedPairs } = guess;
  const truth = truthMultisetFromSentences(statement.sentences);
  const correctThisAttempt = multisetToPairList(
    correctIntersectionMultiset(truth, guessMultisetFromPicks(guess.picks)),
  );

  if (outcome === 'perfect') {
    return (
      <div className={cn(styles.trialGuessResult, styles.correct)}>
        <span className={styles.trialGuessResultIcon}>✓</span>
        <div>
          <p className={styles.trialGuessResultHeadline}>{getLabel('guessHeadlineCorrect')}</p>
          <p className={styles.trialGuessResultBody}>{getLabel('guessPerfectBody')}</p>
        </div>
      </div>
    );
  }

  if (outcome === 'partial') {
    const showSpoilerSafePartial = spoilerSafe && !shouldRevealFullSolution;
    return (
      <div className={cn(styles.trialGuessResult, styles.partial)}>
        <span className={styles.trialGuessResultIcon}>◆</span>
        <div>
          <p className={styles.trialGuessResultHeadline}>
            {getLabel('guessHeadlinePartiallyCorrect')}
          </p>
          {showSpoilerSafePartial ? (
            <>
              <p className={styles.trialGuessResultBody}>{getLabel('guessPartialIntro')}</p>
              <p className={styles.trialGuessResultBody}>
                {getLabel('guessPartialConfirmedPrefix')}{' '}
                {joinFallacyLabels(
                  correctThisAttempt.map((p, i) => {
                    const f = fallacyById.get(p.fallacyId);
                    if (!f) return null;
                    return (
                      <strong key={`${p.sentenceId}-${p.fallacyId}-${i}`}>
                        {f.label}{' '}
                        {getLabel('sentenceReference', {
                          replacements: {
                            sentenceIndex: sentenceIndex(p.sentenceId),
                          },
                        })}
                      </strong>
                    );
                  }),
                )}
                .
              </p>
              <p className={styles.trialGuessResultBody}>{getLabel('guessPartialTryAgain')}</p>
            </>
          ) : (
            <>
              <p className={styles.trialGuessResultBody}>{getLabel('guessPartialFullBody')}</p>
              {missedPairs.length > 0 && (
                <p className={styles.trialGuessResultBody}>
                  {getLabel('missedPrefix')}{' '}
                  {joinFallacyLabels(
                    missedPairs.map((mp, i) => (
                      <strong key={`${mp.sentenceId}-${mp.fallacy.id}-${i}`}>
                        {mp.fallacy.label}{' '}
                        {getLabel('sentenceReference', {
                          replacements: {
                            sentenceIndex: sentenceIndex(mp.sentenceId),
                          },
                        })}
                      </strong>
                    )),
                  )}
                  .
                </p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  const showSpoilerSafeNone = spoilerSafe && !shouldRevealFullSolution;

  return (
    <div className={cn(styles.trialGuessResult, styles.wrong)}>
      <span className={styles.trialGuessResultIcon}>✗</span>
      <div>
        <p className={styles.trialGuessResultHeadline}>{getLabel('guessHeadlineIncorrect')}</p>
        {showSpoilerSafeNone ? (
          <>
            <p className={styles.trialGuessResultBody}>{getLabel('guessNoneWrongLine1')}</p>
            <p className={styles.trialGuessResultBody}>{getLabel('guessNoneWrongLine2')}</p>
          </>
        ) : (
          <>
            <p className={styles.trialGuessResultBody}>{getLabel('guessNoneWrongLine1')}</p>
            {missedPairs.length > 0 && (
              <p className={styles.trialGuessResultBody}>
                {getLabel('guessNoneRevealPrefix')}{' '}
                {joinFallacyLabels(
                  missedPairs.map((mp, i) => (
                    <strong key={`${mp.sentenceId}-${mp.fallacy.id}-${i}`}>
                      {mp.fallacy.label}{' '}
                      {getLabel('sentenceReference', {
                        replacements: {
                          sentenceIndex: sentenceIndex(mp.sentenceId),
                        },
                      })}
                    </strong>
                  )),
                )}
                .
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NPC round analysis view
// ---------------------------------------------------------------------------

function flattenPicks(
  bySentence: Record<string, string[]>,
): { sentenceId: string; fallacyId: string }[] {
  const out: { sentenceId: string; fallacyId: string }[] = [];
  for (const [sentenceId, ids] of Object.entries(bySentence)) {
    for (const fallacyId of ids) {
      out.push({ sentenceId, fallacyId });
    }
  }
  return out;
}

function uniqueFallacyIdsFromPicks(picks: { sentenceId: string; fallacyId: string }[]): string[] {
  const s = new Set<string>();
  for (const p of picks) s.add(p.fallacyId);
  return Array.from(s);
}

function countIdInRow(ids: string[] | undefined, id: string): number {
  return (ids ?? []).filter((x) => x === id).length;
}

/** Marks each pick pill as pinned when it consumes the multiset `pinnedRow` left-to-right. */
function pinnedPickFlags(pickIds: string[], pinnedRow: string[]): boolean[] {
  const bank = [...pinnedRow];
  return pickIds.map((fid) => {
    const i = bank.indexOf(fid);
    if (i < 0) return false;
    bank.splice(i, 1);
    return true;
  });
}

function NpcRoundAnalysis({
  statement,
  pickerFallacies,
  fallacyById,
  canGuess,
  guessSession,
  onGuess,
  onNoFallaciesRequest,
  analysisTargetKind,
  analysisTargetId,
  insightPoints,
  insightRevealed,
  onHelpRequest,
}: {
  statement: Statement;
  pickerFallacies: LogicalFallacy[];
  fallacyById: Map<string, LogicalFallacy>;
  canGuess: boolean;
  guessSession: FallacyGuessSession | null;
  onGuess: (payload: GuessPayload) => void;
  onNoFallaciesRequest: () => void;
  /** Target metadata forwarded to sentence/fallacy toggle events. */
  analysisTargetKind: AnalysisTargetKind;
  analysisTargetId: string;
  insightPoints: number;
  insightRevealed: boolean;
  onHelpRequest: () => void;
}) {
  const [selectedSentenceId, setSelectedSentenceId] = useState<string | null>(null);
  const [bySentence, setBySentence] = useState<Record<string, string[]>>({});
  const sentenceScrollRef = useRef<HTMLDivElement>(null);
  const prevAttemptsLenRef = useRef(0);

  const lastAttempt = guessSession?.attempts[guessSession.attempts.length - 1] ?? null;
  const attemptsUsed = guessSession?.attempts.length ?? 0;
  const maxAttempts = guessSession?.maxAttempts ?? DEFAULT_MAX_ANALYSIS_ATTEMPTS;
  const hasAnyAttempt = attemptsUsed > 0;
  const revealFull = !!(guessSession && shouldRevealFullSolution(guessSession));
  const terminalSuccess =
    lastAttempt &&
    (lastAttempt.kind === 'no_fallacies'
      ? lastAttempt.correct
      : lastAttempt.kind === 'multi' && lastAttempt.outcome === 'perfect');
  const showAllTruthPills = !!(revealFull || terminalSuccess);
  const spoilerSafeBanner = !revealFull;

  const truth = useMemo(() => truthMultisetFromSentences(statement.sentences), [statement]);
  const pinnedMultiset = useMemo(
    () => pinnedMultisetFromAttempts(truth, guessSession?.attempts ?? []),
    [truth, guessSession],
  );
  const pinnedBySentence = useMemo(
    () => pairListToBySentence(multisetToPairList(pinnedMultiset)),
    [pinnedMultiset],
  );

  useEffect(() => {
    if (!guessSession || guessSession.attempts.length === 0) {
      setBySentence({});
      return;
    }
    const last = guessSession.attempts[guessSession.attempts.length - 1]!;
    const rf = shouldRevealFullSolution(guessSession);
    const termOk =
      last.kind === 'no_fallacies'
        ? last.correct
        : last.kind === 'multi' && last.outcome === 'perfect';

    if (canGuess) {
      const pinned = pinnedMultisetFromAttempts(
        truthMultisetFromSentences(statement.sentences),
        guessSession.attempts,
      );
      setBySentence(pairListToBySentence(multisetToPairList(pinned)));
      return;
    }

    if (rf || termOk) {
      if (last.kind === 'multi') {
        setBySentence(picksToBySentence(last.picks));
      } else {
        setBySentence({});
      }
      return;
    }

    const pinned = pinnedMultisetFromAttempts(
      truthMultisetFromSentences(statement.sentences),
      guessSession.attempts,
    );
    setBySentence(pairListToBySentence(multisetToPairList(pinned)));
  }, [guessSession, canGuess, truth]);

  const totalPickCount = useMemo(() => flattenPicks(bySentence).length, [bySentence]);

  const handleSentenceClick = (s: Sentence) => {
    if (!canGuess) return;
    const isSelecting = s.id !== selectedSentenceId;
    const target = { kind: 'analysis_sentence', sentenceId: s.id } as const;
    if (!canRunTutorialTargetAction(target)) return;
    debateEventBus.emit(
      isSelecting ? 'analysis:sentence_selected' : 'analysis:sentence_deselected',
      {
        sentenceId: s.id,
        targetId: analysisTargetId,
        targetKind: analysisTargetKind,
      },
    );
    setSelectedSentenceId(isSelecting ? s.id : null);
    notifyTutorialTargetAction(target);
  };

  const handleFallacySelect = useCallback(
    (fallacyId: string) => {
      if (!selectedSentenceId || !canGuess) return;
      const target = {
        kind: 'analysis_fallacy',
        fallacyId: fallacyId as LogicalFallacyId,
      } as const;
      if (!canRunTutorialTargetAction(target)) return;
      const sid = selectedSentenceId;
      const cur = bySentence[sid] ?? [];
      const pinnedRow = pinnedBySentence[sid] ?? [];
      const idx = cur.indexOf(fallacyId);
      // Compute the next state and decide which event to emit *before* calling
      // setState. Emitting from inside a functional updater runs during React's
      // render phase — and the tutorial bus listener synchronously calls
      // `useTutorialStore.getState().openTutorial(...)`, which would schedule
      // an update to `TutorialOverlay` while `NpcRoundAnalysis` is still
      // rendering (triggers "Cannot update a component while rendering a
      // different component").
      if (idx >= 0) {
        if (countIdInRow(cur, fallacyId) <= countIdInRow(pinnedRow, fallacyId)) {
          return;
        }
        const next = cur.filter((_, i) => i !== idx);
        const copy = { ...bySentence };
        if (next.length === 0) delete copy[sid];
        else copy[sid] = next;
        setBySentence(copy);
        debateEventBus.emit('analysis:fallacy_deselected', {
          fallacyId,
          sentenceId: sid,
          targetId: analysisTargetId,
          targetKind: analysisTargetKind,
        });
        notifyTutorialTargetAction(target);
        return;
      }
      if (cur.length >= 2) return;
      setBySentence({ ...bySentence, [sid]: [...cur, fallacyId] });
      debateEventBus.emit('analysis:fallacy_selected', {
        fallacyId,
        sentenceId: sid,
        targetId: analysisTargetId,
        targetKind: analysisTargetKind,
      });
      notifyTutorialTargetAction(target);
    },
    [
      canGuess,
      selectedSentenceId,
      pinnedBySentence,
      bySentence,
      analysisTargetId,
      analysisTargetKind,
    ],
  );

  const handleSubmitGuess = () => {
    const target = { kind: 'analysis_action', action: 'submit_guess' } as const;
    if (!canRunTutorialTargetAction(target)) return;
    const picks = flattenPicks(bySentence);
    if (picks.length === 0) return;
    onGuess({ type: 'picks', picks });
    notifyTutorialTargetAction(target);
  };

  const handleNoFallacies = () => {
    const target = { kind: 'analysis_action', action: 'no_fallacies' } as const;
    if (!canRunTutorialTargetAction(target)) return;
    onNoFallaciesRequest();
    notifyTutorialTargetAction(target);
  };

  const handleHelp = () => {
    const target = { kind: 'analysis_action', action: 'help' } as const;
    if (!canRunTutorialTargetAction(target)) return;
    if (insightPoints < HELP_INSIGHT_COST || insightRevealed) return;
    onHelpRequest();
    notifyTutorialTargetAction(target);
  };

  const selectedIdsForPicker = selectedSentenceId ? (bySentence[selectedSentenceId] ?? []) : [];

  const readOnlySelectedIds =
    lastAttempt?.kind === 'multi' ? uniqueFallacyIdsFromPicks(lastAttempt.picks) : [];
  const wasNoFallaciesGuess = lastAttempt?.kind === 'no_fallacies';

  const showReadOnlyPicker =
    !canGuess &&
    hasAnyAttempt &&
    revealFull &&
    lastAttempt &&
    ((lastAttempt.kind === 'multi' && lastAttempt.outcome !== 'perfect') ||
      (lastAttempt.kind === 'no_fallacies' && !lastAttempt.correct));

  const showGuessAside = canGuess || showReadOnlyPicker;

  useEffect(() => {
    const currentAttempts = guessSession?.attempts.length ?? 0;
    const prevAttempts = prevAttemptsLenRef.current;
    prevAttemptsLenRef.current = currentAttempts;
    if (!lastAttempt || currentAttempts <= prevAttempts) return;

    requestAnimationFrame(() => {
      sentenceScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    });
  }, [lastAttempt, guessSession?.attempts.length]);

  return (
    <div className={cn(styles.trialAnalysisBody, styles.trialAnalysisBodyFill)}>
      <div
        className={cn(styles.trialAnalysisSplit, {
          [styles.trialAnalysisSplitSingle]: !showGuessAside,
        })}
      >
        <div className={styles.trialLeftMain}>
          <div className={styles.trialScrollSlot}>
            <ScrollFadeContainer
              isModal
              className={styles.trialAnalysisColumnScroll}
              scrollRef={sentenceScrollRef}
            >
              <div className={styles.trialSentenceList}>
                {lastAttempt ? (
                  <div className={styles.trialSentenceFeedback}>
                    <GuessResultBanner
                      guess={lastAttempt}
                      statement={statement}
                      spoilerSafe={spoilerSafeBanner}
                      shouldRevealFullSolution={revealFull}
                      fallacyById={fallacyById}
                    />
                    <p className={styles.trialSentenceAttemptRecap}>
                      {getLabel('attemptRecapCompact', {
                        replacements: {
                          attemptsUsed,
                          maxAttempts,
                        },
                      })}
                    </p>
                  </div>
                ) : (
                  <div
                    className={cn(styles.trialSentenceFeedback, styles.trialSentenceFeedbackStart)}
                  >
                    <div className={cn(styles.trialGuessResult, styles.pending)}>
                      <span className={styles.trialGuessResultIcon}>•</span>
                      <div>
                        <p className={styles.trialGuessResultHeadline}>
                          {getLabel('guessAwaitingHeadline')}
                        </p>
                        <p className={styles.trialGuessResultBody}>
                          {getLabel('guessAwaitingBody')}
                        </p>
                      </div>
                    </div>
                    <p className={styles.trialSentenceAttemptRecap}>
                      {getLabel('attemptRecapCompact', {
                        replacements: {
                          attemptsUsed,
                          maxAttempts,
                        },
                      })}
                    </p>
                  </div>
                )}
                {statement.sentences.map((s) => {
                  const isSelected = selectedSentenceId === s.id;
                  const playerPickIds = bySentence[s.id] ?? [];
                  const pinnedIds = pinnedBySentence[s.id] ?? [];
                  const showTruthRow = showAllTruthPills && s.logicalFallacies.length > 0;
                  const pinnedFlags = pinnedPickFlags(playerPickIds, pinnedIds);
                  const readonlyPinnedFlags =
                    !canGuess && playerPickIds.length > 0
                      ? pinnedPickFlags(playerPickIds, pinnedIds)
                      : [];

                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={cn(styles.trialSentenceCard, {
                        [styles.selected]: isSelected,
                        [styles.clickable]: canGuess,
                        [styles.static]: !canGuess,
                        [styles.hasFallacyRevealed]: showTruthRow,
                      })}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSentenceClick(s);
                      }}
                      data-tutorial-analysis-sentence-id={s.id}
                    >
                      <p className={styles.trialSentenceText}>{s.text}</p>
                      {canGuess && playerPickIds.length > 0 && (
                        <div className={styles.trialPlayerPickRow}>
                          {playerPickIds.map((fid, pillIdx) => {
                            const f = fallacyById.get(fid);
                            if (!f) return null;
                            const isPinned = pinnedFlags[pillIdx] ?? false;
                            return (
                              <span
                                key={`${fid}-${pillIdx}`}
                                className={cn(
                                  styles.trialPlayerPickPill,
                                  isPinned && styles.trialPinnedPill,
                                )}
                                title={f.description}
                              >
                                <img
                                  src={getLogicalFallacyIconSrc(fid)}
                                  alt=""
                                  className={styles.trialPillIcon}
                                />
                                {f.label}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {!canGuess && playerPickIds.length > 0 && !showTruthRow && (
                        <div className={styles.trialPlayerPickRow}>
                          {playerPickIds.map((fid, pillIdx) => {
                            const f = fallacyById.get(fid);
                            if (!f) return null;
                            const isPinned = readonlyPinnedFlags[pillIdx] ?? false;
                            return (
                              <span
                                key={`${fid}-${pillIdx}`}
                                className={cn(
                                  styles.trialPlayerPickPill,
                                  isPinned && styles.trialFallacyPill,
                                )}
                                title={f.description}
                              >
                                <img
                                  src={getLogicalFallacyIconSrc(fid)}
                                  alt=""
                                  className={styles.trialPillIcon}
                                />
                                {f.label}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {showTruthRow && (
                        <div className={styles.trialPlayerPickRow}>
                          {s.logicalFallacies.map((f: LogicalFallacyScenario, i) => {
                            const fallacy = fallacyById.get(f.id);
                            if (!fallacy) return null;
                            return (
                              <span
                                key={`${f.id}-${i}`}
                                className={styles.trialFallacyPill}
                                title={fallacy.description}
                              >
                                <img
                                  src={getLogicalFallacyIconSrc(f.id)}
                                  alt=""
                                  className={styles.trialPillIcon}
                                />
                                {fallacy.label}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {insightRevealed && s.logicalFallacies.length > 0 && (
                        <span
                          className={styles.trialSentenceHelpMark}
                          aria-label={getLabel('helpConfirmTitle', {
                            replacements: { cost: HELP_INSIGHT_COST },
                          })}
                        >
                          <img
                            src={genericFallacyIcon}
                            alt=""
                            className={styles.trialSentenceHelpMarkIcon}
                          />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollFadeContainer>
          </div>
        </div>

        {showGuessAside && (
          <div className={styles.trialRightMain}>
            {canGuess && (
              <>
                <div className={styles.trialColumnInstructions}>
                  <p className={styles.trialAnalysisHint}>{getLabel('analysisFlowHint')}</p>
                </div>

                <div
                  className={cn(
                    styles.trialFallacyPickerSection,
                    styles.trialFallacyPickerSectionStretch,
                  )}
                >
                  <div className={styles.trialScrollSlot}>
                    <ScrollFadeContainer isModal className={styles.trialAnalysisColumnScroll}>
                      <FallacyPicker
                        fallacies={pickerFallacies}
                        selectedIds={selectedIdsForPicker}
                        onSelect={handleFallacySelect}
                        disabled={!selectedSentenceId}
                        compactGrid
                      />
                    </ScrollFadeContainer>
                  </div>
                </div>
              </>
            )}

            {showReadOnlyPicker && (
              <>
                <div className={styles.trialColumnInstructions}>
                  <p className={cn(styles.trialAnalysisHint, styles.disabled)}>
                    {getLabel('yourLastGuessReadOnly')}
                  </p>
                </div>
                <div className={styles.trialFallacyPickerSection}>
                  <div className={styles.trialScrollSlot}>
                    <ScrollFadeContainer isModal className={styles.trialAnalysisColumnScroll}>
                      <FallacyPicker
                        fallacies={pickerFallacies}
                        selectedIds={wasNoFallaciesGuess ? [] : readOnlySelectedIds}
                        onSelect={() => {}}
                        disabled
                        compactGrid
                      />
                    </ScrollFadeContainer>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {showGuessAside && (
          <div className={styles.trialRightFooter}>
            {canGuess && (
              <div className={styles.trialGuessActionsRow}>
                <TrialTextButton
                  variant="dashed"
                  widthMode="flexGrow"
                  onClick={handleHelp}
                  disabled={insightPoints < HELP_INSIGHT_COST || insightRevealed}
                  data-tutorial-analysis-action="help"
                >
                  {getLabel('helpButton', {
                    replacements: { count: insightPoints, cost: HELP_INSIGHT_COST.toString() },
                  })}
                </TrialTextButton>
                <TrialTextButton
                  variant="dashed"
                  widthMode="flexGrow"
                  onClick={handleNoFallacies}
                  data-tutorial-analysis-action="no_fallacies"
                >
                  {getLabel('noFallaciesInStatement')}
                </TrialTextButton>
                <TrialTextButton
                  widthMode="flexGrow"
                  onClick={handleSubmitGuess}
                  disabled={totalPickCount === 0}
                  data-tutorial-analysis-action="submit_guess"
                >
                  {getLabel('submitGuess')}
                </TrialTextButton>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Player assessment (impact / reason) — after fallacy guessing ends
// ---------------------------------------------------------------------------

function PlayerAssessmentSection({ option }: { option: PlayerOption }) {
  const impactBounds = perRoundImpactScoreBounds();
  return (
    <div className={styles.trialAnalysisBody} style={{ marginTop: '1rem' }}>
      <div className={shared.trialSectionBox} style={{ marginBottom: '0' }}>
        <p
          style={{
            fontSize: 'calc(var(--ui-font-subtitle) * var(--ui-trial-panel-font-scale, 1))',
            color: uiColor.textHint,
            marginBottom: '0.5rem',
          }}
        >
          {getLabel('assessment')}
        </p>
        <p
          style={{
            fontSize: 'calc(var(--ui-font-body) * var(--ui-trial-panel-font-scale, 1))',
            fontWeight: 400,
            color: uiColor.textBody,
          }}
        >
          <ModeratorOpinionInline
            score={option.impact}
            min={impactBounds.min}
            max={impactBounds.max}
            variant="compact"
          />
        </p>
        {option.reason && (
          <p
            style={{
              marginTop: '0.75rem',
              fontSize: 'calc(var(--ui-font-body) * var(--ui-trial-panel-font-scale, 1))',
              lineHeight: 1.5,
              color: uiColor.textMuted,
            }}
          >
            {option.reason}
          </p>
        )}
      </div>
    </div>
  );
}

function syntheticStatementFromPlayerTarget(
  round: PlayerRoundEntry,
  chosenOption: PlayerOption,
): Statement {
  return {
    id: chosenOption.id,
    type: round.type,
    speakerId: 'player',
    sentences: resolvedOptionSentences(chosenOption, true),
  };
}

// ---------------------------------------------------------------------------
// No-Fallacies confirmation dialog (rendered inside the modal box)
// ---------------------------------------------------------------------------

function NoFallaciesConfirmDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className={styles.trialConfirmOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className={styles.trialConfirmBox}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <p className={styles.trialConfirmTitle}>{getLabel('noFallaciesConfirmTitle')}</p>
        <p className={styles.trialConfirmBody}>{getLabel('noFallaciesConfirmBody')}</p>
        <div className={styles.trialConfirmActions}>
          <TrialTextButton size="compact" onClick={onCancel}>
            {getLabel('cancel')}
          </TrialTextButton>
          <TrialTextButton
            size="compact"
            onClick={onConfirm}
            data-tutorial-analysis-action="no_fallacies_confirm"
          >
            {getLabel('confirm')}
          </TrialTextButton>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Help (Insight Point) confirmation dialog
// ---------------------------------------------------------------------------

function HelpConfirmDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className={styles.trialConfirmOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className={styles.trialConfirmBox}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <p className={styles.trialConfirmTitle}>
          {getLabel('helpConfirmTitle', { replacements: { cost: HELP_INSIGHT_COST } })}
        </p>
        <p className={styles.trialConfirmBody}>
          {getLabel('helpConfirmBody', { replacements: { cost: HELP_INSIGHT_COST } })}
        </p>
        <div className={styles.trialConfirmActions}>
          <TrialTextButton size="compact" onClick={onCancel}>
            {getLabel('cancel')}
          </TrialTextButton>
          <TrialTextButton size="compact" onClick={onConfirm}>
            {getLabel('confirm')}
          </TrialTextButton>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal root
// ---------------------------------------------------------------------------

const RoundAnalysisModal: React.FC<RoundAnalysisModalProps> = ({
  target,
  allFallacies,
  availableLogicalFallacies,
  fallacyById,
  speakerName,
  canGuess,
  guessSession,
  onGuess,
  onClose,
  activeRoundNumber,
  insightPoints,
  insightRevealed,
  onSpendInsightPoint,
}) => {
  const [showNoFallaciesConfirm, setShowNoFallaciesConfirm] = useState(false);
  const [showHelpConfirm, setShowHelpConfirm] = useState(false);
  const modalScrollRef = useRef<HTMLDivElement>(null);
  const analysisTargetKeyRef = useRef<string>('');
  const prevAttemptsLenRef = useRef(0);

  const analysisTargetKey =
    target.kind === 'player'
      ? target.chosenOption.id
      : target.kind === 'npc'
        ? target.round.id
        : target.statement.id;

  /** Narrow the bus enum alongside `target.kind`. */
  const analysisTargetKind: AnalysisTargetKind = target.kind;
  const analysisTargetId: string = analysisTargetKey;

  const analysisRoundNumber =
    target.kind === 'opponent_prompt' || target.kind === 'opponent_response'
      ? target.playerRound.roundNumber
      : target.round.roundNumber;

  // Emit `analysis:open` when the modal mounts for a new target; `analysis:close` on unmount /
  // target change. Balances open/close regardless of how the modal is dismissed (backdrop,
  // ✕ button, ESC wiring, parent state change).
  useEffect(() => {
    const payload = {
      targetKind: analysisTargetKind,
      targetId: analysisTargetId,
      analysisRoundNumber,
      activeRoundNumber,
    };
    debateEventBus.emit('analysis:open', payload);
    return () => {
      debateEventBus.emit('analysis:close', payload);
    };
    // Open/close paired once per target key — `activeRoundNumber` is captured when the target changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisTargetKey]);

  const pickerFallacies = useMemo(() => {
    const allowed = new Set(availableLogicalFallacies);
    return allFallacies.filter((f) => allowed.has(f.id as LogicalFallacyId));
  }, [allFallacies, availableLogicalFallacies]);

  const playerSyntheticStatement = useMemo((): Statement | null => {
    if (target.kind !== 'player') return null;
    return syntheticStatementFromPlayerTarget(target.round, target.chosenOption);
  }, [target]);

  const playerRevealAssessment = useMemo(() => {
    if (target.kind !== 'player') return false;
    if (!guessSession || guessSession.attempts.length === 0) return false;
    const revealFull = shouldRevealFullSolution(guessSession);
    const last = guessSession.attempts[guessSession.attempts.length - 1]!;
    const terminalOk =
      last.kind === 'no_fallacies'
        ? last.correct
        : last.kind === 'multi' && last.outcome === 'perfect';
    return revealFull || terminalOk;
  }, [target, guessSession]);

  useEffect(() => {
    if (!analysisTargetKey) return;
    const n = guessSession?.attempts.length ?? 0;
    if (analysisTargetKeyRef.current !== analysisTargetKey) {
      analysisTargetKeyRef.current = analysisTargetKey;
      prevAttemptsLenRef.current = n;
      return;
    }

    const prevLen = prevAttemptsLenRef.current;
    prevAttemptsLenRef.current = n;
    if (n <= prevLen) return;

    let rafOuter = 0;
    let rafInner = 0;
    let scrollTimeout: ReturnType<typeof setTimeout> | undefined;

    const runScroll = () => {
      const el = modalScrollRef.current;
      if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
    };

    rafOuter = requestAnimationFrame(() => {
      rafInner = requestAnimationFrame(() => {
        scrollTimeout = window.setTimeout(runScroll, 48);
      });
    });

    return () => {
      cancelAnimationFrame(rafOuter);
      cancelAnimationFrame(rafInner);
      if (scrollTimeout !== undefined) window.clearTimeout(scrollTimeout);
    };
  }, [guessSession?.attempts.length, analysisTargetKey]);

  const handleNoFallaciesConfirm = () => {
    const target = { kind: 'analysis_action', action: 'no_fallacies_confirm' } as const;
    if (!canRunTutorialTargetAction(target)) return;
    onGuess({ type: 'no_fallacies' });
    setShowNoFallaciesConfirm(false);
    notifyTutorialTargetAction(target);
  };

  const handleHelpConfirm = () => {
    onSpendInsightPoint();
    setShowHelpConfirm(false);
  };

  const statType =
    target.kind === 'npc'
      ? target.round.type
      : target.kind === 'opponent_prompt' || target.kind === 'opponent_response'
        ? target.statement.type
        : target.round.type;

  const titleSuffix =
    target.kind === 'opponent_prompt'
      ? getLabel('opponentsQuestion', { replacements: { speakerName } })
      : target.kind === 'opponent_response'
        ? getLabel('opponentsResponse', { replacements: { speakerName } })
        : speakerName;

  return (
    <div
      className={styles.trialModalOverlay}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const target = { kind: 'analysis_action', action: 'close' } as const;
        if (!canRunTutorialTargetAction(target)) return;
        onClose();
        notifyTutorialTargetAction(target);
      }}
    >
      <div
        className={cn(shared.trialModalFontScope, styles.trialModalBox)}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.trialModalHeader}>
          <div className={styles.trialModalHeaderMain}>
            <img src={magnifyingIcon} alt="" className={styles.trialModalHeaderIcon} />
            <div className={styles.trialModalHeaderTitles}>
              <p className={styles.trialModalTitle}>
                {getLabel('modalRoundTitle', {
                  replacements: {
                    roundNumber: analysisRoundNumber,
                    tail: target.kind === 'player' ? getLabel('you') : titleSuffix,
                  },
                })}
              </p>
              <p className={styles.trialModalSubtitle}>{statementTypeLabel(statType)}</p>
            </div>
          </div>
          <button
            type="button"
            className={styles.trialModalCloseBtn}
            onClick={() => {
              const target = { kind: 'analysis_action', action: 'close' } as const;
              if (!canRunTutorialTargetAction(target)) return;
              onClose();
              notifyTutorialTargetAction(target);
            }}
            aria-label={getLabel('close')}
            data-tutorial-analysis-action="close"
          >
            ✕
          </button>
        </div>

        <ScrollFadeContainer
          isModal
          className={styles.trialModalContent}
          scrollRef={modalScrollRef}
        >
          {target.kind === 'player' ? (
            playerSyntheticStatement ? (
              <>
                <NpcRoundAnalysis
                  statement={playerSyntheticStatement}
                  pickerFallacies={pickerFallacies}
                  fallacyById={fallacyById}
                  canGuess={canGuess}
                  guessSession={guessSession}
                  onGuess={onGuess}
                  onNoFallaciesRequest={() => setShowNoFallaciesConfirm(true)}
                  analysisTargetKind={analysisTargetKind}
                  analysisTargetId={analysisTargetId}
                  insightPoints={insightPoints}
                  insightRevealed={insightRevealed}
                  onHelpRequest={() => setShowHelpConfirm(true)}
                />
                {playerRevealAssessment ? (
                  <PlayerAssessmentSection option={target.chosenOption} />
                ) : null}
              </>
            ) : null
          ) : (
            <NpcRoundAnalysis
              statement={target.kind === 'npc' ? target.round.statement : target.statement}
              pickerFallacies={pickerFallacies}
              fallacyById={fallacyById}
              canGuess={canGuess}
              guessSession={guessSession}
              onGuess={onGuess}
              onNoFallaciesRequest={() => setShowNoFallaciesConfirm(true)}
              analysisTargetKind={analysisTargetKind}
              analysisTargetId={analysisTargetId}
              insightPoints={insightPoints}
              insightRevealed={insightRevealed}
              onHelpRequest={() => setShowHelpConfirm(true)}
            />
          )}
        </ScrollFadeContainer>

        {showNoFallaciesConfirm && (
          <NoFallaciesConfirmDialog
            onConfirm={handleNoFallaciesConfirm}
            onCancel={() => setShowNoFallaciesConfirm(false)}
          />
        )}

        {showHelpConfirm && (
          <HelpConfirmDialog
            onConfirm={handleHelpConfirm}
            onCancel={() => setShowHelpConfirm(false)}
          />
        )}
      </div>
    </div>
  );
};

export default RoundAnalysisModal;
