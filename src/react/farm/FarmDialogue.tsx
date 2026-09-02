import React, { useCallback, useEffect } from 'react';
import getLabel from '../../data/labels';
import { resolveCharacter } from '../../data/characters';
import type { DebateScenarioKey } from '../../data/levels';
import type { FarmDialogueState } from './farmDialogueState';
import TrialTextButton from '../trial/components/TrialTextButton';
import styles from './FarmUI.module.scss';

interface FarmDialogueProps {
  dialogue: FarmDialogueState;
  beatIndex: number;
  onAdvance: () => void;
  onStart: (scenario: DebateScenarioKey) => void;
  onClose: () => void;
}

function isAdvanceKey(code: string): boolean {
  return code === 'Space' || code === 'KeyE' || code === 'Enter';
}

/**
 * Sequential conversation box. Continue through beats, then offer the animal's
 * next encounter — or a closing Leave when they have none left.
 */
const FarmDialogue: React.FC<FarmDialogueProps> = ({
  dialogue,
  beatIndex,
  onAdvance,
  onStart,
  onClose,
}) => {
  const lastIndex = Math.max(0, dialogue.beats.length - 1);
  const index = Math.min(Math.max(0, beatIndex), lastIndex);
  const beat = dialogue.beats[index];
  const isLast = index >= lastIndex;
  const speakerName = beat
    ? resolveCharacter(beat.speakerId).displayName
    : getLabel(dialogue.nameLabel);

  const onPrimary = useCallback(() => {
    if (!isLast) {
      onAdvance();
      return;
    }
    if (dialogue.scenario) {
      onStart(dialogue.scenario);
      return;
    }
    onClose();
  }, [dialogue.scenario, isLast, onAdvance, onClose, onStart]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || !isAdvanceKey(event.code)) return;
      event.preventDefault();
      onPrimary();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onPrimary]);

  return (
    <div className={styles.dialogueBackdrop} onClick={onClose} role="presentation">
      <div
        className={styles.dialogueBox}
        role="dialog"
        aria-modal="true"
        aria-label={getLabel(dialogue.nameLabel)}
        onClick={(e) => e.stopPropagation()}
      >
        <p className={styles.dialogueSpeaker}>{speakerName}</p>
        <p className={styles.dialogueBody}>{beat ? getLabel(beat.textLabel) : ''}</p>
        <div className={styles.dialogueActions}>
          {!isLast ? (
            <TrialTextButton onClick={onAdvance}>{getLabel('continue')}</TrialTextButton>
          ) : dialogue.scenario ? (
            <>
              <TrialTextButton onClick={onClose}>{getLabel('farmNotNow')}</TrialTextButton>
              <TrialTextButton onClick={() => onStart(dialogue.scenario as DebateScenarioKey)}>
                {getLabel('farmTalk')}
              </TrialTextButton>
            </>
          ) : (
            <TrialTextButton onClick={onClose}>{getLabel('farmLeave')}</TrialTextButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default FarmDialogue;
