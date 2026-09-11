import React, { useEffect } from 'react';
import { DEFAULT_MODERATOR_ID } from '../../../data/debateCast';
import { resolveCharacter } from '../../../data/characters';
import { preloadFaceSheet, resolvedFaceSheet } from '../../../phaser/animals/animalFaces';
import FaceStill from '../../characters/FaceStill';
import { moderatorOpinionFace } from '../utils/trialHelpers';

/** Box side. `em` so it tracks whatever type it sits in, as the emoji it replaces did.
 *  Keep in lockstep with `.moderatorStatusFaceTutorialHook` in `trialShared.module.scss`. */
const STATUS_FACE_SIZE = '1.6em';

interface ModeratorStatusFaceProps {
  /** Cumulative debate score, or one round's impact — whichever the surface is showing. */
  score: number;
}

/**
 * The moderator's verdict on a score, as Duchess's face.
 *
 * Replaces the 😊 / 😐 / 😠 that used to sit in the debate log header, the recap chip, the round
 * recap and each player round's log card. Held still on one frame rather than looped: this is a
 * status indicator, and four of them animating permanently beside the text they label would
 * pull the eye away from the debate. The three states are three frames of the owl's `approving`
 * clip at three eye apertures — see `moderatorOpinionFace()`.
 *
 * Duchess wears it even in the debates she is not staged in — see `DEFAULT_MODERATOR_ID`.
 */
const ModeratorStatusFace: React.FC<ModeratorStatusFaceProps> = ({ score }) => {
  const animal = resolveCharacter(DEFAULT_MODERATOR_ID).animal;
  const { emotion, frame } = moderatorOpinionFace(score);
  const sheet = resolvedFaceSheet(animal, emotion);

  // All three states are frames of one sheet, so warming that sheet covers every score this
  // indicator can reach — and it is mounted in debates Duchess is not in, where fetching her
  // whole portrait set would be ~2.5MB to draw one 440KB file.
  useEffect(() => preloadFaceSheet(sheet), [sheet]);

  return <FaceStill sheet={sheet} frame={frame} size={STATUS_FACE_SIZE} />;
};

export default ModeratorStatusFace;
