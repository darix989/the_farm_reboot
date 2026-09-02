/**
 * Central UI copy. Use {@link getLabel} with a key; optional `{name}` placeholders are replaced
 * when `replacements` is set on the options argument.
 */
const LABELS = {
  // --- App shell / menus ---
  loadingGame: 'Loading Game...',
  mainMenu: 'Main Menu',
  sampleDebate: 'Sample debate',
  tutorialBlueBarn: 'Tutorial: The Blue Barn',
  montyVsPenny: 'Monty vs Penny',
  bellaVsWoolsey: 'Bella vs Woolsey',

  // --- Level 1: The Pond Motion ---
  level1Heading: 'Level 1 — The Pond Motion',
  legacyScenariosHeading: 'Other scenarios',
  level1GossipHetty: '1.1 · Gossip at the Trough: What Hetty Heard',
  level1SparringCass: '1.2 · The Sparring Post',
  level1GossipBram: '1.3 · Gossip at the Trough: Everyone Says',
  level1LabCass: '1.4 · The Cranky Rooster Lab: Dirty Feathers',
  level1SkirmishBram: '1.5 · Fence-line Skirmish: The Bent Grate',
  level1BossDuchess: '1.6 · The Public Farm: The Pond Motion',
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
  // Log panel heading, one per `EncounterKind` (see `encounterLabels`).
  debateLog: 'Debate Log',
  gossipLog: 'Trough Talk',
  sparringLog: 'Sparring Log',
  labLog: 'Lab Notes',
  interactive: 'Interactive',
  wizard: 'Wizard',
  back: 'Back',
  continue: 'Continue',
  confirm: 'Confirm',

  // --- Debate log cards ---
  introduction: 'Introduction',
  moderator: 'Moderator',
  /** Intro-card stripe label for encounters with no moderator (gossip, sparring, lab). */
  setting: 'Setting',
  minimize: 'Minimize',
  expand: 'Expand',
  notAvailableUntilRoundStarts: 'Not available until this round starts',
  statusActive: 'active',
  statusUpcoming: 'upcoming',
  statusCompleted: 'completed',
  roundNotStartedYet: 'This round has not started yet.',
  roundAria: 'Round {roundNumber}',
  sideYouSuffix: ' · YOU',
  /** Standalone "YOU" badge for encounters that have no Proposition / Opposition sides. */
  youBadge: 'YOU',
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
  // Closing line, one per `EncounterKind`.
  debateFinished: 'The debate is finished.',
  gossipFinished: 'There is nothing more to overhear.',
  sparringFinished: 'That is the session done.',
  labFinished: 'That is the exercise done.',

  // --- useTrialRoundWorkflow (wizard strip) ---
  // Opening guidance, one per `EncounterKind`.
  workflowDebateIntro:
    "We're about to play a debate. Read the introduction, and once you are ready, click Continue.",
  workflowGossipIntro:
    'Someone is talking. Read what they say, then open the magnifying glass and spot any logical fallacies.',
  workflowSparringIntro:
    'A practice bout — nothing is at stake. Read the line you are given, then pick the answer that actually addresses it.',
  workflowLabIntro:
    'A training exercise. Here the dirty answer is the one being asked for. Read the brief, then pick your line.',
  workflowRoundWithType: 'Round {roundNumber} — {typeDisplay}',
  workflowNpcSpeaking: "{roundLabel}. Read {opponentName}'s statement, then click Continue.",
  workflowNpcSpeakingMustAnalyze:
    'Analyze this statement before you move on. Open it with the magnifying glass, then tag any logical fallacies — or mark it Clean.',
  workflowPlayerChoosingQuestion:
    '{roundLabel}. {opponentName} has asked a question. Choose your response.',
  workflowPlayerChoosingStatement: '{roundLabel}. Choose your statement.',
  workflowStatementSelected:
    '{roundLabel}. Statement selected. Click Continue to submit, or Back to change it.',
  workflowPlayerConfirming:
    'Review your choice below. Go back to change it, or confirm to lock it in.',
  workflowNpcResponding: '{opponentName} responds to your statement. Read it, then continue.',
  workflowRoundRecap: 'Review the round summary, then close the dialog to continue.',

  // --- Tutorial overlay ---
  tutorialGotIt: 'Got it',
  tutorialFinish: 'Finish',
  tutorialDialogTitleSingle: 'Tutorial',
  tutorialDialogTitle: 'Tutorial ({currentStep} of {totalSteps})',
  tutorialSpotlightHint: 'Click the button in the highlighted area to continue',

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
  roundRecapYourQuestion: 'Your question',
  roundRecapYourAnswer: 'Your answer',
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
  insightPointsRecapCompact: 'Insights: {count}',
  guessAwaitingHeadline: 'Ready to analyze',
  guessAwaitingBody: 'Analyze the statement, split by sentences. Spot any fallacies, if any.',
  submitGuess: 'Spot',
  noFallaciesInStatement: 'Clean',
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
  helpButton: '({count}/{cost})',
  helpButtonAria: 'Help ({count}/{cost})',
  helpConfirmTitle: 'Use {cost} Insights?',
  helpConfirmBody:
    'Spending {cost} Insights will reveal which sentences in this statement contain logical fallacies. This cannot be undone.',
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

  // --- Overworld (Green Meadows Farm) ---
  enterTheFarm: 'Enter the Farm',
  farmNpcRue: 'Rue',
  farmNpcHetty: 'Hetty',
  farmNpcCass: 'Cass',
  farmNpcBram: 'Bram',
  farmNpcDuchess: 'Duchess',
  farmNpcTobias: 'Tobias',
  farmZoneBarn: 'THE BIG BARN',
  farmZonePond: 'THE OLD POND',
  farmTalkPrompt: 'Talk to {name}',
  farmInteractHint: 'Space / E',
  farmMoveHint: 'Arrows or WASD to move',
  farmMoveHintTouch: 'Drag anywhere to move',
  farmTalk: 'Talk',
  farmNotNow: 'Not now',
  farmLeave: 'Leave',
  characterStage: 'Participants: {names}',
  /** Shown on the finished-encounter footer; returns to wherever you came from. */
  leaveEncounter: 'Leave',

  // Farm talk beats. Fallback one-liners (`farmDialog<Npc><n|Done>`) still exist
  // so a missing table row is never silent. Authored conversations live in
  // `farmTalk.ts` and point at the `a`/`b`/`c` keys.
  farmDialogHetty1:
    'Oh — hello. You are the donkey, are you not? Never mind. Stand there a moment, I have news.',
  farmDialogHetty1a: 'Oh — hello. You are the donkey, are you not?',
  farmDialogHetty1b: 'I am. They call me Rue.',
  farmDialogHetty1c: 'Never mind. Stand there a moment, I have news.',
  farmDialogHettyDone:
    'I have told you everything I know, and a little that I do not. Go and see the rooster.',
  farmDialogHettyDoneA: 'I have told you everything I know, and a little that I do not.',
  farmDialogHettyDoneB: 'Go and see the rooster.',
  farmDialogCass1:
    'You. Stand at the post. I am going to say unpleasant things to you and you are going to answer them properly.',
  farmDialogCass1a: 'You. Stand at the post.',
  farmDialogCass1b: 'I can stand.',
  farmDialogCass1c:
    'I am going to say unpleasant things to you and you are going to answer them properly.',
  farmDialogCass2:
    'Back again. Good. This time you are going to be the unpleasant one, and you are going to enjoy it. That is the lesson.',
  farmDialogCass2a: 'Back again. Good.',
  farmDialogCass2b: 'I came back.',
  farmDialogCass2c:
    'This time you are going to be the unpleasant one, and you are going to enjoy it. That is the lesson.',
  farmDialogCassDone:
    'Nothing more from me. Save it for Sunday, and do not let her make it about you.',
  farmDialogCassDoneA: 'Nothing more from me.',
  farmDialogCassDoneB: 'Save it for Sunday, and do not let her make it about you.',
  farmDialogBram1:
    'Rue, is it? A courtesy, before Sunday. You should hear how the Flock is voting.',
  farmDialogBram1a: 'Rue, is it?',
  farmDialogBram1b: 'I am.',
  farmDialogBram1c: 'A courtesy, before Sunday. You should hear how the Flock is voting.',
  farmDialogBram2:
    'One more word before the Public Farm. Ask me whatever you like — I will answer straight, which is more than most.',
  farmDialogBram2a: 'One more word before the Public Farm.',
  farmDialogBram2b: 'Go on.',
  farmDialogBram2c: 'Ask me whatever you like — I will answer straight, which is more than most.',
  farmDialogBramDone:
    'I have said more than I should have. The grate is bent. You did not hear it from me.',
  farmDialogBramDoneA: 'I have said more than I should have.',
  farmDialogBramDoneB: 'The grate is bent. You did not hear it from me.',
  farmDialogDuchess1:
    'Ah. The newcomer. Tobias has the motion, and the Flock is ready. Shall we settle the pond?',
  farmDialogDuchess1a: 'Ah. The newcomer.',
  farmDialogDuchess1b: 'Rue. I live here now.',
  farmDialogDuchess1c: 'Tobias has the motion, and the Flock is ready. Shall we settle the pond?',
  farmDialogDuchessDone: 'The pond is settled, dear. For now.',
  farmDialogTobiasDone:
    'I moderate; I do not take sides. Speak to the others, and I shall see you on the floor.',
  farmDialogTobiasDoneA: 'I moderate; I do not take sides.',
  farmDialogTobiasDoneB: 'Speak to the others, and I shall see you on the floor.',

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
