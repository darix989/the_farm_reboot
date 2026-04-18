import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import cn from 'classnames';
import type {
  LogicalFallacy,
  LogicalFallacyScenario,
  NpcRoundEntry,
  PlayerOption,
  PlayerRoundEntry,
  Sentence,
  Statement,
} from '../../../types/debateEntities';

import magnifyingIcon from '../../../static/icons/magnifying.svg';
import fallacyPlaceholder from '../../../static/icons/fallacy_placeholder.svg';
import ScrollFadeContainer from '../components/ScrollFadeContainer';
import { qualityColor, qualityLabel, statementTypeLabel } from '../utils/trialHelpers';
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
import styles from './RoundAnalysisModal.module.scss';
import shared from '../trialShared.module.scss';
import { uiFont } from '../../uiFont';
import { uiColor } from '../../uiColor';

export type { FallacyGuessSession, GuessPayload, GuessRecord } from '../utils/fallacyGuessTypes';
export { DEFAULT_MAX_ANALYSIS_ATTEMPTS } from '../utils/fallacyGuessTypes';

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
  fallacyById: Map<string, LogicalFallacy>;
  speakerName: string;
  /** True when the player may still submit for this analysis target. */
  canGuess: boolean;
  guessSession: FallacyGuessSession | null;
  onGuess: (payload: GuessPayload) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// FallacyPicker
// ---------------------------------------------------------------------------

