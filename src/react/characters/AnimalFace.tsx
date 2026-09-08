import React, { useEffect } from 'react';
import { resolveCharacter } from '../../data/characters';
import type { AnimalEmotion } from '../../phaser/animals/animalEmotions';
import {
  FACE_BOX_PX,
  preloadFaceSheets,
  resolvedFaceSheet,
} from '../../phaser/animals/animalFaces';
import FaceClip from './FaceClip';

/**
 * Where the portrait is being drawn. Only the box size differs, but the two sizes are named
 * rather than passed as a number so the dialogue box and the debate log cannot drift apart
 * by a few px, and so a third surface has to pick a side rather than invent a size.
 */
export type AnimalFaceSize = 'dialogue' | 'log';

const BOX_PX: Record<AnimalFaceSize, number> = {
  dialogue: FACE_BOX_PX,
  log: 44,
};

interface AnimalFaceProps {
  /** Character id (e.g. `'cass'`), resolved through `resolveCharacter()` to a sprite id. */
  characterId: string;
  emotion: AnimalEmotion;
  size?: AnimalFaceSize;
}

/**
 * A looping head-and-shoulders portrait for one character.
 *
 * The game-facing half of the pairing with `FaceClip`, which does the drawing: this resolves a
 * *character* to a sheet and asks for the game's forgiving behaviour — `resolvedFaceSheet`
 * falls back to `talking` for an emotion that was never cropped, and a character with no face
 * art at all renders nothing at all. Same contract as `AnimalAnimator.playEmotion()`, which
 * falls back silently so callers never check. A review tool wants neither of those and so goes
 * to `FaceClip` directly.
 */
const AnimalFace: React.FC<AnimalFaceProps> = ({ characterId, emotion, size = 'dialogue' }) => {
  const animal = resolveCharacter(characterId).animal;
  const sheet = resolvedFaceSheet(animal, emotion);

  useEffect(() => preloadFaceSheets(animal), [animal]);

  return <FaceClip sheet={sheet} box={BOX_PX[size]} />;
};

export default AnimalFace;
