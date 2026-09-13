import { describe, expect, it } from 'vitest';
import { farmDialogueFor } from './farmDialogueState';

describe('farmDialogueFor', () => {
  it('resolves a simple conversation for a side-scene-only character', () => {
    const dialogue = farmDialogueFor('pip');

    expect(dialogue).toMatchObject({
      npcId: 'pip',
      nameLabel: 'farmNpcPip',
      slotKey: 'pipDone',
      scenario: null,
      scenarioRequires: [],
      lessons: [],
    });
    expect(dialogue?.beats).toEqual([
      { speakerId: 'pip', textLabel: 'farmDialogPipDoneA' },
      { speakerId: 'rue', textLabel: 'farmDialogPipDoneB' },
      { speakerId: 'pip', textLabel: 'farmDialogPipDoneC' },
    ]);
  });
});
