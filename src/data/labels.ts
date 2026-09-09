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
  level1BramDialog: '1.1 · Down at the Fence: One at a Time',
  level1BramCrossfire: '1.2 · Down at the Fence: Answer Me Now',
  level1CassTeaches: '1.3 · The Sparring Post: The Name of the Trick',
  level1HettyBarrage: '1.4 · Gossip at the Trough: All About You',
  level1CassPopularity: '1.5 · The Sparring Post: How Many, Not How',
  level1GossipHetty: '1.6 · Gossip at the Trough: What Hetty Saw',
  level1BramUnlocks: '1.7 · Down at the Fence: The Line You Have to Earn',
  level1SkirmishBram: '1.8 · Fence-line Skirmish: The Bent Grate',
  level1BossTobias: '1.9 · The Public Farm: The Pond Motion',
  // Parked out of the Level 1 ladder, still playable from "Other scenarios".
  level1SparringCass: 'The Sparring Post: Answer Me',
  level1GossipBram: 'Down at the Fence: Forty-One',
  level1BramInsight: 'Down at the Fence: Looking Twice',
  level1LabCass: "The Fox's Lab: Dirty Paws",
  animationGallery: 'Animation Gallery',

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
  /** Intro-card stripe label for encounters with no moderator (gossip, sparring, lab). */
  setting: 'Setting',
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
  farmNpcRue: 'Rue',
  farmNpcHetty: 'Hetty',
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
  tutorialLessonRounds: 'how a round works',
  tutorialLessonRoundsPreview:
    'How a round works. One animal says a thing, the other answers, and that pair is a round. I can walk you through it one piece at a time.',
  tutorialLessonCrossfire: 'answering on your feet',
  tutorialLessonCrossfirePreview:
    'Crossfire. Somebody asks and you answer on your feet. Both halves: they ask, you answer. Or you ask, and they have to. I can walk you through it. You do not have to.',
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
    'Forty-one. She said the number and you felt it land, and not one of the forty-one has been down to the water. There is a name for that as well. Stand at the post.',
  farmDialogCassDone:
    'Nothing more from me. Save it for Sunday, and whatever he says, do not let him make it about you.',
  farmDialogCassDoneA: 'Nothing more from me. Save it for Sunday.',
  farmDialogCassDoneB:
    'And whatever he says about your supper — and he will — do not let him make it about you.',
  farmDialogBram1:
    'Dot sent you, then. Sunday, against Tobias. I could show you how a conversation works here, if you like — you do not have to say yes.',
  farmDialogBram1a:
    'Bram? Dot sent me. There is a motion on the pond on Sunday, and I have put my name down to speak against it.',
  farmDialogBram1b: 'You — against Tobias. On the floor. And you came down here. To the wolf.',
  farmDialogBram1c: 'You were the first name she gave me. I need help.',
  farmDialogBram1d:
    'That was kind of her. I am not certain it was wise. Nobody sends anybody to the wolf — and I do not say that to be pitied, it is simply the traffic.',
  farmDialogBram1e: 'What is it you do down here?',
  farmDialogBram1f:
    'I walk the fence. Both ways, every day. And from the far side of a hedge you hear every conversation on this farm and nobody remembers you are standing there. That is not a job. It has been an education.',
  farmDialogBram1g: 'Then you know how the floor goes.',
  farmDialogBram1h:
    'I know how it goes wrong, which is the useful half. I could show you how a conversation works here, one piece at a time, before anybody else gets hold of you. You do not have to say yes. I would not blame you.',
  farmDialogBram2:
    'One more thing, if you have a moment. Some rounds are not speeches. You do not have to. I would not blame you.',
  farmDialogBram2a:
    'I am still here. One more thing, if you have a moment. You do not have to. I would not blame you.',
  farmDialogBram2b: 'Go on.',
  farmDialogBram2c:
    'Some rounds are not speeches. Somebody asks and you answer on your feet. I would rather not demonstrate it. That is not the same as not having to. I am sorry.',
  farmDialogBram3:
    'There is another piece, if you have a moment. I have to be unpleasant to you first, and I am sorry about that.',
  farmDialogBram3a: 'There is another piece, if you have a moment. You do not have to.',
  farmDialogBram3b: 'Go on.',
  farmDialogBram3c:
    'This one I cannot simply tell you. I have to be unpleasant to you first, on purpose, so that you can catch me at it. I am sorry in advance. I have been dreading it since breakfast.',
  farmDialogBram4:
    'No more lessons. I am one of the forty-one, and I would rather you had the argument from me than from Tobias on Sunday.',
  farmDialogBram4a: 'No more lessons. I think we are past those.',
  farmDialogBram4b: 'What is this, then?',
  farmDialogBram4c:
    'I am one of the forty-one, Rue. I put my name to the motion. I would rather you had that argument from me, here, where it costs you nothing — than from Tobias on Sunday, where it costs you everything.',
  farmDialogBramDone:
    'I have said a great deal more than I should have. The grate is bent. You did not hear it from me.',
  farmDialogBramDoneA: 'I have said a great deal more than I should have.',
  farmDialogBramDoneB:
    'The grate is bent. You did not hear that from me. You may say on Sunday that you heard it from me.',
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
    'I moderate. I do not take sides, and I did not take one. It is going to be a fine week, I imagine. I would not know.',
  farmDialogTobias1:
    'Ah. The newcomer. No hard feelings about Sunday, I hope — Duchess has the motion, and it is her floor. Speak to her when you are ready.',
  farmDialogTobias1a: 'Ah. The newcomer. Roo, is it?',
  farmDialogTobias1b: 'Rue. I live here now.',
  farmDialogTobias1c:
    'Of course you do, and nobody says otherwise, and I hope there are no hard feelings about Sunday. Duchess has the motion. Speak to her when you are ready.',
  farmDialogTobiasDone: 'The pond is settled, then. For this year.',
  farmDialogTobiasDoneA: 'The pond is settled, then. For this year.',
  farmDialogTobiasDoneB:
    'I will say this once and not again: I have pulled a cart past that drain for eleven years and never once looked into it. Good morning, Rue.',
  farmDialogDot1:
    'You are the new raccoon. Rue, is it? Tobias has put a motion on the pond — Sunday, in front of Duchess — and not one animal will speak against it. Bram first, at the fence. Then Cass at the west post.',
  farmDialogDot1a:
    'You are the new raccoon! Rue, is it? Or Roo — somebody said Roo. I am Dot. I mind the yard.',
  farmDialogDot1b: 'Rue. Six weeks now. I do the hauling, the repairs and the bins.',
  farmDialogDot1c:
    'The bins! Nobody volunteers for the bins. Are the others being decent to you, at least?',
  farmDialogDot1d: 'Mostly. Some of them talk about me when I am three steps away.',
  farmDialogDot1e:
    'That is not about you, that is the week we are having. I would blame the weather. It is not the weather.',
  farmDialogDot1f: 'What is wrong with the week?',
  farmDialogDot1g:
    'There is a debate coming. Tobias has put a motion on the Old Pond — that it is finished, and ought to be drained and filled in and forgotten. It is heard Sunday, on the floor of the Public Farm, in front of Duchess.',
  farmDialogDot1h: 'That is a large thing to lose.',
  farmDialogDot1i:
    'It is. And he says it so warmly that everybody has agreed with him before they work out what they have agreed to.',
  farmDialogDot1j: 'So who is speaking for the pond?',
  farmDialogDot1k:
    'Nobody. Not one animal. They nod at the trough and say the opposite at home, and out here only the nodding is counted.',
  farmDialogDot1l: 'Then I will speak for it.',
  farmDialogDot1m: 'You — you have been here six — right. Yes. Somebody had to be somebody.',
  farmDialogDot1n:
    'But there are rules, and nobody has written them down. Partly because not one animal here knows what writing is. Mostly because rules nobody wrote are the easiest kind to break. You will want to know how this farm argues before you go and stand in front of it.',
  farmDialogDot1o: 'Where do I start?',
  farmDialogDot1p:
    'Bram. The wolf, down at the fence. He will pretend he is checking it. Let him. He is the one who will show you how a conversation works here, before Cass gets her teeth into you. Then Cass at the west post, then Hetty at the trough, then the barn when you want the floor.',
  farmDialogDot2:
    'Bram has done his piece. Cass is at the west post, and she will talk to you now.',
  farmDialogDot2a: 'Bram has done his piece. You know how a round works, then.',
  farmDialogDot2b: 'And now?',
  farmDialogDot2c:
    'Cass. The fox, at the west post. She has something you need before Hetty will so much as look at you. Do not let anyone tell you about the fox first — let her do it.',
  farmDialogDot3: 'Cass has done her piece. Hetty is at the trough, and she will talk to you now.',
  farmDialogDot3a: 'Cass has done her piece. I heard it from here, some of it.',
  farmDialogDot3b: 'And Hetty?',
  farmDialogDot3c:
    'At the trough, and she will talk to you now. She is going to be horrible and she has no idea. Try not to hold it against her — everyone does, and it has never once helped.',
  farmDialogDot4:
    'Hetty has had her go at you. Back to Cass — she will know what to call the rest of it.',
  farmDialogDot4a: 'Hetty has had her go at you. I could hear it from the yard.',
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
    'Bram, at the fence. He has one more piece for you, and then he will argue the motion at you properly.',
  farmDialogDot6a: 'Bram, at the fence. Twice, I should think.',
  farmDialogDot6b: 'Twice?',
  farmDialogDot6c:
    'He has one more piece to show you, and then he will argue the motion at you for real. He put his name to it, you know. He will hate every minute of it and he will do it anyway, which is the most wolf thing about him.',
  farmDialogDot7: 'Duchess has the motion at the barn. That is the floor, whenever you want it.',
  farmDialogDot7a: 'Duchess has the motion at the barn. That is the floor, whenever you want it.',
  farmDialogDot7b: 'And that is everyone?',
  farmDialogDot7c:
    'That is everyone I can point you at. The rest of it is Sunday, and Sunday is not mine. Mind the drain on your way.',
  farmDialogDotDone: 'I have pointed you at everyone I can. The rest is the floor.',
  farmDialogDotDoneA: 'I have pointed you at everyone I can point you at.',
  farmDialogDotDoneB:
    'The rest is the floor, and the floor is not mine. Good luck. Mind the drain.',

  // --- Encounter gates (src/utils/gameConditions.ts) ---
  // Requirement phrases say what to do rather than what is missing, so a list of them reads
  // as directions instead of as a list of failures.
  conditionHintFallacyKnown: 'know the {fallacy} fallacy',
  conditionHintFallacySpotted: 'spot {fallacy} in a conversation',
  conditionHintEncounterCompleted: 'finish an earlier conversation',
  listSeparator: ', ',
  encounterLockedHint: 'Not yet — you need to {requirements}.',
  farmPromptLocked: 'Locked',

  // --- Field Notes (the Codex) ---
  codexTitle: 'Field Notes',
  codexSubtitle: 'Everything you have worked out on this farm.',
  codexOpen: 'Field Notes',
  codexClose: 'Close',
  codexSectionNext: 'Next',
  codexSectionKnown: 'Fallacies you know',
  codexSectionSpotted: 'Fallacies you have spotted',
  codexSectionDialogs: 'Important conversations',
  codexNextMainHeading: 'Main',
  codexNextOptionalHeading: 'Optional',
  codexNextDoneTitle: 'The pond motion is heard',
  codexNextDoneBody:
    'You have done what you came here to do. The rest of the farm is still here if you want it.',
  levelGoalDotTitle: 'Dot, in the yard',
  levelGoalDotBody:
    'Hear her out. She will name Sunday in front of Duchess and tell you where to start.',
  levelGoalBramTitle: 'Bram, down at the fence',
  levelGoalBramBody:
    'The wolf. He will pretend he is checking the fence. Let him. He is the one who will show you how a conversation works here.',
  levelGoalBramCrossfireTitle: 'Bram, still at the fence',
  levelGoalBramCrossfireBody:
    'He has one more thing, and he will apologise for it. Some rounds are not speeches: somebody asks, and you answer on your feet.',
  levelGoalCassTitle: 'Cass, at the west post',
  levelGoalCassBody:
    'The fox. She has something you need before Hetty will so much as look at you. Do not let anyone tell you about the fox first — let her do it.',
  levelGoalHettyTitle: 'Hetty, at the trough',
  levelGoalHettyBody:
    'She will talk to you now. She is going to be horrible and she has no idea. Try not to hold it against her.',
  levelGoalCassPopularityTitle: 'Cass again, at the west post',
  levelGoalCassPopularityBody:
    'Hetty counted heads at you and called it a reason. Cass knows the name of that one too, and she will make you say it before she hands it over.',
  levelGoalHettyGrateTitle: 'Hetty again, at the trough',
  levelGoalHettyGrateBody:
    'She has more news, and buried in the middle of it is the only thing on this farm anybody has actually seen with their own eyes.',
  levelGoalBramUnlocksTitle: 'Bram, for the locked line',
  levelGoalBramUnlocksBody:
    'Some of what you could say back is locked until you catch the other animal at something. He will do something unkind on purpose so that you can.',
  levelGoalBramSkirmishTitle: 'Bram, for a real one',
  levelGoalBramSkirmishBody:
    'No more lessons. He is one of Tobias’s forty-one, and he will argue the motion at you properly — bring what you have.',
  levelGoalDuchessTitle: 'Duchess, at the barn',
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
  // reads as an instruction ("hear Hetty out at the trough"), not as a headline.
  dialogFlagDotWelcomedTitle: 'get your bearings from Dot in the yard',
  dialogFlagDotWelcomedBody:
    'Dot met you in the yard, named Sunday in front of Duchess, and sent you to Bram at the fence before anyone else got hold of you.',
  dialogFlagBramTaughtRoundsTitle: 'learn how a round works from Bram at the fence',
  dialogFlagBramTaughtRoundsBody:
    'Bram walked you through a conversation one piece at a time: one animal says a thing, the other answers, and that pair is a round. He apologised for the lecture the whole way through.',
  dialogFlagBramTaughtCrossfireTitle: 'learn what crossfire is from Bram at the fence',
  dialogFlagBramTaughtCrossfireBody:
    'Bram showed you that some rounds are not speeches: somebody asks and you answer on your feet. They call that crossfire, and he made you do both halves.',
  dialogFlagCassNamedAdHominemTitle: 'let Cass name the trick for you',
  dialogFlagCassNamedAdHominemBody:
    'Cass named Ad Hominem after a season on the floor — answering the animal instead of the argument — and beat it. She does not stand there anymore. She made you use it on her first, so that you would recognise the shape of it from the inside.',
  dialogFlagHettyWitnessedTitle: 'hear Hetty out at the trough',
  dialogFlagHettyWitnessedBody:
    'Hetty went the whole way round the trough and never once reached the water: the bins, the straw in your fur, the six weeks. She said every word of it to your face, meant no harm by any of it, and asked you to agree — which is exactly what makes it work.',
  dialogFlagCassNamedPopularityTitle: 'let Cass name the second trick for you',
  dialogFlagCassNamedPopularityBody:
    'Forty-one of the Meadow-Born have put their names to the motion, and not one animal will say what any of the forty-one went and looked at. Cass calls that Appeal to Popularity, and left you a phrase to hold on to: how many, against how do you know.',
  dialogFlagHettyGrateHeardTitle: 'let Hetty finish at the trough',
  dialogFlagHettyGrateHeardBody:
    'Somewhere between a headcount and a jab about drains, Hetty mentioned that she has seen the outflow grate bent with her own eyes, and that the mud settles behind it. She moved straight on as though it were weather.',
  dialogFlagBramTaughtUnlocksTitle: 'learn how to open a locked line from Bram at the fence',
  dialogFlagBramTaughtUnlocksBody:
    'Bram was unpleasant to you on purpose so that you could catch him at it, and the answer that had been greyed out all along opened up. Spotting and speaking are the same game; that is where they meet.',
  dialogFlagBramGrateTitle: 'get Bram to talk about the grate',
  dialogFlagBramGrateBody:
    'At the fence line, before you had asked him anything: the outflow grate has been bent since before the frost. Bram is one of Tobias’s own forty-one, which makes him the best witness on this farm and the one it costs him most to be.',

  // Feature unlocks — titles read as directions, same contract as dialog flags.
  featureInsightPointsTitle: 'learn what Insight is from Bram at the fence',
  featureInsightPointsBody:
    'Bram handed you the habit he uses to survive a room that has already decided about him: never answer the first time. Insight is the one thing in this game you can spend, and you are never forced to.',
  featureRoundTypesTitle: 'learn what crossfire is from Bram at the fence',
  featureRoundTypesBody:
    'Some rounds are not speeches. Somebody asks and you answer on your feet. Bram named that crossfire, and the round labels started saying so.',

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
