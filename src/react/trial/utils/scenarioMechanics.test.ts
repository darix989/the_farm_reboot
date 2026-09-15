/** @vitest-environment happy-dom */

import { describe, expect, it } from 'vitest';
import type { DebateScenarioJson } from '../../../types/debateEntities';
import { DEFAULT_MAX_ANALYSIS_ATTEMPTS } from './fallacyGuessTypes';
import cassSparring from '../../../data/debates/020_cass_teaches_ad_hominem.json';
import {
  applyFeatureUnlocks,
  DEFAULT_MECHANICS,
  encounterLabels,
  isAnalysisAvailable,
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

  it.each([0, -1, 2.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'falls back to round 1 for an invalid analysis start round: %s',
    (analysisAvailableFromRound) => {
      expect(
        resolveMechanics({ ...baseScenario, mechanics: { analysisAvailableFromRound } })
          .analysisAvailableFromRound,
      ).toBe(1);
    },
  );
});

describe('isAnalysisAvailable', () => {
  it('keeps ordinary encounters available from round 1', () => {
    expect(isAnalysisAvailable(resolveMechanics(baseScenario), 1)).toBe(true);
  });

  it('locks Cass sparring until her round 5 tutorial and leaves history available afterwards', () => {
    const mechanics = resolveMechanics(cassSparring as DebateScenarioJson);
    for (const round of [1, 2, 3, 4]) {
      expect(isAnalysisAvailable(mechanics, round)).toBe(false);
    }
    for (const round of [5, 6, 7, 8]) {
      expect(isAnalysisAvailable(mechanics, round)).toBe(true);
    }
  });

  it('never unlocks analysis when the encounter disables it', () => {
    const mechanics = resolveMechanics({
      ...baseScenario,
      mechanics: { analysisEnabled: false, analysisAvailableFromRound: 5 },
    });
    expect(isAnalysisAvailable(mechanics, 5)).toBe(false);
    expect(isAnalysisAvailable(mechanics, 8)).toBe(false);
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
