import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { STAGE_DESIGN_HEIGHT, STAGE_DESIGN_WIDTH } from '../../utils/constants';
import { SIDE_SCENES } from '../../data/sideScenes';
import { queueSideSceneAssets } from '../sideScene/sideSceneAssets';
import { buildSideSceneLayers, type SideSceneLayers } from '../sideScene/sideSceneLayers';
import { placeFences, placeProps } from '../sideScene/sideSceneProps';
import { drawDebugOverlay, SideSceneDebugWalker } from '../sideScene/sideSceneDebug';
import { resolvePortal } from '../sideScene/sideSceneRoad';
import { reportSceneLoadProgress } from '../bootProgress';

/**
 * Iteration 1 of the lateral farm world: assembling one scene from the Megafarm kit and
 * proving the traversal contract (walk on the road only, one entrance, one or more
 * exits). No gameplay, no characters, no Trial routing yet — `Farm` stays the live
 * top-down overworld. Toggle off once real characters land on this scene.
 */
const DEBUG_SIDE_SCENE = true;

export class FarmSide extends Scene {
  private descriptor = SIDE_SCENES.greenMeadowsRoad;
  private sceneLayers: SideSceneLayers | null = null;
  private debugWalker: SideSceneDebugWalker | null = null;
  private scrollX = 0;

  constructor() {
    super('FarmSide');
  }

  preload() {
    if (queueSideSceneAssets(this, this.descriptor)) reportSceneLoadProgress(this);
  }

  create() {
    const { layers } = buildSideSceneLayers(this, this.descriptor);
    this.sceneLayers = layers;

    placeFences(this, this.descriptor.fences);
    placeProps(this, this.descriptor.props, this.descriptor.scale);

    this.cameras.main.setBounds(0, 0, this.descriptor.width, STAGE_DESIGN_HEIGHT);

    if (DEBUG_SIDE_SCENE) {
      drawDebugOverlay(this, this.descriptor);
      const west = resolvePortal(this.descriptor.portals[0], this.descriptor);
      this.debugWalker = new SideSceneDebugWalker(this, this.descriptor, west.x + 120);
    }

    // No `startFollow`: the scene drives `cam.scrollX` itself in `update()` so every
    // parallax calculation reads the same locally-computed value in the same tick,
    // rather than the one-frame-stale value Phaser's own camera render pass assigns.
    this.updateCamera();

    EventBus.emit('current-scene-ready', this);
  }

  update(_time: number, delta: number): void {
    this.debugWalker?.update(delta);
    this.updateCamera();
    this.sceneLayers?.update(this.scrollX);
  }

  private updateCamera(): void {
    const focusX = this.debugWalker?.sprite.x ?? this.descriptor.width / 2;
    const maxScrollX = Math.max(0, this.descriptor.width - STAGE_DESIGN_WIDTH);
    this.scrollX = Phaser.Math.Clamp(focusX - STAGE_DESIGN_WIDTH / 2, 0, maxScrollX);
    this.cameras.main.scrollX = this.scrollX;
  }
}
