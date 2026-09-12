/**
 * Central UI copy. Use {@link getLabel} with a key; optional `{name}` placeholders are replaced
 * when `replacements` is set on the options argument.
 */
const LABELS = {
  // --- App shell / menus ---
  loadingGame: 'Loading Game...',
  loadingPercent: '{percent}%',
  gameTitle: 'The Farm',
  gameTagline: 'Spot the fallacies. Save the pond.',
  mainMenu: 'Main Menu',
  sampleDebate: 'Sample debate',
  tutorialBlueBarn: 'Tutorial: The Blue Barn',
  montyVsPenny: 'Monty vs Penny',
  bellaVsWoolsey: 'Bella vs Woolsey',

  // --- Level 1: The Pond Motion ---
  level1Heading: 'Level 1 — The Pond Motion',
  legacyScenariosHeading: 'Other scenarios',
  level1BramDialog: '1.1 · Down at the Fence: How a Conversation Works',
  level1BramCrossfire: 'Down at the Fence: Answer Me Now',
  level1CassTeaches: '1.2 · The Sparring Post: The Name of the Trick',
  level1HettyBarrage: '1.3 · Gossip at the Trough: All About You',
  level1CassPopularity: '1.4 · The Sparring Post: How Many, Not How',
  level1GossipHetty: '1.5 · Gossip at the Trough: What Hetty Saw',
  level1BramUnlocks: '1.6 · Down at the Fence: The Line You Have to Earn',
  level1SkirmishBram: '1.7 · Fence-line Skirmish: The Bent Grate',
  level1BossTobias: '1.8 · The Public Farm: The Pond Motion',
  // Parked out of the Level 1 ladder, still playable from "Other scenarios".
  level1SparringCass: 'The Sparring Post: Answer Me',
  level1GossipBram: 'Down at the Fence: Forty-One',
  level1BramInsight: 'Down at the Fence: Looking Twice',
  level1LabCass: "The Fox's Lab: Dirty Paws",
  animationGallery: 'Animation Gallery',
  /** Main-menu toggle for the farm-talk skip button. `{state}` is On / Off. */
  devFarmTalkSkipToggle: 'Dialog skip: {state}',
  devFarmTalkSkipOn: 'On',
  devFarmTalkSkipOff: 'Off',
  resetProgress: 'Reset Progress',
  resetProgressConfirmTitle: 'Reset all progress?',
  resetProgressConfirmBody:
    'This clears your saved encounters, Field Notes, and tutorials from this browser. It cannot be undone.',
  resetProgressConfirmAction: 'Reset',

  // --- Animation gallery ---
  galleryTitle: 'Animation Gallery',
  galleryAnimalHeading: 'Animal',
  galleryEmotionsHeading: 'Emotions (generated)',
  galleryFacesHeading: 'Dialogue portraits (cropped)',
  galleryBaseHeading: 'Base animations',
  gallerySmoothTransitions: 'Smooth transition when switching',
  gallerySmoothHint: 'Crossfades between clips. Turn off to see the raw cut.',
  galleryBackToMenu: 'Back to Main Menu',
  galleryNoArt: 'no art yet',
  galleryRestPose: 'rest pose',
  galleryClipMeta: '{frames} frames · {fps} fps',
  galleryNothingSelected: 'Nothing selected',
  galleryMissingArtNote:
    '{count} of {total} emotions have no generated art for this animal yet — they fall back to the alert animation in game.',
  galleryMissingFaceNote:
    '{count} of {total} emotions have no portrait cropped for this animal yet — this speaker stays text-only in game.',
  galleryFacePreviewShip: '112 px · as it ships',
  galleryFacePreviewRetina: '224 px · 2× display',
  galleryFaceNoPreview: 'No portrait cropped for this emotion yet.',
  galleryStatusFacesHeading: "Moderator's opinion (still frames)",
  galleryStatusFacesNote:
    'Three frames of the approving portrait above, held still — the eyes open from nearly shut to fully round, and how much yellow is left is the whole signal. Shown at roughly the size they ship at.',
  galleryStatusFacesNoteFox:
    'Three frames of three portraits above, held still — a sly grin, a half-lid, a snarl. Shown at roughly the size they ship at.',
  galleryStatusFaceDisapproval: 'disapproves',
  galleryStatusFaceNeutral: 'undecided',
  galleryStatusFaceApproval: 'approves',
  galleryStatusFaceMeta: '{emotion} · frame {frame}',
  galleryQualityPass: 'OK',
  galleryQualityWarn: 'check',
  galleryQualityUnknown: '?',
  galleryQualityAnimalPass: 'all emotions pass',
  galleryQualityAnimalWarn: 'emotions need review',
  galleryQualityAnimalUnknown: 'emotions unmeasured',
  galleryQualityMetrics: 'loop seam {loopPop}% · height swing {heightSwing}% · drift ±{driftX}px',
  // No height swing: a crop cannot zoom, so what it measures on a portrait is the jaw opening
  // — the motion the portrait exists to show. See `FACE_QUALITY_THRESHOLDS`.
  galleryFaceQualityMetrics: 'loop seam {loopPop}% · drift ±{driftX}px',
  galleryQualityStale: 'old generation ({frames} frames)',
  galleryQualityUnmeasured: 'no quality numbers yet',
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
  debateLog: 'Log',
  gossipLog: 'Trough Talk',
  sparringLog: 'Sparring Log',
  labLog: 'Lab Notes',
  lessonLog: 'Lesson Notes',
  interactive: 'Actions',
  wizard: 'Dialog',
  back: 'Back',
  continue: 'Continue',
  confirm: 'Confirm',

  // --- Debate log cards ---
  introduction: 'Introduction',
  moderator: 'Moderator',
  /** Intro-card stripe label — the introduction has no speaker. */
  setting: 'Setting',
  /** Debate-log type line for the moderator's opening of the floor. */
  theFloor: 'The floor',
  minimize: 'Minimize',
  expand: 'Expand',
  /** Whole-log collapse / expand. `{logTitle}` is the resolved `encounterLabels().logTitle`. */
  expandDebateLog: 'Expand {logTitle}',
  collapseDebateLog: 'Collapse {logTitle}',
  /** Recap chip shown while the log is collapsed. */
  debateLogRecapRound: 'Round {roundNumber}/{totalRounds}',
  debateLogRecapAnalysisPending: 'Analyze the statement in the log to continue',
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
  statementTypeOpeningConstructive: 'Opening Constructive',
  statementTypeRebuttal: 'Rebuttal',
  statementTypeCrossfire: 'Crossfire',
  statementTypeClosingConstructive: 'Closing Constructive',
  statementTypeGossip: 'Gossip',
  analyzeStatementGroupAria: 'Analyze statement',
  analyzeQuestionGroupAria: 'Analyze question',
  analyzeYourLineGroupAria: 'Analyze your line',
  analyzeResponseGroupAria: 'Analyze response',
  analyzeThisStatement: 'Analyze this statement',
  analyzeThisQuestion: 'Analyze this question',
  analyzeThisResponse: 'Analyze this response',
  analyzeThisRound: 'Analyze this round',
  analyzeImageAlt: 'Analyze',
  /** Icon row of fallacies correctly spotted in a statement, under its text in the Debate Log. */
  spottedFallaciesAria: 'Fallacies spotted in this statement',

  // --- Interactive panel ---
  clickToUnlock: 'Click to unlock',
  optionReadyToOpen: 'ready to open',
  optionLockedNeedAnalyze:
    'This line is locked. Catch what they just did — open the magnifying glass.',
  optionLockedWrongTag: 'Still locked. That tag is not the one this line is waiting for.',
  optionAriaLabel: 'Option {optionLetter}: {statement}',

  // --- TrialUI wizard detail ---
  wizardDetailIntroduction: 'Introduction',
  wizardDetailSelectedStatement: 'Selected statement (full text)',
  wizardDetailYourChoice: 'Your choice (full text)',
  wizardDetailSpeaks: '{name} speaks:',
  wizardDetailResponse: "{name}'s response:",
  wizardDetailRoundRecapBody:
    'Review the round summary in the dialog. Close it when you are ready to continue.',
  /** Sentence-reveal progress beside the wizard detail title, e.g. "Duchess speaks: (2/4)". */
  wizardSentenceProgress: '({current}/{total})',
  /** Shown in place of the fraction when the pacer was skipped and the joined body is showing. */
  wizardSentenceProgressAll: '(all)',
  // Closing line, one per `EncounterKind`.
  debateFinished: 'The debate is finished.',
  gossipFinished: 'There is nothing more to overhear.',
  sparringFinished: 'That is the session done.',
  labFinished: 'That is the exercise done.',
  lessonFinished: 'That is the lesson done.',

  // --- useTrialRoundWorkflow (wizard strip) ---
  // Opening guidance, one per `EncounterKind`.
  workflowDebateIntro: 'Read the introduction, then click Continue.',
  workflowGossipIntro: 'Read what they say, then spot the fallacies with the magnifying glass.',
  workflowSparringIntro: 'A practice bout. Read the line, then pick the answer that addresses it.',
  workflowLabIntro: 'A training exercise — the dirty answer is the one being asked for.',
  workflowLessonIntro: 'Read what he has to show you, then try it yourself.',
  workflowModeratorSpeaking:
    'The moderator is opening the floor. Click Continue when you have heard them.',
  workflowRoundWithType: 'Round {roundNumber} — {typeDisplay}',
  workflowRoundPlain: 'Round {roundNumber}',
  workflowNpcSpeaking: "Read {opponentName}'s statement, then click Continue.",
  workflowNpcSpeakingMustAnalyze: 'Analyze this statement first — open the magnifying glass.',
  workflowPlayerChoosingQuestion:
    '{opponentName} asked a question. Pick A, B or C to read your reply.',
  workflowPlayerChoosingCrossfireQuestion: 'Pick A, B or C to put your question to {opponentName}.',
  workflowPlayerChoosingStatement: 'Pick A, B or C to read it in the Dialog.',
  workflowStatementSelected: 'Click Continue to submit, or Back to change it.',
  workflowStatementOpened: 'Opened. Click it again to say it, or pick another line.',
  workflowPlayerSpeaking: 'You have spoken. Click Continue.',
  workflowPlayerConfirming:
    'Review your choice below. Go back to change it, or confirm to lock it in.',
  workflowNpcResponding: '{opponentName} responds to your statement. Read it, then continue.',
  workflowRoundRecap: 'Review the round summary, then close the dialog to continue.',
  workflowRevealing: 'Keep reading — click Continue for the next sentence.',

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
  /** Intro-summary submit when a `moderatorOpening` follows, instead of jumping to round 1. */
  openTheFloor: 'Open the floor',

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
  guessHeadlineExtrasOnly: 'Close!',
  guessNoFallaciesCorrectBody: 'This statement contains no logical fallacies.',
  guessNoFallaciesWrongBodySpoiler:
    'This statement still contains logical fallacies. Try again if you have attempts left.',
  guessNoFallaciesWrongBodyRevealPrefix: 'This statement does contain logical fallacies:',
  guessPerfectBody: 'You found every logical fallacy in the right sentences.',
  guessPartialIntro: 'Some of your selections matched. Confirmed for this attempt:',
  guessPartialConfirmedPrefix: 'Confirmed for this attempt:',
  guessPartialTryAgain:
    'Some fallacies are still missing. You can try again if you have attempts left.',
  guessPartialFullBody:
    'You found at least one fallacy correctly, but some fallacies were still missed.',
  guessExtrasOnlyBody:
    'You found every fallacy in the right sentences, but some extra tags were not fallacies.',
  guessExtrasOnlyRevealBody:
    'You found every fallacy in the right sentences, but extra tags were not fallacies.',
  missedPrefix: 'Missed:',
  extrasPrefix: 'Extra:',
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
  helpRevealedSentenceAria: 'This sentence contains a logical fallacy',
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
  enterTopDownFarm: 'Top-down farm',
  farmNpcRue: 'Rue',
  farmNpcHetty: 'Hetty',
  farmNpcBella: 'Bella',
  farmNpcCass: 'Cass',
  farmNpcBram: 'Bram',
  farmNpcDuchess: 'Duchess',
  farmNpcTobias: 'Tobias',
  farmNpcDot: 'Dot',
  farmZoneBarn: 'THE BIG BARN',
  farmZonePond: 'THE OLD POND',
  farmTalkPrompt: 'Talk to {name}',
  farmInteractHint: 'Space / E',
  farmMoveHint: 'Arrows or WASD to move',
  farmMoveHintTouch: 'Drag anywhere to move',
  farmTalk: 'Talk',
  farmTalkSkip: 'Skip to last line',
  farmLeave: 'Leave',
  farmLessons: 'Lessons',
  farmTalkHintContinue: 'Click Continue to hear the next line.',
  farmTalkHintChoose: 'Pick Talk to start, or Leave to walk away.',
  farmTalkHintChooseTalkLessons: 'Pick Talk to start, Lessons to replay, or Leave.',
  farmTalkHintChooseLessonsOnly: 'Pick Lessons to replay, or Leave.',
  farmTalkHintLessonsMode: 'Pick a lesson to replay, or Back to return.',
  farmTalkHintLessonSelected: 'Click Continue to replay this lesson, or Back to change it.',
  farmTalkHintNothingMore: 'Nothing more to say — click Leave when you are ready.',
  farmTalkLessonsPrompt: 'Which one? {list}.',
  farmTalkLessonItem: '{letter} — {title}',
  farmTalkLessonItemJoin: '. ',
  tutorialLessonRounds: 'how a conversation works',
  tutorialLessonRoundsPreview:
    'How a conversation works. One animal says a thing, the other answers — and some rounds, somebody asks and you answer on your feet. I can walk you through both.',
  tutorialLessonUnlocks: 'opening a locked line',
  tutorialLessonUnlocksPreview:
    'The locked line. Some of what you could answer with is already yours, and some of it you cannot reach until you have caught the other animal at something. Bram does the trick on himself so that you can.',
  characterStage: 'Participants: {names}',
  /** Shown on the finished-encounter footer; returns to wherever you came from. */
  leaveEncounter: 'Leave',

  // Farm talk beats. Fallback one-liners (`farmDialog<Npc><n|Done>`) still exist
  // so a missing table row is never silent. Authored conversations live in
  // `farmTalk.ts` and point at the `a`/`b`/`c` keys.
  farmDialogHetty1:
    'Rue! Stand there a moment. I have been thinking about you all morning and I mean to say every word of it to your face, because I am not a gossip.',
  farmDialogHetty1a: 'Rue! Stand there a moment, I have been thinking about you all morning.',
  farmDialogHetty1b: 'That sounds bad.',
  farmDialogHetty1c:
    'It is not bad at all, it is friendly. And I mean to say every word of it to your face, because I am not a gossip.',
  farmDialogHetty2:
    'Back again. I have more news, and this time it is not about you. Well. Some of it is. Stand there.',
  farmDialogHetty2a: 'Back again! I have more news, and this time it is not about you.',
  farmDialogHetty2b: 'Some of it is, though.',
  farmDialogHetty2c: 'Some of it is, yes. Stand there, it will not take a moment.',
  farmDialogHettyDone:
    'I have told you everything I know and a little that I do not. The owl will want you on the floor.',
  farmDialogHettyDoneA: 'I have told you everything I know, and a little that I do not.',
  farmDialogHettyDoneB:
    'The owl will want you on the floor. She never says so, of course. She never says anything.',
  farmDialogHettyMeetA: 'Rue! Stand there a moment. No — not yet. I have not finished thinking.',
  farmDialogHettyMeetB: 'I can wait.',
  farmDialogHettyMeetC:
    'You are very good about standing still. Come back when I have something friendly to say, which I will.',
  farmDialogCass1:
    'You. Come here. They came at my tail until I put a name on it, and you do not even know it has a name. That changes this morning.',
  farmDialogCass1a: 'You. Come here.',
  farmDialogCass1b: 'You are the fox.',
  farmDialogCass1c:
    'Yes. I am the fox. Get it out of your system, because in about a minute I am going to make you say it properly.',
  farmDialogCass2:
    'Back at the post. Somebody has been counting at you, and there is a name for that one as well.',
  farmDialogCass2a: 'Back already. And somebody has been counting at you.',
  farmDialogCass2b: 'Forty-one of them, she said.',
  farmDialogCass2c:
    'Forty-one. She said the number and you felt it land, and **[accent]not one of them will tell you what any of the forty-one went and looked at[/accent]**. There is a name for that as well. Stand at the post.',
  farmDialogCassDone:
    'Nothing more from me. Save it for Sunday, and whatever he says, do not let him make it about you.',
  farmDialogCassDoneA: 'Nothing more from me. Save it for Sunday.',
  farmDialogCassDoneB:
    'And whatever he says about your supper — and he will — do not let him make it about you.',
  farmDialogCassMeetA: 'You. Not yet.',
  farmDialogCassMeetB: 'I am looking for the fox.',
  farmDialogCassMeetC: 'Come back when you have something to ask. I am not here to be looked at.',
  farmDialogBram1:
    'Dot sent you, then. Sunday, against Tobias. I will show you **[accent]how a conversation works[/accent]** here.',
  farmDialogBram1a:
    'Bram? Dot sent me. There is a motion on the pond on Sunday, and I have put my name down to speak against it.',
  farmDialogBram1b: 'You — against Tobias. On the floor. And you came down here. To the wolf.',
  farmDialogBram1c: 'You were the first name she gave me. I need help.',
  farmDialogBram1d:
    'I walk the fence. Both ways. From the far side of a hedge you hear every conversation on this farm. I will show you how one works, before anyone else gets hold of you.',
  farmDialogBram2:
    'There is another piece. I have to be unpleasant to you first, on purpose, so you can catch me at it.',
  farmDialogBram2a: 'There is another piece.',
  farmDialogBram2b: 'Go on.',
  farmDialogBram2c:
    'This one I cannot simply tell you. I have to be unpleasant first, on purpose, so **[accent]you can catch me at it[/accent]**. I have been dreading it since breakfast.',
  farmDialogBram3:
    'No more lessons. I am one of the forty-one, and I would rather you had the argument from me than from Tobias on Sunday. Cass will sit it — practice, before Duchess.',
  farmDialogBram3a: 'No more lessons. I think we are past those.',
  farmDialogBram3b: 'What is this, then?',
  farmDialogBram3c:
    '**[accent]I am one of the forty-one[/accent]**, Rue. I put my name to the motion. I would rather you had that argument from me, here, where it costs you nothing — than from Tobias on Sunday, where it costs you everything.',
  farmDialogBram3d:
    'The fox said she would sit it. **[accent]Practice[/accent]**, she called it, before Duchess has the floor. I did not ask her to.',
  farmDialogBramDone:
    'I have said a great deal more than I should have. The grate is bent. You did not hear it from me.',
  farmDialogBramDoneA: 'I have said a great deal more than I should have.',
  farmDialogBramDoneB:
    '**[accent]The grate is bent.[/accent]** You did not hear that from me. You may say on Sunday that you heard it from me.',
  farmDialogBramMeetA: 'I walk the fence. Both ways, every day. You do not have to stop.',
  farmDialogBramMeetB: 'Dot mentioned you.',
  farmDialogBramMeetC: 'Then she is ahead of me. I would not know what to show you yet.',
  farmDialogDuchess1:
    'The motion is with me and it is heard on Sunday. When you are ready to stand on the floor, say so, and I will call it.',
  farmDialogDuchess1a: 'The motion is with me. It is heard on Sunday.',
  farmDialogDuchess1b: 'Whose side are you on?',
  farmDialogDuchess1c: 'No.',
  farmDialogDuchess1d: 'That was not a yes-or-no question.',
  farmDialogDuchess1e:
    'It was not, and I have answered it as far as I intend to. Say the word and I will call the floor.',
  farmDialogDuchessDone:
    'The floor is finished for now. I moderate. I do not take sides, and I did not take one.',
  farmDialogDuchessDoneA: 'The floor is finished, for now.',
  farmDialogDuchessDoneB:
    'I moderate. **[accent]I do not take sides[/accent]**, and I did not take one. It is going to be a fine week, I imagine. I would not know.',
  farmDialogDuchessMeetA: 'The motion is with me. It is heard on Sunday.',
  farmDialogDuchessMeetB: 'Can I speak?',
  farmDialogDuchessMeetC:
    'Not yet. I will call the floor when you are ready. I do not take sides, including about whether you are ready.',
  farmDialogTobias1:
    'Ah. The newcomer. No hard feelings about Sunday, I hope — Duchess has the motion, and it is her floor. Speak to her when you are ready.',
  farmDialogTobias1a: 'Ah. The newcomer. Roo, is it?',
  farmDialogTobias1b: 'Rue. I live here now.',
  farmDialogTobias1c:
    'Of course you do, and nobody says otherwise, and I hope there are no hard feelings about Sunday. Duchess has the motion. Speak to her when you are ready.',
  farmDialogTobiasDone: 'The pond is settled, then. For this year.',
  farmDialogTobiasDoneA: 'The pond is settled, then. For this year.',
  farmDialogTobiasDoneB:
    'I will say this once and not again: I have pulled a cart past that drain for eleven years and **[accent]never once looked into it[/accent]**. Good morning, Rue.',
  farmDialogBella1:
    'I am not Hetty. I only look like this until the proper coat arrives. She is at the pond.',
  farmDialogBella1a:
    'Before you ask: I am not Hetty. I only look like this until the proper coat arrives.',
  farmDialogBella1b: 'You look exactly like Hetty.',
  farmDialogBella1c:
    'That is the whole joke, and it is not even mine. **[accent]Hetty is at the pond[/accent]** — down the east road, walk up to the water. I am holding the barn. Someone has to.',
  farmDialogBellaDone: 'Still not Hetty. Still holding the barn.',
  farmDialogBellaDoneA: 'Still not Hetty.',
  farmDialogBellaDoneB:
    'The coat is late. I am still holding the barn. She is still at the pond, I expect.',
  farmDialogDot1:
    'You are the new raccoon. Rue, is it? I am Dot, guardian of the farm — that is why I stand at the entrance. Tobias has put a motion to keep the Old Pond for the Meadow-Born and send the rest of you to the road trough — Sunday, in front of Duchess — and not one animal will speak against it. Bram first, through the gate. Then Cass on the road.',
  farmDialogDot1a:
    'You are the new raccoon! Rue, is it? Or Roo — somebody said Roo. I am Dot. Guardian of the farm — that is why I stand at the entrance.',
  farmDialogDot1b: 'Rue. Six weeks now. I do the hauling, the repairs and the bins.',
  farmDialogDot1c:
    'The bins! Nobody volunteers for the bins. Are the others being decent to you, at least?',
  farmDialogDot1d: 'Mostly. Some of them talk about me when I am three steps away.',
  farmDialogDot1e:
    'That is not about you, that is the week we are having. I would blame the weather. It is not the weather.',
  farmDialogDot1f: 'What is wrong with the week?',
  farmDialogDot1g:
    'There is a **[accent]debate[/accent]** coming. Tobias has put a motion on the Old Pond — that the water be kept for the Meadow-Born, the ones born on this meadow, and that **[accent]every animal who arrived here after them go and drink at the road trough instead[/accent]**. It is heard Sunday, on the floor of the Public Farm, in front of Duchess.',
  farmDialogDot1h: 'That is me, then. And the road trough is half a mile down the lane.',
  farmDialogDot1i:
    'It is. He says the arrivals are what turned the water brown, and he says it so warmly that everybody has agreed with him before they work out what they have agreed to.',
  farmDialogDot1j: 'And who speaks for the rest of us? The ones he wants sent down the lane.',
  farmDialogDot1k:
    'Nobody. Not one animal. Plenty of them grumble about it at home, and then agree with him to his face. **[accent]Only the agreeing out loud gets counted.[/accent]**',
  farmDialogDot1l: 'Then I will speak for us.',
  farmDialogDot1m: 'You — you have been here six — right. Yes. Somebody had to be somebody.',
  farmDialogDot1n:
    'But there are rules, and nobody has written them down. Partly because not one animal here knows what writing is. Mostly because rules nobody wrote are the easiest kind to break. You will want to know **[accent]how this farm argues[/accent]** before you go and stand in front of it.',
  farmDialogDot1o: 'Where do I start?',
  farmDialogDot1p:
    'Bram. The wolf, through the gate. He will pretend he is checking the fence. Let him. He is the one who will show you how a conversation works here, before Cass gets her teeth into you. Then Cass on the road, just this side of the gate, then Hetty at the pond — east road, walk up to the water — then Duchess further down that same road when you want the floor.',
  farmDialogDot2:
    'Bram has done his piece. Cass is on the road, just this side of the gate, and she will talk to you now.',
  farmDialogDot2a: 'Bram has done his piece. You know how a conversation works, then.',
  farmDialogDot2b: 'And now?',
  farmDialogDot2c:
    'Cass. The fox, on the road, just this side of the gate. She has something you need before Hetty will so much as look at you. Do not let anyone tell you about the fox first — let her do it.',
  farmDialogDot3: 'Cass has done her piece. Hetty is at the pond, and she will talk to you now.',
  farmDialogDot3a: 'Cass has done her piece. I heard it from here, some of it.',
  farmDialogDot3b: 'And Hetty?',
  farmDialogDot3c:
    'At the pond — east road, walk up to the water — and she will talk to you now. She is going to be horrible and she has no idea. Try not to hold it against her — everyone does, and it has never once helped.',
  farmDialogDot4:
    'Hetty has had her go at you. Back to Cass — she will know what to call the rest of it.',
  farmDialogDot4a: 'Hetty has had her go at you. I could hear it from the road.',
  farmDialogDot4b: 'Some of it was about me.',
  farmDialogDot4c:
    'Most of it was about how many animals agree with her, which is the half that will do you real harm on Sunday. Back to Cass. She will know what to call it.',
  farmDialogDot5:
    'Hetty again, I am afraid. She was not finished, and the part she has not said yet is the useful one.',
  farmDialogDot5a: 'Hetty again, I am afraid.',
  farmDialogDot5b: 'She talked for a very long time already.',
  farmDialogDot5c:
    'She was not finished. She never is. And the one true thing she has to give you is somewhere near the end of it, so you will have to sit through the rest of it to get there.',
  farmDialogDot6:
    'Bram, through the gate. He has one more piece for you, and then he will argue the motion at you properly — Cass is coming down to sit that one.',
  farmDialogDot6a: 'Bram, through the gate. Twice, I should think.',
  farmDialogDot6b: 'Twice?',
  farmDialogDot6c:
    'He has one more piece to show you, and then he will argue the motion at you for real. **[accent]Cass is coming down to sit that one[/accent]**, she says — practice, before the owl has the floor. He put his name to it, you know. He will hate every minute of it and he will do it anyway, which is the most wolf thing about him.',
  farmDialogDot7:
    'Duchess has the motion down the east road. That is the floor, whenever you want it.',
  farmDialogDot7a:
    'Duchess has the motion down the east road. That is the floor, whenever you want it.',
  farmDialogDot7b: 'And that is everyone?',
  farmDialogDot7c:
    'That is everyone I can point you at. The rest of it is Sunday, and Sunday is not mine. Mind the drain on your way.',
  farmDialogDotDone: 'I have pointed you at everyone I can. The rest is the floor.',
  farmDialogDotDoneA: 'I have pointed you at everyone I can point you at.',
  farmDialogDotDoneB:
    'The rest is the floor, and the floor is not mine. Good luck. **[accent]Mind the drain.[/accent]**',

  // Post-Trial follow-ups (`followUp:{scenarioKey}` in farmTalk.ts). Same animal, short, and
  // they name the next stop so Field Notes Next can move after the last beat settles.
  farmDialogFollowUpBramRoundsA: 'That is both halves. I think you have it.',
  farmDialogFollowUpBramRoundsB: 'Where now?',
  farmDialogFollowUpBramRoundsC:
    'The fox. On the road, just this side of the gate. I am not saying that because I am a wolf. I am saying it because she will give you **[accent]a name you do not have yet[/accent]**.',
  farmDialogFollowUpCassAdHominemA: 'You have the name. Do not lose it on the walk to the pond.',
  farmDialogFollowUpCassAdHominemB: 'Hetty.',
  farmDialogFollowUpCassAdHominemC:
    'She will use it on you and she will think she is being kind. Try not to hold it against her. I do.',
  farmDialogFollowUpHettyBarrageA:
    'There. I have said it. You were very good about standing still.',
  farmDialogFollowUpHettyBarrageB: 'I should go.',
  farmDialogFollowUpHettyBarrageC:
    'The fox again, I should think. She always has another name for what people say. I do not know why anyone talks to her.',
  farmDialogFollowUpCassPopularityA: 'How many, not how. You have both names now.',
  farmDialogFollowUpCassPopularityB: 'Hetty again?',
  farmDialogFollowUpCassPopularityC:
    'The pond. East road, walk up to the water. She has more news, and this time it is not only about you. Buried in it is **[accent]something somebody actually saw[/accent]**.',
  farmDialogFollowUpHettyGrateA:
    'A grate. Bent. **[accent]I saw it with my own eyes[/accent]**, which is more than most animals can say.',
  farmDialogFollowUpHettyGrateB: 'I should tell someone who argues.',
  farmDialogFollowUpHettyGrateC:
    'The wolf, through the gate. He hears everything. I did not say that. I said I saw a grate.',
  farmDialogFollowUpBramUnlocksA: 'That is the locked line. I am sorry I had to be unpleasant.',
  farmDialogFollowUpBramUnlocksB: 'Is that all of the lessons?',
  farmDialogFollowUpBramUnlocksC:
    'That is all of the lessons. Talk to me again when you want the real one. I am one of the forty-one. I would rather you had it from me. The fox said she would sit it — **[accent]practice[/accent]**, before the owl.',
  farmDialogFollowUpBramSkirmishA:
    'The grate is bent. You did not hear it from me, except that you may say on Sunday that you did.',
  farmDialogFollowUpBramSkirmishB: 'Sunday.',
  farmDialogFollowUpBramSkirmishC:
    'Duchess has the motion. Down the east road. Whenever you want the floor.',
  farmDialogFollowUpDuchessBossA: 'The floor is finished, for now.',
  farmDialogFollowUpDuchessBossB: 'Whose side did I take?',
  farmDialogFollowUpDuchessBossC:
    'I moderate. I do not take sides, and I did not take one. The rest of the farm is still here if you want it.',

  // --- Encounter gates (src/utils/gameConditions.ts) ---
  // Requirement phrases say what to do rather than what is missing, so a list of them reads
  // as directions instead of as a list of failures.
  conditionHintFallacyKnown: 'know the {fallacy} fallacy',
  conditionHintFallacySpotted: 'spot {fallacy} in a conversation',
  conditionHintEncounterCompleted: 'finish an earlier conversation',
  conditionHintTutorialCompleted: 'open Field Notes on the farm',
  listSeparator: ', ',
  encounterLockedHint: 'Not yet — you need to {requirements}.',
  farmPromptLocked: 'Locked',

  // --- Field Notes (the Codex) ---
  codexTitle: 'Field Notes',
  codexSubtitle: 'Everything you have worked out on this farm.',
  codexOpen: 'Field Notes',
  codexOpenHasNew: 'Field Notes, new notes to check',
  codexClose: 'Close',
  codexMarkAllRead: 'Mark all as read',
  codexSectionNext: 'Next',
  codexSectionKnown: 'Fallacies you know',
  codexSectionSpotted: 'Fallacies you have spotted',
  codexSectionDialogs: 'Important conversations',
  codexTabHasNew: '{section}, new notes',
  codexEntryUnreadHint: 'New — click to mark as read',
  codexNextMainHeading: 'Main',
  codexNextOptionalHeading: 'Optional',
  codexNextDoneTitle: 'The pond motion is heard',
  codexNextDoneBody:
    'You have done what you came here to do. The rest of the farm is still here if you want it.',
  levelGoalDotTitle: 'Dot, on the road by the barn',
  levelGoalDotBody:
    'Hear her out. She will name Sunday in front of Duchess and tell you where to start.',
  levelGoalBramTitle: 'Bram, beyond the gate',
  levelGoalBramBody:
    'The wolf. He will pretend he is checking the fence. Let him. He is the one who will show you how a conversation works here.',
  levelGoalCassTitle: 'Cass, on the road by the gate',
  levelGoalCassBody:
    'The fox. She has something you need before Hetty will so much as look at you. Do not let anyone tell you about the fox first — let her do it.',
  levelGoalHettyTitle: 'Hetty, at the pond',
  levelGoalHettyBody:
    'She will talk to you now. She is going to be horrible and she has no idea. Try not to hold it against her.',
  levelGoalCassPopularityTitle: 'Cass again, on the road by the gate',
  levelGoalCassPopularityBody:
    'Hetty counted heads at you and called it a reason. Cass knows the name of that one too, and she will make you say it before she hands it over.',
  levelGoalHettyGrateTitle: 'Hetty again, at the pond',
  levelGoalHettyGrateBody:
    'She has more news, and buried in the middle of it is the only thing on this farm anybody has actually seen with their own eyes.',
  levelGoalBramUnlocksTitle: 'Bram, for the locked line',
  levelGoalBramUnlocksBody:
    'Some of what you could say back is locked until you catch the other animal at something. He will do something unkind on purpose so that you can.',
  levelGoalBramSkirmishTitle: 'Bram, for a real one',
  levelGoalBramSkirmishBody:
    'No more lessons. He is one of Tobias’s forty-one, and he will argue the motion at you properly — bring what you have. Cass is sitting it as practice, so you see a moderator before Duchess has the floor.',
  levelGoalDuchessTitle: 'Duchess, down the east road',
  levelGoalDuchessBody: 'She has the motion. That is the floor, whenever you want it.',
  codexKnownProgress: '{known} of {total} known',
  codexKnownEmpty:
    'Nobody has taught you a fallacy yet. Talk to the animals — one of them knows the name of the trick being played on you.',
  codexSpottedEmpty:
    'Nothing spotted yet. Open the lens during a conversation and tag a fallacy in what was actually said.',
  codexDialogsEmpty: 'Nothing worth writing down yet.',
  codexKnownRemaining: '{count} more that nobody has explained to you yet.',
  codexSpottedQuote: '“{text}”',
  codexSpottedAttribution: '— {speaker}',
  codexSpottedTimes: 'spotted {count}×',

  // Dialog flags — the title doubles as the requirement phrase on a locked encounter, so it
  // reads as an instruction ("hear Hetty out at the pond"), not as a headline.
  dialogFlagDotWelcomedTitle: 'get your bearings from Dot on the road',
  dialogFlagDotWelcomedBody:
    'Dot met you on the road by the barn, named Sunday in front of Duchess, and sent you to Bram through the gate before anyone else got hold of you.',
  dialogFlagBramTaughtCrossfireTitle: 'learn how a conversation works from Bram beyond the gate',
  dialogFlagBramTaughtCrossfireBody:
    'Bram walked you through a conversation one piece at a time: one animal says a thing, the other answers, and that pair is a round. Then he showed you that some rounds are not speeches — somebody asks and you answer on your feet. They call that crossfire.',
  dialogFlagCassNamedAdHominemTitle: 'let Cass name the trick for you',
  dialogFlagCassNamedAdHominemBody:
    'Cass named Ad Hominem after a season on the floor — answering the animal instead of the argument — and beat it. She does not stand there anymore. She made you use it on her first, so that you would recognise the shape of it from the inside.',
  dialogFlagHettyWitnessedTitle: 'hear Hetty out at the pond',
  dialogFlagHettyWitnessedBody:
    'Hetty went the whole way round the trough and never once reached the water: the bins, the straw in your fur, the six weeks. She said every word of it to your face, meant no harm by any of it, and asked you to agree — which is exactly what makes it work.',
  dialogFlagCassNamedPopularityTitle: 'let Cass name the second trick for you',
  dialogFlagCassNamedPopularityBody:
    'Forty-one of the Meadow-Born have put their names to the motion, and not one animal will say what any of the forty-one went and looked at. Cass calls that Appeal to Popularity, and left you a phrase to hold on to: how many, against how do you know.',
  dialogFlagHettyGrateHeardTitle: 'let Hetty finish at the pond',
  dialogFlagHettyGrateHeardBody:
    'Somewhere between a headcount and a jab about drains, Hetty mentioned that she has seen the outflow grate bent with her own eyes, and that the mud settles behind it. She moved straight on as though it were weather.',
  dialogFlagBramTaughtUnlocksTitle: 'learn how to open a locked line from Bram beyond the gate',
  dialogFlagBramTaughtUnlocksBody:
    'Bram was unpleasant to you on purpose so that you could catch him at it, and the answer that had been greyed out all along opened up. Spotting and speaking are the same game; that is where they meet.',
  dialogFlagBramGrateTitle: 'get Bram to talk about the grate',
  dialogFlagBramGrateBody:
    'You put it to him straight beyond the gate and he gave it up on the spot: the outflow grate has been bent since before the frost, and he has known the whole time. Bram is one of Tobias’s own forty-one, which makes him the best witness on this farm and the one it costs him most to be.',

  // Feature unlocks — titles read as directions, same contract as dialog flags.
  featureInsightPointsTitle: 'learn what Insight is from Bram beyond the gate',
  featureInsightPointsBody:
    'Bram handed you the habit he uses to survive a room that has already decided about him: never answer the first time. Insight is the one thing in this game you can spend, and you are never forced to.',
  featureRoundTypesTitle: 'learn what crossfire is from Bram beyond the gate',
  featureRoundTypesBody:
    'Some rounds are not speeches. Somebody asks and you answer on your feet. Bram named that crossfire, and the round labels started saying so.',

  // --- Phaser placeholder scenes ---
  gameOver: 'Game Over',
  gamePlaceholderBody: 'Make something fun!\nand share it with us:\nsupport@phaser.io',
  trialScenePlaceholder: 'Trial Scene\n\nThis is where the trial gameplay\nwould be implemented.',

  // --- Lateral farm scene ---
  farmSideBackToMenu: 'Back to Main Menu',
  farmSideMoveHint: 'Arrows / WASD to walk the road, Shift to run',

  // Portal prompts — the label belongs to the direction of travel, so a symmetric pair of
  // portals reads differently depending which side of it you're standing on.
  farmSidePortalBarn: 'Enter the barn',
  farmSidePortalGate: 'Go through the gate',
  farmSidePortalEastRoad: 'Head down the east road',
  farmSidePortalPond: 'Walk down to the pond',
  farmSidePortalBackToOrchard: 'Back to the orchard',
  farmSidePortalBackToRoad: 'Back to the road',
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
