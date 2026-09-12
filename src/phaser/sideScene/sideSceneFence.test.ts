import { describe, expect, it } from 'vitest';
import { buildFenceRun, FENCE_PIECE_TILE_WIDTH_NATIVE_PX } from './sideSceneFence';
import { FARM_KIT_ASSETS } from './farmKit.generated';
import type { SideFenceRun } from '../../types/sideScene';

describe('buildFenceRun', () => {
  const pieceWidth = FARM_KIT_ASSETS['fence/repeating-piece'].width;
  const pitch = FENCE_PIECE_TILE_WIDTH_NATIVE_PX;

  it('places a gate at each gap x and leaves no piece overlapping a gap', () => {
    const run: SideFenceRun = {
      y: 796,
      fromX: 0,
      toX: pieceWidth * 10,
      gaps: [
        { x: pieceWidth * 3, gate: 'open' },
        { x: pieceWidth * 7, gate: 'complete' },
      ],
    };

    const placements = buildFenceRun(run);
    const pieces = placements.filter((p) => p.kind === 'piece');
    const gates = placements.filter((p) => p.kind === 'gate');

    expect(gates).toHaveLength(2);
    expect(gates.map((g) => g.x)).toEqual([pieceWidth * 3, pieceWidth * 7]);

    run.gaps.forEach((gap) => {
      const gapWidth = gap.width ?? pieceWidth;
      pieces.forEach((piece) => {
        const overlaps = piece.x < gap.x + gapWidth && piece.x + pieceWidth > gap.x;
        expect(overlaps).toBe(false);
      });
    });
  });

  it('a run with no gaps tiles pieces at the measured picket-rhythm pitch', () => {
    const run: SideFenceRun = { y: 796, fromX: 0, toX: pitch * 4, gaps: [] };
    const placements = buildFenceRun(run);
    expect(placements).toHaveLength(4);
    placements.forEach((p, i) => expect(p.x).toBeCloseTo(i * pitch, 5));
  });

  it('consecutive pieces overlap by the piece width minus the tile pitch, never gap', () => {
    const run: SideFenceRun = { y: 796, fromX: 0, toX: pitch * 5, gaps: [] };
    const placements = buildFenceRun(run).filter((p) => p.kind === 'piece');
    const overlap = pieceWidth - pitch;
    for (let i = 1; i < placements.length; i += 1) {
      const previousRightEdge = placements[i - 1].x + pieceWidth;
      expect(placements[i].x).toBeLessThan(previousRightEdge);
      expect(previousRightEdge - placements[i].x).toBeCloseTo(overlap, 5);
    }
  });

  it('a gap of gate "none" leaves a hole with no gate placed', () => {
    const run: SideFenceRun = {
      y: 796,
      fromX: 0,
      toX: pieceWidth * 3,
      gaps: [{ x: pieceWidth, gate: 'none' }],
    };
    const placements = buildFenceRun(run);
    expect(placements.filter((p) => p.kind === 'gate')).toHaveLength(0);
    expect(placements.filter((p) => p.kind === 'piece')).toHaveLength(2);
  });
});
