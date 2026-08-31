import React from 'react';
import getLabel from '../../data/labels';
import type { DebateScenarioKey } from '../../data/levels';
import type { FarmDialogueState } from './farmDialogueState';
import TrialTextButton from '../trial/components/TrialTextButton';
import styles from './FarmUI.module.scss';

interface FarmDialogueProps {
  dialogue: FarmDialogueState;
  onStart: (scenario: DebateScenarioKey) => void;
  onClose: () => void;
}

/**
 * The conversation box. Offers the animal's next encounter, or a closing line when
 * they have none left.
 */
const FarmDialogue: React.FC<FarmDialogueProps> = ({ dialogue, onStart, onClose }) => (
  <div className={styles.dialogueBackdrop} onClick={onClose} role="presentation">
    <div
      className={styles.dialogueBox}
      role="dialog"
      aria-modal="true"
      aria-label={getLabel(dialogue.nameLabel)}
      onClick={(e) => e.stopPropagation()}
    >
      <p className={styles.dialogueSpeaker}>{getLabel(dialogue.nameLabel)}</p>
      <p className={styles.dialogueBody}>{getLabel(dialogue.messageLabel)}</p>
      <div className={styles.dialogueActions}>
        {dialogue.scenario ? (
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

export default FarmDialogue;
