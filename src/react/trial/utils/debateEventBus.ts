/**
 * Typed event bus for debate-layer events.
 *
 * The event names match the `EventTrigger` literal type in `src/types/debateEntities.ts`, so
 * tutorial logic (`DebateTutorialLogic.triggerEvent`) — and any other consumer — can listen for
 * well-known debate beats without stringly-typed glue.
 *
 * Each event has its own payload shape (`DebateEventPayloads`). `emit` / `on` / `off` enforce
 * the pair via conditional generics, so you cannot emit `analysis:guess_correct` with the
 * payload for `round:start`, and the listener callback is narrowed to the correct payload.
 *
 * Usage:
 *   debateEventBus.emit('round:start', { roundNumber: 1, roundId: 'r1', kind: 'npc', type: 'opening_constructive' });
 *
 *   const unsubscribe = debateEventBus.on('analysis:guess_correct', (p) => {
 *     // p is DebateEventPayloads['analysis:guess_correct']
 *   });
 *   // ...
 *   unsubscribe();
 *
 *   // In React:
 *   useDebateEvent('round:recap:open', (p) => { ... });
 */

import { useEffect, useRef } from 'react';
import type { EventTrigger, StatementType } from '../../../types/debateEntities';
import type { GamePhase } from '../../hooks/useTrialRoundWorkflow';
import type { GuessPayload, GuessRecord } from './fallacyGuessTypes';

// ---------------------------------------------------------------------------
// Payload shapes — one per EventTrigger literal
// ---------------------------------------------------------------------------

/** Identifies which entity inside a debate an analysis action is targeting. */
export type AnalysisTargetKind = 'npc' | 'player' | 'opponent_prompt' | 'opponent_response';

export interface RoundLifecyclePayload {
  roundNumber: number;
  roundId: string;
  kind: 'npc' | 'player';
  type: StatementType;
}

export interface InteractiveStatementSelectedPayload {
  roundNumber: number;
  roundId: string;
  optionId: string;
}

export interface InteractiveContinuePayload {
  /** Phase the Continue was pressed from (intro, NPC speaking, NPC responding, etc.). */
  fromPhase: GamePhase;
  /** Round in play when Continue was pressed, or null for `debate_intro`. */
  roundNumber: number | null;
}

export interface InteractiveBackPayload {
  /** Phase the Back was pressed from. */
  fromPhase: GamePhase;
  roundNumber: number | null;
}

export interface InteractiveConfirmPayload {
  roundNumber: number;
  roundId: string;
  optionId: string;
}

export interface RoundRecapTogglePayload {
  roundNumber: number;
  roundId: string;
}

export interface DebateLogRoundPayload {
  roundNumber: number;
  roundId: string;
}

export interface AnalysisOpenClosePayload {
  targetKind: AnalysisTargetKind;
  /** NPC round id, opponent statement id, or chosen option id depending on targetKind. */
  targetId: string;
  roundNumber: number;
}

export interface AnalysisSentenceTogglePayload {
  sentenceId: string;
  targetId: string;
  targetKind: AnalysisTargetKind;
}

export interface AnalysisFallacyTogglePayload {
  fallacyId: string;
  sentenceId: string;
  targetId: string;
  targetKind: AnalysisTargetKind;
}

export interface AnalysisGuessSubmittedPayload {
  targetId: string;
  targetKind: AnalysisTargetKind;
  roundNumber: number;
  payload: GuessPayload;
}

export interface AnalysisGuessOutcomePayload {
  targetId: string;
  targetKind: AnalysisTargetKind;
  roundNumber: number;
  /** The guess record that just landed. */
  record: GuessRecord;
  /** How many attempts have now been used, including this one. */
  attemptsUsed: number;
  maxAttempts: number;
}

export interface AnalysisGuessMaxAttemptsPayload {
  targetId: string;
  targetKind: AnalysisTargetKind;
  roundNumber: number;
  attemptsUsed: number;
  maxAttempts: number;
}

// ---------------------------------------------------------------------------
// Event -> payload map (the source of truth — keys match EventTrigger literals).
// ---------------------------------------------------------------------------

export interface DebateEventPayloads {
  'round:start': RoundLifecyclePayload;
  'round:end': RoundLifecyclePayload;
  'interactive:statement_selected': InteractiveStatementSelectedPayload;
  'interactive:back': InteractiveBackPayload;
  'interactive:continue': InteractiveContinuePayload;
  'interactive:confirm': InteractiveConfirmPayload;
  'round:recap:open': RoundRecapTogglePayload;
  'round:recap:close': RoundRecapTogglePayload;
  'debate_log:round:analyze': DebateLogRoundPayload;
  'debate_log:round:shrink': DebateLogRoundPayload;
  'debate_log:round:expand': DebateLogRoundPayload;
  'analysis:open': AnalysisOpenClosePayload;
  'analysis:close': AnalysisOpenClosePayload;
  'analysis:sentence_selected': AnalysisSentenceTogglePayload;
  'analysis:sentence_deselected': AnalysisSentenceTogglePayload;
  'analysis:fallacy_selected': AnalysisFallacyTogglePayload;
  'analysis:fallacy_deselected': AnalysisFallacyTogglePayload;
  'analysis:guess_submitted': AnalysisGuessSubmittedPayload;
  'analysis:guess_correct': AnalysisGuessOutcomePayload;
  'analysis:guess_incorrect': AnalysisGuessOutcomePayload;
  'analysis:guess_partially_correct': AnalysisGuessOutcomePayload;
  'analysis:guess_max_attempts_reached': AnalysisGuessMaxAttemptsPayload;
}

