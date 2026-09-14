const HINT_SCENES = new Set(['Farm', 'FarmSide', 'Trial']);

export interface ShortcutHintContext {
  isTouch: boolean;
  currentScene: string;
  isTraveling: boolean;
  isCodexOpen: boolean;
  isTutorialOpen: boolean;
  isRevealed: boolean;
}

/**
 * Whether the bottom-left "hold Shift" hint should paint. Callers keep the node
 * mounted when this would be true at `isRevealed: false`, and hide it with
 * `visibility` while Shift is held — unmounting on reveal flickers.
 */
export function shouldShowShortcutHint(ctx: ShortcutHintContext): boolean {
  if (ctx.isTouch) return false;
  if (!HINT_SCENES.has(ctx.currentScene)) return false;
  if (ctx.isTraveling) return false;
  if (ctx.isCodexOpen) return false;
  if (ctx.isTutorialOpen) return false;
  if (ctx.isRevealed) return false;
  return true;
}
