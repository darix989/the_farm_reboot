import { describe, expect, it } from 'vitest';
import { resolveFocus } from './sideSceneInteractions';

const RADII = { npc: 400, portal: 220 };

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
    // Both candidates score exactly 0.5: 200/400 for the NPC, 110/220 for the portal.
    const focus = resolveFocus(
      { x: 0, y: 0 },
      [{ id: 'hetty', x: 200, y: 0 }],
      [{ id: 'gate', x: -110, y: 0 }],
      RADII,
    );
    expect(focus).toEqual({ kind: 'npc', id: 'hetty' });
  });

  /**
   * The regression `greenMeadowsRoad` is actually shaped around: Cass stands at
   * `GATE_X - 340 = 3460` with a 400px talk radius, which reaches every point within
   * 400px of the gate at `GATE_X = 3800` (the gap between them is only 340px). A flat
   * "nearest NPC wins" rule would make the gate unenterable — standing right on top of
   * it, still 330px from Cass (within her radius), the gate would lose to her on raw
   * distance alone. Scoring by radius fraction instead: at x=3790, Cass is 330px away
   * (score 0.825) and the gate is 10px away with its own 220px radius (score 0.045) — the
   * gate wins by a wide margin.
   */
  it('lets a tight-radius portal beat a wide-radius NPC standing right on top of it (Cass vs. the gate)', () => {
    const GATE_X = 3800;
    const CASS_X = GATE_X - 340;
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
    const focus = resolveFocus({ x: 3790, y: 952 }, [{ id: 'cass', x: 3460, y: 952 }], [], RADII);
    expect(focus).toEqual({ kind: 'npc', id: 'cass' });
  });
});
