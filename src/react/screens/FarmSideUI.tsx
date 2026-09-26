import React, { useEffect, useMemo, useRef } from 'react';
import { GameManager } from '../../utils/gameManager';
import type { FarmSide } from '../../phaser/scenes/FarmSide';
import getLabel from '../../data/labels';
import { ariaKeyShortcutsFor } from '../../data/keyBindings';
import { resolveCharacter } from '../../data/characters';
import { FARM_INTRO_NPC_ID } from '../../data/farmMap';
import { SIDE_SCENES } from '../../data/sideScenes';
import { useGameStore } from '../../store/gameStore';
import { useFarmStore } from '../../store/farmStore';
import { useProgressStore } from '../../store/progressStore';
import { useTutorialStore } from '../../store/tutorialStore';
import FarmDialogue from '../farm/FarmDialogue';
import { useFarmOverworldTalk } from '../hooks/useFarmOverworldTalk';
import { canRunTutorialUntargetedAction } from '../tutorial/tutorialInteractionGuard';
import { interactionPromptPosition } from '../farm/interactionPromptPosition';
import ShortcutKeycap from '../shortcuts/ShortcutKeycap';
import styles from './FarmSideUI.module.scss';
import { supportsTouchInput } from '../../utils/touchInput';

/**
 * Overlay for the `FarmSide` scene: the walk-up talk prompt, portal travel prompt, and talk.
 *
 * Same handoff as the top-down overworld — the scene writes `nearbyNpcId` / reads
 * `talkingToNpcId` through `farmStore`, and the conversation is the shared `FarmDialogue`
 * chrome walking the encounter ladder via `useFarmOverworldTalk`.
 *
 * `descriptor` is read from `gameStore.activeSideSceneId`, not a fixed constant — this
 * component never unmounts across a warm scene-to-scene hop (`FarmSide` restarts in
 * place), so every derived value has `descriptor` in its dependency list or a hop would
 * keep showing the previous level's cast.
 *
 * `isTraveling` hides everything but the empty root: the camera fade darkens only the
 * Phaser canvas, so without this the prompts and hints would sit at full brightness
 * over a black screen for the whole transition, and would never even blink on a warm hop.
 *
 * `.react-ui-overlay` is `pointer-events: none`, so every control here re-enables them for
 * itself (see `docs/architecture.md`).
 */
const MOVE_HINT_LABEL = supportsTouchInput() ? 'farmSideMoveHintTouch' : 'farmSideMoveHint';

const FarmSideUI: React.FC = () => {
  const activeSideSceneId = useGameStore((s) => s.activeSideSceneId);
  const nearbyPortalId = useFarmStore((s) => s.nearbyPortalId);
  const isTraveling = useFarmStore((s) => s.isTraveling);
  const farmSideMoveHintDismissed = useProgressStore((s) => s.farmSideMoveHintDismissed);
  const tutorialOpen = useTutorialStore((s) => s.isOpen);
  const interactionPromptRef = useRef<HTMLButtonElement>(null);

  const descriptor = useMemo(() => SIDE_SCENES[activeSideSceneId], [activeSideSceneId]);
  const introNpcPresent = descriptor.npcs.some((npc) => npc.characterId === FARM_INTRO_NPC_ID);

  const {
    nearbyNpcId,
    pendingFollowUp,
    dialogue,
    openDialogue,
    closeFarmDialogue,
    startEncounter,
  } = useFarmOverworldTalk({ returnSceneKey: 'FarmSide', introNpcPresent });

  const nearbyPortal = useMemo(() => {
    if (!nearbyPortalId) return null;
    return descriptor.portals.find((portal) => portal.id === nearbyPortalId) ?? null;
  }, [descriptor, nearbyPortalId]);

  const nearbyTalkLabel = nearbyNpcId
    ? getLabel('farmTalkPrompt', {
        replacements: { name: resolveCharacter(nearbyNpcId).displayName },
      })
    : '';

  const nearbyPortalLabel = nearbyPortal?.to ? getLabel(nearbyPortal.to.label) : '';

  const interactionFocus = useMemo(
    () =>
      nearbyNpcId
        ? { kind: 'npc' as const, id: nearbyNpcId }
        : nearbyPortal?.to
          ? { kind: 'portal' as const, id: nearbyPortal.id }
          : null,
    [nearbyNpcId, nearbyPortal],
  );

  useEffect(() => {
    if (!interactionFocus || dialogue) return;

    let frame = 0;
    const updatePromptPosition = () => {
      const scene = GameManager.getCurrentScene();
      const anchor =
        scene?.scene.key === 'FarmSide'
          ? (scene as FarmSide).getInteractionAnchor(interactionFocus)
          : null;
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
  }, [dialogue, interactionFocus]);

  if (isTraveling) return <div className={styles.farmSideUi} />;

  return (
    <div className={styles.farmSideUi}>
      {tutorialOpen && <div className={styles.tutorialInputGate} aria-hidden="true" />}

      {!dialogue && !farmSideMoveHintDismissed && (
        <p className={styles.moveHint}>{getLabel(MOVE_HINT_LABEL)}</p>
      )}

      {nearbyNpcId && !dialogue && !tutorialOpen && !pendingFollowUp && (
        <button
          type="button"
          className={styles.talkPrompt}
          ref={interactionPromptRef}
          aria-label={nearbyTalkLabel}
          aria-keyshortcuts={ariaKeyShortcutsFor('farmInteract')}
          onClick={() => {
            if (!canRunTutorialUntargetedAction()) return;
            openDialogue(nearbyNpcId);
          }}
        >
          <span className={styles.interactionCue} aria-hidden="true">
            ✦
          </span>
          <span className={styles.interactionLabel}>{nearbyTalkLabel}</span>
          <ShortcutKeycap action="farmInteract" radius="pill" />
        </button>
      )}

      {nearbyPortal?.to && !dialogue && !tutorialOpen && !pendingFollowUp && (
        <button
          type="button"
          className={styles.portalPrompt}
          ref={interactionPromptRef}
          aria-label={nearbyPortalLabel}
          aria-keyshortcuts={ariaKeyShortcutsFor('farmInteract')}
          onClick={() => {
            if (!canRunTutorialUntargetedAction()) return;
            const scene = GameManager.getCurrentScene();
            if (scene?.scene.key === 'FarmSide') {
              (scene as FarmSide).travelThroughPortal(nearbyPortal.id);
            }
          }}
        >
          <span className={styles.interactionCue} aria-hidden="true">
            ✦
          </span>
          <span className={styles.interactionLabel}>{nearbyPortalLabel}</span>
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

export default FarmSideUI;