function FallacyPicker({
  fallacies,
  selectedIds,
  onSelect,
  disabled,
}: {
  fallacies: LogicalFallacy[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className={styles.trialFallacyGrid}>
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
        >
          <img src={fallacyPlaceholder} alt="" className={styles.trialFallacyItemIcon} />
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
              <p className={styles.trialGuessResultHeadline}>Correct!</p>
              <p className={styles.trialGuessResultBody}>
                This statement contains no logical fallacies.
              </p>
            </div>
          </>
        ) : (
          <>
            <span className={styles.trialGuessResultIcon}>✗</span>
            <div>
              <p className={styles.trialGuessResultHeadline}>Incorrect</p>
              <p className={styles.trialGuessResultBody}>
                {spoilerSafe && !shouldRevealFullSolution ? (
                  <>
                    This statement still contains logical fallacies. Try again if you have attempts
                    left.
                  </>
                ) : (
                  <>
                    This statement does contain logical fallacies:{' '}
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
          <p className={styles.trialGuessResultHeadline}>Correct!</p>
          <p className={styles.trialGuessResultBody}>
            You found every logical fallacy in the right sentences.
          </p>
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
          <p className={styles.trialGuessResultHeadline}>Partially correct</p>
          {showSpoilerSafePartial ? (
            <>
              <p className={styles.trialGuessResultBody}>
                Some of your selections matched. Confirmed for this attempt:
              </p>
              <p className={styles.trialGuessResultBody}>
                Confirmed for this attempt:{' '}
                {joinFallacyLabels(
                  correctThisAttempt.map((p, i) => {
                    const f = fallacyById.get(p.fallacyId);
                    if (!f) return null;
                    return (
                      <strong key={`${p.sentenceId}-${p.fallacyId}-${i}`}>
                        {f.label} (sentence {sentenceIndex(p.sentenceId)})
                      </strong>
                    );
                  }),
                )}
                .
              </p>
              <p className={styles.trialGuessResultBody}>
                Other selections were not confirmed. You can try again if you have attempts left.
              </p>
            </>
          ) : (
            <>
              <p className={styles.trialGuessResultBody}>
                You found at least one fallacy correctly, but some selections were wrong or some
                fallacies were missed.
              </p>
              {missedPairs.length > 0 && (
                <p className={styles.trialGuessResultBody}>
                  Missed:{' '}
                  {joinFallacyLabels(
                    missedPairs.map((mp, i) => (
                      <strong key={`${mp.sentenceId}-${mp.fallacy.id}-${i}`}>
                        {mp.fallacy.label} (sentence {sentenceIndex(mp.sentenceId)})
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
        <p className={styles.trialGuessResultHeadline}>Incorrect</p>
        {showSpoilerSafeNone ? (
          <>
            <p className={styles.trialGuessResultBody}>
              None of your selections matched a logical fallacy in the right place.
            </p>
            <p className={styles.trialGuessResultBody}>
              You can try again if you have attempts left.
            </p>
          </>
        ) : (
          <>
            <p className={styles.trialGuessResultBody}>
              None of your selections matched a logical fallacy in the right place.
            </p>
            {missedPairs.length > 0 && (
              <p className={styles.trialGuessResultBody}>
                The statement contains:{' '}
                {joinFallacyLabels(
                  missedPairs.map((mp, i) => (
                    <strong key={`${mp.sentenceId}-${mp.fallacy.id}-${i}`}>
                      {mp.fallacy.label} (sentence {sentenceIndex(mp.sentenceId)})
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
  allFallacies,
  fallacyById,
  canGuess,
  guessSession,
  onGuess,
  onNoFallaciesRequest,
}: {
  statement: Statement;
  allFallacies: LogicalFallacy[];
  fallacyById: Map<string, LogicalFallacy>;
  canGuess: boolean;
  guessSession: FallacyGuessSession | null;
  onGuess: (payload: GuessPayload) => void;
  onNoFallaciesRequest: () => void;
}) {
  const [selectedSentenceId, setSelectedSentenceId] = useState<string | null>(null);
  const [bySentence, setBySentence] = useState<Record<string, string[]>>({});

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
    setSelectedSentenceId(s.id === selectedSentenceId ? null : s.id);
  };

  const handleFallacySelect = useCallback(
    (fallacyId: string) => {
      if (!selectedSentenceId || !canGuess) return;
      setBySentence((prev) => {
        const sid = selectedSentenceId;
        const cur = prev[sid] ?? [];
        const pinnedRow = pinnedBySentence[sid] ?? [];
        const idx = cur.indexOf(fallacyId);
        if (idx >= 0) {
          if (countIdInRow(cur, fallacyId) <= countIdInRow(pinnedRow, fallacyId)) {
            return prev;
          }
          const next = cur.filter((_, i) => i !== idx);
          const copy = { ...prev };
          if (next.length === 0) delete copy[sid];
          else copy[sid] = next;
          return copy;
        }
        if (cur.length >= 2) return prev;
        return { ...prev, [sid]: [...cur, fallacyId] };
      });
    },
    [canGuess, selectedSentenceId, pinnedBySentence],
  );

  const handleSubmitGuess = () => {
    const picks = flattenPicks(bySentence);
    if (picks.length === 0) return;
    onGuess({ type: 'picks', picks });
  };

  const handleNoFallacies = () => {
    onNoFallaciesRequest();
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

  return (
    <div className={styles.trialAnalysisBody}>
      <p className={styles.trialAnalysisHint}>
        {maxAttempts} attempts per analysis.{' '}
        {hasAnyAttempt
          ? `Attempt ${attemptsUsed} of ${maxAttempts} — ${Math.max(0, maxAttempts - attemptsUsed)} remaining.`
          : `You have up to ${maxAttempts} attempts.`}
      </p>

      {!hasAnyAttempt && canGuess && (
        <p className={styles.trialAnalysisHint}>
          Select a sentence, then pick up to two logical fallacies (toggle to remove). You can tag
          multiple sentences before submitting — or use &quot;No Fallacies&quot; if the statement is
          clean.
        </p>
      )}
      {!canGuess && !hasAnyAttempt && (
        <p className={cn(styles.trialAnalysisHint, styles.disabled)}>
          You cannot submit fallacy guesses in this phase of the debate.
        </p>
      )}

      {lastAttempt && (
        <GuessResultBanner
          guess={lastAttempt}
          statement={statement}
          spoilerSafe={spoilerSafeBanner}
          shouldRevealFullSolution={revealFull}
          fallacyById={fallacyById}
        />
      )}

      <div className={styles.trialSentenceList}>
        {statement.sentences.map((s) => {
          const isSelected = selectedSentenceId === s.id;
          const playerPickIds = bySentence[s.id] ?? [];
          const pinnedIds = pinnedBySentence[s.id] ?? [];
          const showTruthRow = showAllTruthPills && s.logicalFallacies.length > 0;
          const pinnedFlags = pinnedPickFlags(playerPickIds, pinnedIds);
          const readonlyPinnedFlags =
            !canGuess && playerPickIds.length > 0 ? pinnedPickFlags(playerPickIds, pinnedIds) : [];

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
            >
              <p className={styles.trialSentenceText}>{s.text}</p>
              {canGuess && playerPickIds.length > 0 && (
                <div className={styles.trialPlayerPickRow}>
                  {playerPickIds.map((fid, pillIdx) => {
                    const f = allFallacies.find((x) => x.id === fid);
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
                        <img src={fallacyPlaceholder} alt="" className={styles.trialPillIcon} />
                        {f.label}
                      </span>
                    );
                  })}
                </div>
              )}
              {!canGuess && playerPickIds.length > 0 && !showTruthRow && (
                <div className={styles.trialPlayerPickRow}>
                  {playerPickIds.map((fid, pillIdx) => {
                    const f = allFallacies.find((x) => x.id === fid);
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
                        <img src={fallacyPlaceholder} alt="" className={styles.trialPillIcon} />
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
                        <img src={fallacyPlaceholder} alt="" className={styles.trialPillIcon} />
                        {fallacy.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {canGuess && selectedSentenceId && (
        <div className={styles.trialFallacyPickerSection}>
          <p className={styles.trialAnalysisHint}>
            Choose fallacies for this sentence (up to two, click again to remove):
          </p>
          <FallacyPicker
            fallacies={allFallacies}
            selectedIds={selectedIdsForPicker}
            onSelect={handleFallacySelect}
          />
        </div>
      )}

      {canGuess && totalPickCount > 0 && (
        <div className={styles.trialAnalysisSubmitRow}>
          <button
            type="button"
            className={cn(shared.trialFooterBtn, styles.submitFooterBtn)}
            onClick={handleSubmitGuess}
          >
            Submit guess
          </button>
        </div>
      )}

      {canGuess && (
        <div className={styles.trialNoFallaciesRow}>
          <button type="button" className={styles.trialNoFallaciesBtn} onClick={handleNoFallacies}>
            No Fallacies in this statement
          </button>
        </div>
      )}

      {showReadOnlyPicker && (
        <div className={styles.trialFallacyPickerSection}>
          <p className={cn(styles.trialAnalysisHint, styles.disabled)}>
            Your last guess (read-only):
          </p>
          <FallacyPicker
            fallacies={allFallacies}
            selectedIds={wasNoFallaciesGuess ? [] : readOnlySelectedIds}
            onSelect={() => {}}
            disabled
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Player round analysis view
// ---------------------------------------------------------------------------

function PlayerRoundAnalysis({
  option,
  fallacyById,
}: {
  option: PlayerOption;
  fallacyById: Map<string, LogicalFallacy>;
}) {
  const sentences = resolvedOptionSentences(option, true);
  return (
    <div className={styles.trialAnalysisBody}>
      <div className={shared.trialSectionBox} style={{ marginBottom: '1rem' }}>
        <p
          style={{
            fontSize: uiFont.subtitle,
            color: uiColor.textHint,
            marginBottom: '0.5rem',
          }}
        >
          Assessment
        </p>
        <p
          style={{
            fontSize: uiFont.body,
            fontWeight: 600,
            color: qualityColor(option.quality),
          }}
        >
          {qualityLabel(option.quality)}
          <span
            style={{
              marginLeft: '0.75rem',
              fontSize: uiFont.subtitle,
              fontWeight: 400,
              color:
                option.impact > 0
                  ? uiColor.infoBright
                  : option.impact < 0
                    ? uiColor.danger
                    : uiColor.textFaint,
            }}
          >
            {option.impact > 0 ? '+' : ''}
            {option.impact} pts
          </span>
        </p>
        {option.reason && (
          <p
            style={{
              marginTop: '0.75rem',
              fontSize: uiFont.body,
              lineHeight: 1.5,
              color: uiColor.textMuted,
            }}
          >
            {option.reason}
          </p>
        )}
      </div>

      <p className={styles.trialAnalysisHint} style={{ marginBottom: '0.5rem' }}>
        Statement breakdown:
      </p>
      <div className={styles.trialSentenceList}>
        {sentences.map((s) => {
          const hasFallacy = s.logicalFallacies.length > 0;
          return (
            <div
              key={s.id}
              className={cn(styles.trialSentenceCard, styles.static, {
                [styles.hasFallacyRevealed]: hasFallacy,
              })}
            >
              <p className={styles.trialSentenceText}>{s.text}</p>
              {hasFallacy && (
                <div
                  style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}
                >
                  {s.logicalFallacies.map((f) => {
                    const fallacy = fallacyById.get(f.id);
                    if (!fallacy) return null;
                    return (
                      <span
                        key={f.id}
                        className={styles.trialFallacyPill}
                        title={fallacy.description}
                      >
                        <img src={fallacyPlaceholder} alt="" className={styles.trialPillIcon} />
                        {fallacy.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
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
        <p className={styles.trialConfirmTitle}>No Fallacies?</p>
        <p className={styles.trialConfirmBody}>
          You&apos;re about to submit that this statement contains no logical fallacies. This uses
          one attempt and cannot be undone.
        </p>
        <div className={styles.trialConfirmActions}>
          <button
            type="button"
            className={cn(shared.trialFooterBtn, styles.confirmFooterBtn)}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={cn(shared.trialFooterBtn, styles.confirmFooterBtn)}
            onClick={onConfirm}
          >
            Confirm
          </button>
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
  fallacyById,
  speakerName,
  canGuess,
  guessSession,
  onGuess,
  onClose,
}) => {
  const [showNoFallaciesConfirm, setShowNoFallaciesConfirm] = useState(false);
  const modalScrollRef = useRef<HTMLDivElement>(null);
  const analysisTargetKeyRef = useRef<string>('');
  const prevAttemptsLenRef = useRef(0);

  const analysisTargetKey =
    target.kind === 'player' ? '' : target.kind === 'npc' ? target.round.id : target.statement.id;

  useEffect(() => {
    if (target.kind === 'player' || !analysisTargetKey) return;
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
  }, [guessSession?.attempts.length, analysisTargetKey, target.kind]);

  const handleNoFallaciesConfirm = () => {
    onGuess({ type: 'no_fallacies' });
    setShowNoFallaciesConfirm(false);
  };

  const roundNumber =
    target.kind === 'opponent_prompt' || target.kind === 'opponent_response'
      ? target.playerRound.roundNumber
      : target.round.roundNumber;

  const statType =
    target.kind === 'npc'
      ? target.round.type
      : target.kind === 'opponent_prompt' || target.kind === 'opponent_response'
        ? target.statement.type
        : target.round.type;

  const titleSuffix =
    target.kind === 'opponent_prompt'
      ? `${speakerName}'s question`
      : target.kind === 'opponent_response'
        ? `${speakerName}'s response`
        : speakerName;

  return (
    <div
      className={styles.trialModalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={styles.trialModalBox}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.trialModalHeader}>
          <div className={styles.trialModalHeaderLeft}>
            <img src={magnifyingIcon} alt="" className={styles.trialModalHeaderIcon} />
            <div>
              <p className={styles.trialModalTitle}>
                Round {roundNumber} — {target.kind === 'player' ? 'You' : titleSuffix}
              </p>
              <p className={styles.trialModalSubtitle}>
                {statementTypeLabel(statType)}
                {target.kind === 'player' && (
                  <>
                    {' '}
                    <span
                      style={{
                        color: qualityColor(target.chosenOption.quality),
                        fontWeight: 600,
                      }}
                    >
                      · {qualityLabel(target.chosenOption.quality)}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.trialModalCloseBtn}
            onClick={onClose}
            aria-label="Close"
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
            <PlayerRoundAnalysis option={target.chosenOption} fallacyById={fallacyById} />
          ) : (
            <NpcRoundAnalysis
              statement={target.kind === 'npc' ? target.round.statement : target.statement}
              allFallacies={allFallacies}
              fallacyById={fallacyById}
              canGuess={canGuess}
              guessSession={guessSession}
              onGuess={onGuess}
              onNoFallaciesRequest={() => setShowNoFallaciesConfirm(true)}
            />
          )}
        </ScrollFadeContainer>

        {showNoFallaciesConfirm && (
          <NoFallaciesConfirmDialog
            onConfirm={handleNoFallaciesConfirm}
            onCancel={() => setShowNoFallaciesConfirm(false)}
          />
        )}
      </div>
    </div>
  );
};

export default RoundAnalysisModal;
