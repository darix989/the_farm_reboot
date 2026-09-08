import React, { useEffect } from 'react';
import { resolveCharacter } from '../../data/characters';
import type { AnimalEmotion } from '../../phaser/animals/animalEmotions';
import {
  FACE_BOX_PX,
  faceBoxTransform,
  faceFramePosition,
  faceSheetUrl,
  preloadFaceSheets,
  resolvedFaceSheet,
} from '../../phaser/animals/animalFaces';
import { useSpriteFrame } from '../hooks/useSpriteFrame';
import styles from './AnimalFace.module.scss';

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

/**
 * Frame rate for a sheet promoted without one. The pipeline always records `frameRate`, so
 * this only covers a hand-written record; 13fps is what the generator asks Ludo for.
 */
const FALLBACK_FRAME_RATE = 13;

interface AnimalFaceProps {
  /** Character id (e.g. `'cass'`), resolved through `resolveCharacter()` to a sprite id. */
  characterId: string;
  emotion: AnimalEmotion;
  size?: AnimalFaceSize;
}

/**
 * A looping head-and-shoulders portrait for one character, played in the DOM.
 *
 * **Renders nothing when the character has no face art**, which is the whole reason the
 * register can ship one animal at a time: the farm dialogue and the debate log mount this for
 * every speaker unconditionally, and the ones without portraits stay text-only until their
 * clips are generated. Same contract as `AnimalAnimator.playEmotion()`, which falls back
 * silently so callers never check. Both surfaces are laid out so a missing portrait costs no
 * space rather than leaving a hole.
 *
 * Playback is a stepped `background-position` on a `frameWidth x frameHeight` element that is
 * then transformed to sit the head in the middle of the box — the same staging the pipeline's
 * own review page uses, via the shared `faceBoxTransform`, so what was approved offline is
 * framed identically here.
 */
const AnimalFace: React.FC<AnimalFaceProps> = ({ characterId, emotion, size = 'dialogue' }) => {
  const animal = resolveCharacter(characterId).animal;
  const sheet = resolvedFaceSheet(animal, emotion);

  // Before the early return: hooks run on every render or not at all.
  useEffect(() => preloadFaceSheets(animal), [animal]);
  const frame = useSpriteFrame(sheet?.frameCount ?? 0, sheet?.frameRate ?? FALLBACK_FRAME_RATE);

  if (!sheet) return null;

  const box = BOX_PX[size];
  const { z, x, y } = faceBoxTransform(sheet, box);

  return (
    // Decorative: every surface already names the speaker in text beside it, so announcing
    // the portrait too would read the name twice.
    <div className={styles.box} style={{ width: box, height: box }} aria-hidden="true">
      <div
        className={styles.frame}
        style={{
          width: sheet.frameWidth,
          height: sheet.frameHeight,
          backgroundImage: `url(${faceSheetUrl(sheet.file)})`,
          backgroundPosition: faceFramePosition(sheet, frame),
          transform: `translate(${x}px, ${y}px) scale(${z})`,
        }}
      />
    </div>
  );
};

export default AnimalFace;
