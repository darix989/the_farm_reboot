import { create } from 'zustand';
import type { PendingFollowUp } from '../data/encounterFollowUps';

/**
 * Handoff between the Farm Phaser scene (simulation) and the React overlay (UI).
 *
 * The scene writes `nearbyNpcId` as the player walks; React reads it to show the
 * talk prompt. React writes `talkingToNpcId` when the player opens a conversation;
 * the scene reads it to freeze movement and reframe the camera into the game hole.
 * Mirrors how `gameStore` already bridges the two layers, kept separate so overworld
 * state does not leak into app state.
 */
interface FarmStore {
  /** Animal within interaction range, or null. Written only when it changes. */
  nearbyNpcId: string | null;
  /** Animal whose conversation is open, or null. */
  talkingToNpcId: string | null;
  /**
   * Follow-up queued on Trial Leave, consumed once FarmUI is up. Survives
   * `resetFarmUi` because Farm `create` runs after the queue and would otherwise
   * drop it before the overlay can open the talk.
   */
  pendingFollowUp: PendingFollowUp | null;

  setNearbyNpc: (id: string | null) => void;
  openDialogue: (id: string) => void;
  closeDialogue: () => void;
  setPendingFollowUp: (pending: PendingFollowUp | null) => void;
  /**
   * One write so a follow-up Leave cannot flash the next offer slot (pending cleared
   * while `talkingToNpcId` is still set) or re-open the pointer (talk closed while pending
   * is still set).
   */
  closeTalkAndFollowUp: () => void;
  /** Clears nearby / talking, so a fresh visit never opens a stale conversation. */
  resetFarmUi: () => void;
}

export const useFarmStore = create<FarmStore>((set) => ({
  nearbyNpcId: null,
  talkingToNpcId: null,
  pendingFollowUp: null,

  setNearbyNpc: (id) => set((s) => (s.nearbyNpcId === id ? s : { ...s, nearbyNpcId: id })),
  openDialogue: (id) => set({ talkingToNpcId: id }),
  closeDialogue: () => set({ talkingToNpcId: null }),
  setPendingFollowUp: (pending) => set({ pendingFollowUp: pending }),
  closeTalkAndFollowUp: () => set({ talkingToNpcId: null, pendingFollowUp: null }),
  resetFarmUi: () => set({ nearbyNpcId: null, talkingToNpcId: null }),
}));
