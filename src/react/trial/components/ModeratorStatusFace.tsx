import React, { useEffect } from 'react';
import { DEFAULT_MODERATOR_ID } from '../../../data/debateCast';
import { resolveCharacter } from '../../../data/characters';
import { preloadFaceSheet, resolvedFaceSheet } from '../../../phaser/animals/animalFaces';
import FaceStill from '../../characters/FaceStill';
import { moderatorOpinionFace, moderatorOpinionFacesForAnimal } from '../utils/trialHelpers';

/** Box side. `em` so it tracks whatever type it sits in, as the emoji it replaces did.
 *  Keep in lockstep with `.moderatorStatusFaceTutorialHook` in `trialShared.module.scss`. */
const STATUS_FACE_SIZE = '1.6em';

interface ModeratorStatusFaceProps {
  /** Cumulative debate score, or one round's impact — whichever the surface is showing. */
  score: number;
  /**
   * Whose portraits to hold. Defaults to Duchess — she lends her face to debates that
   * show a score with nobody staged as moderator. Pass `debateModeratorId(debate)` so
   * 1.7 wears Cass's fox stills without putting her on stage.
   */
  characterId?: string;
}

/**
 * The moderator's verdict on a score, as a still frame of their portrait.
 *
 * Replaces the 😊 / 😐 / 😠 that used to sit in the debate log header, the recap chip, the round
 * recap and each player round's log card. Held still on one frame rather than looped: this is a
 * status indicator, and four of them animating permanently beside the text they label would
 * pull the eye away from the debate. Which sheet and frame is `moderatorOpinionFace()`.
 *
 * Duchess wears it in debates she is not staged in; 1.7 names Cass via `moderatorId`
 * without putting her on the fence. See `debateModeratorId`.
 */
const ModeratorStatusFace: React.FC<ModeratorStatusFaceProps> = ({
  score,
  characterId = DEFAULT_MODERATOR_ID,
}) => {
  const animal = resolveCharacter(characterId).animal;
  const { emotion, frame } = moderatorOpinionFace(score, animal);
  const sheet = resolvedFaceSheet(animal, emotion);

  // Warm every sheet this character's three states can reach, so a score change does not
  // flash a missing PNG. Owl is one sheet (three frames of `approving`); fox is three.
  // Still cheaper than fetching the whole portrait set in a debate the moderator is not in.
  useEffect(() => {
    for (const pick of moderatorOpinionFacesForAnimal(animal)) {
      preloadFaceSheet(resolvedFaceSheet(animal, pick.emotion));
    }
  }, [animal]);

  return <FaceStill sheet={sheet} frame={frame} size={STATUS_FACE_SIZE} />;
};

export default ModeratorStatusFace;
