import { supportsTouchInput } from '../../utils/touchInput';
import { isInsideJoystick, JOYSTICK_CENTER, resolveJoystickDrag } from './virtualJoystickMath';

/**
 * Touch thumbstick for the overworld.
 *
 * It is built from raw pointer events, fixed in the bottom-left corner, and visible
 * whenever the browser reports touch support.
 *
 * Both sprites use `setScrollFactor(0)` to stay locked to the camera while the
 * world scrolls underneath.
 */
export class VirtualJoystick {
  private base: Phaser.GameObjects.Image;
  private thumb: Phaser.GameObjects.Image;
  private pointerId: number | null = null;
  private value = new Phaser.Math.Vector2();
  private readonly touchCapable = supportsTouchInput();
  private acceptingInput = true;

  constructor(private scene: Phaser.Scene) {
    this.base = scene.add
      .image(JOYSTICK_CENTER.x, JOYSTICK_CENTER.y, 'farm-stick-base')
      .setScrollFactor(0)
      .setDepth(9000)
      .setVisible(this.touchCapable);
    this.thumb = scene.add
      .image(JOYSTICK_CENTER.x, JOYSTICK_CENTER.y, 'farm-stick-thumb')
      .setScrollFactor(0)
      .setDepth(9001)
      .setVisible(this.touchCapable);

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    scene.input.on(Phaser.Input.Events.GAME_OUT, this.onGameOut, this);
  }

  /** Current stick direction, magnitude 0..1. Zero when untouched. */
  getVector(): Phaser.Math.Vector2 {
    return this.value;
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (!this.acceptingInput || !this.touchCapable) return;
    if (this.pointerId !== null || !pointer.wasTouch) return;
    if (!isInsideJoystick(pointer.x, pointer.y)) return;
    this.pointerId = pointer.id;
    this.applyPointer(pointer);
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (this.pointerId !== pointer.id) return;
    this.applyPointer(pointer);
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (this.pointerId !== pointer.id) return;
    this.reset();
  }

  private onGameOut(): void {
    this.reset();
  }

  private applyPointer(pointer: Phaser.Input.Pointer): void {
    const drag = resolveJoystickDrag(pointer.x, pointer.y);
    this.thumb.setPosition(drag.thumb.x, drag.thumb.y);
    this.value.set(drag.vector.x, drag.vector.y);
  }

  private reset(): void {
    this.pointerId = null;
    this.value.set(0, 0);
    this.thumb.setPosition(JOYSTICK_CENTER.x, JOYSTICK_CENTER.y);
  }

  /**
   * Gate input for a farm talk. Disabling hides the sprites and clears a held stick so
   * a stale vector cannot walk Rue off on the frame the conversation closes.
   */
  setEnabled(enabled: boolean): void {
    this.acceptingInput = enabled;
    this.reset();
    const visible = enabled && this.touchCapable;
    this.base.setVisible(visible);
    this.thumb.setVisible(visible);
  }

  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    this.scene.input.off(Phaser.Input.Events.GAME_OUT, this.onGameOut, this);
    this.base.destroy();
    this.thumb.destroy();
  }
}
