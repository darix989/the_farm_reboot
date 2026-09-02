/**
 * Sequential farm-talk beats, keyed by `{npcId}{suffix}` (`hetty1`, `cassDone`).
 *
 * The suffix is the animal's next unfinished scenario index (`1`, `2`, …) or
 * `Done` when the list is empty. A missing row falls back to the single
 * `farmDialog<Npc><suffix>` label so a new animal is never silent.
 */
import { PLAYER_CHARACTER_ID } from './characters';
import type { Labels } from './labels';

export interface FarmTalkBeat {
  speakerId: string;
  textLabel: Labels;
}

const RUE = PLAYER_CHARACTER_ID;

export const FARM_TALK: Readonly<Record<string, readonly FarmTalkBeat[]>> = {
  hetty1: [
    { speakerId: 'hetty', textLabel: 'farmDialogHetty1a' },
    { speakerId: RUE, textLabel: 'farmDialogHetty1b' },
    { speakerId: 'hetty', textLabel: 'farmDialogHetty1c' },
  ],
  hettyDone: [
    { speakerId: 'hetty', textLabel: 'farmDialogHettyDoneA' },
    { speakerId: 'hetty', textLabel: 'farmDialogHettyDoneB' },
  ],
  cass1: [
    { speakerId: 'cass', textLabel: 'farmDialogCass1a' },
    { speakerId: RUE, textLabel: 'farmDialogCass1b' },
    { speakerId: 'cass', textLabel: 'farmDialogCass1c' },
  ],
  cass2: [
    { speakerId: 'cass', textLabel: 'farmDialogCass2a' },
    { speakerId: RUE, textLabel: 'farmDialogCass2b' },
    { speakerId: 'cass', textLabel: 'farmDialogCass2c' },
  ],
  cassDone: [
    { speakerId: 'cass', textLabel: 'farmDialogCassDoneA' },
    { speakerId: 'cass', textLabel: 'farmDialogCassDoneB' },
  ],
  bram1: [
    { speakerId: 'bram', textLabel: 'farmDialogBram1a' },
    { speakerId: RUE, textLabel: 'farmDialogBram1b' },
    { speakerId: 'bram', textLabel: 'farmDialogBram1c' },
  ],
  bram2: [
    { speakerId: 'bram', textLabel: 'farmDialogBram2a' },
    { speakerId: RUE, textLabel: 'farmDialogBram2b' },
    { speakerId: 'bram', textLabel: 'farmDialogBram2c' },
  ],
  bramDone: [
    { speakerId: 'bram', textLabel: 'farmDialogBramDoneA' },
    { speakerId: 'bram', textLabel: 'farmDialogBramDoneB' },
  ],
  duchess1: [
    { speakerId: 'duchess', textLabel: 'farmDialogDuchess1a' },
    { speakerId: RUE, textLabel: 'farmDialogDuchess1b' },
    { speakerId: 'duchess', textLabel: 'farmDialogDuchess1c' },
  ],
  duchessDone: [{ speakerId: 'duchess', textLabel: 'farmDialogDuchessDone' }],
  tobiasDone: [
    { speakerId: 'tobias', textLabel: 'farmDialogTobiasDoneA' },
    { speakerId: 'tobias', textLabel: 'farmDialogTobiasDoneB' },
  ],
};

function capitalize(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

export function farmTalkSlotKey(npcId: string, suffix: string): string {
  return `${npcId}${suffix}`;
}

export function farmTalkBeats(npcId: string, suffix: string): FarmTalkBeat[] {
  const authored = FARM_TALK[farmTalkSlotKey(npcId, suffix)];
  if (authored && authored.length > 0) return [...authored];
  const fallback = `farmDialog${capitalize(npcId)}${suffix}` as Labels;
  return [{ speakerId: npcId, textLabel: fallback }];
}
