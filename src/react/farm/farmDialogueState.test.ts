import { describe, expect, it } from 'vitest';
import { farmDialogueFor, farmDialogueForSlot } from './farmDialogueState';

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

describe('farmDialogueForSlot', () => {
  it('plays a side-scene-only slot as authored, with no encounter', () => {
    const dialogue = farmDialogueForSlot('pip', 'pipDone');
    expect(dialogue).toMatchObject({
      npcId: 'pip',
      slotKey: 'pipDone',
      scenario: null,
      scenarioRequires: [],
    });
    expect(dialogue?.beats).toHaveLength(3);
  });

  it('attaches the matching encounter on a numeric pre-talk and leaves it ungated', () => {
    const dialogue = farmDialogueForSlot('bram', 'bram1');
    expect(dialogue).toMatchObject({
      npcId: 'bram',
      slotKey: 'bram1',
      scenario: '030_bram_teaches_dialog',
      scenarioRequires: [],
    });
  });

  it('keeps Meet / Done leave-only', () => {
    expect(farmDialogueForSlot('cass', 'cassMeet')?.scenario).toBeNull();
    expect(farmDialogueForSlot('cass', 'cassDone')?.scenario).toBeNull();
  });

  it('carries a greeter stage flag so finishing the forced talk still writes it', () => {
    expect(farmDialogueForSlot('dot', 'dot1')?.completesFlags).toEqual(['dot-welcomed']);
  });

  it('reuses follow-up beats and flags for followUp slots', () => {
    const dialogue = farmDialogueForSlot('bram', 'followUp:030_bram_teaches_dialog');
    expect(dialogue).toMatchObject({
      npcId: 'bram',
      slotKey: 'followUp:030_bram_teaches_dialog',
      scenario: null,
      completesFlags: ['bram-taught-crossfire'],
    });
  });
});
