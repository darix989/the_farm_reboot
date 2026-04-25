# Tutorial guidelines

## Coordinate space (important)

All `spotlight` / `modal` ratios in debate JSON are expressed as fractions of
`#app-stage-16x9` (the letterboxed 16:9 stage), **not** of the browser viewport.
The conversion happens in two pieces: `useStageRect` (see `useStageRect.ts`)
tracks the stage's live `getBoundingClientRect()` reactively — observing
`ResizeObserver` on the stage element plus `window.resize`, `visualViewport`
events, `fullscreenchange`, and `orientationchange`, all coalesced through
`requestAnimationFrame`. `resolveStageSpotlightToViewport` (see
`spotlightRect.ts`) is then a pure function that takes that stage rect and
adds the letterbox offset, so a spotlight defined at 1920×1080 lands on the
same UI at any aspect ratio (e.g. 874×402 landscape iPhone, where the stage
is 714.67×402 centred in the viewport).

For this to hold, **every UI element a spotlight can target must also live in
stage coordinates**. In practice that means trial modals
(`RoundAnalysisModal`, `RoundRecapModal`, `IntroSummaryModal`) use
`position: absolute; inset: 0` on their overlay — anchored to
`#app-stage-16x9` (which is `position: relative`) — and size their modal box
in `%` rather than `vw` / `vh`. If a new overlay is added and it uses
`position: fixed` or viewport units, spotlight ratios aimed at content inside
it will drift the moment the window aspect ratio stops being 16:9.

## Size guidelines

Minimum values for the modal size:

- `width` >= `0.35`;
- `height` >= `0.35`

This will guarantee to have 2 lines of text without any scroll.

## Common modal areas

- On game area (top left)
  - Centered inside the game area:
    `x: 0.125, y: 0.06, width: 0.4, height: 0.4`
