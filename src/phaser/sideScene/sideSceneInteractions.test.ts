import { describe, expect, it } from 'vitest';
import {
  PORTAL_INTERACT_RADIUS,
  resolveFocus,
  SIDE_NPC_INTERACT_RADIUS,
} from './sideSceneInteractions';

const RADII = { npc: SIDE_NPC_INTERACT_RADIUS, portal: PORTAL_INTERACT_RADIUS };

describe('resolveFocus', () => {
  it('returns null when nothing is in range', () => {
    const focus = resolveFocus({ x: 0, y: 0 }, [{ id: 'hetty', x: 10000, y: 0 }], [], RADII);
    expect(focus).toBeNull();
  });

  it('picks the only candidate in range', () => {
    const focus = resolveFocus({ x: 100, y: 0 }, [{ id: 'hetty', x: 0, y: 0 }], [], RADII);
    expect(focus).toEqual({ kind: 'npc', id: 'hetty' });
  });

  it('ties go to the NPC', () => {
    // Both candidates score exactly 0.5: 170/340 for the NPC, 110/220 for the portal.
    const focus = resolveFocus(
      { x: 0, y: 0 },
      [{ id: 'hetty', x: 170, y: 0 }],
      [{ id: 'gate', x: -110, y: 0 }],
      RADII,
    );
    expect(focus).toEqual({ kind: 'npc', id: 'hetty' });
  });

  /**
   * Cass is deliberately beyond the combined talk/portal radii: a 660px horizontal gap
   * (and 34px vertical offset) exceeds 340px + 220px. The gate must therefore be the only
   * focus candidate when the player is at its threshold.
   */
  it('keeps Cass and the gate interaction zones separate', () => {
    const GATE_X = 3800;
    const CASS_X = GATE_X - 660;
    const player = { x: 3790, y: 952 };

    const focus = resolveFocus(
      player,
      [{ id: 'cass', x: CASS_X, y: 952 }],
      [{ id: 'gate', x: GATE_X, y: 918 }],
      RADII,
    );

    expect(focus).toEqual({ kind: 'portal', id: 'gate' });
  });

  it('portals with no `to` are simply never passed in, so they are never candidates', () => {
    // The caller is responsible for filtering — resolveFocus takes whatever list it's
    // handed. Passing none in for portals proves an empty list never wins over an NPC.
    const focus = resolveFocus({ x: 3150, y: 952 }, [{ id: 'cass', x: 3140, y: 952 }], [], RADII);
    expect(focus).toEqual({ kind: 'npc', id: 'cass' });
  });
});
