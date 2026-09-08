import React from 'react';
import {
  faceBoxTransform,
  faceFramePosition,
  faceSheetUrl,
  type FaceSheet,
} from '../../phaser/animals/animalFaces';
import { useSpriteFrame } from '../hooks/useSpriteFrame';
import styles from './FaceClip.module.scss';

/**
 * Frame rate for a sheet promoted without one. The pipeline always records `frameRate`, so
 * this only covers a hand-written record; 13fps is what the generator asks Ludo for.
 */
const FALLBACK_FRAME_RATE = 13;

interface FaceClipProps {
  /** Null renders nothing — see below. */
  sheet: FaceSheet | null;
  /** Side of the square box to fit the head into, in CSS px. */
  box: number;
}

/**
 * Plays one face sheet in a square box. Decorative and sheet-addressed; whoever picks the
 * sheet decides what a missing one means.
 *
 * **Renders nothing when `sheet` is null**, which is what lets the register ship one animal at
 * a time: callers mount it unconditionally and the animals without portraits simply stay
 * text-only. Every surface is laid out so that costs no space rather than leaving a hole.
 *
 * Playback is a stepped `background-position` on a `frameWidth x frameHeight` element that is
 * then transformed to sit the head in the middle of the box, via the shared `faceBoxTransform`
 * — the same staging the pipeline's own review page uses, so what was approved offline is
 * framed identically here.
 *
 * Split out of `AnimalFace` because the animation gallery has an `AnimalSpriteId` and no
 * character to resolve it from: five of the gallery's animals are skins nobody in the cast
 * wears. Keeping one renderer is what stops the gallery from framing a portrait differently
 * from the game it is meant to be reviewing.
 */
const FaceClip: React.FC<FaceClipProps> = ({ sheet, box }) => {
  // Before the early return: hooks run on every render or not at all.
  const frame = useSpriteFrame(sheet?.frameCount ?? 0, sheet?.frameRate ?? FALLBACK_FRAME_RATE);

  if (!sheet) return null;

  const { z, x, y } = faceBoxTransform(sheet, box);

  return (
    // Decorative: every surface already names the speaker or the clip in text beside it, so
    // announcing the portrait too would read the name twice.
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

export default FaceClip;
