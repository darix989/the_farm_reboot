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

  it('drops the focus for a base clip the animal lacks', () => {
    expect(carryClipOver('fox', 'no-such-clip', 'sequence')).toBeNull();
  });

  it('keeps nothing focused across animals', () => {
    expect(carryClipOver('fox', null, 'sequence')).toBeNull();
  });
});

describe('useAnimalGalleryStore', () => {
  beforeEach(() => store().resetGallery());

  it('opens with nothing focused', () => {
    expect(store().clipName).toBeNull();
  });

  it('clears the focus when the focused emotion is clicked again, at any part', () => {
    store().setAnimal('white-sheep-1');
    store().toggleEmotion('angry');
    store().setPart('in');
    store().toggleEmotion('angry');
    expect(store().clipName).toBeNull();
  });

  it('moves the focus when a different emotion is clicked', () => {
    store().setAnimal('white-sheep-1');
    store().toggleEmotion('angry');
    store().toggleEmotion('talking');
    expect(store().clipName).toMatch(/^talking/);
  });

  it('toggles a base clip on and off', () => {
    store().toggleClip('idle');
    expect(store().clipName).toBe('idle');
    store().toggleClip('idle');
    expect(store().clipName).toBeNull();
  });

  it('opens a phased emotion on the whole chain', () => {
    store().setAnimal('white-sheep-1');
    store().toggleEmotion('angry');
    expect(store().clipName).toBe('angry@sequence');
  });

  it('re-resolves the current emotion when the part changes', () => {
    store().setAnimal('white-sheep-1');
    store().toggleEmotion('angry');
    store().setPart('in');
    expect(store()).toMatchObject({ part: 'in', clipName: 'angry@in' });
  });

  it('remembers the part across an unphased animal and back', () => {
    store().setAnimal('white-sheep-1');
    store().toggleEmotion('angry');
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
