import React from 'react';
import cn from 'classnames';
import { KEY_BINDINGS, keycapForCode, type ShortcutAction } from '../../data/keyBindings';
import { useShortcutRevealStore } from '../../store/shortcutRevealStore';
import styles from './ShortcutKeycap.module.scss';

export interface ShortcutKeycapProps {
  action: ShortcutAction | null;
  radius?: 'square' | 'pill';
}

/**
 * Absolutely-positioned overlay that replaces a CTA's visible content with its
 * keycap while Shift is held. The host's own children stay in the DOM (and go
 * `visibility: hidden` via `:has([data-shortcut-keycap])`) so flex/`max-content`
 * sizing does not jump.
 *
 * Always `aria-hidden`, never focusable, `pointer-events: none`.
 */
const ShortcutKeycap: React.FC<ShortcutKeycapProps> = ({ action, radius = 'square' }) => {
  const isRevealed = useShortcutRevealStore((s) => s.isRevealed);
  if (!isRevealed) return null;

  const label = action == null ? '—' : keycapForCode(KEY_BINDINGS[action].displayCode);

  return (
    <span
      className={cn(styles.keycap, styles[radius], action == null && styles.unbound)}
      data-shortcut-keycap
      aria-hidden
    >
      {label}
    </span>
  );
};

export default ShortcutKeycap;
