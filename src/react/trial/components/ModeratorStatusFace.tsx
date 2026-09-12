import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import cn from 'classnames';
import { DEFAULT_MODERATOR_ID } from '../../../data/debateCast';
import { resolveCharacter } from '../../../data/characters';
import { preloadFaceSheet, resolvedFaceSheet } from '../../../phaser/animals/animalFaces';
import FaceStill from '../../characters/FaceStill';
import {
  moderatorOpinionFace,
  moderatorOpinionFacesForAnimal,
  scoreBand,
} from '../utils/trialHelpers';
import { useDebateEvent } from '../utils/debateEventBus';
import styles from './ModeratorStatusFace.module.scss';

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
  /**
   * Live chip / log header. Score updates as soon as the player confirms, but the round
   * recap then covers the stage — hold the mood-glow until that modal closes so it is
   * not playing behind the overlay. Recap / log-card / gallery stills omit this.
   */
  deferGlowUntilRecapClose?: boolean;
}

/**
 * The moderator's verdict on a score, as a still frame of their portrait.
 *
 * Replaces the 😊 / 😐 / 😠 that used to sit in the debate log header, the recap chip, the round
 * recap and each player round's log card. Held still on one frame rather than looped: this is a
 * status indicator, and four of them animating permanently beside the text they label would
 * pull the eye away from the debate. Which sheet and frame is `moderatorOpinionFace()`.
 *
 * When the still actually swaps (approval / neutral / disapproval), a one-shot mood glow
 * pulses the portrait and an inset halo — first paint never plays it, so a log card or recap
 * that mounts already at its impact stays quiet. The live chip/header can also wait until
 * `round:recap:close` so the glow is not buried under the recap overlay.
 *
 * Duchess wears it in debates she is not staged in; 1.7 names Cass via `moderatorId`
 * without putting her on the fence. See `debateModeratorId`.
 */
const ModeratorStatusFace: React.FC<ModeratorStatusFaceProps> = ({
  score,
  characterId = DEFAULT_MODERATOR_ID,
  deferGlowUntilRecapClose = false,
}) => {
  const animal = resolveCharacter(characterId).animal;
  const { emotion, frame } = moderatorOpinionFace(score, animal);
  const band = scoreBand(score);
  const sheet = resolvedFaceSheet(animal, emotion);

  const prevPickRef = useRef({ emotion, frame });
  const pendingGlowRef = useRef(false);
  const [glowNonce, setGlowNonce] = useState(0);
  const [bright, setBright] = useState(false);

  const fireGlow = useCallback(() => {
    setBright(false);
    setGlowNonce((n) => n + 1);
  }, []);

  // Detect a real still swap after mount. Compare sheet+frame, not raw score: +1 → +5
  // keeps the same face, so it must not flash.
  useLayoutEffect(() => {
    const prev = prevPickRef.current;
    const changed = prev.emotion !== emotion || prev.frame !== frame;
    prevPickRef.current = { emotion, frame };
    if (!changed) return;
    if (deferGlowUntilRecapClose) {
      pendingGlowRef.current = true;
      return;
    }
    fireGlow();
  }, [emotion, frame, deferGlowUntilRecapClose, fireGlow]);

  // Recap open/close pair from `RoundRecapModal`'s mount effect. React Strict Mode
  // runs that effect twice, so a naive `close` listener would glow while the modal
  // is still on screen. Depth + rAF waits until a close actually sticks.
  const recapDepthRef = useRef(0);
  useDebateEvent('round:recap:open', () => {
    recapDepthRef.current += 1;
  });
  useDebateEvent('round:recap:close', () => {
    recapDepthRef.current = Math.max(0, recapDepthRef.current - 1);
    requestAnimationFrame(() => {
      if (recapDepthRef.current !== 0) return;
      if (!pendingGlowRef.current) return;
      pendingGlowRef.current = false;
      fireGlow();
    });
  });

  // Re-apply the brightness class on the next frame so a second swap restarts the CSS animation
  // without remounting `FaceStill`.
  useLayoutEffect(() => {
    if (glowNonce === 0) return;
    const id = requestAnimationFrame(() => setBright(true));
    return () => cancelAnimationFrame(id);
  }, [glowNonce]);

  // Warm every sheet this character's three states can reach, so a score change does not
  // flash a missing PNG. Owl is one sheet (three frames of `approving`); fox is three.
  // Still cheaper than fetching the whole portrait set in a debate the moderator is not in.
  useEffect(() => {
    for (const next of moderatorOpinionFacesForAnimal(animal)) {
      preloadFaceSheet(resolvedFaceSheet(animal, next.emotion));
    }
  }, [animal]);

  return (
    <span className={styles.wrap}>
      <span className={cn(styles.portrait, bright && styles.bright)}>
        <FaceStill sheet={sheet} frame={frame} size={STATUS_FACE_SIZE} />
      </span>
      {glowNonce > 0 && (
        <span key={glowNonce} className={styles.halo} data-band={band} aria-hidden="true" />
      )}
    </span>
  );
};

export default ModeratorStatusFace;
