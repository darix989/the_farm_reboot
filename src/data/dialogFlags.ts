/**
 * Named things the player can have witnessed, as opposed to encounters they have finished.
 *
 * `progressStore.completedScenarios` already answers "did they play it". A dialog flag answers
 * "did *this* happen", which is what a gate usually wants and what the Codex can show: it
 * carries its own copy, so an unlock requirement and a journal entry are the same record.
 *
 * A flag is set when an encounter that declares it in `setsDialogFlags` is finished — see
 * `src/utils/encounterRewards.ts` — or when a farm-talk stage with `completesFlag` is
 * played through to the last beat. Ids are a closed union so a typo in scenario JSON is a
 * compile error, and so a stale flag in `localStorage` can be dropped on load.
 */
import type { Labels } from './labels';

export type DialogFlagId =
  | 'dot-welcomed'
  | 'bram-taught-rounds'
  | 'bram-taught-crossfire'
  | 'cass-named-ad-hominem'
  | 'hetty-ad-hominem-witnessed'
  | 'bram-grate-conceded';

export interface DialogFlagEntry {
  /** One-line heading, also used as the requirement text on a locked encounter. */
  titleLabel: Labels;
  /** What happened, for the Codex's Important Conversations section. */
  bodyLabel: Labels;
}

export const DIALOG_FLAGS: Readonly<Record<DialogFlagId, DialogFlagEntry>> = {
  'dot-welcomed': {
    titleLabel: 'dialogFlagDotWelcomedTitle',
    bodyLabel: 'dialogFlagDotWelcomedBody',
  },
  'bram-taught-rounds': {
    titleLabel: 'dialogFlagBramTaughtRoundsTitle',
    bodyLabel: 'dialogFlagBramTaughtRoundsBody',
  },
  'bram-taught-crossfire': {
    titleLabel: 'dialogFlagBramTaughtCrossfireTitle',
    bodyLabel: 'dialogFlagBramTaughtCrossfireBody',
  },
  'cass-named-ad-hominem': {
    titleLabel: 'dialogFlagCassNamedAdHominemTitle',
    bodyLabel: 'dialogFlagCassNamedAdHominemBody',
  },
  'hetty-ad-hominem-witnessed': {
    titleLabel: 'dialogFlagHettyWitnessedTitle',
    bodyLabel: 'dialogFlagHettyWitnessedBody',
  },
  'bram-grate-conceded': {
    titleLabel: 'dialogFlagBramGrateTitle',
    bodyLabel: 'dialogFlagBramGrateBody',
  },
};

/** Author order, which is also the order the Codex lists them in. */
export const DIALOG_FLAG_ORDER = Object.keys(DIALOG_FLAGS) as DialogFlagId[];

export function dialogFlagById(id: string): DialogFlagEntry | null {
  return DIALOG_FLAGS[id as DialogFlagId] ?? null;
}

export function isDialogFlagId(value: unknown): value is DialogFlagId {
  return typeof value === 'string' && value in DIALOG_FLAGS;
}
