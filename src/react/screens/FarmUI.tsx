import React, { useCallback, useMemo } from 'react';
import getLabel from '../../data/labels';
import type { DebateScenarioKey } from '../../data/levels';
import { resolveCharacter } from '../../data/characters';
import { farmNpcById } from '../../data/farmMap';
import { useFarmStore } from '../../store/farmStore';
import { useGameStore } from '../../store/gameStore';
import { useCodexUiStore } from '../../store/codexUiStore';
import { GameManager } from '../../utils/gameManager';
import { farmDialogueFor, farmNpcRequirements } from '../farm/farmDialogueState';
import { useConditionsMet } from '../hooks/useGameConditions';
import { areConditionsMet, conditionContextSnapshot } from '../../utils/gameConditions';
import { scenarioRequirements } from '../../data/levels';
import { isSmartphone } from '../../utils/chromeAndroidFullscreen';
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
  const openCodex = useCodexUiStore((s) => s.openCodex);

  const dialogue = useMemo(
    () => (talkingToNpcId ? farmDialogueFor(talkingToNpcId) : null),
    [talkingToNpcId],
  );

  const nearbyNpc = nearbyNpcId ? farmNpcById(nearbyNpcId) : null;
  // Recomputed whenever the nearby animal changes; the requirements themselves are static
  // authored data, so `useConditionsMet` is what makes the badge react to progress.
  const nearbyRequires = useMemo(
    () => (nearbyNpcId ? farmNpcRequirements(nearbyNpcId) : []),
    [nearbyNpcId],
  );
  const nearbyUnlocked = useConditionsMet(nearbyRequires);

  const startEncounter = useCallback((scenario: DebateScenarioKey) => {
    // Re-checked here rather than trusted from the button's disabled state: this is the one
    // door into the Trial scene from the overworld, and a locked encounter reached through a
    // stale render would strand the player in a conversation that assumes things they have not
    // been told.
    if (!areConditionsMet(scenarioRequirements(scenario), conditionContextSnapshot())) return;

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

      {/* Hidden during a conversation: the talk screen fills the stage, and the Codex opening
          over it would cover the line the player is reading. */}
      {!dialogue && (
        <button className={styles.codexButton} type="button" onClick={() => openCodex()}>
          {getLabel('codexOpen')}
        </button>
      )}

      {nearbyNpc && !dialogue && (
        <button
          type="button"
          className={styles.talkPrompt}
          onClick={() => openDialogue(nearbyNpc.id)}
        >
          {getLabel('farmTalkPrompt', {
            replacements: { name: resolveCharacter(nearbyNpc.id).displayName },
          })}
          {/* The prompt stays enabled when locked: the animal will still talk, they just will
              not start their encounter, and the conversation is where the reason is given. */}
          <span className={styles.talkPromptKey}>
            {nearbyUnlocked ? getLabel('farmInteractHint') : getLabel('farmPromptLocked')}
          </span>
        </button>
      )}

      {dialogue && (
        <FarmDialogue
          key={dialogue.slotKey}
          dialogue={dialogue}
          onStart={startEncounter}
          onClose={closeDialogue}
        />
      )}
    </div>
  );
};

export default FarmUI;
