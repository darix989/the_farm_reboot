/**
 * Vitest stand-in for `phaser`. Unit tests never boot a Game; they only import modules
 * that construct `EventBus` (`new Events.EventEmitter()`). Loading the real library
 * tries to touch a canvas 2D context and throws in Node / happy-dom.
 */
export class EventEmitter {
  on(): this {
    return this;
  }
  once(): this {
    return this;
  }
  off(): this {
    return this;
  }
  emit(): boolean {
    return false;
  }
  removeListener(): this {
    return this;
  }
  removeAllListeners(): this {
    return this;
  }
}

export const Events = { EventEmitter };

export default { Events };
