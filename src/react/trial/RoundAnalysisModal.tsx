import React, { useCallback, useEffect, useMemo, useState } from 'react';
import cn from 'classnames';
import type {
  LogicalFallacy,
  LogicalFallacyScenario,
  NpcRoundEntry,
  PlayerOption,
  PlayerRoundEntry,
  Sentence,
  Statement,
} from '../../types/debateEntities';

import magnifyingIcon from '../../static/icons/magnifying.svg';
import fallacyPlaceholder from '../../static/icons/fallacy_placeholder.svg';
import ScrollFadeContainer from './components/ScrollFadeContainer';
import { qualityColor, qualityLabel, statementTypeLabel } from './utils/trialHelpers';
import { resolvedOptionSentences } from './optionUnlock';
import styles from './RoundAnalysisModal.module.scss';
import shared from './trialShared.module.scss';
import { uiFont } from '../uiFont';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GuessPayload =
  | { type: 'picks'; picks: { sentenceId: string; fallacyId: string }[] }
  | { type: 'no_fallacies' };

export type GuessRecord =
  | {
      kind: 'multi';
      npcRoundId: string;
      picks: { sentenceId: string; fallacyId: string }[];
      outcome: 'perfect' | 'partial' | 'none';
      missedPairs: { sentenceId: string; fallacy: LogicalFallacy }[];
    }
  | {
      kind: 'no_fallacies';
      npcRoundId: string;
      correct: boolean;
      actualFallacies: LogicalFallacy[];
    };

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
  /** True when the player has an active turn (choosing / confirming). */
  canGuess: boolean;
  existingGuess: GuessRecord | null;
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

