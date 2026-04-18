import React, { useMemo, useState } from 'react';
import type { DebateScenarioJson } from '../../../types/debateEntities';
import type { useTrialRoundWorkflow } from '../../hooks/useTrialRoundWorkflow';
import type { AnalysisTarget } from '../roundAnalysisModal/RoundAnalysisModal';
import type { FallacyGuessSession } from '../utils/fallacyGuessTypes';
import ScrollFadeContainer from '../components/ScrollFadeContainer';
import cn from 'classnames';
import StatementBlock from '../components/StatementBlock';
import AnalyzeButton from '../components/AnalyzeButton';
import {
  getSpeakerName,
  statementText,
  scoreColor,
  shuffleCopyDeterministic,
} from '../utils/trialHelpers';
import { isPlayerOptionUnlocked, resolvedOptionSentences } from '../utils/optionUnlock';
import styles from './TrialPanels.module.scss';
import shared from '../trialShared.module.scss';
import { uiFont } from '../../uiFont';
import { uiColor } from '../../uiColor';

interface InteractiveFooter {
  submitLabel: string;
  submitDisabled: boolean;
  onSubmit?: () => void;
}

interface InteractivePanelProps {
  wf: ReturnType<typeof useTrialRoundWorkflow>;
  debate: DebateScenarioJson;
  fallacyGuesses: Map<number, FallacyGuessSession>;
  revealedLockedOptionIds: Set<string>;
  onRevealLockedOption: (optionId: string) => void;
  interactiveFooter: InteractiveFooter;
  onOpenAnalysis: (target: AnalysisTarget) => void;
  getNpcGuessState: (npcRoundId: string) => 'correct' | 'partial' | 'wrong' | null;
}

// ---------------------------------------------------------------------------
// Choice button
// ---------------------------------------------------------------------------

function ChoiceButton({
  label,
  onClick,
  disabled,
  unlockHint,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** Unlocked statement not yet revealed — periodic nudge to click */
  unlockHint?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(styles.trialChoiceBtn, unlockHint && styles.trialChoiceBtnUnlockHint)}
      onClick={onClick}
      disabled={disabled}
    >
      <span className={styles.trialChoiceBtnInner}>{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

const InteractivePanel: React.FC<InteractivePanelProps> = ({
  wf,
  debate,
  fallacyGuesses,
  revealedLockedOptionIds,
  onRevealLockedOption,
  interactiveFooter,
  onOpenAnalysis,
  getNpcGuessState,
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

  const renderContent = () => {
    switch (wf.gamePhase) {
      case 'npc_speaking': {
        const npc = wf.currentNpcRound;
        if (!npc) return null;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <StatementBlock
              speakerLabel={`${getSpeakerName(debate, npc.speakerId)} speaks:`}
              text={statementText(npc.statement.sentences)}
            />
          </div>
        );
      }

      case 'player_choosing': {
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
                return (
                  <ChoiceButton
                    key={opt.id}
                    label={`${String.fromCharCode(65 + idx)}. ${body}`}
                    disabled={locked}
                    unlockHint={awaitingReveal}
                    onClick={() => {
                      if (
                        opt.unlockCondition &&
                        guessUnlocked &&
                        !revealedLockedOptionIds.has(opt.id)
                      ) {
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
      }

      case 'player_confirming': {
        const opt = wf.selectedOption;
        if (!opt) return null;
        return (
          <div
            className={shared.trialSectionBox}
            style={{ fontSize: uiFont.body, lineHeight: 1.375, color: uiColor.textBody }}
          >
            <p style={{ color: uiColor.textHint }}>Your choice (full text)</p>
            <p style={{ marginTop: '0.5rem', color: uiColor.textBody }}>
              {statementText(
                resolvedOptionSentences(
                  opt,
                  !opt.unlockCondition || isPlayerOptionUnlocked(opt, fallacyGuesses),
                ),
              )}
            </p>
            <p
              style={{
                marginTop: '1.5rem',
                borderTop: `1px solid ${uiColor.borderFade}`,
                paddingTop: '1rem',
                fontSize: uiFont.body,
                lineHeight: 1.375,
                color: uiColor.textCaption,
              }}
            >
              Go back to change your selection, or confirm to lock it in. Confirming cannot be
              undone.
            </p>
          </div>
        );
      }

      case 'npc_responding': {
        const response = wf.activeOpponentResponse;
        const playerRound = wf.currentPlayerRound;
        if (!response || !playerRound) return null;
        return (
          <StatementBlock
            speakerLabel={`${getSpeakerName(debate, response.statement.speakerId)}'s response:`}
            text={statementText(response.statement.sentences)}
            analyzeButton={
              <AnalyzeButton
                guessState={getNpcGuessState(response.statement.id)}
                title="Analyze this response"
                onClick={() =>
                  onOpenAnalysis({
                    kind: 'opponent_response',
                    statement: response.statement,
                    playerRound,
                  })
                }
              />
            }
          />
        );
      }

      case 'round_recap': {
        const response = wf.activeOpponentResponse;
        const playerRound = wf.currentPlayerRound;
        if (response && playerRound) {
          return (
            <StatementBlock
              speakerLabel={`${getSpeakerName(debate, response.statement.speakerId)}'s response:`}
              text={statementText(response.statement.sentences)}
              analyzeButton={
                <AnalyzeButton
                  guessState={getNpcGuessState(response.statement.id)}
                  title="Analyze this response"
                  onClick={() =>
                    onOpenAnalysis({
                      kind: 'opponent_response',
                      statement: response.statement,
                      playerRound,
                    })
                  }
                />
              }
            />
          );
        }
        return (
          <div
            className={shared.trialSectionBox}
            style={{ fontSize: uiFont.body, lineHeight: 1.375, color: uiColor.textBody }}
          >
            <p style={{ margin: 0, color: uiColor.textCaption }}>
              Review the round summary in the dialog. Close it when you are ready to continue.
            </p>
          </div>
        );
      }

      case 'debate_complete':
        return (
          <div
            className={shared.trialSectionBox}
            style={{ fontSize: uiFont.body, lineHeight: 1.375, color: uiColor.textBody }}
          >
            <p>The debate is finished.</p>
            <p
              style={{
                marginTop: '1rem',
                fontSize: uiFont.body,
                color: uiColor.textHint,
              }}
            >
              Final score:{' '}
              <span style={{ color: scoreColor(wf.totalScore) }}>
                {wf.totalScore > 0 ? '+' : ''}
                {wf.totalScore}
              </span>{' '}
              out of {wf.maxPossibleScore}
            </p>
          </div>
        );

      default:
        return null;
    }
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
              disabled={!wf.canUndo}
              onClick={wf.undo}
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
