import { supportsTouchInput } from '../../utils/touchInput';
import { INTERACT_BUTTON_CENTER, isInsideInteractButton } from './virtualInteractButtonMath';

/**
 * Touch action button for Farm and FarmSide.
 *
 * It mirrors the bottom-left joystick's raw-pointer contract while delegating the
 * action to the owning scene. That keeps touch interaction identical to the
 * Space / E / Enter path, including dialogue, portals, and their input locks.
 */
export class VirtualInteractButton {
  private base: Phaser.GameObjects.Image;
  private icon: Phaser.GameObjects.Image;
  private readonly touchCapable = supportsTouchInput();
  private acceptingInput = true;

  constructor(
    private scene: Phaser.Scene,
    private readonly onInteract: () => void,
  ) {
    this.base = scene.add
      .image(INTERACT_BUTTON_CENTER.x, INTERACT_BUTTON_CENTER.y, 'farm-interact-base')
      .setScrollFactor(0)
      .setDepth(9000)
      .setVisible(this.touchCapable);
    this.icon = scene.add
      .image(INTERACT_BUTTON_CENTER.x, INTERACT_BUTTON_CENTER.y, 'farm-interact-icon')
      .setScrollFactor(0)
      .setDepth(9001)
      .setVisible(this.touchCapable);

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (!this.acceptingInput || !this.touchCapable || !pointer.wasTouch) return;
    if (!isInsideInteractButton(pointer.x, pointer.y)) return;
    this.onInteract();
  }

  /** Mirrors the joystick lock so an open dialogue or tutorial cannot be re-triggered. */
  setEnabled(enabled: boolean): void {
    this.acceptingInput = enabled;
    const visible = enabled && this.touchCapable;
    this.base.setVisible(visible);
    this.icon.setVisible(visible);
  }

  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.base.destroy();
    this.icon.destroy();
  }
}
