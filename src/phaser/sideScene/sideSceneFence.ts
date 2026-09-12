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

/**
 * Placements for one fence run: whole pieces tiled straight across `[fromX, toX)`,
 * plus a gate image over every gap that names one.
 *
 * A gated gap does **not** carve a hole out of the piece tiling: `gate-complete` etc.
 * are wider than a piece and fully opaque, and are always the last thing added to the
 * scene for this run (`placeFences`), so at equal depth they render on top of — and
 * fully cover — whatever fence tiles straight through underneath. Trying to compute
 * which pieces would visually collide with a gate and skip exactly those was the
 * previous approach, and it was a bug farm of its own: the piece grid and the gate's
 * own centred width rarely lined up, leaving a real gap on one side of the gate and an
 * oversized hole on the other. Only a **bare hole** (`gate: 'none'` or omitted — no
 * gate asset to cover the seam) still needs pieces skipped around it.
 */
export function buildFenceRun(run: SideFenceRun): FencePlacement[] {
  const scale = run.scale ?? 1;
  const pieceWidth = FARM_KIT_ASSETS[FENCE_PIECE].width * scale;
  const pitch = FENCE_PIECE_TILE_WIDTH_NATIVE_PX * scale;
  const placements: FencePlacement[] = [];

  const holes = run.gaps.filter((gap) => !gap.gate || gap.gate === 'none');

  for (let x = run.fromX; x < run.toX; x += pitch) {
    const inHole = holes.some((hole) => {
      const width = hole.width ?? pieceWidth;
      return x < hole.x + width / 2 && x + pieceWidth > hole.x - width / 2;
    });
    if (inHole) continue;
    placements.push({ kind: 'piece', asset: FENCE_PIECE, x, y: run.y, scale });
  }

  run.gaps.forEach((gap) => {
    if (!gap.gate || gap.gate === 'none') return;
    placements.push({ kind: 'gate', asset: GATE_ASSET[gap.gate], x: gap.x, y: run.y, scale });
  });

  return placements;
}
