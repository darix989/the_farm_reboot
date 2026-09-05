import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [beatIndex, setBeatIndex] = useState(0);

  const dialogue = useMemo(
    () => (talkingToNpcId ? farmDialogueFor(talkingToNpcId) : null),
    [talkingToNpcId],
  );

  useEffect(() => {
    setBeatIndex(0);
  }, [talkingToNpcId, dialogue?.slotKey]);

  const nearbyNpc = nearbyNpcId ? farmNpcById(nearbyNpcId) : null;
  const currentBeat = dialogue?.beats[Math.min(beatIndex, Math.max(0, dialogue.beats.length - 1))];

  const startEncounter = useCallback((scenario: DebateScenarioKey) => {
    const store = useGameStore.getState();
    // Order matters: the scenario must be set before the scene switch, or TrialUI
    // mounts with the previous encounter for a frame.
    store.setActiveDebate(scenario);
    store.setReturnSceneKey('Farm');
    useFarmStore.getState().closeDialogue();
    GameManager.switchScene('Trial');
  }, []);

  const advanceBeat = useCallback(() => {
    if (!dialogue) return;
    setBeatIndex((index) => Math.min(index + 1, dialogue.beats.length - 1));
  }, [dialogue]);

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
              activeSpeakerId={currentBeat?.speakerId ?? dialogue.npcId}
            />
          </div>
          <FarmDialogue
            dialogue={dialogue}
            beatIndex={beatIndex}
            onAdvance={advanceBeat}
            onStart={startEncounter}
            onClose={closeDialogue}
          />
        </>
      )}
    </div>
  );
};

export default FarmUI;
