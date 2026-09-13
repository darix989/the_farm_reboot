import React, { useEffect, useRef, useState } from 'react';
import cn from 'classnames';
import getLabel from '../../data/labels';
import { GameManager } from '../../utils/gameManager';
import type { Farm } from '../../phaser/scenes/Farm';
import { resolveCharacter } from '../../data/characters';
import { farmNpcById } from '../../data/farmMap';
import { useCodexUiStore } from '../../store/codexUiStore';
import { useTutorialStore } from '../../store/tutorialStore';
import { isSmartphone } from '../../utils/chromeAndroidFullscreen';
import FarmDialogue from '../farm/FarmDialogue';
import { useFarmOverworldTalk } from '../hooks/useFarmOverworldTalk';
import { useCodexNotices } from '../codex/useCodexNotices';
import {
  canRunTutorialTargetAction,
  canRunTutorialUntargetedAction,
  notifyTutorialTargetAction,
} from '../tutorial/tutorialInteractionGuard';
import type { TutorialTargetRef } from '../../types/debateEntities';
import { interactionPromptPosition } from '../farm/interactionPromptPosition';
import styles from '../farm/FarmUI.module.scss';

/**
 * Overworld overlay. Deliberately almost empty — the farm itself is Phaser, and
 * everything here sits on the `pointer-events: none` overlay, so each interactive
 * element re-enables pointer events for itself (see AGENTS.md).
 */
/** Phones have no keyboard, and the joystick is summoned by touching anywhere. */
const MOVE_HINT_LABEL = isSmartphone() ? 'farmMoveHintTouch' : 'farmMoveHint';
const CODEX_OPEN_TARGET: TutorialTargetRef = { kind: 'codex_open' };

const FarmUI: React.FC = () => {
  const {
    nearbyNpcId,
    pendingFollowUp,
    dialogue,
    openDialogue,
    closeFarmDialogue,
    startEncounter,
  } = useFarmOverworldTalk({ returnSceneKey: 'Farm', introNpcPresent: true });
  const openCodex = useCodexUiStore((s) => s.openCodex);
  const tutorialOpen = useTutorialStore((s) => s.isOpen);
  const { hasUnread, unreadIds, firstUnreadSection } = useCodexNotices();
  const animatedNoticeIds = useCodexUiStore((s) => s.animatedNoticeIds);
  const markNoticesAnimated = useCodexUiStore((s) => s.markNoticesAnimated);
  const [codexBursting, setCodexBursting] = useState(false);
  const interactionPromptRef = useRef<HTMLButtonElement>(null);

  const nearbyNpc = nearbyNpcId ? farmNpcById(nearbyNpcId) : null;

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

  // One-shot burst when unread ids appear while the HUD button is on screen. Talks and Trial
  // hide it; the lingering cue stays, but those ids are marked animated so coming back from a
  // talk does not replay. New ids after Trial still pulse.
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

  return (
    <div className={styles.farmUi}>
      {/* Sits under the HUD buttons so Field Notes stays clickable on a
          `target_only` step, but swallows every other pointer so Phaser never
          sees it. The overlay itself is `pointer-events: none`. */}
      {tutorialOpen && <div className={styles.tutorialInputGate} aria-hidden="true" />}

      {!dialogue && <p className={styles.moveHint}>{getLabel(MOVE_HINT_LABEL)}</p>}

      {/* Hidden during a conversation: the talk screen fills the stage, and the Codex opening
          over it would cover the line the player is reading. */}
      {!dialogue && (
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
      )}

      {nearbyNpc && !dialogue && !tutorialOpen && !pendingFollowUp && (
        <button
          type="button"
          className={styles.talkPrompt}
          ref={interactionPromptRef}
          onClick={() => {
            if (!canRunTutorialUntargetedAction()) return;
            openDialogue(nearbyNpc.id);
          }}
        >
          <span className={styles.interactionCue} aria-hidden="true">
            ✦
          </span>
          <span className={styles.interactionLabel}>
            {getLabel('farmTalkPrompt', {
              replacements: { name: resolveCharacter(nearbyNpc.id).displayName },
            })}
          </span>
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

export default FarmUI;
