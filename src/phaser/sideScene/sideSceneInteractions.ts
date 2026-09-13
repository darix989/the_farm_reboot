/**
 * What the player is standing close enough to walk up to on a lateral scene's road — an
 * NPC to talk to, or a portal to travel through. Pure (no Phaser value import, `Math.hypot`
 * rather than `Phaser.Math.Distance.Between`) so the Hetty-vs-gate regression below is
 * unit tested without booting a scene — the Vitest `phaser` stub only provides
 * `Events.EventEmitter`, and a Phaser value import would make this module untestable.
 */

/**
 * How near the player has to stand before a portal is offered for travel. Exported so
 * `FarmSide` and `drawDebugOverlay` (`sideSceneDebug.ts`) share the one number rather than
 * risking the debug ring drifting out of sync with what actually arms a portal.
 */
export const PORTAL_INTERACT_RADIUS = 220;

export type Focus = { kind: 'npc' | 'portal'; id: string } | null;

export interface FocusPoint {
  id: string;
  x: number;
  y: number;
}

export interface FocusRadii {
  npc: number;
  portal: number;
}

interface ScoredCandidate {
  kind: 'npc' | 'portal';
  id: string;
  score: number;
}

/**
 * Nearest candidate under its own interact radius, or null if nothing is close enough.
 *
 * Each candidate is scored as `distance / itsOwnRadius`, not raw distance: a flat
 * "nearest NPC always wins" rule makes a portal near a wide-radius NPC unenterable. On
 * `greenMeadowsRoad`, Hetty stands at `GATE_X - 340` with a 400px talk radius, which
 * reaches every point within 400px of the gate itself; a 220px-radius gate portal would
 * never win a raw-distance contest at any point where it is actually in range. Scoring by
 * radius fraction instead means the gate (a tight, close-in target) beats Hetty (a wide,
 * far-off one) exactly where a player standing at the gate would expect it to. Ties go to
 * the NPC — a conversation is the more common thing to want, and the only case this can
 * tie is standing equidistant (as a fraction of each radius) between the two.
 */
export function resolveFocus(
  player: { x: number; y: number },
  npcs: readonly FocusPoint[],
  portals: readonly FocusPoint[],
  radii: FocusRadii,
): Focus {
  const candidates: ScoredCandidate[] = [
    ...npcs.map((npc) => ({
      kind: 'npc' as const,
      id: npc.id,
      score: Math.hypot(player.x - npc.x, player.y - npc.y) / radii.npc,
    })),
    ...portals.map((portal) => ({
      kind: 'portal' as const,
      id: portal.id,
      score: Math.hypot(player.x - portal.x, player.y - portal.y) / radii.portal,
    })),
  ];

  let best: ScoredCandidate | null = null;
  for (const candidate of candidates) {
    if (candidate.score >= 1) continue;
    const current = best as ScoredCandidate | null;
    const better = !current || candidate.score < current.score;
    const tiedFavoringNpc =
      !!current &&
      candidate.score === current.score &&
      candidate.kind === 'npc' &&
      current.kind !== 'npc';
    if (better || tiedFavoringNpc) best = candidate;
  }

  return best ? { kind: best.kind, id: best.id } : null;
}
