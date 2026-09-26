/** @vitest-environment happy-dom */

import { describe, expect, it } from 'vitest';
import { useCodexStore } from './codexStore';

const hydrate = (saved: unknown) =>
  useCodexStore.persist.getOptions().merge!(saved, useCodexStore.getState());

describe('analysis unlock hydration', () => {
  it('keeps fresh saves and fallacy knowledge alone locked', () => {
    expect(hydrate({}).unlockedFeatures).not.toContain('analysis');
    expect(hydrate({ knownFallacies: ['ad-hominem'] }).unlockedFeatures).not.toContain('analysis');
  });

  it('restores the unlock granted when the tutorial opened', () => {
    expect(hydrate({ unlockedFeatures: ['analysis'] }).unlockedFeatures).toEqual(['analysis']);
  });

  it('preserves learning from older saves that finished Cass or analysed her practice line', () => {
    expect(hydrate({ dialogFlags: ['cass-named-ad-hominem'] }).unlockedFeatures).toContain(
      'analysis',
    );
    expect(
      hydrate({
        spottedFallacies: [
          {
            fallacyId: 'ad-hominem',
            scenarioKey: '020_cass_teaches_ad_hominem',
            statementId: 'round-5',
            sentenceId: 's-r5-2',
          },
        ],
      }).unlockedFeatures,
    ).toContain('analysis');
  });

  it('does not infer the tutorial from older, premature analysis of Cass', () => {
    expect(
      hydrate({
        spottedFallacies: [
          {
            fallacyId: 'ad-hominem',
            scenarioKey: '020_cass_teaches_ad_hominem',
            statementId: 'stmt-r3-cass',
            sentenceId: 's-r3-opt-a-1',
          },
        ],
      }).unlockedFeatures,
    ).not.toContain('analysis');
  });
});
