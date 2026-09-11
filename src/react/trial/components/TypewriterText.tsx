import React, { useEffect, useMemo, useRef, useState } from 'react';
import SpokenRichText from './SpokenRichText';
import { plainSpokenText } from '../utils/spokenMarkup';

/** ~36 characters a second: fast enough not to be a wait, slow enough to read along with. */
export const TYPEWRITER_CHAR_MS = 28;

interface TypewriterTextProps {
  /**
   * The full chunk to fill in, inline emphasis and all. Changing it restarts from the first
   * character. Tags cost the reveal nothing: the cadence counts the plain text
   * (`plainSpokenText`), which is what the player actually watches land.
   */
  text: string;
  /** Bump to finish the current chunk immediately (the player pressed Continue mid-type). */
  skipToken: number;
  /** Fired once per chunk, the moment the last character lands — by timer or by skip. */
  onComplete: () => void;
  charMs?: number;
}

/**
 * Fills in one line of text a character at a time.
 *
 * The character count lives here rather than in `useWizardReveal` on purpose. `TrialUI` renders
 * the debate log (a card per round), the cast stage and the interactive panel, none of them
 * memoised — and `useTrialRoundWorkflow` returns a fresh object every render, so memoising them
 * would not help. A `chars` state up there would re-render the whole overlay ~36 times a second
 * alongside Phaser's own loop. Held in this leaf, the parent re-renders once per chunk instead.
 *
 * `setInterval` over a CSS `steps()` animation for the reasons given in `useSpriteFrame`: the
 * skip press and the completion callback both need the count to be ordinary React state.
 */
const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  skipToken,
  onComplete,
  charMs = TYPEWRITER_CHAR_MS,
}) => {
  const [chars, setChars] = useState(0);
  const plain = useMemo(() => plainSpokenText(text), [text]);

  // Latest callback without re-arming the timer when the parent re-creates it.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // One completion per chunk. StrictMode runs mount effects twice, and a skip lands the same
  // count the timer would have reached, so both paths funnel through this guard.
  const completedForRef = useRef<string | null>(null);

  // Restart on a new chunk. Adjusting during render rather than in an effect keeps the parent
  // from painting the tail of the previous speaker's line for a frame.
  const lastTextRef = useRef(text);
  const lastSkipRef = useRef(skipToken);
  if (lastTextRef.current !== text) {
    lastTextRef.current = text;
    lastSkipRef.current = skipToken;
    completedForRef.current = null;
    setChars(0);
  } else if (lastSkipRef.current !== skipToken) {
    lastSkipRef.current = skipToken;
    setChars(plain.length);
  }

  const typing = chars < plain.length;

  useEffect(() => {
    if (!typing) return;
    const id = window.setInterval(() => {
      // Functional updater so `chars` stays out of the deps — otherwise the interval is torn
      // down and rebuilt on every character, which drifts the cadence.
      setChars((current) => Math.min(current + 1, plain.length));
    }, charMs);
    return () => window.clearInterval(id);
  }, [typing, plain, charMs]);

  useEffect(() => {
    if (typing) return;
    if (completedForRef.current === text) return;
    completedForRef.current = text;
    onCompleteRef.current();
  }, [typing, text]);

  // Announcing a string that grows a character at a time makes screen readers re-read the
  // paragraph continuously; `WizardPanel` owns the live region and announces whole chunks.
  return (
    <span aria-hidden="true">
      <SpokenRichText text={text} maxChars={chars} />
    </span>
  );
};

export default TypewriterText;
