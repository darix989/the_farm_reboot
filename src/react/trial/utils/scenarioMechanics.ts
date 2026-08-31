import type { DebateScenarioJson, DebateScenarioMechanics } from '../../../types/debateEntities';
import { DEFAULT_MAX_ANALYSIS_ATTEMPTS } from './fallacyGuessTypes';

/** Every mode flag resolved to a concrete value — no `undefined` for consumers to handle. */
export type ResolvedMechanics = Required<DebateScenarioMechanics>;

/**
 * Full-debate behaviour. A scenario with no `mechanics` block resolves to exactly this,
 * so adding the flags cannot change how any existing scenario plays.
 */
export const DEFAULT_MECHANICS: ResolvedMechanics = {
  analysisEnabled: true,
  showInsightPoints: true,
  showModeratorOpinion: true,
  showRoundRecap: true,
  showIntroSummary: true,
  revealChoiceAssessment: false,
  targetQuality: 'effective',
  maxAnalysisAttempts: DEFAULT_MAX_ANALYSIS_ATTEMPTS,
};

function boolOr(value: boolean | undefined, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/**
 * Resolves a scenario's mode flags against {@link DEFAULT_MECHANICS}.
 *
 * Defensive in the same way as `getStartingInsightPoints`: authored JSON is cast rather
 * than validated at load time, so a malformed value falls back to the default instead of
 * propagating a `NaN` attempt budget into the analysis modal.
 */
export function resolveMechanics(debate: DebateScenarioJson): ResolvedMechanics {
  const m = debate.mechanics;
  if (!m) return DEFAULT_MECHANICS;

  const attempts = m.maxAnalysisAttempts;
  const maxAnalysisAttempts =
    typeof attempts === 'number' && Number.isFinite(attempts) && attempts >= 1
      ? Math.floor(attempts)
      : DEFAULT_MECHANICS.maxAnalysisAttempts;

  return {
    analysisEnabled: boolOr(m.analysisEnabled, DEFAULT_MECHANICS.analysisEnabled),
    showInsightPoints: boolOr(m.showInsightPoints, DEFAULT_MECHANICS.showInsightPoints),
    showModeratorOpinion: boolOr(m.showModeratorOpinion, DEFAULT_MECHANICS.showModeratorOpinion),
    showRoundRecap: boolOr(m.showRoundRecap, DEFAULT_MECHANICS.showRoundRecap),
    showIntroSummary: boolOr(m.showIntroSummary, DEFAULT_MECHANICS.showIntroSummary),
    revealChoiceAssessment: boolOr(
      m.revealChoiceAssessment,
      DEFAULT_MECHANICS.revealChoiceAssessment,
    ),
    targetQuality: m.targetQuality ?? DEFAULT_MECHANICS.targetQuality,
    maxAnalysisAttempts,
  };
}
