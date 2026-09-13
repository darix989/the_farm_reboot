/** Fallback screen-space gap between an interaction target and its prompt, in design pixels. */
export const DEFAULT_INTERACTION_PROMPT_LIFT = 200;

export function resolveInteractionPromptLift(value?: number): number {
  return value ?? DEFAULT_INTERACTION_PROMPT_LIFT;
}
