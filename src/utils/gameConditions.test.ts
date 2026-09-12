/** @vitest-environment happy-dom */

import { describe, expect, it } from 'vitest';
import {
  areConditionsMet,
  conditionHint,
  isConditionMet,
  unmetConditions,
  unmetConditionsHint,
  type ConditionContext,
} from './gameConditions';
import type { SpottedFallacy } from '../store/codexStore';

const emptyCtx: ConditionContext = {
  knownFallacies: [],
  spottedFallacies: [],
  dialogFlags: [],
  unlockedFeatures: [],
  completedScenarios: [],
  completedTutorials: [],
};

function spot(
  fallacyId: SpottedFallacy['fallacyId'],
  scenarioKey: SpottedFallacy['scenarioKey'],
): SpottedFallacy {
  return { fallacyId, scenarioKey, statementId: 'st', sentenceId: 's' };
}

describe('isConditionMet', () => {
  it('matches fallacy_known by id', () => {
    const ctx: ConditionContext = { ...emptyCtx, knownFallacies: ['ad-hominem'] };
    expect(isConditionMet({ kind: 'fallacy_known', fallacyId: 'ad-hominem' }, ctx)).toBe(true);
    expect(isConditionMet({ kind: 'fallacy_known', fallacyId: 'straw-man' }, ctx)).toBe(false);
  });

  it('matches fallacy_spotted anywhere, or scoped to one encounter', () => {
    const ctx: ConditionContext = {
      ...emptyCtx,
      spottedFallacies: [spot('ad-hominem', '020_cass_teaches_ad_hominem')],
    };
    expect(isConditionMet({ kind: 'fallacy_spotted', fallacyId: 'ad-hominem' }, ctx)).toBe(true);
    expect(
      isConditionMet(
        {
          kind: 'fallacy_spotted',
          fallacyId: 'ad-hominem',
          scenarioKey: '020_cass_teaches_ad_hominem',
        },
        ctx,
      ),
    ).toBe(true);
    expect(
      isConditionMet(
        {
          kind: 'fallacy_spotted',
          fallacyId: 'ad-hominem',
          scenarioKey: '021_hetty_ad_hominem_barrage',
        },
        ctx,
      ),
    ).toBe(false);
  });

  it('matches encounter, flag, feature and tutorial conditions', () => {
    const ctx: ConditionContext = {
      ...emptyCtx,
      completedScenarios: ['010_gossip_trough_hetty'],
      dialogFlags: ['cass-named-ad-hominem'],
      unlockedFeatures: ['insight_points'],
      completedTutorials: ['field-notes-intro'],
    };
    expect(
      isConditionMet({ kind: 'encounter_completed', scenarioKey: '010_gossip_trough_hetty' }, ctx),
    ).toBe(true);
    expect(
      isConditionMet({ kind: 'encounter_completed', scenarioKey: '015_tobias_vs_rue' }, ctx),
    ).toBe(false);
    expect(isConditionMet({ kind: 'dialog_flag', flagId: 'cass-named-ad-hominem' }, ctx)).toBe(
      true,
    );
    expect(isConditionMet({ kind: 'feature_unlocked', featureId: 'insight_points' }, ctx)).toBe(
      true,
    );
    expect(isConditionMet({ kind: 'feature_unlocked', featureId: 'round_types' }, ctx)).toBe(false);
    expect(
      isConditionMet({ kind: 'tutorial_completed', tutorialId: 'field-notes-intro' }, ctx),
    ).toBe(true);
  });
});

describe('areConditionsMet / unmetConditions', () => {
  it('treats an absent or empty list as met', () => {
    expect(areConditionsMet(undefined, emptyCtx)).toBe(true);
    expect(areConditionsMet([], emptyCtx)).toBe(true);
    expect(unmetConditions(undefined, emptyCtx)).toEqual([]);
  });

  it('ANDs every condition and reports the outstanding ones in author order', () => {
    const conditions = [
      { kind: 'fallacy_known' as const, fallacyId: 'ad-hominem' as const },
      { kind: 'dialog_flag' as const, flagId: 'cass-named-ad-hominem' as const },
      { kind: 'feature_unlocked' as const, featureId: 'insight_points' as const },
    ];
    const ctx: ConditionContext = {
      ...emptyCtx,
      knownFallacies: ['ad-hominem'],
      dialogFlags: ['cass-named-ad-hominem'],
    };
    expect(areConditionsMet(conditions, ctx)).toBe(false);
    expect(unmetConditions(conditions, ctx)).toEqual([conditions[2]]);

    const met: ConditionContext = { ...ctx, unlockedFeatures: ['insight_points'] };
    expect(areConditionsMet(conditions, met)).toBe(true);
    expect(unmetConditions(conditions, met)).toEqual([]);
  });
});

describe('conditionHint / unmetConditionsHint', () => {
  it('phrases known and spotted fallacies as directions', () => {
    expect(conditionHint({ kind: 'fallacy_known', fallacyId: 'ad-hominem' })).toBe(
      'know the Ad Hominem fallacy',
    );
    expect(conditionHint({ kind: 'fallacy_spotted', fallacyId: 'ad-hominem' })).toBe(
      'spot Ad Hominem in a conversation',
    );
  });

  it('joins outstanding hints for a lock tooltip', () => {
    const hint = unmetConditionsHint(
      [
        { kind: 'fallacy_known', fallacyId: 'ad-hominem' },
        { kind: 'dialog_flag', flagId: 'cass-named-ad-hominem' },
      ],
      emptyCtx,
    );
    expect(hint).toBe(
      'Not yet — you need to know the Ad Hominem fallacy, let Cass name the trick for you.',
    );
    expect(unmetConditionsHint([], emptyCtx)).toBeNull();
  });
});
