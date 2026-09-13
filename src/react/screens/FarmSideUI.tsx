import React, { useEffect, useMemo, useState } from 'react';
import cn from 'classnames';
import { GameManager } from '../../utils/gameManager';
import type { FarmSide } from '../../phaser/scenes/FarmSide';
import getLabel from '../../data/labels';
import { resolveCharacter } from '../../data/characters';
import { FARM_INTRO_NPC_ID } from '../../data/farmMap';
import { SIDE_SCENES } from '../../data/sideScenes';
import { useGameStore } from '../../store/gameStore';
import { useFarmStore } from '../../store/farmStore';
import { useCodexUiStore } from '../../store/codexUiStore';
import { useTutorialStore } from '../../store/tutorialStore';
import FarmDialogue from '../farm/FarmDialogue';
import { useFarmOverworldTalk } from '../hooks/useFarmOverworldTalk';
import { useCodexNotices } from '../codex/useCodexNotices';
import {
  canRunTutorialTargetAction,
  canRunTutorialUntargetedAction,
  notifyTutorialTargetAction,
} from '../tutorial/tutorialInteractionGuard';
import type { TutorialTargetRef } from '../../types/debateEntities';
import styles from './FarmSideUI.module.scss';

/**
 * Overlay for the `FarmSide` scene: the way back to the menu, Field Notes, the walk-up
 * talk prompt, the portal travel prompt, and the talk itself.
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
 * Phaser canvas, so without this the back button and hints would sit at full brightness
 * over a black screen for the whole transition, and would never even blink on a warm hop.
 *
 * `.react-ui-overlay` is `pointer-events: none`, so every control here re-enables them for
 * itself (see `docs/architecture.md`).
 */
const CODEX_OPEN_TARGET: TutorialTargetRef = { kind: 'codex_open' };

const FarmSideUI: React.FC = () => {
  const activeSideSceneId = useGameStore((s) => s.activeSideSceneId);
  const nearbyPortalId = useFarmStore((s) => s.nearbyPortalId);
  const isTraveling = useFarmStore((s) => s.isTraveling);
  const openCodex = useCodexUiStore((s) => s.openCodex);
  const tutorialOpen = useTutorialStore((s) => s.isOpen);
  const { hasUnread, unreadIds, firstUnreadSection } = useCodexNotices();
  const animatedNoticeIds = useCodexUiStore((s) => s.animatedNoticeIds);
  const markNoticesAnimated = useCodexUiStore((s) => s.markNoticesAnimated);
  const [codexBursting, setCodexBursting] = useState(false);

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

  const hudCodexVisible = !dialogue;
  useEffect(() => {
    if (!hudCodexVisible) {
      setCodexBursting(false);
      return;
    }
    const pending = unreadIds.filter((id) => !animatedNoticeIds.includes(id));
    if (pending.length === 0) return;
    markNoticesAnimated(pending);
    setCodexBursting(true);
  }, [hudCodexVisible, unreadIds, animatedNoticeIds, markNoticesAnimated]);

  if (isTraveling) return <div className={styles.farmSideUi} />;

  return (
    <div className={styles.farmSideUi}>
      {tutorialOpen && <div className={styles.tutorialInputGate} aria-hidden="true" />}

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

          <button
            className={cn(
              styles.codexButton,
              hasUnread && styles.codexButtonHasCue,
              codexBursting && styles.codexButtonBurst,
            )}
            type="button"
            data-tutorial-codex-open
            aria-label={hasUnread ? getLabel('codexOpenHasNew') : undefined}
            onAnimationEnd={(event) => {
              if (event.target !== event.currentTarget) return;
              setCodexBursting(false);
            }}
            onClick={() => {
              if (!canRunTutorialTargetAction(CODEX_OPEN_TARGET)) return;
              openCodex(firstUnreadSection ?? undefined);
              notifyTutorialTargetAction(CODEX_OPEN_TARGET);
            }}
          >
            {getLabel('codexOpen')}
          </button>
        </>
      )}

      {nearbyNpcId && !dialogue && !tutorialOpen && !pendingFollowUp && (
        <button
          type="button"
          className={styles.talkPrompt}
          onClick={() => {
            if (!canRunTutorialUntargetedAction()) return;
            openDialogue(nearbyNpcId);
          }}
        >
          {getLabel('farmTalkPrompt', {
            replacements: { name: resolveCharacter(nearbyNpcId).displayName },
          })}
          <span className={styles.talkPromptKey}>{getLabel('farmInteractHint')}</span>
        </button>
      )}

      {nearbyPortal?.to && !dialogue && !tutorialOpen && !pendingFollowUp && (
        <button
          type="button"
          className={styles.portalPrompt}
          onClick={() => {
            if (!canRunTutorialUntargetedAction()) return;
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
          onClose={closeFarmDialogue}
        />
      )}
    </div>
  );
};

export default FarmSideUI;
