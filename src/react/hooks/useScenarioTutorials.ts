/**
 * Runs scenario-defined tutorial overlays declared via `DebateScenarioJson.tutorials`.
 *
 * Subscribes to the debate event bus per unique event name referenced by the
 * scenario, then on each emit walks the entries for that event in author order,
 * deep-subset matches their `where` filter against the payload, and opens the
 * first match via `useTutorialStore`.
 *
 * Dedup: fires each entry at most once per scenario run. The key is `entry.id`
 * when provided, otherwise the array index. Swapping to a different tutorials
 * array (e.g. loading another scenario) resets the fired set.
 *
 * Concurrency: if an overlay is already open, matches are dropped (not queued).
 * This matches the existing intro-tutorial behaviour.
 */

import { useEffect, useRef } from 'react';
import type { DebateScenarioTutorialEntry, EventTrigger } from '../../types/debateEntities';
import { useTutorialStore } from '../../store/tutorialStore';
import {
  debateEventBus,
  debateTutorialTriggerMatches,
  type DebateEventListener,
  type DebateEventPayloads,
} from '../trial/utils/debateEventBus';

/** Internal: grouped entries for a single event, carrying their dedup key. */
interface GroupedEntry {
  entry: DebateScenarioTutorialEntry;
  /** Key into the `fired` set — `entry.id` when set, else a synthetic index key. */
  dedupKey: string;
}

export function useScenarioTutorials(
  tutorials: readonly DebateScenarioTutorialEntry[] | undefined,
): void {
  // One dedup set per mount — we intentionally key on the tutorials array so
  // switching scenarios resets the fired tutorials.
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    firedRef.current = new Set();
  }, [tutorials]);

  useEffect(() => {
    if (!tutorials || tutorials.length === 0) return;

    // Group by event name — one bus subscription per unique event keeps
    // dispatch O(entries-for-event) rather than O(all-entries).
    const byEvent = new Map<EventTrigger, GroupedEntry[]>();
    tutorials.forEach((entry, idx) => {
      const dedupKey = entry.id ?? `__idx_${idx}`;
      const bucket = byEvent.get(entry.trigger.event) ?? [];
      bucket.push({ entry, dedupKey });
      byEvent.set(entry.trigger.event, bucket);
    });

    const unsubscribes: Array<() => void> = [];

    byEvent.forEach((group, event) => {
      const handler: DebateEventListener<EventTrigger> = (payload) => {
        for (const { entry, dedupKey } of group) {
          if (firedRef.current.has(dedupKey)) continue;
          if (
            !debateTutorialTriggerMatches(
              entry.trigger,
              event,
              payload as DebateEventPayloads[EventTrigger],
            )
          ) {
            continue;
          }

          const store = useTutorialStore.getState();
          // Don't clobber an open overlay. The next matching emit will retry.
          if (store.isOpen) continue;

          firedRef.current.add(dedupKey);
          store.openTutorial({
            id: entry.id,
            steps: entry.tutorial.steps.map((step) => ({
              message: step.message,
              modal: step.modal,
              targetComponent: step.targetComponent,
              interactionMode: step.interactionMode,
              targetClassName: step.targetClassName,
              artificialInteractions: step.artificialInteractions,
            })),
          });
          // First match wins per emission, even if several entries would match.
          return;
        }
      };
      unsubscribes.push(debateEventBus.on(event, handler));
    });

    return () => {
      for (const unsubscribe of unsubscribes) unsubscribe();
    };
  }, [tutorials]);
}
