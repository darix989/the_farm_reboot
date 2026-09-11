/**
 * Named mechanics the player can have been taught, as opposed to fallacies they can name.
 *
 * A feature unlock hides UI for a concept nobody has introduced yet — Insight Points, round-type
 * labels — so a control never appears for a word the player has not heard. Ids are a closed
 * union so a typo in scenario JSON is a compile error, and so a stale id in `localStorage`
 * can be dropped on load. The same shape as `dialogFlags.ts`, on purpose.
 *
 * A feature is granted when an encounter that declares it in `unlocksFeatures` is finished —
 * see `src/utils/encounterRewards.ts`. Walking out halfway unlocks nothing.
 */
import type { Labels } from './labels';

export type GameFeatureId = 'insight_points' | 'round_types';

export interface GameFeatureEntry {
  /** One-line heading, also used as the requirement text on a locked encounter. */
  titleLabel: Labels;
  /** What was taught, for a journal-style reading of the unlock. */
  bodyLabel: Labels;
}

export const GAME_FEATURES: Readonly<Record<GameFeatureId, GameFeatureEntry>> = {
  insight_points: {
    titleLabel: 'featureInsightPointsTitle',
    bodyLabel: 'featureInsightPointsBody',
  },
  round_types: {
    titleLabel: 'featureRoundTypesTitle',
    bodyLabel: 'featureRoundTypesBody',
  },
};

export const GAME_FEATURE_ORDER = Object.keys(GAME_FEATURES) as GameFeatureId[];

export function gameFeatureById(id: string): GameFeatureEntry | null {
  return GAME_FEATURES[id as GameFeatureId] ?? null;
}

export function isGameFeatureId(value: unknown): value is GameFeatureId {
  return typeof value === 'string' && value in GAME_FEATURES;
}