/**
 * Compile-time guard: every EventTrigger literal must have an entry in DebateEventPayloads
 * and vice-versa. If this line red-squiggles after you edit EventTrigger or the map above,
 * the two are out of sync.
 */
type _AssertKeysMatch = [EventTrigger] extends [keyof DebateEventPayloads]
  ? [keyof DebateEventPayloads] extends [EventTrigger]
    ? true
    : never
  : never;
// Force the type to be evaluated so a mismatch becomes a compile error.
const _assertKeysMatch: _AssertKeysMatch = true;
void _assertKeysMatch;

// ---------------------------------------------------------------------------
// Listener / emitter implementation
// ---------------------------------------------------------------------------

export type DebateEventListener<E extends EventTrigger> = (payload: DebateEventPayloads[E]) => void;

type ListenerMap = {
  [E in EventTrigger]?: Set<DebateEventListener<E>>;
};

class DebateEventBus {
  private readonly listeners: ListenerMap = {};

  /** Subscribe to `event`. Returns an unsubscribe function. */
  on<E extends EventTrigger>(event: E, listener: DebateEventListener<E>): () => void {
    // The indirection avoids TS's `ListenerMap[E]` intersection shape when `E` is generic.
    let bucket = this.listeners[event] as Set<DebateEventListener<E>> | undefined;
    if (!bucket) {
      bucket = new Set<DebateEventListener<E>>();
      (this.listeners as Record<EventTrigger, Set<DebateEventListener<EventTrigger>>>)[event] =
        bucket as Set<DebateEventListener<EventTrigger>>;
    }
    bucket.add(listener);
    return () => this.off(event, listener);
  }

  /** Subscribe once; fires on the next matching emit, then unsubscribes automatically. */
  once<E extends EventTrigger>(event: E, listener: DebateEventListener<E>): () => void {
    const wrapped: DebateEventListener<E> = (payload) => {
      this.off(event, wrapped);
      listener(payload);
    };
    return this.on(event, wrapped);
  }

  /** Remove a previously registered listener. Safe to call with a listener that was never added. */
  off<E extends EventTrigger>(event: E, listener: DebateEventListener<E>): void {
    const bucket = this.listeners[event] as Set<DebateEventListener<E>> | undefined;
    if (!bucket) return;
    bucket.delete(listener);
    if (bucket.size === 0) delete this.listeners[event];
  }

  /** Emit `event` with its payload. Listener exceptions are isolated per listener. */
  emit<E extends EventTrigger>(event: E, payload: DebateEventPayloads[E]): void {
    const bucket = this.listeners[event] as Set<DebateEventListener<E>> | undefined;
    if (!bucket || bucket.size === 0) return;
    // Iterate a copy so listeners can unsubscribe themselves without mutating during iteration.
    for (const listener of Array.from(bucket)) {
      try {
        listener(payload);
      } catch (err) {
        // Don't let one bad listener stop the others.
        console.error(`[debateEventBus] listener for "${event}" threw:`, err);
      }
    }
  }

  /** For tests: drop every listener. Not intended for production use. */
  clear(): void {
    for (const key of Object.keys(this.listeners) as EventTrigger[]) {
      delete this.listeners[key];
    }
  }

  /** For tests: report how many listeners are registered for `event`. */
  listenerCount<E extends EventTrigger>(event: E): number {
    const bucket = this.listeners[event] as Set<DebateEventListener<E>> | undefined;
    return bucket ? bucket.size : 0;
  }
}

/** Shared singleton — every emit / on call in the app routes through this instance. */
export const debateEventBus = new DebateEventBus();

// ---------------------------------------------------------------------------
// React helpers
// ---------------------------------------------------------------------------

/**
 * React hook that subscribes to a debate event for the life of the component.
 *
 * The subscription is created once per `event` value and kept stable across renders,
 * even if `listener` is a fresh arrow on every render. Internally we route the call
 * through a ref so the latest listener always wins without ever cleaning up /
 * resubscribing the underlying bus handler.
 *
 * Why this matters: emits that fire from `useEffect` in the same component (or an
 * ancestor hook called earlier in the same component) would otherwise race the
 * cleanup-then-resubscribe cycle and arrive while nothing is listening. Keeping the
 * subscription identity stable closes that window.
 */
export function useDebateEvent<E extends EventTrigger>(
  event: E,
  listener: DebateEventListener<E>,
): void {
  const listenerRef = useRef(listener);
  // Keep the ref pointed at the latest listener. Assigning during render is safe for
  // refs and ensures the newest closure is already visible by the time any effect in
  // this render cycle fires an emit.
  listenerRef.current = listener;

  useEffect(() => {
    const stable: DebateEventListener<E> = (payload) => listenerRef.current(payload);
    return debateEventBus.on(event, stable);
  }, [event]);
}
