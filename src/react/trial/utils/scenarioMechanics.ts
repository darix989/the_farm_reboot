import type {
  DebateScenarioJson,
  DebateScenarioMechanics,
  EncounterKind,
} from '../../../types/debateEntities';
import { DEFAULT_MAX_ANALYSIS_ATTEMPTS } from './fallacyGuessTypes';
import type { Labels } from '../../../data/labels';

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
  encounterKind: 'debate',
};

/**
 * Presentation per encounter kind: the log panel heading, the opening guidance shown
 * before round 1, the line shown once it is over, and whether Proposition / Opposition
 * badges make sense. Keeps "Debate Log" and a side badge off a scenario that is two
 * hens talking at a water trough.
 */
const ENCOUNTER_LABELS: Record<
  EncounterKind,
  { logTitle: Labels; intro: Labels; finished: Labels; showSides: boolean }
> = {
  debate: {
    logTitle: 'debateLog',
    intro: 'workflowDebateIntro',
    finished: 'debateFinished',
    showSides: true,
  },
  gossip: {
    logTitle: 'gossipLog',
    intro: 'workflowGossipIntro',
    finished: 'gossipFinished',
    // Nobody is arguing a side at a trough; they are just talking.
    showSides: false,
  },
  sparring: {
    logTitle: 'sparringLog',
    intro: 'workflowSparringIntro',
    finished: 'sparringFinished',
    // A coach throwing lines at you is not a debate with two sides.
    showSides: false,
  },
  lab: {
    logTitle: 'labLog',
    intro: 'workflowLabIntro',
    finished: 'labFinished',
    showSides: false,
  },
};

/** Label keys for a scenario's encounter kind. Falls back to the debate copy. */
export function encounterLabels(debate: DebateScenarioJson) {
  return ENCOUNTER_LABELS[resolveMechanics(debate).encounterKind] ?? ENCOUNTER_LABELS.debate;
}

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
    encounterKind: m.encounterKind ?? DEFAULT_MECHANICS.encounterKind,
  };
}
