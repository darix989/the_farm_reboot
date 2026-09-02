import React, { useCallback, useMemo } from 'react';
import getLabel from '../../data/labels';
import type { DebateScenarioKey } from '../../data/levels';
import { PLAYER_CHARACTER_ID, resolveCharacter } from '../../data/characters';
import { farmNpcById } from '../../data/farmMap';
import { useFarmStore } from '../../store/farmStore';
import { useGameStore } from '../../store/gameStore';
import { GameManager } from '../../utils/gameManager';
import { farmDialogueFor } from '../farm/farmDialogueState';
import { isSmartphone } from '../../utils/chromeAndroidFullscreen';
import CharacterStage from '../farm/CharacterStage';
import FarmDialogue from '../farm/FarmDialogue';
import styles from '../farm/FarmUI.module.scss';

/**
 * Overworld overlay. Deliberately almost empty — the farm itself is Phaser, and
 * everything here sits on the `pointer-events: none` overlay, so each interactive
 * element re-enables pointer events for itself (see AGENTS.md).
 */
/** Phones have no keyboard, and the joystick is summoned by touching anywhere. */
const MOVE_HINT_LABEL = isSmartphone() ? 'farmMoveHintTouch' : 'farmMoveHint';

const FarmUI: React.FC = () => {
  const nearbyNpcId = useFarmStore((s) => s.nearbyNpcId);
  const talkingToNpcId = useFarmStore((s) => s.talkingToNpcId);
  const openDialogue = useFarmStore((s) => s.openDialogue);
  const closeDialogue = useFarmStore((s) => s.closeDialogue);

  const dialogue = useMemo(
    () => (talkingToNpcId ? farmDialogueFor(talkingToNpcId) : null),
    [talkingToNpcId],
  );

  const nearbyNpc = nearbyNpcId ? farmNpcById(nearbyNpcId) : null;

  const startEncounter = useCallback((scenario: DebateScenarioKey) => {
    const store = useGameStore.getState();
    // Order matters: the scenario must be set before the scene switch, or TrialUI
    // mounts with the previous encounter for a frame.
    store.setActiveDebate(scenario);
    store.setReturnSceneKey('Farm');
    useFarmStore.getState().closeDialogue();
    GameManager.switchScene('Trial');
  }, []);

  return (
    <div className={styles.farmUi}>
      {!dialogue && <p className={styles.moveHint}>{getLabel(MOVE_HINT_LABEL)}</p>}

      {nearbyNpc && !dialogue && (
        <button
          type="button"
          className={styles.talkPrompt}
          onClick={() => openDialogue(nearbyNpc.id)}
        >
          {getLabel('farmTalkPrompt', {
            replacements: { name: resolveCharacter(nearbyNpc.id).displayName },
          })}
          <span className={styles.talkPromptKey}>{getLabel('farmInteractHint')}</span>
        </button>
      )}

      {dialogue && (
        <>
          <div className={styles.characterStage}>
            <CharacterStage
              participantIds={[PLAYER_CHARACTER_ID, dialogue.npcId]}
              activeSpeakerId={dialogue.npcId}
            />
          </div>
          <FarmDialogue dialogue={dialogue} onStart={startEncounter} onClose={closeDialogue} />
        </>
      )}
    </div>
  );
};

export default FarmUI;
