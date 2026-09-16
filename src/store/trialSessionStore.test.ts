/** @vitest-environment happy-dom */

import { beforeEach, describe, expect, it } from 'vitest';
import { useCodexStore } from './codexStore';
import { useTrialSessionStore } from './trialSessionStore';

describe('trial session rollback', () => {
  beforeEach(() => {
    useCodexStore.getState().resetCodex();
    useTrialSessionStore.setState({ snapshot: null });
  });

  it('restores persistent Trial learning when the player abandons the encounter', () => {
    const codex = useCodexStore.getState();
    codex.learnFallacy('ad-hominem');
    useTrialSessionStore.getState().begin();

    codex.recordSpottedFallacy({
      fallacyId: 'false-dilemma',
      scenarioKey: '015_tobias_vs_rue',
      statementId: 'opening',
      sentenceId: 'opening-1',
    });
    codex.setDialogFlag('cass-named-ad-hominem');
    codex.unlockFeature('analysis');

    useTrialSessionStore.getState().abandon();

    const restored = useCodexStore.getState();
    expect(restored.knownFallacies).toEqual(['ad-hominem']);
    expect(restored.spottedFallacies).toEqual([]);
    expect(restored.dialogFlags).toEqual([]);
    expect(restored.unlockedFeatures).toEqual([]);
  });

  it('keeps completed-session learning by dropping its rollback snapshot', () => {
    useTrialSessionStore.getState().begin();
    useCodexStore.getState().unlockFeature('analysis');
    useTrialSessionStore.getState().complete();
    useTrialSessionStore.getState().abandon();

    expect(useCodexStore.getState().unlockedFeatures).toEqual(['analysis']);
  });
});
