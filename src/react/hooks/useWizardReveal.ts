import { useCallback, useEffect, useRef, useState } from 'react';
import { onReducedMotionChange, prefersReducedMotion } from '../../utils/reducedMotion';

export interface WizardRevealSource {
  /** Content identity, e.g. `${debate.id}:npc:${round.id}`. A change re-arms the reveal. */
  key: string;
  /** Pre-trimmed, non-empty chunks. One authored `Sentence` each; the intro is split. */
  sentences: string[];
}

export interface WizardReveal {
  /** The wizard is showing one chunk: the instruction line stays minimal, options stay hidden. */
  active: boolean;
  /**
   * The pacer finished this line on its last sentence. The wizard should keep that sentence
   * on screen (no concatenated dump). False while typing, and also false when the line was
   * skipped (reduced motion / tutorial) so the wizard can show the full body.
   */
  settled: boolean;
  /** The chunk being filled in, or the last shown chunk when `settled` (`''` otherwise). */
  sentence: string;
  /** Drives the wizard's scroll reset and remounts the live region once per chunk. */
  sentenceIndex: number;
  /** Total chunks in the current source (0 when inactive and not settled), for "(2/4)". */
  sentenceCount: number;
  /** The chunk is fully shown, so the next press steps on instead of skipping ahead. */
  sentenceComplete: boolean;
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

function armed(key: string | null): RevealState {
  return { key, sentenceIndex: 0, sentenceComplete: false, skipToken: 0 };
}

/**
 * Paces an incoming line through the wizard panel one sentence at a time.
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
 * would otherwise strand the player halfway through a statement with no way forward.
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
  const sentences = source?.sentences ?? [];

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

  const active =
    source !== null && enabled && !reduced && sentences.length > 0 && !completed.has(source.key);
  // Skipped pacers (reduced motion, a tutorial overlay) still mark the line read, but the
  // wizard should show the joined body — not freeze on whichever chunk happened to be up.
  const settled =
    source !== null && sentences.length > 0 && completed.has(source.key) && enabled && !reduced;

  // Clamped so a shrinking source can never index past its last chunk.
  const sentenceIndex = Math.min(current.sentenceIndex, Math.max(0, sentences.length - 1));
  const showingSentence = active || settled;

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
    // Last sentence is already on screen — do not dump the joined line. `false` lets Continue
    // mean the caller's own action (phase advance, next farm beat).
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
    sentence: showingSentence ? (sentences[sentenceIndex] ?? '') : '',
    sentenceIndex,
    sentenceCount: showingSentence ? sentences.length : 0,
    sentenceComplete: settled || current.sentenceComplete,
    skipToken: current.skipToken,
    onSentenceTyped,
    advance,
    complete,
  };
}
