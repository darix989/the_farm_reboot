/**
 * Mirrors `--ui-color-*` on `html` (see `uiColors.scss`).
 * Use in inline `style` so components stay aligned with the global palette.
 */
export const uiColor = {
  bg: 'var(--ui-color-bg)',
  bgSoft: 'var(--ui-color-bg-soft)',
  surfaceTrialPanel: 'var(--ui-color-surface-trial-panel)',
  white: 'var(--ui-color-white)',
  textOnAccent: 'var(--ui-color-text-on-accent)',

  textPrimary: 'var(--ui-color-text-primary)',
  textTitle: 'var(--ui-color-text-title)',
  textStrong: 'var(--ui-color-text-strong)',
  textEmphasis: 'var(--ui-color-text-emphasis)',
  textBody: 'var(--ui-color-text-body)',
  textSecondary: 'var(--ui-color-text-secondary)',
  textMuted: 'var(--ui-color-text-muted)',
  textSubtle: 'var(--ui-color-text-subtle)',
  textHint: 'var(--ui-color-text-hint)',
  textCaption: 'var(--ui-color-text-caption)',
  textFaint: 'var(--ui-color-text-faint)',
  textDisabled: 'var(--ui-color-text-disabled)',
  textGhost: 'var(--ui-color-text-ghost)',
  textMuted2: 'var(--ui-color-text-muted-2)',

  accent: 'var(--ui-color-accent)',

  info: 'var(--ui-color-info)',
  infoBright: 'var(--ui-color-info-bright)',
  danger: 'var(--ui-color-danger)',
  success: 'var(--ui-color-success)',
  warning: 'var(--ui-color-warning)',

  borderFade: 'var(--ui-color-border-fade)',
} as const;
