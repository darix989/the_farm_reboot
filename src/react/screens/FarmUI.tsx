import React, { useCallback, useEffect, useMemo, useState } from 'react';
import cn from 'classnames';
import getLabel from '../../data/labels';
import type { DebateScenarioKey } from '../../data/levels';
import { resolveCharacter } from '../../data/characters';
import { FARM_INTRO_NPC_ID, farmNpcById } from '../../data/farmMap';
import { useFarmStore } from '../../store/farmStore';
import { useGameStore } from '../../store/gameStore';
import { useCodexUiStore } from '../../store/codexUiStore';
import { useProgressStore } from '../../store/progressStore';
import { useTutorialStore } from '../../store/tutorialStore';
import { GameManager } from '../../utils/gameManager';
import { farmDialogueFor, farmNpcRequirements } from '../farm/farmDialogueState';
import {
  useConditionContext,
  useConditionsMet,
  useUnmetConditionsHint,
} from '../hooks/useGameConditions';
import { useFarmTutorials } from '../hooks/useFarmTutorials';
import { areConditionsMet, conditionContextSnapshot } from '../../utils/gameConditions';
import { farmNpcTalkLocked } from '../../utils/farmTalkGate';
import { scenarioRequirements } from '../../data/levels';
import { isSmartphone } from '../../utils/chromeAndroidFullscreen';
import FarmDialogue from '../farm/FarmDialogue';
import { useCodexNotices } from '../codex/useCodexNotices';
import {
  canRunTutorialTargetAction,
  canRunTutorialUntargetedAction,
  notifyTutorialTargetAction,
} from '../tutorial/tutorialInteractionGuard';
import type { TutorialTargetRef } from '../../types/debateEntities';
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
  const nearbyNpcId = useFarmStore((s) => s.nearbyNpcId);
  const talkingToNpcId = useFarmStore((s) => s.talkingToNpcId);
  const openDialogue = useFarmStore((s) => s.openDialogue);
  const closeDialogue = useFarmStore((s) => s.closeDialogue);
  const openCodex = useCodexUiStore((s) => s.openCodex);
  const tutorialOpen = useTutorialStore((s) => s.isOpen);
  const { hasUnread, unreadIds, firstUnreadSection } = useCodexNotices();
  const animatedNoticeIds = useCodexUiStore((s) => s.animatedNoticeIds);
  const markNoticesAnimated = useCodexUiStore((s) => s.markNoticesAnimated);
  const [codexBursting, setCodexBursting] = useState(false);

  const completedScenarios = useProgressStore((s) => s.completedScenarios);
  const dialogue = useMemo(
    () => (talkingToNpcId ? farmDialogueFor(talkingToNpcId) : null),
    [talkingToNpcId, completedScenarios],
  );

  const nearbyNpc = nearbyNpcId ? farmNpcById(nearbyNpcId) : null;
  // Recomputed whenever the nearby animal changes; the requirements themselves are static
  // authored data, so `useConditionsMet` is what makes the badge react to progress.
  const nearbyRequires = useMemo(
    () => (nearbyNpcId ? farmNpcRequirements(nearbyNpcId) : []),
    [nearbyNpcId],
  );
  const nearbyUnlocked = useConditionsMet(nearbyRequires);
  const conditionCtx = useConditionContext();
  const nearbyTalkLocked = nearbyNpcId ? farmNpcTalkLocked(nearbyNpcId, conditionCtx) : false;
  const nearbyLockedHint = useUnmetConditionsHint(nearbyTalkLocked ? nearbyRequires : []);

  useFarmTutorials();

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

  // After the loading overlay unmounts — not in Phaser `create`, which runs while that
  // overlay still covers the stage, and which used to skip anyone who already had progress.
  useEffect(() => {
    const progress = useProgressStore.getState();
    if (progress.level1Started) return;
    openDialogue(FARM_INTRO_NPC_ID);
    progress.markLevel1Started();
  }, [openDialogue]);

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

      {nearbyNpc && !dialogue && !tutorialOpen && (
        <button
          type="button"
          className={styles.talkPrompt}
          disabled={nearbyTalkLocked}
          onClick={() => {
            if (nearbyTalkLocked) return;
            if (!canRunTutorialUntargetedAction()) return;
            openDialogue(nearbyNpc.id);
          }}
        >
          {getLabel('farmTalkPrompt', {
            replacements: { name: resolveCharacter(nearbyNpc.id).displayName },
          })}
          <span className={styles.talkPromptKey}>
            {nearbyTalkLocked
              ? (nearbyLockedHint ?? getLabel('farmPromptLocked'))
              : nearbyUnlocked
                ? getLabel('farmInteractHint')
                : getLabel('farmPromptLocked')}
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
