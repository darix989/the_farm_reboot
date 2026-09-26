import { describe, expect, it } from 'vitest';
import { animalClips, clipEmotion, emotionClipName } from './animalClipCatalogue';

describe('animalClips', () => {
  it('lists a phased emotion only as its parts, whole chain first', () => {
    const angry = animalClips('white-sheep-1').filter((clip) => clip.emotion === 'angry');
    expect(angry.map((clip) => clip.name)).toEqual([
      'angry@sequence',
      'angry@in',
      'angry@loop',
      'angry@out',
    ]);
    expect(angry.map((clip) => clip.part)).toEqual(['sequence', 'in', 'loop', 'out']);
  });

  it('lists an unphased emotion as one bare clip with no part', () => {
    const talking = animalClips('white-sheep-1').filter((clip) => clip.emotion === 'talking');
    expect(talking).toHaveLength(1);
    expect(talking[0]!.name).toBe('talking');
    expect(talking[0]!.part).toBeUndefined();
  });
});

describe('emotionClipName', () => {
  const sheep = animalClips('white-sheep-1');

  it('resolves a phased emotion to the requested part', () => {
    expect(emotionClipName(sheep, 'angry', 'loop')).toBe('angry@loop');
    expect(emotionClipName(sheep, 'angry', 'sequence')).toBe('angry@sequence');
  });

  it('falls back to the whole chain when the part is missing', () => {
    const noIn = sheep.filter((clip) => clip.name !== 'angry@in');
    expect(emotionClipName(noIn, 'angry', 'in')).toBe('angry@sequence');
  });

  it('ignores the part for an unphased emotion', () => {
    expect(emotionClipName(sheep, 'talking', 'out')).toBe('talking');
  });
});

describe('clipEmotion', () => {
  it('strips a part suffix and passes other names through', () => {
    expect(clipEmotion('angry@loop')).toBe('angry');
    expect(clipEmotion('idle')).toBe('idle');
  });
});
