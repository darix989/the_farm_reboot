import React, { useState } from 'react';
import cn from 'classnames';
import type {
  LogicalFallacy,
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
import styles from './RoundAnalysisModal.module.scss';
import shared from './trialShared.module.scss';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GuessRecord {
  npcRoundId: string;
  sentenceId: string;
  fallacyId: string;
  correct: boolean;
  /** Fallacies actually present in the chosen sentence (may be empty). */
  actualFallacies: LogicalFallacy[];
}

export type AnalysisTarget =
  | { kind: 'npc'; round: NpcRoundEntry }
  | { kind: 'player'; round: PlayerRoundEntry; chosenOption: PlayerOption }
  | { kind: 'opponent_prompt'; statement: Statement; playerRound: PlayerRoundEntry }
  | { kind: 'opponent_response'; statement: Statement; playerRound: PlayerRoundEntry };

interface RoundAnalysisModalProps {
  target: AnalysisTarget;
  allFallacies: LogicalFallacy[];
  speakerName: string;
  /** True when the player has an active turn (choosing / confirming). */
  canGuess: boolean;
  existingGuess: GuessRecord | null;
  onGuess: (sentenceId: string, fallacyId: string) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// FallacyPicker
// ---------------------------------------------------------------------------

function FallacyPicker({
  fallacies,
  selectedId,
  onSelect,
}: {
  fallacies: LogicalFallacy[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className={styles.trialFallacyGrid}>
      {fallacies.map((f) => (
        <button
          key={f.id}
          type="button"
          className={cn(styles.trialFallacyItem, {
            [styles.selected]: selectedId === f.id,
          })}
          onClick={() => onSelect(f.id)}
          title={f.description}
        >
          <img src={fallacyPlaceholder} alt="" className={styles.trialFallacyItemIcon} />
          <span className={styles.trialFallacyItemLabel}>{f.label}</span>
        </button>
      ))}
    </div>
  );
}

// Sentinel value used when the player claims the statement has no fallacies at all.
export const NO_FALLACIES_ID = 'no_fallacies';

// ---------------------------------------------------------------------------
// GuessResultBanner
// ---------------------------------------------------------------------------

function GuessResultBanner({ guess }: { guess: GuessRecord }) {
  const isNoFallaciesGuess = guess.fallacyId === NO_FALLACIES_ID;
  const pickedFallacyId = guess.fallacyId;

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
              {isNoFallaciesGuess ? (
                'This statement contains no logical fallacies.'
              ) : (
                <>
                  That sentence does contain a{' '}
                  <strong>
                    {guess.actualFallacies.find((f) => f.id === pickedFallacyId)?.label ??
                      pickedFallacyId}
                  </strong>
                  . {guess.actualFallacies.find((f) => f.id === pickedFallacyId)?.description}
                </>
              )}
            </p>
          </div>
        </>
      ) : (
        <>
          <span className={styles.trialGuessResultIcon}>✗</span>
          <div>
            <p className={styles.trialGuessResultHeadline}>Incorrect</p>
            {isNoFallaciesGuess ? (
              <p className={styles.trialGuessResultBody}>
                This statement does contain logical fallacies:{' '}
                {guess.actualFallacies
                  .map((f) => <strong key={f.id}>{f.label}</strong>)
                  .reduce<
                    React.ReactNode[]
                  >((acc, el, i) => (i === 0 ? [el] : [...acc, ', ', el]), [])}
                .
              </p>
            ) : guess.actualFallacies.length > 0 ? (
              <p className={styles.trialGuessResultBody}>
                That sentence contains:{' '}
                {guess.actualFallacies
                  .map((f) => <strong key={f.id}>{f.label}</strong>)
                  .reduce<
                    React.ReactNode[]
                  >((acc, el, i) => (i === 0 ? [el] : [...acc, ', ', el]), [])}
                .
              </p>
            ) : (
              <p className={styles.trialGuessResultBody}>
                That sentence contains no logical fallacy.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// NPC round analysis view
// ---------------------------------------------------------------------------

function NpcRoundAnalysis({
  statement,
  allFallacies,
  canGuess,
  existingGuess,
  onGuess,
  onNoFallaciesRequest,
}: {
  statement: Statement;
  allFallacies: LogicalFallacy[];
  canGuess: boolean;
  existingGuess: GuessRecord | null;
  onGuess: (sentenceId: string, fallacyId: string) => void;
  onNoFallaciesRequest: () => void;
}) {
  // When the existing guess is "no fallacies" there's no sentence to pre-select.
  const [selectedSentenceId, setSelectedSentenceId] = useState<string | null>(
    existingGuess?.sentenceId || null,
  );
  const [pickedFallacyId, setPickedFallacyId] = useState<string | null>(
    existingGuess && existingGuess.fallacyId !== NO_FALLACIES_ID ? existingGuess.fallacyId : null,
  );

  const hasGuessed = existingGuess !== null;
  const wasNoFallaciesGuess = existingGuess?.fallacyId === NO_FALLACIES_ID;

  const handleSentenceClick = (s: Sentence) => {
    if (hasGuessed || !canGuess) return;
    setSelectedSentenceId(s.id === selectedSentenceId ? null : s.id);
    setPickedFallacyId(null);
  };

  const handleFallacySelect = (fallacyId: string) => {
    if (hasGuessed) return;
    setPickedFallacyId(fallacyId);
  };

  const handleSubmitGuess = () => {
    if (!selectedSentenceId || !pickedFallacyId) return;
    onGuess(selectedSentenceId, pickedFallacyId);
  };

  const handleNoFallacies = () => {
    onNoFallaciesRequest();
  };

  return (
    <div className={styles.trialAnalysisBody}>
      {/* Instruction / status */}
      {!hasGuessed && canGuess && (
        <p className={styles.trialAnalysisHint}>
          Select a sentence you believe contains a logical fallacy, then pick one from the list — or
          submit "No Fallacies" if the statement is clean.
        </p>
      )}
      {!hasGuessed && !canGuess && (
        <p className={cn(styles.trialAnalysisHint, styles.disabled)}>
          Fallacy analysis is available during your turn.
        </p>
      )}

      {/* Sentence list */}
      <div className={styles.trialSentenceList}>
        {statement.sentences.map((s) => {
          const isSelected = selectedSentenceId === s.id;
          const isGuessedSentence = existingGuess?.sentenceId === s.id;
          // Reveal a correct sentence-level guess, OR reveal ALL fallacious
          // sentences when the player wrongly claimed "No Fallacies".
          const revealFallacy =
            s.logicalFallacies.length > 0 &&
            hasGuessed &&
            ((isGuessedSentence && existingGuess!.correct) ||
              (wasNoFallaciesGuess && !existingGuess!.correct));

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
              {revealFallacy &&
                s.logicalFallacies.map((f) => (
                  <span key={f.id} className={styles.trialFallacyPill} title={f.description}>
                    <img src={fallacyPlaceholder} alt="" className={styles.trialPillIcon} />
                    {f.label}
                  </span>
                ))}
            </button>
          );
        })}
      </div>

      {/* Fallacy picker — only when a sentence is selected and we can still guess */}
      {canGuess && !hasGuessed && selectedSentenceId && (
        <div className={styles.trialFallacyPickerSection}>
          <p className={styles.trialAnalysisHint}>
            Choose the fallacy you think this sentence contains:
          </p>
          <FallacyPicker
            fallacies={allFallacies}
            selectedId={pickedFallacyId}
            onSelect={handleFallacySelect}
          />
          <div className={styles.trialAnalysisSubmitRow}>
            <button
              type="button"
              className={cn(shared.trialFooterBtn, styles.submitFooterBtn)}
              disabled={!pickedFallacyId}
              onClick={handleSubmitGuess}
            >
              Submit guess
            </button>
          </div>
        </div>
      )}

      {/* "No Fallacies" alternative — available whenever the player can still guess */}
      {canGuess && !hasGuessed && (
        <div className={styles.trialNoFallaciesRow}>
          <button type="button" className={styles.trialNoFallaciesBtn} onClick={handleNoFallacies}>
            No Fallacies in this statement
          </button>
        </div>
      )}

      {/* Read-only fallacy picker after a wrong sentence-level guess */}
      {hasGuessed && !existingGuess!.correct && !wasNoFallaciesGuess && (
        <div className={styles.trialFallacyPickerSection}>
          <p className={cn(styles.trialAnalysisHint, styles.disabled)}>Your guess (read-only):</p>
          <FallacyPicker
            fallacies={allFallacies}
            selectedId={existingGuess!.fallacyId}
            onSelect={() => {}}
          />
        </div>
      )}

      {/* Result banner */}
      {hasGuessed && <GuessResultBanner guess={existingGuess!} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Player round analysis view
// ---------------------------------------------------------------------------

function PlayerRoundAnalysis({ option }: { option: PlayerOption }) {
  return (
    <div className={styles.trialAnalysisBody}>
      {/* Quality summary */}
      <div className={shared.trialSectionBox} style={{ marginBottom: '1rem' }}>
        <p
          style={{ fontSize: '1.375rem', color: 'rgba(255,255,255,0.50)', marginBottom: '0.5rem' }}
        >
          Assessment
        </p>
        <p
          style={{
            fontSize: '1.875rem',
            fontWeight: 600,
            color: qualityColor(option.quality),
          }}
        >
          {qualityLabel(option.quality)}
          <span
            style={{
              marginLeft: '0.75rem',
              fontSize: '1.375rem',
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
              fontSize: '1.625rem',
              lineHeight: 1.5,
              color: 'rgba(255,255,255,0.75)',
            }}
          >
            {option.reason}
          </p>
        )}
      </div>

      {/* Sentences annotated */}
      <p className={styles.trialAnalysisHint} style={{ marginBottom: '0.5rem' }}>
        Statement breakdown:
      </p>
      <div className={styles.trialSentenceList}>
        {option.sentences.map((s) => {
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
                  {s.logicalFallacies.map((f) => (
                    <span key={f.id} className={styles.trialFallacyPill} title={f.description}>
                      <img src={fallacyPlaceholder} alt="" className={styles.trialPillIcon} />
                      {f.label}
                    </span>
                  ))}
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
  speakerName,
  canGuess,
  existingGuess,
  onGuess,
  onClose,
}) => {
  const [showNoFallaciesConfirm, setShowNoFallaciesConfirm] = useState(false);

  const handleNoFallaciesConfirm = () => {
    onGuess('', NO_FALLACIES_ID);
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
        {/* Header */}
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

        {/* Body */}
        <ScrollFadeContainer isModal className={styles.trialModalContent}>
          {target.kind === 'player' ? (
            <PlayerRoundAnalysis option={target.chosenOption} />
          ) : (
            <NpcRoundAnalysis
              statement={target.kind === 'npc' ? target.round.statement : target.statement}
              allFallacies={allFallacies}
              canGuess={canGuess}
              existingGuess={existingGuess}
              onGuess={onGuess}
              onNoFallaciesRequest={() => setShowNoFallaciesConfirm(true)}
            />
          )}
        </ScrollFadeContainer>

        {/* Confirmation dialog — absolute overlay inside the modal box */}
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
