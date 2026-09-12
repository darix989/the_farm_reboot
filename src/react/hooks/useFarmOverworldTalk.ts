/**
 * Shared talk / Trial / follow-up wiring for the top-down farm and the lateral FarmSide.
 *
 * Both overlays open the same ladder (`farmDialogueFor`), queue the same follow-ups, and
 * auto-start Dot's intro. The only scene-specific input is where Trial Leave returns, and
 * whether Dot is actually standing in the current scene (FarmSide pockets other than the
 * main road do not have her).
 */
import { useCallback, useEffect, useMemo } from 'react';
import { FARM_INTRO_NPC_ID } from '../../data/farmMap';
import { scenarioRequirements, type DebateScenarioKey } from '../../data/levels';
import type { PendingFollowUp } from '../../data/encounterFollowUps';
import { useFarmStore } from '../../store/farmStore';
import { useGameStore } from '../../store/gameStore';
import { useProgressStore } from '../../store/progressStore';
import { GameManager } from '../../utils/gameManager';
import { areConditionsMet, conditionContextSnapshot } from '../../utils/gameConditions';
import {
  farmDialogueFor,
  farmFollowUpDialogue,
  type FarmDialogueState,
} from '../farm/farmDialogueState';
import { useFarmTutorials } from './useFarmTutorials';
import { useConditionContext } from './useGameConditions';

export type FarmOverworldReturnScene = 'Farm' | 'FarmSide';

export function useFarmOverworldTalk(options: {
  returnSceneKey: FarmOverworldReturnScene;
  introNpcPresent: boolean;
}): {
  nearbyNpcId: string | null;
  talkingToNpcId: string | null;
  pendingFollowUp: PendingFollowUp | null;
  dialogue: FarmDialogueState | null;
  openDialogue: (id: string) => void;
  closeFarmDialogue: () => void;
  startEncounter: (scenario: DebateScenarioKey) => void;
} {
  const { returnSceneKey, introNpcPresent } = options;
  const nearbyNpcId = useFarmStore((s) => s.nearbyNpcId);
  const talkingToNpcId = useFarmStore((s) => s.talkingToNpcId);
  const pendingFollowUp = useFarmStore((s) => s.pendingFollowUp);
  const openDialogue = useFarmStore((s) => s.openDialogue);

  const completedScenarios = useProgressStore((s) => s.completedScenarios);
  const conditionCtx = useConditionContext();
  const dialogue = useMemo(() => {
    // `farmDialogueFor` reads progress/codex stores internally. These subscriptions
    // keep the memo honest when a gate opens while the talk is on screen.
    void completedScenarios;
    void conditionCtx;
    if (!talkingToNpcId) return null;
    if (pendingFollowUp?.kind === 'farm_talk' && pendingFollowUp.npcId === talkingToNpcId) {
      return farmFollowUpDialogue(pendingFollowUp.npcId, pendingFollowUp.scenarioKey);
    }
    return farmDialogueFor(talkingToNpcId);
  }, [talkingToNpcId, completedScenarios, pendingFollowUp, conditionCtx]);

  useFarmTutorials();

  // After the loading overlay unmounts — not in Phaser `create`, which runs while that
  // overlay still covers the stage, and which used to skip anyone who already had progress.
  useEffect(() => {
    if (!introNpcPresent) return;
    const progress = useProgressStore.getState();
    if (progress.level1Started) return;
    openDialogue(FARM_INTRO_NPC_ID);
    progress.markLevel1Started();
  }, [introNpcPresent, openDialogue]);

  // Same timing as Dot's intro: scene `create` has already reset talking, and the loading
  // overlay has unmounted. Opening here (not in Phaser) keeps the talk on top of the farm.
  useEffect(() => {
    if (!pendingFollowUp || talkingToNpcId) return;
    if (pendingFollowUp.kind !== 'farm_talk') return;
    openDialogue(pendingFollowUp.npcId);
  }, [pendingFollowUp, talkingToNpcId, openDialogue]);

  const closeFarmDialogue = useCallback(() => {
    useFarmStore.getState().closeTalkAndFollowUp();
  }, []);

  const startEncounter = useCallback(
    (scenario: DebateScenarioKey) => {
      // Re-checked here rather than trusted from the button's disabled state: this is the
      // one door into the Trial scene from the overworld, and a locked encounter reached
      // through a stale render would strand the player in a conversation that assumes
      // things they have not been told.
      if (!areConditionsMet(scenarioRequirements(scenario), conditionContextSnapshot())) return;

      const store = useGameStore.getState();
      // Order matters: the scenario must be set before the scene switch, or TrialUI
      // mounts with the previous encounter for a frame.
      store.setActiveDebate(scenario);
      store.setReturnSceneKey(returnSceneKey);
      useFarmStore.getState().closeDialogue();
      GameManager.switchScene('Trial');
    },
    [returnSceneKey],
  );

  return {
    nearbyNpcId,
    talkingToNpcId,
    pendingFollowUp,
    dialogue,
    openDialogue,
    closeFarmDialogue,
    startEncounter,
  };
}
