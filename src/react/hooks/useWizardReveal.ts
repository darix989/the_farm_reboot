import { useCallback, useEffect, useRef, useState } from 'react';
import { onReducedMotionChange, prefersReducedMotion } from '../../utils/reducedMotion';

export interface WizardRevealSource {
  /** Content identity, e.g. `${debate.id}:npc:${round.id}`. A change re-arms the reveal. */
  key: string;
  /** Pre-trimmed, non-empty chunks. One authored `Sentence` each; prose is split. */
  sentences: string[];
}

export interface WizardReveal {
  /** The wizard is still pacing this line out: the instruction line stays minimal, options stay hidden. */
  active: boolean;
  /**
   * The whole line has been read. Every sentence is on screen and nothing is typing, so the
   * wizard shows the complete statement — whether the player paced through it, skipped it, or
   * had it completed for them (reduced motion, a tutorial, opening analysis).
   */
  settled: boolean;
  /**
   * The sentences already fully on screen, in order — the line as spoken so far. Every sentence
   * once `settled`, `[]` when there is nothing to show. Rendered as static text: only `typing`
   * animates.
   */
  spoken: string[];
  /** The chunk still filling in, appended after `spoken`, or `null` when nothing is typing. */
  typing: string | null;
  /** Total chunks in the current source (0 when neither active nor settled), for "(2/4)". */
  sentenceCount: number;
  /** Passed to `TypewriterText`; bumped by `advance` to finish the current chunk now. */
  skipToken: number;
  /** `TypewriterText` reports that the last character of the chunk has landed. */
  onSentenceTyped: () => void;
  /** Consumes a Continue press (Enter / Space / D). `false` means the caller should run its own action. */
  advance: () => boolean;
  /** Finish now and remember this line, so it is never revealed twice. */
  complete: () => void;
}

interface RevealState {
  key: string | null;
  sentenceIndex: number;
  sentenceComplete: boolean;
  skipToken: number;
}

const NO_KEYS: ReadonlySet<string> = new Set();
const NO_SENTENCES: string[] = [];

function armed(key: string | null): RevealState {
  return { key, sentenceIndex: 0, sentenceComplete: false, skipToken: 0 };
}

/**
 * Paces an incoming line through the wizard panel one sentence at a time, accumulating them.
 *
 * Each sentence is *added* to the ones already read rather than replacing them, so the box grows
 * as the player presses Continue and a finished line always shows in full. That is what makes the
 * reveal robust: `settled` is a "this line has been read" flag with no memory of how far the pacer
 * actually got, and several things complete a line early (see below). While the wizard showed a
 * single chunk, any of those froze it on whichever sentence happened to be up — usually the first,
 * with the rest of the statement unreachable. With the whole line on screen the stale index cannot
 * be seen.
 *
 * Deliberately *not* a sub-step in `useTrialRoundWorkflow`'s reducer. That reducer snapshots
 * every field of its state for the undo stack, so a reveal step would either replay a
 * typewriter on Back or need a second class of "not history" state. It also cannot own a
 * timer, and the reveal depends on three things the workflow is kept unaware of by design —
 * reduced motion, an open tutorial, an open analysis modal. Same split as the analysis-gate
 * nudge, which `TrialUI` applies on top of `wizardMessage` rather than inside the hook.
 *
 * The character count is *not* here either: it lives in `TypewriterText`, so a line filling in
 * re-renders one leaf instead of the whole trial overlay 36 times a second.
 *
 * `enabled: false` (a tutorial overlay is up) and reduced motion both resolve to "this line is
 * already read" rather than "paused": a tutorial choreographs its own reading pace, and
 * `tutorialStore` blocks the Continue button for any step that targets something else, which
 * would otherwise strand the player halfway through a statement with no way forward. Both land in
 * `settled` like a line the player paced through, so every path renders the same way.
 */
