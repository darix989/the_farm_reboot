/**
 * Central UI copy. Use {@link getLabel} with a key; optional `{name}` placeholders are replaced
 * when `replacements` is set on the options argument.
 */
const LABELS = {
  // --- App shell / menus ---
  loadingGame: 'Loading Game...',
  mainMenu: 'Main Menu',
  sampleDebate: 'Sample debate',
  montyVsPenny: 'Monty vs Penny',
  bellaVsWoolsey: 'Bella vs Woolsey',
  currentScene: 'Current Scene:',
  gameStatus: 'Game Status:',
  loadingEllipsis: 'Loading...',
  ready: 'Ready',
  changeScene: 'Change Scene',
  toggleMovement: 'Toggle Movement',
  playerLevelExperience: 'Player Level: {level} | Experience: {experience}',
  logoPosition: 'Logo Position: x: {x}, y: {y}',
  addNewSprite: 'Add New Sprite',

  // --- Trial layout panels ---
  debateLog: 'Debate Log',
  interactive: 'Interactive',
  wizard: 'Wizard',
  back: 'Back',
  continue: 'Continue',
  confirm: 'Confirm',

  // --- Debate log cards ---
  introduction: 'Introduction',
  moderator: 'Moderator',
  minimize: 'Minimize',
  expand: 'Expand',
  notAvailableUntilRoundStarts: 'Not available until this round starts',
  statusActive: 'active',
  statusUpcoming: 'upcoming',
  statusCompleted: 'completed',
  roundNotStartedYet: 'This round has not started yet.',
  roundAria: 'Round {roundNumber}',
  sideYouSuffix: ' · YOU',
  you: 'You',
  responds: '{name} responds',
  debaterQuestion: "{name}'s question",
  roundHeader: 'Round {roundNumber} — ',
  roundHeadingWithStatementType: 'Round {roundNumber} — {statementType}',
  analyzeStatementGroupAria: 'Analyze statement',
  analyzeQuestionGroupAria: 'Analyze question',
  analyzeYourLineGroupAria: 'Analyze your line',
  analyzeResponseGroupAria: 'Analyze response',
  analyzeThisStatement: 'Analyze this statement',
  analyzeThisQuestion: 'Analyze this question',
  analyzeThisResponse: 'Analyze this response',
  analyzeThisRound: 'Analyze this round',
  analyzeImageAlt: 'Analyze',

  // --- Interactive panel ---
  clickToUnlock: 'Click to unlock',
  optionAriaLabel: 'Option {optionLetter}: {statement}',

  // --- TrialUI wizard detail ---
  wizardDetailIntroduction: 'Introduction',
  wizardDetailSelectedStatement: 'Selected statement (full text)',
  wizardDetailYourChoice: 'Your choice (full text)',
  wizardDetailSpeaks: '{name} speaks:',
  wizardDetailResponse: "{name}'s response:",
  wizardDetailRoundRecapBody:
    'Review the round summary in the dialog. Close it when you are ready to continue.',
  debateFinished: 'The debate is finished.',

  // --- useTrialRoundWorkflow (wizard strip) ---
  workflowDebateIntro:
    "We're about to play a debate. Read the introduction, and once you are ready, click Continue.",
  workflowRoundWithType: 'Round {roundNumber} — {typeDisplay}',
  workflowNpcSpeaking: "{roundLabel}. Read {opponentName}'s statement, then click Continue.",
  workflowPlayerChoosingQuestion:
    '{roundLabel}. {opponentName} has asked a question. Choose your response.',
  workflowPlayerChoosingStatement: '{roundLabel}. Choose your statement.',
  workflowStatementSelected:
    '{roundLabel}. Statement selected. Click Continue to submit, or Back to change it.',
  workflowPlayerConfirming:
    'Review your choice below. Go back to change it, or confirm to lock it in.',
  workflowNpcResponding: '{opponentName} responds to your statement. Read it, then continue.',
  workflowRoundRecap: 'Review the round summary, then close the dialog to continue.',

  // --- Intro summary modal ---
  beforeTheDebate: 'Before the debate',
  introductionSummary: 'Introduction summary',
  yourSide: 'Your side',
  youWillArgueAsThe: 'You will argue as the',
  debateSideNoun: 'side.',
  beginRound1: 'Begin Round 1',

  // --- Round recap modal ---
  roundRecap: 'Round recap',
  yourStatement: 'Your statement',
  activeRoundImpact: 'Active Round Impact',
  overallScore: 'Overall Score',
  roundComplete: 'Round complete.',
  opponentResponseHeading: "{name}'s response",

  // --- Round analysis modal ---
  close: 'Close',
  attemptsPerAnalysis: '{maxAttempts} attempts per analysis.',
  attemptProgress: 'Attempt {attemptsUsed} of {maxAttempts} — {remaining} remaining.',
  attemptsUpTo: 'You have up to {maxAttempts} attempts.',
  analysisSelectSentenceHint:
    'Select a sentence, then pick up to two logical fallacies (toggle to remove). You can tag multiple sentences, then tap Spot Fallacies — or No Fallacies if the statement is clean.',
  analysisFlowHint:
    'Select a sentence, apply one or two fallacies, then submit. Or click No Fallacies.',
  analysisCannotGuessPhase: 'You cannot submit fallacy guesses in this phase of the debate.',
  chooseFallaciesForSentence:
    'Choose fallacies for this sentence (up to two, click again to remove):',
  attemptRecapCompact: 'Attempts: {attemptsUsed}/{maxAttempts}',
  submitGuess: 'Spot Fallacies',
  noFallaciesInStatement: 'No Fallacies',
  yourLastGuessReadOnly: 'Your last guess (read-only):',
  sentenceReference: '(sentence {sentenceIndex})',
  guessHeadlineCorrect: 'Correct!',
  guessHeadlineIncorrect: 'Incorrect',
  guessHeadlinePartiallyCorrect: 'Partially correct',
  guessNoFallaciesCorrectBody: 'This statement contains no logical fallacies.',
  guessNoFallaciesWrongBodySpoiler:
    'This statement still contains logical fallacies. Try again if you have attempts left.',
  guessNoFallaciesWrongBodyRevealPrefix: 'This statement does contain logical fallacies:',
  guessPerfectBody: 'You found every logical fallacy in the right sentences.',
  guessPartialIntro: 'Some of your selections matched. Confirmed for this attempt:',
  guessPartialConfirmedPrefix: 'Confirmed for this attempt:',
  guessPartialTryAgain:
    'Other selections were not confirmed. You can try again if you have attempts left.',
  guessPartialFullBody:
    'You found at least one fallacy correctly, but some selections were wrong or some fallacies were missed.',
  missedPrefix: 'Missed:',
  guessNoneWrongLine1: 'None of your selections matched a logical fallacy in the right place.',
  guessNoneWrongLine2: 'You can try again if you have attempts left.',
  guessNoneRevealPrefix: 'The statement contains:',
  assessment: 'Assessment',
  noFallaciesConfirmTitle: 'No Fallacies?',
  noFallaciesConfirmBody:
    "You're about to submit that this statement contains no logical fallacies. This uses one attempt and cannot be undone.",
  cancel: 'Cancel',
  modalRoundTitle: 'Round {roundNumber} — {tail}',
  opponentsQuestion: "{speakerName}'s question",
  opponentsResponse: "{speakerName}'s response",

  // --- trialHelpers (quality / sides / moderator) ---
  qualityEffective: 'Effective',
  qualityLogicalFallacy: 'Logical Fallacy',
  qualityIneffective: 'Ineffective',
  moderatorsOpinion: "Moderator's opinion",
  sideProposition: 'Proposition',
  sideOpposition: 'Opposition',

  // --- Phaser placeholder scenes ---
  gameOver: 'Game Over',
  gamePlaceholderBody: 'Make something fun!\nand share it with us:\nsupport@phaser.io',
  trialScenePlaceholder: 'Trial Scene\n\nThis is where the trial gameplay\nwould be implemented.',
} as const;

export type Labels = keyof typeof LABELS;

const PLACEHOLDER_RE = /\{(\w+)\}/g;

function applyReplacements(
  template: string,
  replacements?: Record<string, string | number>,
): string {
  if (!replacements) return template;
  return template.replace(PLACEHOLDER_RE, (_, key: string) => {
    const v = replacements[key];
    return v !== undefined && v !== null ? String(v) : `{${key}}`;
  });
}

export type GetLabelOptions = {
  /** When true, appends a period (e.g. for TTS pauses). */
  addPeriod?: boolean;
  replacements?: Record<string, string | number>;
};

/** Returns the string for `label`, optionally appending a period (e.g. for TTS pauses). */
function getLabel(label: Labels, options?: GetLabelOptions): string {
  const { addPeriod, replacements } = options ?? {};
  const raw = LABELS[label];
  const resolved = applyReplacements(raw, replacements);
  return `${resolved}${addPeriod ? '.' : ''}`;
}

export default getLabel;
