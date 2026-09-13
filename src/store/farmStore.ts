import { create } from 'zustand';
import type { PendingFollowUp } from '../data/encounterFollowUps';

/**
 * Handoff between a farm Phaser scene (simulation) and the React overlay (UI) — both the
 * top-down `Farm` and the lateral `FarmSide` talk through it, since it is the same
 * conversation on two cameras.
 *
 * The scene writes `nearbyNpcId` as the player walks; React reads it to show the
 * talk prompt. React writes `talkingToNpcId` when the player opens a conversation;
 * the scene reads it to freeze movement and frame the pair into the game hole.
 * Mirrors how `gameStore` already bridges the two layers, kept separate so overworld
 * state does not leak into app state.
 *
 * `pendingFollowUp` is queued on Trial Leave when returning to either overworld
 * (`Farm` or `FarmSide`) and consumed once that overlay is up.
 */
interface FarmStore {
  /** Animal within interaction range, or null. Written only when it changes. */
  nearbyNpcId: string | null;
  /** Animal whose conversation is open, or null. */
  talkingToNpcId: string | null;
  /** Portal within interaction range on `FarmSide`, or null. `FarmSideUI`'s only way to
   *  show the portal prompt without a Phaser scene in hand. Written only when it changes,
   *  same contract as `nearbyNpcId`. */
  nearbyPortalId: string | null;
  /** A `FarmSide` -> `FarmSide` hop is in flight (fade out, load if needed, fade in).
   *  `FarmSideUI` renders nothing but its empty root while this is set — the camera fade
   *  only darkens the Phaser canvas, so the React chrome would otherwise sit at full
   *  brightness over a black screen for the whole transition. */
  isTraveling: boolean;
  /**
   * Follow-up queued on Trial Leave, consumed once FarmUI is up. Survives
   * `resetFarmUi` because Farm `create` runs after the queue and would otherwise
   * drop it before the overlay can open the talk.
   */
  pendingFollowUp: PendingFollowUp | null;

  setNearbyNpc: (id: string | null) => void;
  setNearbyPortal: (id: string | null) => void;
  setTraveling: (traveling: boolean) => void;
  openDialogue: (id: string) => void;
  closeDialogue: () => void;
  setPendingFollowUp: (pending: PendingFollowUp | null) => void;
  /**
   * One write so a follow-up Leave cannot flash the next offer slot (pending cleared
   * while `talkingToNpcId` is still set) or re-open the pointer (talk closed while pending
   * is still set).
   */
  closeTalkAndFollowUp: () => void;
  /** Clears nearby / talking / portal / traveling, so a fresh visit — or one interrupted
   *  mid-hop — never opens a stale conversation or strands the UI hidden. */
  resetFarmUi: () => void;
}

export const useFarmStore = create<FarmStore>((set) => ({
  nearbyNpcId: null,
  talkingToNpcId: null,
  nearbyPortalId: null,
  isTraveling: false,
  pendingFollowUp: null,

  setNearbyNpc: (id) => set((s) => (s.nearbyNpcId === id ? s : { ...s, nearbyNpcId: id })),
  setNearbyPortal: (id) => set((s) => (s.nearbyPortalId === id ? s : { ...s, nearbyPortalId: id })),
  setTraveling: (traveling) => set({ isTraveling: traveling }),
  openDialogue: (id) => set({ talkingToNpcId: id }),
  closeDialogue: () => set({ talkingToNpcId: null }),
  setPendingFollowUp: (pending) => set({ pendingFollowUp: pending }),
  closeTalkAndFollowUp: () => set({ talkingToNpcId: null, pendingFollowUp: null }),
  resetFarmUi: () =>
    set({
      nearbyNpcId: null,
      talkingToNpcId: null,
      nearbyPortalId: null,
      isTraveling: false,
    }),
}));
