# Tutorial guidelines

## Coordinate space (important)

All `spotlight` / `modal` ratios in debate JSON are expressed as fractions of
`#app-stage-16x9` (the letterboxed 16:9 stage), **not** of the browser viewport.
`resolveStageSpotlightToViewport` (see `spotlightRect.ts`) reads the stage's
live `getBoundingClientRect()` and adds the letterbox offset, so a spotlight
defined at 1920×1080 lands on the same UI at any aspect ratio (e.g. 874×402
landscape iPhone, where the stage is 714.67×402 centred in the viewport).

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

- `width` >= `0.33`;
- `height` >= `0.33`

This will guarantee to have 2 lines of text without any scroll.

## Common modal areas

- On game area (top left)
  - Centered inside the game area:
    `x: 0.125, y: 0.06, width: 0.4, height: 0.4`

## Common spotlight areas

- FeedbackPanel:
  - Analyze button of the current round inside FeedbackPanel:

  ```
  "spotlight": {
    "x": 0.6,
    "y": 0.22,
    "width": 0.4,
    "height": 0.3
  },
  ```

- RoundAnalysisModal:
  - Sentences inside RoundAnalysisModal:

  ```
  "spotlight": {
    "x": 0.02,
    "y": 0.1,
    "width": 0.52,
    "height": 0.8
  },
  ```

  - Logical Fallacies inside RoundAnalysisModal:

- InteractivePanel:
  - Back and Continue buttons inside InteractivePanel:
  `x: 0.63, y: 0.85, width: 0.34, height: 0.12`
  - Continue button inside InteractivePanel:
  `x: 0.805, y: 0.85, width: 0.18, height: 0.12`
  - Options inside InteractivePanel:
    `x: 0.63, y: 0.6, width: 0.34, height: 0.26`
  - Option A inside InteractivePanel:
    `x: 0.63, y: 0.6, width: 0.095, height: 0.26`
  - Option B inside InteractivePanel:
    `x: 0.75, y: 0.6, width: 0.095, height: 0.26`
  - Option C inside InteractivePanel:
    `x: 0.87, y: 0.6, width: 0.095, height: 0.26`

- WizardPanel:
  - Whole area inside WizardPanel:

- Debate Log Panel:
  - `x: 0.61, y: 0.11, width: 0.37, height: 0.4`