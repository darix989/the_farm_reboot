import type { LogicalFallacyId } from '../../../types/debateEntities';
import fallacyPlaceholder from '../../../static/icons/fallacy_placeholder.svg';
import adHominem from '../../../static/icons/fallacies/001_emo_ad_hominem.svg';
import appealToPopularity from '../../../static/icons/fallacies/002_emo_appeal_to_popularity.svg';
import strawMan from '../../../static/icons/fallacies/003_emo_strawman.svg';
import appealToPity from '../../../static/icons/fallacies/004_emo_appeal_to_pity.svg';
import appealToFear from '../../../static/icons/fallacies/005_emo_appeal_to_fear.svg';
import appealToEmotion from '../../../static/icons/fallacies/006_emo_appeal_to_emotion_1.svg';
import glitteringGeneralities from '../../../static/icons/fallacies/007_emo__glittering_generalities_1.svg';
import falseDilemma from '../../../static/icons/fallacies/008_faulty_false_dilemma_black_or_white.svg';
import slipperySlope from '../../../static/icons/fallacies/009_faulty_slipper_slope.svg';
import hastyGeneralization from '../../../static/icons/fallacies/010_faulty_hasty_generalization.svg';
import anecdotal from '../../../static/icons/fallacies/011_faulty_anecdotal.svg';
import falseCause from '../../../static/icons/fallacies/012_faulty_false_cause.svg';
import weakAnalogy from '../../../static/icons/fallacies/013_faulty_weak_analogy.svg';
import loadedQuestion from '../../../static/icons/fallacies/014_faulty_loaded_question.svg';
import genetic from '../../../static/icons/fallacies/015_faulty_genetic.svg';
import specialPleading from '../../../static/icons/fallacies/016_struct_special_pleading.svg';
import nothingToHide from '../../../static/icons/fallacies/017_struct_nothing_to_hide.svg';

const LOGICAL_FALLACY_ICON_SRC = {
  'ad-hominem': adHominem,
  'appeal-to-popularity': appealToPopularity,
  'straw-man': strawMan,
  'appeal-to-pity': appealToPity,
  'appeal-to-fear': appealToFear,
  'appeal-to-emotion': appealToEmotion,
  'glittering-generalities': glitteringGeneralities,
  'false-dilemma': falseDilemma,
  'slippery-slope': slipperySlope,
  'hasty-generalization': hastyGeneralization,
  anecdotal,
  'false-cause': falseCause,
  'weak-analogy': weakAnalogy,
  'loaded-question': loadedQuestion,
  genetic,
  'special-pleading': specialPleading,
  'nothing-to-hide': nothingToHide,
} satisfies Record<LogicalFallacyId, string>;

export function getLogicalFallacyIconSrc(id: string): string {
  const src = LOGICAL_FALLACY_ICON_SRC[id as LogicalFallacyId];
  return src ?? fallacyPlaceholder;
}
