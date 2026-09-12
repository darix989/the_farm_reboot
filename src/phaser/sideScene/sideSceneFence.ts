/**
 * Turns a `SideFenceRun` into discrete piece placements, plus the gate placements for
 * any gap it names.
 *
 * `fence/repeating-piece.png` is **not** a tiling band (its left edge is a post, its
 * right edge is mid-rail — see the plan's asset analysis) so the run places whole
 * images at a pitch equal to the piece's on-screen width, rather than a `tileSprite`.
 * Pure — no Phaser value import — so it is unit-testable under the Vitest `phaser`
 * stub and reusable by the eventual scene-authoring tooling.
 */
import type { FarmKitAssetId } from './farmKit.generated';
import { FARM_KIT_ASSETS } from './farmKit.generated';
import type { SideFenceRun } from '../../types/sideScene';

const FENCE_PIECE: FarmKitAssetId = 'fence/repeating-piece';

export interface FencePiecePlacement {
  kind: 'piece';
  asset: FarmKitAssetId;
  x: number;
  y: number;
  scale: number;
}

export interface FenceGatePlacement {
  kind: 'gate';
  asset: FarmKitAssetId;
  x: number;
  y: number;
  scale: number;
}

export type FencePlacement = FencePiecePlacement | FenceGatePlacement;

const GATE_ASSET: Record<
  Exclude<NonNullable<SideFenceRun['gaps'][number]['gate']>, 'none'>,
  FarmKitAssetId
> = {
  open: 'fence/gate-open',
  closed: 'fence/gate-closed',
  complete: 'fence/gate-complete',
};

/** Placements for one fence run: whole pieces along `[fromX, toX)`, skipping every gap. */
export function buildFenceRun(run: SideFenceRun): FencePlacement[] {
  const scale = run.scale ?? 1;
  const pieceWidth = FARM_KIT_ASSETS[FENCE_PIECE].width * scale;
  const placements: FencePlacement[] = [];

  for (let x = run.fromX; x < run.toX; x += pieceWidth) {
    const gap = run.gaps.find((g) => x < g.x + (g.width ?? pieceWidth) && x + pieceWidth > g.x);
    if (gap) continue;
    placements.push({ kind: 'piece', asset: FENCE_PIECE, x, y: run.y, scale });
  }

  run.gaps.forEach((gap) => {
    if (!gap.gate || gap.gate === 'none') return;
    placements.push({ kind: 'gate', asset: GATE_ASSET[gap.gate], x: gap.x, y: run.y, scale });
  });

  return placements;
}
