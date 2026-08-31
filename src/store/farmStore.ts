import { create } from 'zustand';

/**
 * Handoff between the Farm Phaser scene (simulation) and the React overlay (UI).
 *
 * The scene writes `nearbyNpcId` as the player walks; React reads it to show the
 * talk prompt. React writes `talkingToNpcId` when the player opens a conversation;
 * the scene reads it to freeze movement. Mirrors how `gameStore` already bridges
 * the two layers, kept separate so overworld state does not leak into app state.
 */
interface FarmStore {
  /** Animal within interaction range, or null. Written only when it changes. */
  nearbyNpcId: string | null;
  /** Animal whose dialogue box is open, or null. */
  talkingToNpcId: string | null;

  setNearbyNpc: (id: string | null) => void;
  openDialogue: (id: string) => void;
  closeDialogue: () => void;
  /** Clears both, so a fresh visit to the farm never opens a stale conversation. */
  resetFarmUi: () => void;
}

export const useFarmStore = create<FarmStore>((set) => ({
  nearbyNpcId: null,
  talkingToNpcId: null,

  setNearbyNpc: (id) => set((s) => (s.nearbyNpcId === id ? s : { ...s, nearbyNpcId: id })),
  openDialogue: (id) => set({ talkingToNpcId: id }),
  closeDialogue: () => set({ talkingToNpcId: null }),
  resetFarmUi: () => set({ nearbyNpcId: null, talkingToNpcId: null }),
}));
