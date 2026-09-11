import React from 'react';
import {
  faceBoxPercent,
  faceFramePercent,
  faceSheetUrl,
  type FaceSheet,
} from '../../phaser/animals/animalFaces';
import styles from './FaceStill.module.scss';

interface FaceStillProps {
  /** Null renders nothing, same contract as `FaceClip`. */
  sheet: FaceSheet | null;
  /** Which frame to hold. Out-of-range values are clamped rather than showing a blank cell. */
  frame: number;
  /** Side of the square box, as a CSS length. `em` keeps it tracking the text it sits in. */
  size: string;
}

/**
 * One frozen frame of a face sheet, sized in CSS units rather than pixels.
 *
 * The third way to show a portrait, and the reasons it is not the other two:
 *
 * - **not `FaceClip`**, because that plays the loop and takes its box as a number. A status
 *   indicator that animates permanently beside the text it labels is noise, and a pixel box
 *   cannot follow a font size that scales with the stage.
 * - **not an exported PNG per state**, because the frames are already shipped — the moderator
 *   status set is three frames of two sheets the game loads anyway. Cutting stills at promote
 *   time would add a pipeline step, three assets and a way for them to fall out of sync with
 *   the clips they came from.
 *
 * The staging still comes from the one shared place (`faceBoxPercent` wraps `faceBoxTransform`),
 * so a still is framed exactly like the same portrait playing beside it.
 */
const FaceStill: React.FC<FaceStillProps> = ({ sheet, frame, size }) => {
  if (!sheet) return null;

  const clamped = Math.max(0, Math.min(sheet.frameCount - 1, Math.trunc(frame)));
  const box = faceBoxPercent(sheet);
  const cell = faceFramePercent(sheet, clamped);

  return (
    // Decorative: every surface that shows one of these labels it in text for screen readers.
    <span className={styles.box} style={{ width: size, height: size }} aria-hidden="true">
      <span
        className={styles.frame}
        style={{
          width: `${box.width}%`,
          height: `${box.height}%`,
          left: `${box.left}%`,
          top: `${box.top}%`,
          backgroundImage: `url(${faceSheetUrl(sheet.file)})`,
          backgroundSize: cell.size,
          backgroundPosition: cell.position,
        }}
      />
    </span>
  );
};

export default FaceStill;
