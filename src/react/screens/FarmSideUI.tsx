import React, { useCallback, useMemo } from 'react';
import { GameManager } from '../../utils/gameManager';
import getLabel from '../../data/labels';
import { resolveCharacter } from '../../data/characters';
import { FARM_SIDE_SCENE_ID, SIDE_SCENES } from '../../data/sideScenes';
import { useFarmStore } from '../../store/farmStore';
import { sideSceneDialogue } from '../farm/farmDialogueState';
import FarmDialogue from '../farm/FarmDialogue';
import styles from './FarmSideUI.module.scss';

/**
 * Overlay for the `FarmSide` scene: the way back to the menu, the walk-up talk prompt, and
 * the talk itself.
 *
 * Same handoff as the top-down overworld — the scene writes `nearbyNpcId` / reads
 * `talkingToNpcId` through `farmStore`, and the conversation is the shared `FarmDialogue`
 * chrome — so a side-scene talk looks and reads exactly like a farm talk. The beats come
 * from the scene descriptor's own `talkSuffix` rather than the encounter ladder; see
 * `sideSceneDialogue`.
 *
 * `.react-ui-overlay` is `pointer-events: none`, so every control here re-enables them for
 * itself (see `docs/architecture.md`).
 */
const FarmSideUI: React.FC = () => {
  const nearbyNpcId = useFarmStore((s) => s.nearbyNpcId);
  const talkingToNpcId = useFarmStore((s) => s.talkingToNpcId);
  const openDialogue = useFarmStore((s) => s.openDialogue);

  const dialogue = useMemo(() => {
    if (!talkingToNpcId) return null;
    const spec = SIDE_SCENES[FARM_SIDE_SCENE_ID].npcs.find(
      (npc) => npc.characterId === talkingToNpcId,
    );
    return spec ? sideSceneDialogue(spec.characterId, spec.talkSuffix) : null;
  }, [talkingToNpcId]);

  const closeDialogue = useCallback(() => useFarmStore.getState().closeDialogue(), []);
  /** A side-scene talk has no encounter behind it, so the Talk button that would call
   *  this is never mounted — `FarmDialogue` still wants the prop. */
  const startEncounter = useCallback(() => {}, []);

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
