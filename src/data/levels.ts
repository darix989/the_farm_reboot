import type { DebateScenarioJson } from '../types/debateEntities';
import type { Labels } from './labels';

import tutorialBlueBarnJson from './debates/000_tutorial_the_blue_barn.json';
import montyVsPennyJson from './debates/001_monty_vs_penny.json';
import bellaVsWoolseyJson from './debates/002_bella_vs_woolsey.json';
import sampleDebateJson from './debates/sample-debate.json';
import gossipHettyJson from './debates/010_gossip_trough_hetty.json';
import sparringCassJson from './debates/011_sparring_cass_ad_hominem.json';
import gossipBramJson from './debates/012_gossip_trough_bram.json';
import labCassJson from './debates/013_lab_cass_dirty_feathers.json';
import skirmishBramJson from './debates/014_skirmish_bram_fenceline.json';
import bossDuchessJson from './debates/015_duchess_vs_rue.json';

/** Keys map to debate JSON files under `src/data/debates/`. */
export type DebateScenarioKey =
  | '000_tutorial_the_blue_barn'
  | 'sample-debate'
  | '001_monty_vs_penny'
  | '002_bella_vs_woolsey'
  | '010_gossip_trough_hetty'
  | '011_sparring_cass_ad_hominem'
  | '012_gossip_trough_bram'
  | '013_lab_cass_dirty_feathers'
  | '014_skirmish_bram_fenceline'
  | '015_duchess_vs_rue';

export interface ScenarioEntry {
  key: DebateScenarioKey;
  /** `labels.ts` key for the menu button. */
  titleLabel: Labels;
  scenario: DebateScenarioJson;
}

/**
 * Level 1 — "The Pond Motion". Ordered as a ladder: each rung adds exactly one thing,
 * from spotting alone up to the full Public Farm debate. See
 * `docs/level_01_the_pond_motion.md` for the story and the authored dialog.
 *
 * Nothing gates progression yet — the order is authorial, and any rung can be started.
 */
export const LEVEL_1_SCENARIOS: readonly ScenarioEntry[] = [
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
    key: '013_lab_cass_dirty_feathers',
    titleLabel: 'level1LabCass',
    scenario: labCassJson as unknown as DebateScenarioJson,
  },
  {
    key: '014_skirmish_bram_fenceline',
    titleLabel: 'level1SkirmishBram',
    scenario: skirmishBramJson as unknown as DebateScenarioJson,
  },
  {
    key: '015_duchess_vs_rue',
    titleLabel: 'level1BossDuchess',
    scenario: bossDuchessJson as unknown as DebateScenarioJson,
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
