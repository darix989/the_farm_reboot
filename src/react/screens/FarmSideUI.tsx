import React, { useCallback, useMemo } from 'react';
import { GameManager } from '../../utils/gameManager';
import type { FarmSide } from '../../phaser/scenes/FarmSide';
import getLabel from '../../data/labels';
import { resolveCharacter } from '../../data/characters';
import { SIDE_SCENES } from '../../data/sideScenes';
import { useGameStore } from '../../store/gameStore';
import { useFarmStore } from '../../store/farmStore';
import { sideSceneDialogue } from '../farm/farmDialogueState';
import FarmDialogue from '../farm/FarmDialogue';
import styles from './FarmSideUI.module.scss';

/**
 * Overlay for the `FarmSide` scene: the way back to the menu, the walk-up talk prompt, the
 * portal travel prompt, and the talk itself.
 *
 * Same handoff as the top-down overworld — the scene writes `nearbyNpcId` / reads
 * `talkingToNpcId` through `farmStore`, and the conversation is the shared `FarmDialogue`
 * chrome — so a side-scene talk looks and reads exactly like a farm talk. The beats come
 * from the scene descriptor's own `talkSuffix` rather than the encounter ladder; see
 * `sideSceneDialogue`.
 *
 * `descriptor` is read from `gameStore.activeSideSceneId`, not a fixed constant — this
 * component never unmounts across a warm scene-to-scene hop (`FarmSide` restarts in
 * place), so every derived value has `descriptor` in its dependency list or a hop would
 * keep showing the previous level's cast.
 *
 * `isTraveling` hides everything but the empty root: the camera fade darkens only the
 * Phaser canvas, so without this the back button and hints would sit at full brightness
 * over a black screen for the whole transition, and would never even blink on a warm hop.
 *
 * `.react-ui-overlay` is `pointer-events: none`, so every control here re-enables them for
 * itself (see `docs/architecture.md`).
 */
const FarmSideUI: React.FC = () => {
  const activeSideSceneId = useGameStore((s) => s.activeSideSceneId);
  const nearbyNpcId = useFarmStore((s) => s.nearbyNpcId);
  const nearbyPortalId = useFarmStore((s) => s.nearbyPortalId);
  const talkingToNpcId = useFarmStore((s) => s.talkingToNpcId);
  const isTraveling = useFarmStore((s) => s.isTraveling);
  const openDialogue = useFarmStore((s) => s.openDialogue);

  const descriptor = useMemo(() => SIDE_SCENES[activeSideSceneId], [activeSideSceneId]);

  const dialogue = useMemo(() => {
    if (!talkingToNpcId) return null;
    const spec = descriptor.npcs.find((npc) => npc.characterId === talkingToNpcId);
    return spec ? sideSceneDialogue(spec.characterId, spec.talkSuffix) : null;
  }, [descriptor, talkingToNpcId]);

  const nearbyPortal = useMemo(() => {
    if (!nearbyPortalId) return null;
    return descriptor.portals.find((portal) => portal.id === nearbyPortalId) ?? null;
  }, [descriptor, nearbyPortalId]);

  const closeDialogue = useCallback(() => useFarmStore.getState().closeDialogue(), []);
  /** A side-scene talk has no encounter behind it, so the Talk button that would call
   *  this is never mounted — `FarmDialogue` still wants the prop. */
  const startEncounter = useCallback(() => {}, []);

  if (isTraveling) return <div className={styles.farmSideUi} />;

  return (
    <div className={styles.farmSideUi}>
      {!dialogue && (
        <>
          <button
            className={styles.backButton}
            type="button"
            onClick={() => GameManager.switchScene('MainMenu')}
          >
            {getLabel('farmSideBackToMenu')}
          </button>

          <p className={styles.moveHint}>{getLabel('farmSideMoveHint')}</p>
        </>
      )}

      {nearbyNpcId && !dialogue && (
        <button
          type="button"
          className={styles.talkPrompt}
          onClick={() => openDialogue(nearbyNpcId)}
        >
          {getLabel('farmTalkPrompt', {
            replacements: { name: resolveCharacter(nearbyNpcId).displayName },
          })}
          <span className={styles.talkPromptKey}>{getLabel('farmInteractHint')}</span>
        </button>
      )}

      {nearbyPortal?.to && !dialogue && (
        <button
          type="button"
          className={styles.portalPrompt}
          onClick={() => {
            const scene = GameManager.getCurrentScene();
            if (scene?.scene.key === 'FarmSide') {
              (scene as FarmSide).travelThroughPortal(nearbyPortal.id);
            }
          }}
        >
          {getLabel(nearbyPortal.to.label)}
          <span className={styles.talkPromptKey}>{getLabel('farmInteractHint')}</span>
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

export default FarmSideUI;
