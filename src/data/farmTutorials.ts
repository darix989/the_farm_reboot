/**
 * Overworld overlay tutorials: same overlay as debate tutorials, triggered by
 * {@link GameCondition}s once the player is back on the farm.
 *
 * Completing an entry writes `tutorial_completed` into `progressStore` so it does not
 * re-fire on the next farm visit. Ids are a closed union so a stale id in `localStorage`
 * can be dropped on load — same shape as `dialogFlags.ts`.
 */
import type { DebateTutorialJson } from '../types/debateEntities';
import type { GameCondition } from '../utils/gameConditions';

export type FarmTutorialId = 'field-notes-intro';

export interface FarmTutorialEntry {
  id: FarmTutorialId;
  /**
   * All of these must be met, and this entry must not already be in
   * `progressStore.completedTutorials`, before the overlay opens.
   */
  triggerWhen: readonly GameCondition[];
  tutorial: DebateTutorialJson;
}

export const FARM_TUTORIALS: readonly FarmTutorialEntry[] = [
  {
    id: 'field-notes-intro',
    triggerWhen: [{ kind: 'dialog_flag', flagId: 'bram-taught-crossfire' }],
    tutorial: {
      steps: [
        {
          message:
            'Your **[accent]progress[/accent]** is in **[accent]Field Notes[/accent]**. Open it.',
          interactionMode: 'target_only',
          targetComponent: { kind: 'codex_open' },
          modal: { size: 'small', position: 'centerRight' },
        },
        {
          message: 'Under **[accent]Next[/accent]** is who to talk to.\n\nIt has moved on.',
          interactionMode: 'highlight',
          targetComponent: { kind: 'codex_content' },
          modal: { size: 'small', position: 'centerRight' },
        },
        {
          message:
            'The other tabs keep fallacies you know, fallacies you have spotted, and important conversations.',
          interactionMode: 'highlight',
          targetComponent: { kind: 'codex_tabs' },
          modal: { size: 'small', position: 'centerRight' },
        },
      ],
    },
  },
];

export const FARM_TUTORIAL_IDS = FARM_TUTORIALS.map((entry) => entry.id);

export function farmTutorialById(id: string): FarmTutorialEntry | null {
  return FARM_TUTORIALS.find((entry) => entry.id === id) ?? null;
}

export function isFarmTutorialId(value: unknown): value is FarmTutorialId {
  return typeof value === 'string' && FARM_TUTORIALS.some((entry) => entry.id === value);
}
