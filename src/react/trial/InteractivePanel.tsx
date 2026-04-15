import React from 'react';
import type { DebateScenarioJson } from '../../types/debateEntities';
import type { useTrialRoundWorkflow } from './useTrialRoundWorkflow';
import type { AnalysisTarget, GuessRecord } from './RoundAnalysisModal';

function guessStateForRecord(record: GuessRecord): 'correct' | 'partial' | 'wrong' {
  if (record.kind === 'no_fallacies') return record.correct ? 'correct' : 'wrong';
  if (record.outcome === 'perfect') return 'correct';
  if (record.outcome === 'partial') return 'partial';
  return 'wrong';
}
import ScrollFadeContainer from './components/ScrollFadeContainer';
import StatementBlock from './components/StatementBlock';
import AnalyzeButton from './components/AnalyzeButton';
import { getSpeakerName, statementText, scoreColor } from './utils/trialHelpers';
import { isPlayerOptionUnlocked, resolvedOptionSentences } from './optionUnlock';
import styles from './TrialUI.module.scss';
import shared from './trialShared.module.scss';
import { uiFont } from '../uiFont';

interface InteractiveFooter {
  submitLabel: string;
  submitDisabled: boolean;
  onSubmit?: () => void;
}

interface InteractivePanelProps {
  wf: ReturnType<typeof useTrialRoundWorkflow>;
  debate: DebateScenarioJson;
  fallacyGuesses: Map<number, GuessRecord>;
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
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" className={styles.trialChoiceBtn} onClick={onClick} disabled={disabled}>
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
        if (!playerRound) return null;

        let promptGuessState: 'correct' | 'partial' | 'wrong' | null = null;
        if (playerRound.opponentPrompt) {
          const record = fallacyGuesses.get(playerRound.roundNumber);
          if (record && record.npcRoundId === playerRound.opponentPrompt.id) {
            promptGuessState = guessStateForRecord(record);
          }
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {playerRound.opponentPrompt && (
              <StatementBlock
                speakerLabel={`${getSpeakerName(debate, playerRound.opponentPrompt.speakerId)}'s question:`}
                text={statementText(playerRound.opponentPrompt.sentences)}
                analyzeButton={
                  <AnalyzeButton
                    guessState={promptGuessState}
                    title="Analyze this statement"
                    onClick={() =>
                      onOpenAnalysis({
                        kind: 'opponent_prompt',
                        statement: playerRound.opponentPrompt!,
                        playerRound,
                      })
                    }
                  />
                }
              />
            )}
            <div className={styles.trialChoices}>
              {playerRound.options.map((opt, idx) => {
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
                return (
                  <ChoiceButton
                    key={opt.id}
                    label={`${String.fromCharCode(65 + idx)}. ${body}`}
                    disabled={locked}
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
            style={{ fontSize: uiFont.body, lineHeight: 1.375, color: 'rgba(255,255,255,0.85)' }}
          >
            <p style={{ color: 'rgba(255,255,255,0.50)' }}>Your choice (full text)</p>
            <p style={{ marginTop: '0.5rem', color: 'rgba(255,255,255,0.85)' }}>
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
                borderTop: '1px solid rgba(255,255,255,0.10)',
                paddingTop: '1rem',
                fontSize: uiFont.body,
                lineHeight: 1.375,
                color: 'rgba(255,255,255,0.45)',
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

      case 'debate_complete':
        return (
          <div
            className={shared.trialSectionBox}
            style={{ fontSize: uiFont.body, lineHeight: 1.375, color: 'rgba(255,255,255,0.85)' }}
          >
            <p>The debate is finished.</p>
            <p
              style={{
                marginTop: '1rem',
                fontSize: uiFont.body,
                color: 'rgba(255,255,255,0.50)',
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
