/**
 * Touch thumbstick for the overworld.
 *
 * There is no touch input anywhere else in the repo, so this is built from raw
 * pointer events. It stays hidden until the first touch-type pointer appears, so
 * desktop players never see it.
 *
 * Both sprites use `setScrollFactor(0)` to stay locked to the camera while the
 * world scrolls underneath.
 */
const STICK_RADIUS = 78;
/** Ignore tiny wobbles so a resting thumb does not drift the player. */
const DEAD_ZONE = 0.15;

export class VirtualJoystick {
  private base: Phaser.GameObjects.Image;
  private thumb: Phaser.GameObjects.Image;
  private pointerId: number | null = null;
  private origin = new Phaser.Math.Vector2();
  private value = new Phaser.Math.Vector2();
  private enabled = false;

  constructor(private scene: Phaser.Scene) {
    this.base = scene.add
      .image(0, 0, 'farm-stick-base')
      .setScrollFactor(0)
      .setDepth(9000)
      .setVisible(false);
    this.thumb = scene.add
      .image(0, 0, 'farm-stick-thumb')
      .setScrollFactor(0)
      .setDepth(9001)
      .setVisible(false);

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
  }

  /** Current stick direction, magnitude 0..1. Zero when untouched. */
  getVector(): Phaser.Math.Vector2 {
    return this.value;
  }

  private isTouch(pointer: Phaser.Input.Pointer): boolean {
    return pointer.wasTouch;
  }

  private onDown(pointer: Phaser.Input.Pointer): void {
    if (this.pointerId !== null || !this.isTouch(pointer)) return;
    this.enabled = true;
    this.pointerId = pointer.id;
    // Anchor wherever the thumb lands, rather than a fixed corner — far more
    // forgiving on a phone than hunting for a painted control.
    this.origin.set(pointer.x, pointer.y);
    this.base.setPosition(pointer.x, pointer.y).setVisible(true);
    this.thumb.setPosition(pointer.x, pointer.y).setVisible(true);
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (this.pointerId !== pointer.id) return;
    const dx = pointer.x - this.origin.x;
    const dy = pointer.y - this.origin.y;
    const dist = Math.min(Math.hypot(dx, dy), STICK_RADIUS);
    const angle = Math.atan2(dy, dx);
    const tx = this.origin.x + Math.cos(angle) * dist;
    const ty = this.origin.y + Math.sin(angle) * dist;
    this.thumb.setPosition(tx, ty);

    const strength = dist / STICK_RADIUS;
    if (strength < DEAD_ZONE) this.value.set(0, 0);
    else this.value.set(Math.cos(angle) * strength, Math.sin(angle) * strength);
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (this.pointerId !== pointer.id) return;
    this.pointerId = null;
    this.value.set(0, 0);
    this.base.setVisible(false);
    this.thumb.setVisible(false);
  }

  /** True once the player has used touch at least once. */
  isEnabled(): boolean {
    return this.enabled;
  }

  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    this.base.destroy();
    this.thumb.destroy();
  }
}
