/**
 * Tutorial overlay modal layout (stage-normalized ratios, same space as {@link DebateTutorialArea}).
 */

export const TutorialModalAnchor = {
  TopLeft: 'topLeft',
  Center: 'center',
} as const;
export type TutorialModalAnchor = (typeof TutorialModalAnchor)[keyof typeof TutorialModalAnchor];

export const TutorialModalSize = {
  Small: 'small',
  Medium: 'medium',
  Large: 'large',
} as const;
export type TutorialModalSize = (typeof TutorialModalSize)[keyof typeof TutorialModalSize];

export const TutorialModalPosition = {
  TopLeft: 'topLeft',
  TopCenter: 'topCenter',
  TopRight: 'topRight',
  CenterLeft: 'centerLeft',
  Center: 'center',
  CenterRight: 'centerRight',
  BottomLeft: 'bottomLeft',
  BottomCenter: 'bottomCenter',
  BottomRight: 'bottomRight',
} as const;
export type TutorialModalPosition =
  (typeof TutorialModalPosition)[keyof typeof TutorialModalPosition];

export const TutorialModalPreset = {
  AnalysisSentencesSelection: 'analysisSentencesSelection',
  AnalysisFallacySelection: 'analysisFallacySelection',
  AnalysisSubmit: 'analysisSubmit',
  AnalysisExit: 'analysisExit',
} as const;
export type TutorialModalPreset = (typeof TutorialModalPreset)[keyof typeof TutorialModalPreset];

/** Named preset → composable placement (resolved before pivot math). */
export type TutorialModalPresetSpec = {
  preset: TutorialModalPreset;
  pivot?: TutorialModalAnchor;
};

/** Grid cell + size; default pivot is {@link TutorialModalAnchor.Center}. */
export type TutorialModalPlacementSpec = {
  size: TutorialModalSize;
  position: TutorialModalPosition;
  pivot?: TutorialModalAnchor;
};

/** Full control: ratios on the stage; default pivot is {@link TutorialModalAnchor.TopLeft}. */
export type TutorialModalExplicitSpec = {
  x: number;
  y: number;
  width: number;
  height: number;
  pivot?: TutorialModalAnchor;
};

export type TutorialModalSpec =
  | TutorialModalPresetSpec
  | TutorialModalPlacementSpec
  | TutorialModalExplicitSpec;
