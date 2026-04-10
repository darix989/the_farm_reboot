/**
 * Domain entities for the dialogue / debate game (see plan_001.md).
 */

/** Always exactly two sides in a debate. */
export type Side = "proposition" | "opposition";

/** Player represents one of these; maps to opening roles. */
export type OpeningStatementRole = "affirmative" | "negative";

export interface LogicalFallacy {
    id: string;
    label: string;
    description: string;
}

export interface Sentence {
    id: string;
    text: string;
    logicalFallacies: LogicalFallacy[];
}

export interface Statement {
    id: string;
    speakerId: string;
    sentences: Sentence[];
}

/** Same shape as Statement; role distinguishes proposition vs opposition opening. */
export interface OpeningStatement extends Statement {
    role: OpeningStatementRole;
}

export interface PlayerOpeningStatement extends OpeningStatement {
    triggerOpeningStatementId?: string;
}

/**
 * Like a statement, but sentences must not carry logical fallacies (objective facts).
 */
export interface FactSentence {
    id: string;
    text: string;
    logicalFallacies: readonly [];
}

export interface Fact {
    id: string;
    speakerId: string;
    sentences: FactSentence[];
}

export interface WinningConditions {
    /** Percentages sum to 100; both start at 50. */
    propositionWinPercent: number;
    oppositionWinPercent: number;
}

export interface ConstructiveRound {
    kind: "constructive";
    activeSide: Side;
}

export interface CrossfireRound {
    kind: "crossfire";
    activeSide: Side;
    /** Present when the other side may react in crossfire. */
    reactiveSide?: Side;
}

export interface RebuttalRound {
    kind: "rebuttal";
    activeSide: Side;
}

export type Round = ConstructiveRound | CrossfireRound | RebuttalRound;

/** Reference to a sentence from any statement-like source (opening, rebuttal, fact). */
export interface SentenceTargetRef {
    type: "sentence";
    sourceId: string;
    sentenceId: string;
}

export interface SideTargetRef {
    type: "side";
    side: Side;
}

export type Target = SentenceTargetRef | SideTargetRef;

export interface EvidenceSentenceRef {
    type: "sentence";
    sourceId: string;
    sentenceId: string;
}

/** Whether the fallacy is used to flag the opponent’s error or to characterize how an argument operates. */
export type LogicalFallacyUseTo = "apply" | "spot";

export interface EvidenceLogicalFallacyRef {
    type: "logical_fallacy";
    logicalFallacyId: string;
    useTo: LogicalFallacyUseTo;
}

export type Evidence = EvidenceSentenceRef | EvidenceLogicalFallacyRef;

/** At least one evidence item (rebuttal/crossfire assembly allows up to three). */
export type NonEmptyEvidenceList = readonly [Evidence, ...Evidence[]];

/**
 * One end-of-round option: composed lines shown after the player picks target + evidences.
 * `impact` is a score delta for jury / win conditions; keep in [-50, 50].
 */
export interface AssembledStatement {
    id: string;
    sentences: Sentence[];
    target: Target;
    evidences: NonEmptyEvidenceList;
    /** Integer delta in [-50, 50]. */
    impact: number;
}

export type JuryVerdict = "proposition_accepted" | "proposition_rejected";

export interface Debate {
    id: string;
    /** Brief summary of what the debate is about. */
    introduction: string;
    playerSide: Side;
    propositionOpening: OpeningStatement;
    oppositionOpening: OpeningStatement;
    rounds: Round[];
    /** Statement produced at the end of each round, keyed by round id or index as you prefer. */
    statementsByRoundKey?: Record<string, Statement>;
    winningConditions: WinningConditions;
    juryVerdict?: JuryVerdict;
}

/**
 * Authoring shape for a single-player debate scenario (JSON).
 * `opponentOpening` is the non-player side; `playerConstructiveOpenings` are the three first-speech options.
 */
export interface DebateScenarioJson {
    id: string;
    /** Brief summary of what the debate is about. */
    introduction?: string;
    playerSide: Side;
    opponentOpening: readonly [
        OpeningStatement,
        OpeningStatement,
        OpeningStatement,
    ];
    playerConstructiveOpenings: readonly [
        PlayerOpeningStatement,
        PlayerOpeningStatement,
        PlayerOpeningStatement,
    ];
    logicalFallacies: LogicalFallacy[];
    facts: Fact[];
    playerAssembledStatements: AssembledStatement[];
    /**
     * Opponent lines spoken after each player assembly round, in order.
     * Index `i` is revealed when moving to assembly round `i + 1` (after round `i` completes).
     */
    otherSideRebuttalStatements?: Statement[];
    /**
     * Each entry lists `playerAssembledStatements` ids allowed as finals that assembly round.
     * If omitted, one round is implied: all assembled statements in a single round.
     */
    playerAssemblyRounds?: readonly (readonly string[])[];
}

/** First speech: three ready options; quality TBD per character. */
export interface AssemblingConstructive {
    kind: "assembling_constructive";
    optionStatements: readonly [Statement, Statement, Statement];
}

/** Select a target, then up to three evidences. */
export interface AssemblingRebuttal {
    kind: "assembling_rebuttal";
    target: Target | null;
    evidences: Evidence[];
}

/** Select a target, then up to three evidences. */
export interface AssemblingCrossfire {
    kind: "assembling_crossfire";
    target: Target | null;
    evidences: Evidence[];
}

export type AssemblingPhase =
    | AssemblingConstructive
    | AssemblingRebuttal
    | AssemblingCrossfire;

