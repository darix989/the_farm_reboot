import type { TutorialTargetRef } from '../../types/debateEntities';
import { useTutorialStore } from '../../store/tutorialStore';

export function canRunTutorialTargetAction(target: TutorialTargetRef): boolean {
  return useTutorialStore.getState().canRunTargetAction(target);
}

export function canRunTutorialUntargetedAction(): boolean {
  return useTutorialStore.getState().canRunUntargetedAction();
}

export function notifyTutorialTargetAction(target: TutorialTargetRef): void {
  useTutorialStore.getState().notifyTargetAction(target);
}
