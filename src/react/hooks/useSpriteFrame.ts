import { useEffect, useState } from 'react';
import { onReducedMotionChange, prefersReducedMotion } from '../../utils/reducedMotion';

/**
 * Steps a spritesheet frame index on a timer, for clips played in the DOM.
 *
 * `setInterval` over injected `@keyframes` deliberately. A CSS `steps()` animation is the
 * usual way to play a sheet, but it makes the frame index invisible to React, so pausing,
 * restarting on a clip change, or honouring reduced motion all become string surgery on a
 * stylesheet. As ordinary state the frame is just a number, and the three behaviours below
 * fall out of the render.
 *
 * Playback is *not* frame-accurate — a 13fps clip on a 60Hz display lands each step on the
 * nearest 16.7ms tick, so individual frames run a few ms long or short. For a looping
 * portrait behind dialogue that is unnoticeable, and the alternative (a `requestAnimationFrame`
 * loop tracking elapsed time) re-renders 60 times a second to change a number 13 times.
 *
 * Returns 0 rather than animating when the clip is a single frame, has no frame rate, or the
 * viewer asked for reduced motion — so a caller never has to special-case a still.
 */
export function useSpriteFrame(frameCount: number, frameRate: number): number {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  const [frame, setFrame] = useState(0);

  // Live, because the OS preference can flip while a dialogue box is open.
  useEffect(() => onReducedMotionChange(setReduced), []);

  const animating = !reduced && frameCount > 1 && frameRate > 0;

  useEffect(() => {
    // Restart from frame 0 whenever the clip identity changes, so switching emotion never
    // resumes mid-way through the new clip at the old clip's index.
    setFrame(0);
    if (!animating) return;
    const id = window.setInterval(() => {
      setFrame((current) => (current + 1) % frameCount);
    }, 1000 / frameRate);
    return () => window.clearInterval(id);
  }, [animating, frameCount, frameRate]);

  // Guards the render between `reduced` flipping and the effect resetting `frame`.
  return animating ? frame : 0;
}