export function useWizardReveal(
  source: WizardRevealSource | null,
  options: { enabled: boolean; resetKey: string },
): WizardReveal {
  const { enabled, resetKey } = options;

  // Live, because the OS preference can flip mid-debate.
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => onReducedMotionChange(setReduced), []);

  const [completedKeys, setCompletedKeys] = useState<ReadonlySet<string>>(NO_KEYS);
  const [state, setState] = useState<RevealState>(() => armed(null));

  const sourceKey = source?.key ?? null;
  const sentences = source?.sentences ?? NO_SENTENCES;

  // --- adjustments during render, not in an effect ---------------------------------------
  // An effect would leave one painted frame showing the previous speaker's sentence, and
  // would flash the option grid in and straight back out between the two renders.

  // The hook is never remounted on a scenario swap (only `InteractivePanel` is keyed on the
  // debate id), so the read lines have to be dropped explicitly.
  const lastResetKeyRef = useRef(resetKey);
  const scenarioChanged = lastResetKeyRef.current !== resetKey;
  if (scenarioChanged) {
    lastResetKeyRef.current = resetKey;
    setCompletedKeys(NO_KEYS);
    setState(armed(sourceKey));
  }
  const completed = scenarioChanged ? NO_KEYS : completedKeys;

  if (!scenarioChanged && state.key !== sourceKey) setState(armed(sourceKey));
  const current = state.key === sourceKey && !scenarioChanged ? state : armed(sourceKey);

  const hasLine = source !== null && sentences.length > 0;
  const isRead = source !== null && completed.has(source.key);
  const active = hasLine && enabled && !reduced && !isRead;
  // Not gated on `enabled` / `reduced`: a line completed for the player is as read as one they
  // paced through, and showing it in full is the same answer for both. Gating it was what made
  // the wizard shrink back to sentence 1 when a tutorial closed.
  const settled = hasLine && isRead;

  // Clamped so a shrinking source can never index past its last chunk.
  const sentenceIndex = Math.min(current.sentenceIndex, Math.max(0, sentences.length - 1));

  // A settled line is entirely spoken; while pacing, the current chunk joins the list the moment
  // its last character lands, so the box holds it as static text until Continue adds the next.
  const spoken = settled
    ? sentences
    : active
      ? sentences.slice(0, sentenceIndex + (current.sentenceComplete ? 1 : 0))
      : NO_SENTENCES;
  const typing = active && !current.sentenceComplete ? (sentences[sentenceIndex] ?? null) : null;

  const stateRef = useRef(current);
  stateRef.current = { ...current, sentenceIndex };
  const sentenceCountRef = useRef(sentences.length);
  sentenceCountRef.current = sentences.length;
  const activeRef = useRef(active);
  activeRef.current = active;

  const complete = useCallback(() => {
    const key = stateRef.current.key;
    if (!key) return;
    setCompletedKeys((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  }, []);

  // Marks the line read whenever the reveal may not play, so that finishing a tutorial (or
  // turning reduced motion back off) does not start typing a line the player has been staring
  // at for the last half minute.
  useEffect(() => {
    if (!sourceKey) return;
    if (enabled && !reduced) return;
    complete();
  }, [sourceKey, enabled, reduced, complete]);

  const advance = useCallback((): boolean => {
    if (!activeRef.current) return false;
    const snapshot = stateRef.current;
    if (!snapshot.sentenceComplete) {
      // Still filling in — this press buys the rest of the sentence, not the next one.
      setState({ ...snapshot, skipToken: snapshot.skipToken + 1 });
      return true;
    }
    if (snapshot.sentenceIndex + 1 < sentenceCountRef.current) {
      setState({ ...snapshot, sentenceIndex: snapshot.sentenceIndex + 1, sentenceComplete: false });
      return true;
    }
    // The whole line is already on screen. `false` lets Continue mean the caller's own action
    // (phase advance, next farm beat).
    complete();
    return false;
  }, [complete]);

  const onSentenceTyped = useCallback(() => {
    const snapshot = stateRef.current;
    if (snapshot.sentenceComplete) return;
    // The last chunk finishing *is* the line being read. A further Continue that only swapped
    // in the concatenated body was an extra beat; Analyze and the real Continue unlock here.
    if (snapshot.sentenceIndex + 1 >= sentenceCountRef.current) {
      complete();
      return;
    }
    setState({ ...snapshot, sentenceComplete: true });
  }, [complete]);

  return {
    active,
    settled,
    spoken,
    typing,
    sentenceCount: active || settled ? sentences.length : 0,
    skipToken: current.skipToken,
    onSentenceTyped,
    advance,
    complete,
  };
}
