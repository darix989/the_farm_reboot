/**
 * Turns a `SideFenceRun` into discrete piece placements, plus the gate placements for
 * any gap it names.
 *
 * `fence/repeating-piece.png` is **not** a tiling band, and its 795px width is *not*
 * the right placement pitch either. Measured column-by-column opaque coverage (see
 * `docs/farm_side_scenes.md`): the art is one post (x 0-165ish) followed by 5 picket
 * boards at a ~118px rhythm, the last of which ends around x=753 — the remaining
 * ~42px to the image's own edge is bare horizontal rail with no picket silhouette over
 * it, present so the rail has somewhere to run into the *next* piece's post. Placing
 * pieces at the full 795px width therefore leaves that 42px stub exposed as a
 * post-less gap with grass visible clean through it every ~795px — not a rounding
 * artifact, a real hole. Pitching pieces at the picket rhythm's own repeat distance
 * (post-width-equivalent + 5 picket-widths) instead lands the next post exactly where
 * the stub was heading, covering it, with no gap and no seam art required. Pure — no
 * Phaser value import — so it is unit-testable under the Vitest `phaser` stub and
 * reusable by the eventual scene-authoring tooling.
 */
import type { FarmKitAssetId } from './farmKit.generated';
import { FARM_KIT_ASSETS } from './farmKit.generated';
import type { SideFenceRun } from '../../types/sideScene';

const FENCE_PIECE: FarmKitAssetId = 'fence/repeating-piece';

/**
 * The piece's true repeat distance in native (pre-scale) pixels — where the next
 * piece's post has to start for the picket rhythm to continue with no gap and no
 * overlap into the previous piece's last picket. Measured from the source art (see the
 * module comment above), not derived from the 795px file width.
 */
export const FENCE_PIECE_TILE_WIDTH_NATIVE_PX = 753;

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
  const pitch = FENCE_PIECE_TILE_WIDTH_NATIVE_PX * scale;
  const placements: FencePlacement[] = [];

  for (let x = run.fromX; x < run.toX; x += pitch) {
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
