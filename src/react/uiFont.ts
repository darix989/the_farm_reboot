/**
 * Mirrors `--ui-font-*` on `.react-root` (see `uiTypography.scss`).
 * Use in inline `style` so components stay aligned with the global scale.
 */
export const uiFont = {
  micro: 'var(--ui-font-micro)',
  caption: 'var(--ui-font-caption)',
  label: 'var(--ui-font-label)',
  subtitle: 'var(--ui-font-subtitle)',
  body: 'var(--ui-font-body)',
  display: 'var(--ui-font-display)',
  footer: 'var(--ui-font-footer)',
  footerWide: 'var(--ui-font-footer-wide)',
  control: 'var(--ui-font-control)',
  moderatorOpinion: 'var(--ui-font-moderator-opinion)',
} as const;
