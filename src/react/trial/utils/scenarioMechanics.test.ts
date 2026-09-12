/** @vitest-environment happy-dom */

import { describe, expect, it } from 'vitest';
import type { DebateScenarioJson } from '../../../types/debateEntities';
import { DEFAULT_MAX_ANALYSIS_ATTEMPTS } from './fallacyGuessTypes';
import {
  applyFeatureUnlocks,
  DEFAULT_MECHANICS,
  encounterLabels,
  resolveMechanics,
} from './scenarioMechanics';

const baseScenario: DebateScenarioJson = {
  id: 'fixture',
  playerSide: 'opposition',
  logicalFallacies: [],
  availableLogicalFallacies: [],
  rounds: [],
};

describe('resolveMechanics', () => {
  it('returns full-debate defaults when mechanics are omitted', () => {
    expect(resolveMechanics(baseScenario)).toEqual(DEFAULT_MECHANICS);
    expect(DEFAULT_MECHANICS.maxAnalysisAttempts).toBe(DEFAULT_MAX_ANALYSIS_ATTEMPTS);
    expect(DEFAULT_MECHANICS.encounterKind).toBe('debate');
  });

  it('overrides only the authored flags and floors a valid attempt budget', () => {
    const resolved = resolveMechanics({
      ...baseScenario,
      mechanics: {
        analysisEnabled: false,
        showRoundRecap: false,
        encounterKind: 'gossip',
        maxAnalysisAttempts: 2.9,
      },
    });
    expect(resolved.analysisEnabled).toBe(false);
    expect(resolved.showRoundRecap).toBe(false);
    expect(resolved.encounterKind).toBe('gossip');
    expect(resolved.maxAnalysisAttempts).toBe(2);
    expect(resolved.showInsightPoints).toBe(true);
  });

  it('falls back when the attempt budget is missing or not a positive finite number', () => {
    expect(
      resolveMechanics({ ...baseScenario, mechanics: { maxAnalysisAttempts: 0 } })
        .maxAnalysisAttempts,
    ).toBe(DEFAULT_MAX_ANALYSIS_ATTEMPTS);
    expect(
      resolveMechanics({ ...baseScenario, mechanics: { maxAnalysisAttempts: Number.NaN } })
        .maxAnalysisAttempts,
    ).toBe(DEFAULT_MAX_ANALYSIS_ATTEMPTS);
  });
});

describe('applyFeatureUnlocks', () => {
  it('hides Insight and round-type chrome until the matching feature is unlocked or taught here', () => {
    const hidden = applyFeatureUnlocks(DEFAULT_MECHANICS, []);
    expect(hidden.showInsightPoints).toBe(false);
    expect(hidden.showRoundType).toBe(false);

    const unlocked = applyFeatureUnlocks(DEFAULT_MECHANICS, ['insight_points', 'round_types']);
    expect(unlocked.showInsightPoints).toBe(true);
    expect(unlocked.showRoundType).toBe(true);

    const taught = applyFeatureUnlocks(DEFAULT_MECHANICS, [], ['insight_points']);
    expect(taught.showInsightPoints).toBe(true);
    expect(taught.showRoundType).toBe(false);
  });
});

describe('encounterLabels', () => {
  it('swaps log copy off a non-debate encounter kind', () => {
    expect(encounterLabels(baseScenario).logTitle).toBe('debateLog');
    expect(
      encounterLabels({ ...baseScenario, mechanics: { encounterKind: 'gossip' } }).logTitle,
    ).toBe('gossipLog');
    expect(
      encounterLabels({ ...baseScenario, mechanics: { encounterKind: 'gossip' } }).showSides,
    ).toBe(false);
  });
});