function GuessResultBanner({ guess, statement }: { guess: GuessRecord; statement: Statement }) {
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
                This statement does contain logical fallacies:{' '}
                {joinFallacyLabels(
                  guess.actualFallacies.map((f) => <strong key={f.id}>{f.label}</strong>),
                )}
                .
              </p>
            </div>
          </>
        )}
      </div>
    );
  }

  const { outcome, missedPairs } = guess;

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
    return (
      <div className={cn(styles.trialGuessResult, styles.partial)}>
        <span className={styles.trialGuessResultIcon}>◆</span>
        <div>
          <p className={styles.trialGuessResultHeadline}>Partially correct</p>
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
        </div>
      </div>
    );
  }

  return (
    <div className={cn(styles.trialGuessResult, styles.wrong)}>
      <span className={styles.trialGuessResultIcon}>✗</span>
      <div>
        <p className={styles.trialGuessResultHeadline}>Incorrect</p>
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
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NPC round analysis view
// ---------------------------------------------------------------------------

function picksToBySentence(
  picks: { sentenceId: string; fallacyId: string }[],
): Record<string, string[]> {
  const acc: Record<string, string[]> = {};
  for (const p of picks) {
    if (!acc[p.sentenceId]) acc[p.sentenceId] = [];
    if (!acc[p.sentenceId].includes(p.fallacyId)) acc[p.sentenceId].push(p.fallacyId);
  }
  return acc;
}

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

function NpcRoundAnalysis({
  statement,
  allFallacies,
  fallacyById,
  canGuess,
  existingGuess,
  onGuess,
  onNoFallaciesRequest,
}: {
  statement: Statement;
  allFallacies: LogicalFallacy[];
  fallacyById: Map<string, LogicalFallacy>;
  canGuess: boolean;
  existingGuess: GuessRecord | null;
  onGuess: (payload: GuessPayload) => void;
  onNoFallaciesRequest: () => void;
}) {
  const [selectedSentenceId, setSelectedSentenceId] = useState<string | null>(null);
  const [bySentence, setBySentence] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (existingGuess?.kind === 'multi') {
      setBySentence(picksToBySentence(existingGuess.picks));
    } else if (!existingGuess) {
      setBySentence({});
    }
  }, [existingGuess]);

  const hasGuessed = existingGuess !== null;
  const wasNoFallaciesGuess = existingGuess?.kind === 'no_fallacies';

  const totalPickCount = useMemo(() => flattenPicks(bySentence).length, [bySentence]);

  const handleSentenceClick = (s: Sentence) => {
    if (hasGuessed || !canGuess) return;
    setSelectedSentenceId(s.id === selectedSentenceId ? null : s.id);
  };

  const handleFallacySelect = useCallback(
    (fallacyId: string) => {
      if (!selectedSentenceId || hasGuessed) return;
      setBySentence((prev) => {
        const sid = selectedSentenceId;
        const cur = prev[sid] ?? [];
        const idx = cur.indexOf(fallacyId);
        if (idx >= 0) {
          const next = cur.filter((id) => id !== fallacyId);
          const copy = { ...prev };
          if (next.length === 0) delete copy[sid];
          else copy[sid] = next;
          return copy;
        }
        if (cur.length >= 2) return prev;
        return { ...prev, [sid]: [...cur, fallacyId] };
      });
    },
    [hasGuessed, selectedSentenceId],
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

  const showReadOnlyPicker =
    hasGuessed &&
    ((existingGuess!.kind === 'multi' && existingGuess!.outcome !== 'perfect') ||
      (existingGuess!.kind === 'no_fallacies' && !existingGuess!.correct));

  const readOnlySelectedIds =
    existingGuess?.kind === 'multi' ? uniqueFallacyIdsFromPicks(existingGuess.picks) : [];

  return (
    <div className={styles.trialAnalysisBody}>
      {!hasGuessed && canGuess && (
        <p className={styles.trialAnalysisHint}>
          Select a sentence, then pick up to two logical fallacies (toggle to remove). You can tag
          multiple sentences before submitting — or use &quot;No Fallacies&quot; if the statement is
          clean.
        </p>
      )}
      {!hasGuessed && !canGuess && (
        <p className={cn(styles.trialAnalysisHint, styles.disabled)}>
          Fallacy analysis is available during your turn.
        </p>
      )}

      <div className={styles.trialSentenceList}>
        {statement.sentences.map((s) => {
          const isSelected = selectedSentenceId === s.id;
          const revealFallacy = s.logicalFallacies.length > 0 && hasGuessed;

          const playerPickIds = bySentence[s.id] ?? [];

          return (
            <button
              key={s.id}
              type="button"
              className={cn(styles.trialSentenceCard, {
                [styles.selected]: isSelected,
                [styles.clickable]: canGuess && !hasGuessed,
                [styles.static]: !canGuess || hasGuessed,
                [styles.hasFallacyRevealed]: revealFallacy,
              })}
              onClick={(e) => {
                e.stopPropagation();
                handleSentenceClick(s);
              }}
            >
              <p className={styles.trialSentenceText}>{s.text}</p>
              {!hasGuessed && canGuess && playerPickIds.length > 0 && (
                <div className={styles.trialPlayerPickRow}>
                  {playerPickIds.map((fid) => {
                    const f = allFallacies.find((x) => x.id === fid);
                    if (!f) return null;
                    return (
                      <span key={fid} className={styles.trialPlayerPickPill} title={f.description}>
                        <img src={fallacyPlaceholder} alt="" className={styles.trialPillIcon} />
                        {f.label}
                      </span>
                    );
                  })}
                </div>
              )}
              {revealFallacy && (
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

      {canGuess && !hasGuessed && selectedSentenceId && (
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

      {canGuess && !hasGuessed && totalPickCount > 0 && (
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

      {canGuess && !hasGuessed && (
        <div className={styles.trialNoFallaciesRow}>
          <button type="button" className={styles.trialNoFallaciesBtn} onClick={handleNoFallacies}>
            No Fallacies in this statement
          </button>
        </div>
      )}

      {showReadOnlyPicker && (
        <div className={styles.trialFallacyPickerSection}>
          <p className={cn(styles.trialAnalysisHint, styles.disabled)}>Your guess (read-only):</p>
          <FallacyPicker
            fallacies={allFallacies}
            selectedIds={wasNoFallaciesGuess ? [] : readOnlySelectedIds}
            onSelect={() => {}}
            disabled
          />
        </div>
      )}

      {hasGuessed && <GuessResultBanner guess={existingGuess!} statement={statement} />}
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
            color: 'rgba(255,255,255,0.50)',
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
                  ? '#67e8f9'
                  : option.impact < 0
                    ? '#f87171'
                    : 'rgba(255,255,255,0.40)',
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
              color: 'rgba(255,255,255,0.75)',
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
          You're about to submit that this statement contains no logical fallacies. This cannot be
          undone.
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
  existingGuess,
  onGuess,
  onClose,
}) => {
  const [showNoFallaciesConfirm, setShowNoFallaciesConfirm] = useState(false);

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

        <ScrollFadeContainer isModal className={styles.trialModalContent}>
          {target.kind === 'player' ? (
            <PlayerRoundAnalysis option={target.chosenOption} fallacyById={fallacyById} />
          ) : (
            <NpcRoundAnalysis
              statement={target.kind === 'npc' ? target.round.statement : target.statement}
              allFallacies={allFallacies}
              fallacyById={fallacyById}
              canGuess={canGuess}
              existingGuess={existingGuess}
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
