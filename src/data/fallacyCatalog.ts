/**
 * The fallacy catalog — `logicalFallacies.json`, parsed once.
 *
 * Scenario JSON references fallacies by `id` and supplies its own per-scenario `explanation`;
 * the label, category and general description live here and are shared by the analysis
 * modal's picker, the Codex and the encounter-gate hints.
 *
 * Note that `LogicalFallacyId` is wider than this catalog: the union in
 * `types/debateEntities.ts` names every id the schema will accept, while the JSON holds the
 * ones actually authored. Anything that has to survive a round-trip through `localStorage`
 * should validate with {@link isCatalogedFallacyId} rather than trusting the type.
 */
import type { LogicalFallacy, LogicalFallacyId } from '../types/debateEntities';
import catalog from './logicalFallacies.json';

export const ALL_LOGICAL_FALLACIES = catalog.logicalFallacies as LogicalFallacy[];

export const LOGICAL_FALLACIES_BY_ID: ReadonlyMap<string, LogicalFallacy> = new Map(
  ALL_LOGICAL_FALLACIES.map((fallacy) => [fallacy.id, fallacy]),
);

export function logicalFallacyById(id: string): LogicalFallacy | null {
  return LOGICAL_FALLACIES_BY_ID.get(id) ?? null;
}

/** Display name, falling back to the raw id so a missing catalog entry is visible, not blank. */
export function logicalFallacyLabel(id: string): string {
  return LOGICAL_FALLACIES_BY_ID.get(id)?.label ?? id;
}

export function isCatalogedFallacyId(value: unknown): value is LogicalFallacyId {
  return typeof value === 'string' && LOGICAL_FALLACIES_BY_ID.has(value);
}
