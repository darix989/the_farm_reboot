import React, { useEffect, useRef } from 'react';
import getLabel from '../../data/labels';
import { ariaKeyShortcutsFor } from '../../data/keyBindings';
import { GameManager } from '../../utils/gameManager';
import type { Farm } from '../../phaser/scenes/Farm';
import { resolveCharacter } from '../../data/characters';
import { farmNpcById } from '../../data/farmMap';
import { useTutorialStore } from '../../store/tutorialStore';
import { supportsTouchInput } from '../../utils/touchInput';
import FarmDialogue from '../farm/FarmDialogue';
import { useFarmOverworldTalk } from '../hooks/useFarmOverworldTalk';
import { canRunTutorialUntargetedAction } from '../tutorial/tutorialInteractionGuard';
import { interactionPromptPosition } from '../farm/interactionPromptPosition';
import ShortcutKeycap from '../shortcuts/ShortcutKeycap';
import styles from '../farm/FarmUI.module.scss';

/**
 * Overworld overlay. Deliberately almost empty — the farm itself is Phaser, and
 * everything here sits on the `pointer-events: none` overlay, so each interactive
 * element re-enables pointer events for itself (see AGENTS.md).
 */
const MOVE_HINT_LABEL = supportsTouchInput() ? 'farmMoveHintTouch' : 'farmMoveHint';

const FarmUI: React.FC = () => {
  const {
    nearbyNpcId,
    pendingFollowUp,
    dialogue,
    openDialogue,
    closeFarmDialogue,
    startEncounter,
  } = useFarmOverworldTalk({ returnSceneKey: 'Farm', introNpcPresent: true });
  const tutorialOpen = useTutorialStore((s) => s.isOpen);
  const interactionPromptRef = useRef<HTMLButtonElement>(null);

  const nearbyNpc = nearbyNpcId ? farmNpcById(nearbyNpcId) : null;
  const nearbyTalkLabel = nearbyNpc
    ? getLabel('farmTalkPrompt', {
        replacements: { name: resolveCharacter(nearbyNpc.id).displayName },
      })
    : '';

  useEffect(() => {
    if (!nearbyNpcId || dialogue) return;

    let frame = 0;
    const updatePromptPosition = () => {
      const scene = GameManager.getCurrentScene();
      const anchor =
        scene?.scene.key === 'Farm' ? (scene as Farm).getNpcInteractionAnchor(nearbyNpcId) : null;
      const prompt = interactionPromptRef.current;
      if (anchor && prompt) {
        const stage = prompt.parentElement;
        if (!stage) return;
        const position = interactionPromptPosition(anchor, {
          stageWidth: stage.clientWidth,
          stageHeight: stage.clientHeight,
          promptWidth: prompt.offsetWidth,
          promptHeight: prompt.offsetHeight,
        });
        prompt.style.left = position.left;
        prompt.style.top = position.top;
      }
      frame = window.requestAnimationFrame(updatePromptPosition);
    };
    updatePromptPosition();
    return () => window.cancelAnimationFrame(frame);
  }, [dialogue, nearbyNpcId]);

  return (
    <div className={styles.farmUi}>
      {/* Sits under the HUD buttons so Field Notes stays clickable on a
          `target_only` step, but swallows every other pointer so Phaser never
          sees it. The overlay itself is `pointer-events: none`. */}
      {tutorialOpen && <div className={styles.tutorialInputGate} aria-hidden="true" />}

      {!dialogue && <p className={styles.moveHint}>{getLabel(MOVE_HINT_LABEL)}</p>}

      {nearbyNpc && !dialogue && !tutorialOpen && !pendingFollowUp && (
        <button
          type="button"
          className={styles.talkPrompt}
          ref={interactionPromptRef}
          aria-label={nearbyTalkLabel}
          aria-keyshortcuts={ariaKeyShortcutsFor('farmInteract')}
          onClick={() => {
            if (!canRunTutorialUntargetedAction()) return;
            openDialogue(nearbyNpc.id);
          }}
        >
          <span className={styles.interactionCue} aria-hidden="true">
            ✦
          </span>
          <span className={styles.interactionLabel}>{nearbyTalkLabel}</span>
          <ShortcutKeycap action="farmInteract" radius="pill" />
        </button>
      )}

      {dialogue && (
        <FarmDialogue
          key={dialogue.slotKey}
          dialogue={dialogue}
          onStart={startEncounter}
          onClose={closeFarmDialogue}
        />
      )}
    </div>
  );
};

export default FarmUI;
