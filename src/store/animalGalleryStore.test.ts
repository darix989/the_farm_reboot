import { beforeEach, describe, expect, it } from 'vitest';
import { carryClipOver, useAnimalGalleryStore } from './animalGalleryStore';

const store = () => useAnimalGalleryStore.getState();

describe('carryClipOver', () => {
  it('carries a phase part to the bare emotion on an unphased animal', () => {
    expect(carryClipOver('fox', 'angry@loop', 'loop')).toBe('angry');
  });

  it('applies the remembered part when landing on a phased animal', () => {
    expect(carryClipOver('white-sheep-1', 'angry', 'out')).toBe('angry@out');
  });

  it('falls back to the rest pose for a base clip the animal lacks', () => {
    expect(carryClipOver('fox', 'no-such-clip', 'sequence')).toBe(
      carryClipOver('fox', null, 'sequence'),
    );
  });
});

describe('useAnimalGalleryStore', () => {
  beforeEach(() => store().resetGallery());

  it('opens a phased emotion on the whole chain', () => {
    store().setAnimal('white-sheep-1');
    store().selectEmotion('angry');
    expect(store().clipName).toBe('angry@sequence');
  });

  it('re-resolves the current emotion when the part changes', () => {
    store().setAnimal('white-sheep-1');
    store().selectEmotion('angry');
    store().setPart('in');
    expect(store()).toMatchObject({ part: 'in', clipName: 'angry@in' });
  });

  it('remembers the part across an unphased animal and back', () => {
    store().setAnimal('white-sheep-1');
    store().selectEmotion('angry');
    store().setPart('loop');
    store().setAnimal('fox');
    expect(store().clipName).toBe('angry');
    store().setAnimal('white-sheep-1');
    expect(store().clipName).toBe('angry@loop');
  });

  it('keeps a base clip selected when the part changes', () => {
    store().setClip('idle');
    store().setPart('out');
    expect(store()).toMatchObject({ part: 'out', clipName: 'idle' });
  });
});
