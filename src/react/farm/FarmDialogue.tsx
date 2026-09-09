import React, { useCallback, useMemo, useState } from 'react';
import getLabel from '../../data/labels';
import { resolveCharacter } from '../../data/characters';
import type { DebateScenarioKey } from '../../data/levels';
import type { FarmDialogueState } from './farmDialogueState';
import { useWizardReveal } from '../hooks/useWizardReveal';
import { revealChunks } from '../trial/utils/trialHelpers';
import TrialLayout from '../trial/TrialLayout';
import WizardPanel, { type WizardPanelDetail } from '../trial/panels/WizardPanel';
import FarmTalkActionsPanel from './FarmTalkActionsPanel';
import { useUnmetConditionsHint } from '../hooks/useGameConditions';

interface FarmDialogueProps {
  dialogue: FarmDialogueState;
  onStart: (scenario: DebateScenarioKey) => void;
  onClose: () => void;
}

/**
 * Farm talk screen. Same `TrialLayout` as a debate — Dialog bottom-left, Actions
 * bottom-right, farm framed in the game hole — with no log and no Analyze / Back.
 * Keyed on `dialogue.slotKey` at the call site so a new conversation remounts clean.
 */
const FarmDialogue: React.FC<FarmDialogueProps> = ({ dialogue, onStart, onClose }) => {
  const [beatIndex, setBeatIndex] = useState(0);
  const lastIndex = Math.max(0, dialogue.beats.length - 1);
  const index = Math.min(Math.max(0, beatIndex), lastIndex);
  const beat = dialogue.beats[index];
  const isLast = index >= lastIndex;

  const body = beat ? getLabel(beat.textLabel) : '';
  const sentences = useMemo(() => revealChunks(body), [body]);

  const reveal = useWizardReveal(
    beat ? { key: `farm:${dialogue.slotKey}:${index}`, sentences } : null,
    { enabled: true, resetKey: dialogue.slotKey },
  );
  const revealActive = reveal.active;
  const revealSettled = reveal.settled;
  const revealAdvance = reveal.advance;

  const advanceBeat = useCallback(() => {
    setBeatIndex((current) => Math.min(current + 1, lastIndex));
  }, [lastIndex]);

  // Subscribed rather than snapshotted, so an encounter that unlocks while this conversation is
  // on screen un-greys its own Talk button. That is not hypothetical: the tutorial in Cass's
  // encounter teaches a fallacy, and the player can walk straight to the animal it unlocks.
  const lockedHint = useUnmetConditionsHint(dialogue.scenarioRequires);

  const detail = useMemo((): WizardPanelDetail | null => {
    if (!beat) return null;
    return {
      title: getLabel('wizardDetailSpeaks', {
        replacements: { name: resolveCharacter(beat.speakerId).displayName },
      }),
      body,
      sentenceCount: sentences.length,
      speaker: { characterId: beat.speakerId, emotion: beat.emotion ?? 'talking' },
    };
  }, [beat, body, sentences.length]);

  return (
    <div style={{ height: '100%', minHeight: 0, width: '100%' }}>
      <TrialLayout
        stage={null}
        wizard={
          <WizardPanel
            detail={detail}
            reveal={
              revealActive || revealSettled
                ? {
                    spoken: reveal.spoken,
                    typing: reveal.typing,
                    sentenceCount: reveal.sentenceCount,
                    skipToken: reveal.skipToken,
                    onSentenceTyped: reveal.onSentenceTyped,
                    settled: revealSettled,
                  }
                : null
            }
            roundLabel={null}
          />
        }
        interactive={
          <FarmTalkActionsPanel
            revealActive={revealActive}
            isLastBeat={isLast}
            scenario={dialogue.scenario}
            lockedHint={lockedHint}
            onRevealAdvance={revealAdvance}
            onAdvanceBeat={advanceBeat}
            onStart={onStart}
            onClose={onClose}
          />
        }
      />
    </div>
  );
};

export default FarmDialogue;
