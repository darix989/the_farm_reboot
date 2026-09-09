import type { DebateScenarioJson } from '../types/debateEntities';
import type { Labels } from './labels';
// Type-only, and deliberately so: `gameConditions` imports this module back for
// `DebateScenarioKey`, and a value import would make that a real cycle at runtime.
import type { GameCondition } from '../utils/gameConditions';

import tutorialBlueBarnJson from './debates/000_tutorial_the_blue_barn.json';
import montyVsPennyJson from './debates/001_monty_vs_penny.json';
import bellaVsWoolseyJson from './debates/002_bella_vs_woolsey.json';
import sampleDebateJson from './debates/sample-debate.json';
import gossipHettyJson from './debates/010_gossip_trough_hetty.json';
import sparringCassJson from './debates/011_sparring_cass_ad_hominem.json';
import gossipBramJson from './debates/012_gossip_trough_bram.json';
import labCassJson from './debates/013_lab_cass_dirty_tricks.json';
import skirmishBramJson from './debates/014_skirmish_bram_fenceline.json';
import bossTobiasJson from './debates/015_tobias_vs_rue.json';
import cassTeachesJson from './debates/020_cass_teaches_ad_hominem.json';
import hettyBarrageJson from './debates/021_hetty_ad_hominem_barrage.json';
import bramInsightJson from './debates/022_bram_teaches_insight.json';

/** Keys map to debate JSON files under `src/data/debates/`. */
export type DebateScenarioKey =
  | '000_tutorial_the_blue_barn'
  | 'sample-debate'
  | '001_monty_vs_penny'
  | '002_bella_vs_woolsey'
  | '010_gossip_trough_hetty'
  | '011_sparring_cass_ad_hominem'
  | '012_gossip_trough_bram'
  | '013_lab_cass_dirty_tricks'
  | '014_skirmish_bram_fenceline'
  | '015_tobias_vs_rue'
  | '020_cass_teaches_ad_hominem'
  | '021_hetty_ad_hominem_barrage'
  | '022_bram_teaches_insight';

export interface ScenarioEntry {
  key: DebateScenarioKey;
  /** `labels.ts` key for the menu button. */
  titleLabel: Labels;
  scenario: DebateScenarioJson;
  /**
   * What the player must have done elsewhere before an animal will start this encounter.
   * Omit for an encounter that is always available.
   *
   * A gated encounter is still *offered* by default — the animal talks, and the Talk button
   * carries the reason it is disabled. Set `FarmNpc.gateTalk` to refuse the conversation
   * itself until this encounter's `requires` are met. Being told "not yet, and here is why"
   * is content; a silent animal without `gateTalk` is a bug report.
   *
   * This gates the overworld only. The main menu lists every scenario and always has, which is
   * what makes the ladder testable without replaying the farm.
   */
  requires?: readonly GameCondition[];
}

/**
 * Level 1 — "The Pond Motion". Ordered as a ladder: each rung adds exactly one thing,
 * from Cass naming Ad Hominem up to the full Public Farm debate. Note that the file
 * numbers are creation order, not ladder order — Bram's Insight lesson (`022_`) is rung
 * 1.6, between his trough gossip and Cass's lab. See
 * `docs/level_01_the_pond_motion.md` for the story and the authored dialog.
 *
 * Overworld gates live on `requires`. The main menu still lists every rung ungated, which
 * is what makes the ladder testable without replaying the farm.
 */
export const LEVEL_1_SCENARIOS: readonly ScenarioEntry[] = [
  {
    key: '020_cass_teaches_ad_hominem',
    titleLabel: 'level1CassTeaches',
    scenario: cassTeachesJson as unknown as DebateScenarioJson,
  },
  {
    key: '021_hetty_ad_hominem_barrage',
    titleLabel: 'level1HettyBarrage',
    scenario: hettyBarrageJson as unknown as DebateScenarioJson,
    requires: [{ kind: 'fallacy_known', fallacyId: 'ad-hominem' }],
  },
  {
    key: '010_gossip_trough_hetty',
    titleLabel: 'level1GossipHetty',
    scenario: gossipHettyJson as unknown as DebateScenarioJson,
  },
  {
    key: '011_sparring_cass_ad_hominem',
    titleLabel: 'level1SparringCass',
    scenario: sparringCassJson as unknown as DebateScenarioJson,
  },
  {
    key: '012_gossip_trough_bram',
    titleLabel: 'level1GossipBram',
    scenario: gossipBramJson as unknown as DebateScenarioJson,
  },
  {
    key: '022_bram_teaches_insight',
    titleLabel: 'level1BramInsight',
    scenario: bramInsightJson as unknown as DebateScenarioJson,
  },
  {
    key: '013_lab_cass_dirty_tricks',
    titleLabel: 'level1LabCass',
    scenario: labCassJson as unknown as DebateScenarioJson,
  },
  {
    key: '014_skirmish_bram_fenceline',
    titleLabel: 'level1SkirmishBram',
    scenario: skirmishBramJson as unknown as DebateScenarioJson,
  },
  {
    key: '015_tobias_vs_rue',
    titleLabel: 'level1BossTobias',
    scenario: bossTobiasJson as unknown as DebateScenarioJson,
    requires: [
      { kind: 'fallacy_known', fallacyId: 'ad-hominem' },
      { kind: 'dialog_flag', flagId: 'hetty-ad-hominem-witnessed' },
    ],
  },
];

/** Scenarios that predate the Level 1 ladder; kept playable from the menu. */
export const LEGACY_SCENARIOS: readonly ScenarioEntry[] = [
  {
    key: '000_tutorial_the_blue_barn',
    titleLabel: 'tutorialBlueBarn',
    scenario: tutorialBlueBarnJson as unknown as DebateScenarioJson,
  },
  {
    key: 'sample-debate',
    titleLabel: 'sampleDebate',
    scenario: sampleDebateJson as unknown as DebateScenarioJson,
  },
  {
    key: '001_monty_vs_penny',
    titleLabel: 'montyVsPenny',
    scenario: montyVsPennyJson as unknown as DebateScenarioJson,
  },
  {
    key: '002_bella_vs_woolsey',
    titleLabel: 'bellaVsWoolsey',
    scenario: bellaVsWoolseyJson as unknown as DebateScenarioJson,
  },
];

const ALL_SCENARIOS = [...LEVEL_1_SCENARIOS, ...LEGACY_SCENARIOS];

/** Single lookup used by `ReactApp` to resolve `activeDebateId` to its scenario. */
export const DEBATES: Record<DebateScenarioKey, DebateScenarioJson> = Object.fromEntries(
  ALL_SCENARIOS.map((entry) => [entry.key, entry.scenario]),
) as Record<DebateScenarioKey, DebateScenarioJson>;

const REQUIREMENTS: Partial<Record<DebateScenarioKey, readonly GameCondition[]>> =
  Object.fromEntries(
    ALL_SCENARIOS.filter((entry) => entry.requires?.length).map((entry) => [
      entry.key,
      entry.requires,
    ]),
  );

/** `requires` for one encounter; an empty array when it is ungated. */
export function scenarioRequirements(key: DebateScenarioKey): readonly GameCondition[] {
  return REQUIREMENTS[key] ?? [];
}
