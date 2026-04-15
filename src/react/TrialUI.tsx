import React, { useEffect, useMemo, useRef, useState } from "react";
import cn from "classnames";
import type { DebateScenarioJson } from "../types/debateEntities";
import TrialLayout from "./trial/TrialLayout";
import { useTrialRoundWorkflow } from "./trial/useTrialRoundWorkflow";
import RoundAnalysisModal, {
    type AnalysisTarget,
    type GuessRecord,
    NO_FALLACIES_ID,
} from "./trial/RoundAnalysisModal";
import { useScrollFade } from "./trial/useScrollFade";

import magnifyingIcon from "../static/icons/magnifying.svg";
import styles from "./trial/TrialUI.module.scss";
import shared from "./trial/trialShared.module.scss";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSpeakerName(debate: DebateScenarioJson, speakerId: string): string {
    return debate.characters?.[speakerId] ??
        (speakerId.charAt(0).toUpperCase() + speakerId.slice(1));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TrialUIProps {
    debate: DebateScenarioJson;
}

const TrialUI: React.FC<TrialUIProps> = ({ debate }) => {
    const wf = useTrialRoundWorkflow(debate);

    // -----------------------------------------------------------------------
    // Feedback auto-scroll + scroll fade indicators
    // -----------------------------------------------------------------------
    const feedbackScrollRef = useRef<HTMLDivElement>(null);
    const interactiveScrollRef = useRef<HTMLDivElement>(null);

    const feedbackFade = useScrollFade(feedbackScrollRef);
    const interactiveFade = useScrollFade(interactiveScrollRef);

    useEffect(() => {
        const el = feedbackScrollRef.current;
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, [wf.currentRoundIndex]);

    // -----------------------------------------------------------------------
    // Modal state
    // -----------------------------------------------------------------------
    const [analysisTarget, setAnalysisTarget] = useState<AnalysisTarget | null>(null);
    // Maps player round number → GuessRecord (one guess per player round)
    const [fallacyGuesses, setFallacyGuesses] = useState<Map<number, GuessRecord>>(new Map());

    // The current player round number (defined while the player can still act on a round:
    // choosing, confirming, or reading the NPC's response to their choice)
    const currentPlayerRoundNumber = useMemo(() => {
        if (
            wf.gamePhase === "player_choosing" ||
            wf.gamePhase === "player_confirming" ||
            wf.gamePhase === "npc_responding"
        ) {
            return wf.currentRound?.roundNumber ?? null;
        }
        return null;
    }, [wf.gamePhase, wf.currentRound]);

    const canGuess =
        currentPlayerRoundNumber !== null &&
        !fallacyGuesses.has(currentPlayerRoundNumber);

    // Returns the overall result of guesses for a given NPC round across all player rounds.
    // 'correct' if any guess was right (correct beats wrong), 'wrong' if only wrong guesses, null if none.
    const getNpcGuessState = (npcRoundId: string): "correct" | "wrong" | null => {
        let hasWrong = false;
        for (const record of fallacyGuesses.values()) {
            if (record.npcRoundId !== npcRoundId) continue;
            if (record.correct) return "correct";
            hasWrong = true;
        }
        return hasWrong ? "wrong" : null;
    };

    // Guess for the currently open modal (if it's an NPC round or opponent_prompt)
    const activeGuess = useMemo((): GuessRecord | null => {
        if (!analysisTarget || analysisTarget.kind === "player") return null;
        const targetId =
            analysisTarget.kind === "npc"
                ? analysisTarget.round.id
                : analysisTarget.statement.id;
        for (const [, record] of fallacyGuesses) {
            if (record.npcRoundId === targetId) return record;
        }
        return null;
    }, [analysisTarget, fallacyGuesses]);

    const handleGuess = (sentenceId: string, fallacyId: string) => {
        if (!analysisTarget || analysisTarget.kind === "player") return;
        if (currentPlayerRoundNumber === null) return;

        const sentences =
            analysisTarget.kind === "npc"
                ? analysisTarget.round.statement.sentences
                : analysisTarget.statement.sentences;
        const targetId =
            analysisTarget.kind === "npc"
                ? analysisTarget.round.id
                : analysisTarget.statement.id;

        let record: GuessRecord;

        if (fallacyId === NO_FALLACIES_ID) {
            // Player claims the statement has no fallacies at all.
            // Correct iff every sentence's logicalFallacies array is empty.
            const correct = sentences.every((s) => s.logicalFallacies.length === 0);
            // Collect the union of all actual fallacies (deduped by id) so the
            // result banner can list what was really there when the guess is wrong.
            const seen = new Set<string>();
            const allFallacies = sentences.flatMap((s) => s.logicalFallacies).filter((f) => {
                if (seen.has(f.id)) return false;
                seen.add(f.id);
                return true;
            });
            record = {
                npcRoundId: targetId,
                sentenceId: "",
                fallacyId: NO_FALLACIES_ID,
                correct,
                actualFallacies: allFallacies,
            };
        } else {
            const sentence = sentences.find((s) => s.id === sentenceId);
            if (!sentence) return;
            const correct = sentence.logicalFallacies.some((f) => f.id === fallacyId);
            record = {
                npcRoundId: targetId,
                sentenceId,
                fallacyId,
                correct,
                actualFallacies: sentence.logicalFallacies,
            };
        }

        setFallacyGuesses((prev) => new Map(prev).set(currentPlayerRoundNumber, record));
    };

    // -----------------------------------------------------------------------
    // Footer action state derived from game phase
    // -----------------------------------------------------------------------
    const interactiveFooter = useMemo(() => {
        let submitLabel = "Continue";
        let submitDisabled = true;
        let onSubmit: (() => void) | undefined;

        switch (wf.gamePhase) {
            case "npc_speaking":
            case "npc_responding":
                submitLabel = "Continue";
                submitDisabled = false;
                onSubmit = () => wf.dispatch({ type: "continue" });
                break;
            case "player_confirming":
                submitLabel = "Confirm";
                submitDisabled = false;
                onSubmit = () => wf.dispatch({ type: "confirm_option" });
                break;
            default:
                submitDisabled = true;
                break;
        }

        return { submitLabel, submitDisabled, onSubmit };
    }, [wf.gamePhase, wf.dispatch]);

    // -----------------------------------------------------------------------
    // Feedback panel
    // -----------------------------------------------------------------------

    const feedback = (
        <div className={styles.trialPanelContent}>
            <div className={styles.trialAreaTitle}>
                <h2 className={styles.trialPanelHeading}>Feedback</h2>
            </div>
            <div className={shared.trialScrollFadeWrap}>
                <div className={cn(shared.scrollFadeOverlay, shared.fadeTop)} style={{ opacity: feedbackFade.top ? 1 : 0 }} />
                <div className={styles.trialFeedbackScroll} ref={feedbackScrollRef}>

            {wf.scenario.introduction && (
                <div className={shared.trialSectionBox} style={{ fontSize: '1.875rem', lineHeight: 1.375, color: 'rgba(255,255,255,0.80)' }}>
                    <p style={{ color: 'rgba(255,255,255,0.50)' }}>Introduction</p>
                    <p style={{ marginTop: '0.5rem', color: 'rgba(255,255,255,0.90)' }}>{wf.scenario.introduction}</p>
                </div>
            )}

            {/* Round counter */}
            {wf.gamePhase !== "debate_complete" && wf.currentRound && (
                <div className={shared.trialSectionBox}>
                    <p style={{ fontSize: '2.125rem', lineHeight: 1.375, color: 'rgba(255,255,255,0.85)' }}>
                        <span style={{ color: 'rgba(255,255,255,0.50)' }}>Round </span>
                        <span style={{ color: 'rgba(255,255,255,0.90)' }}>
                            {wf.currentRound.roundNumber} / {wf.totalRounds}
                        </span>
                        <span style={{ marginLeft: '1rem', textTransform: 'capitalize', color: 'rgba(255,255,255,0.50)', fontSize: '1.625rem' }}>
                            {wf.currentRound.type.replace(/_/g, " ")}
                        </span>
                    </p>
                </div>
            )}

            {/* Score */}
            <div className={shared.trialSectionBox}>
                <p style={{ fontSize: '2.125rem', lineHeight: 1.375, color: 'rgba(255,255,255,0.85)' }}>
                    <span style={{ color: 'rgba(255,255,255,0.50)' }}>Score </span>
                    <span
                        style={{
                            color: wf.totalScore > 0
                                ? '#67e8f9'
                                : wf.totalScore < 0
                                  ? '#f87171'
                                  : 'rgba(255,255,255,0.90)',
                        }}
                    >
                        {wf.totalScore > 0 ? "+" : ""}
                        {wf.totalScore}
                    </span>
                    <span style={{ marginLeft: '0.75rem', fontSize: '1.375rem', color: 'rgba(255,255,255,0.35)' }}>
                        / {wf.maxPossibleScore}
                    </span>
                </p>
            </div>

            {/* Full debate history — all rounds that have been fully passed */}
            {wf.currentRoundIndex > 0 && (
                <div className={shared.trialSectionBox} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <p style={{ color: 'rgba(255,255,255,0.50)' }}>History</p>
                    {wf.scenario.rounds.slice(0, wf.currentRoundIndex).map((round) => {
                        if (round.kind === "npc") {
                            const guessState = getNpcGuessState(round.id);
                            return (
                                <div key={round.id} className={styles.trialHistoryEntry}>
                                    <p style={{ color: 'rgba(255,255,255,0.45)' }}>
                                        Round {round.roundNumber} — {getSpeakerName(debate, round.speakerId)}
                                    </p>
                                    <p style={{ marginTop: '0.25rem', color: 'rgba(255,255,255,0.75)' }}>
                                        {round.statement.sentences.map((s) => s.text).join(" ")}
                                    </p>
                                    <button
                                        type="button"
                                        className={cn(styles.trialAnalyzeBtn, {
                                            [styles.correct]: guessState === "correct",
                                            [styles.wrong]: guessState === "wrong",
                                        })}
                                        title="Analyze this round"
                                        onClick={() =>
                                            setAnalysisTarget({ kind: "npc", round })
                                        }
                                    >
                                        <img src={magnifyingIcon} alt="Analyze" />
                                    </button>
                                </div>
                            );
                        }

                        // player round
                        const cr = wf.completedRounds.find((c) => c.roundId === round.id);
                        if (!cr) return null;
                        const opt = round.options.find((o) => o.id === cr.optionId);
                        if (!opt) return null;
                        const response = round.opponentResponses?.find(
                            (r) => r.forOptionId === cr.optionId,
                        );
                        return (
                            <React.Fragment key={round.id}>
                                {round.opponentPrompt && (
                                    <div className={styles.trialHistoryEntry}>
                                        <p style={{ color: 'rgba(255,255,255,0.45)' }}>
                                            Round {round.roundNumber} — {getSpeakerName(debate, round.opponentPrompt.speakerId)}'s question
                                        </p>
                                        <p style={{ marginTop: '0.25rem', color: 'rgba(255,255,255,0.75)' }}>
                                            {round.opponentPrompt.sentences.map((s) => s.text).join(" ")}
                                        </p>
                                        <button
                                            type="button"
                                            className={cn(styles.trialAnalyzeBtn, {
                                                [styles.correct]: getNpcGuessState(round.opponentPrompt.id) === "correct",
                                                [styles.wrong]: getNpcGuessState(round.opponentPrompt.id) === "wrong",
                                            })}
                                            title="Analyze this question"
                                            onClick={() =>
                                                setAnalysisTarget({
                                                    kind: "opponent_prompt",
                                                    statement: round.opponentPrompt!,
                                                    playerRound: round,
                                                })
                                            }
                                        >
                                            <img src={magnifyingIcon} alt="Analyze" />
                                        </button>
                                    </div>
                                )}
                                <div className={styles.trialHistoryEntry}>
                                    <p style={{ color: 'rgba(255,255,255,0.45)' }}>
                                        Round {cr.roundNumber} — You —{" "}
                                        <span
                                            style={{
                                                color: opt.quality === "effective"
                                                    ? '#22d3ee'
                                                    : opt.quality === "logical_fallacy"
                                                      ? '#f87171'
                                                      : 'rgba(255,255,255,0.50)',
                                            }}
                                        >
                                            {opt.quality === "effective"
                                                ? "Effective"
                                                : opt.quality === "logical_fallacy"
                                                  ? "Logical fallacy"
                                                  : "Ineffective"}
                                        </span>{" "}
                                        <span
                                            style={{
                                                color: cr.impact > 0
                                                    ? '#67e8f9'
                                                    : cr.impact < 0
                                                      ? '#f87171'
                                                      : 'rgba(255,255,255,0.40)',
                                            }}
                                        >
                                            ({cr.impact > 0 ? "+" : ""}
                                            {cr.impact})
                                        </span>
                                    </p>
                                    <p style={{ marginTop: '0.25rem', color: 'rgba(255,255,255,0.75)' }}>
                                        {opt.sentences[0]?.text ?? ""}
                                    </p>
                                    <button
                                        type="button"
                                        className={styles.trialAnalyzeBtn}
                                        title="Analyze this round"
                                        onClick={() =>
                                            setAnalysisTarget({
                                                kind: "player",
                                                round,
                                                chosenOption: opt,
                                            })
                                        }
                                    >
                                        <img src={magnifyingIcon} alt="Analyze" />
                                    </button>
                                </div>
                                {response && (
                                    <div className={styles.trialHistoryEntry}>
                                        <p style={{ color: 'rgba(255,255,255,0.45)' }}>
                                            Round {cr.roundNumber} — {getSpeakerName(debate, response.statement.speakerId)} responds
                                        </p>
                                        <p style={{ marginTop: '0.25rem', color: 'rgba(255,255,255,0.75)' }}>
                                            {response.statement.sentences.map((s) => s.text).join(" ")}
                                        </p>
                                        <button
                                            type="button"
                                            className={cn(styles.trialAnalyzeBtn, {
                                                [styles.correct]: getNpcGuessState(response.statement.id) === "correct",
                                                [styles.wrong]: getNpcGuessState(response.statement.id) === "wrong",
                                            })}
                                            title="Analyze this response"
                                            onClick={() =>
                                                setAnalysisTarget({
                                                    kind: "opponent_response",
                                                    statement: response.statement,
                                                    playerRound: round,
                                                })
                                            }
                                        >
                                            <img src={magnifyingIcon} alt="Analyze" />
                                        </button>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            )}

            {/* Live crossfire question — shown in the feedback panel as soon as the round starts */}
            {wf.currentPlayerRound?.opponentPrompt &&
             (wf.gamePhase === "player_choosing" ||
              wf.gamePhase === "player_confirming" ||
              wf.gamePhase === "npc_responding") && (
                <div className={shared.trialSectionBox} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className={styles.trialHistoryEntry}>
                        <p style={{ color: 'rgba(255,255,255,0.45)' }}>
                            Round {wf.currentPlayerRound.roundNumber} — {getSpeakerName(debate, wf.currentPlayerRound.opponentPrompt.speakerId)}'s question
                        </p>
                        <p style={{ marginTop: '0.25rem', color: 'rgba(255,255,255,0.75)' }}>
                            {wf.currentPlayerRound.opponentPrompt.sentences.map((s) => s.text).join(" ")}
                        </p>
                        <button
                            type="button"
                            className={cn(styles.trialAnalyzeBtn, {
                                [styles.correct]: getNpcGuessState(wf.currentPlayerRound.opponentPrompt.id) === "correct",
                                [styles.wrong]: getNpcGuessState(wf.currentPlayerRound.opponentPrompt.id) === "wrong",
                            })}
                            title="Analyze this question"
                            onClick={() =>
                                setAnalysisTarget({
                                    kind: "opponent_prompt",
                                    statement: wf.currentPlayerRound!.opponentPrompt!,
                                    playerRound: wf.currentPlayerRound!,
                                })
                            }
                        >
                            <img src={magnifyingIcon} alt="Analyze" />
                        </button>
                    </div>
                </div>
            )}
            </div>
                <div className={cn(shared.scrollFadeOverlay, shared.fadeBottom)} style={{ opacity: feedbackFade.bottom ? 1 : 0 }} />
            </div>
        </div>
    );

    // -----------------------------------------------------------------------
    // Wizard panel
    // -----------------------------------------------------------------------

    const wizard = (
        <div style={{ display: 'flex', height: '100%', minHeight: 0, width: '100%', flexDirection: 'column', gap: '1rem' }}>
            <div className={styles.trialAreaTitle}>
                <h2 className={styles.trialPanelHeading}>Wizard</h2>
            </div>
            <div className={styles.trialWizardBodyWrap}>
                <p className={styles.trialWizardMainText}>
                    {wf.wizardMessage}
                </p>
            </div>
        </div>
    );

    // -----------------------------------------------------------------------
    // Interactive panel
    // -----------------------------------------------------------------------

    const renderInteractive = () => {
        switch (wf.gamePhase) {
            case "npc_speaking": {
                const npc = wf.currentNpcRound;
                if (!npc) return null;
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className={shared.trialSectionBox} style={{ fontSize: '1.875rem', lineHeight: 1.375 }}>
                            <p style={{ color: 'rgba(255,255,255,0.45)' }}>
                                {getSpeakerName(debate, npc.speakerId)}{" "}
                                speaks:
                            </p>
                            <p style={{ marginTop: '0.5rem', color: 'rgba(255,255,255,0.85)' }}>
                                {npc.statement.sentences.map((s) => s.text).join(" ")}
                            </p>
                        </div>
                    </div>
                );
            }

            case "player_choosing": {
                const playerRound = wf.currentPlayerRound;
                if (!playerRound) return null;

                // Determine analyze-button state for the opponentPrompt
                let promptGuessState: "correct" | "wrong" | null = null;
                if (playerRound.opponentPrompt) {
                    const record = fallacyGuesses.get(playerRound.roundNumber);
                    if (record && record.npcRoundId === playerRound.opponentPrompt.id) {
                        promptGuessState = record.correct ? "correct" : "wrong";
                    }
                }

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {playerRound.opponentPrompt && (
                            <div className={shared.trialSectionBox} style={{ fontSize: '1.875rem', lineHeight: 1.375 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ color: 'rgba(255,255,255,0.45)' }}>
                                            {getSpeakerName(debate, playerRound.opponentPrompt.speakerId)}'s question:
                                        </p>
                                        <p style={{ marginTop: '0.5rem', color: 'rgba(255,255,255,0.85)' }}>
                                            {playerRound.opponentPrompt.sentences.map((s) => s.text).join(" ")}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        className={cn(styles.trialAnalyzeBtn, {
                                            [styles.correct]: promptGuessState === "correct",
                                            [styles.wrong]: promptGuessState === "wrong",
                                        })}
                                        title="Analyze this statement"
                                        onClick={() =>
                                            setAnalysisTarget({
                                                kind: "opponent_prompt",
                                                statement: playerRound.opponentPrompt!,
                                                playerRound,
                                            })
                                        }
                                    >
                                        <img src={magnifyingIcon} alt="Analyze" />
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className={styles.trialChoices}>
                            {playerRound.options.map((opt, idx) => (
                                <ChoiceButton
                                    key={opt.id}
                                    label={`${String.fromCharCode(65 + idx)}. ${opt.sentences.map((s) => s.text).join(" ")}`}
                                    onClick={() =>
                                        wf.dispatch({
                                            type: "select_option",
                                            optionId: opt.id,
                                        })
                                    }
                                />
                            ))}
                        </div>
                    </div>
                );
            }

            case "player_confirming": {
                const opt = wf.selectedOption;
                if (!opt) return null;
                return (
                    <div className={shared.trialSectionBox} style={{ fontSize: '2.125rem', lineHeight: 1.375, color: 'rgba(255,255,255,0.85)' }}>
                        <p style={{ color: 'rgba(255,255,255,0.50)' }}>Your choice (full text)</p>
                        <p style={{ marginTop: '0.5rem', color: 'rgba(255,255,255,0.85)' }}>
                            {opt.sentences.map((s) => s.text).join(" ")}
                        </p>
                        <p style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.10)', paddingTop: '1rem', fontSize: '1.625rem', lineHeight: 1.375, color: 'rgba(255,255,255,0.45)' }}>
                            Go back to change your selection, or confirm to lock it
                            in. Confirming cannot be undone.
                        </p>
                    </div>
                );
            }

            case "npc_responding": {
                const response = wf.activeOpponentResponse;
                const playerRound = wf.currentPlayerRound;
                if (!response || !playerRound) return null;
                const responseGuessState = getNpcGuessState(response.statement.id);
                return (
                    <div className={shared.trialSectionBox} style={{ fontSize: '1.875rem', lineHeight: 1.375 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ color: 'rgba(255,255,255,0.45)' }}>
                                    {getSpeakerName(debate, response.statement.speakerId)}'s response:
                                </p>
                                <p style={{ marginTop: '0.5rem', color: 'rgba(255,255,255,0.85)' }}>
                                    {response.statement.sentences.map((s) => s.text).join(" ")}
                                </p>
                            </div>
                            <button
                                type="button"
                                className={cn(styles.trialAnalyzeBtn, {
                                    [styles.correct]: responseGuessState === "correct",
                                    [styles.wrong]: responseGuessState === "wrong",
                                })}
                                title="Analyze this response"
                                onClick={() =>
                                    setAnalysisTarget({
                                        kind: "opponent_response",
                                        statement: response.statement,
                                        playerRound,
                                    })
                                }
                            >
                                <img src={magnifyingIcon} alt="Analyze" />
                            </button>
                        </div>
                    </div>
                );
            }

            case "debate_complete":
                return (
                    <div className={shared.trialSectionBox} style={{ fontSize: '1.96875rem', lineHeight: 1.375, color: 'rgba(255,255,255,0.85)' }}>
                        <p>The debate is finished.</p>
                        <p style={{ marginTop: '1rem', fontSize: '1.625rem', color: 'rgba(255,255,255,0.50)' }}>
                            Final score:{" "}
                            <span
                                style={{
                                    color: wf.totalScore > 0
                                        ? '#67e8f9'
                                        : wf.totalScore < 0
                                          ? '#f87171'
                                          : 'rgba(255,255,255,0.70)',
                                }}
                            >
                                {wf.totalScore > 0 ? "+" : ""}
                                {wf.totalScore}
                            </span>{" "}
                            out of {wf.maxPossibleScore}
                        </p>
                    </div>
                );

            default:
                return null;
        }
    };

    const interactive = (
        <div className={styles.trialInteractiveBody}>
            {/* Title — fixed height, never participates in flex growth */}
            <div className={styles.trialAreaTitle}>
                <h2 className={styles.trialPanelHeading}>Interactive</h2>
            </div>

            {/* Body: fills remaining height, clips overflow so children cannot escape */}
            <div className={styles.trialInteractiveScrollWrap}>
                {/* Scroll area: grows to fill, scrolls when content is taller */}
                <div className={shared.trialScrollFadeWrap}>
                    <div className={cn(shared.scrollFadeOverlay, shared.fadeTop)} style={{ opacity: interactiveFade.top ? 1 : 0 }} />
                    <div className={styles.trialScrollArea} ref={interactiveScrollRef}>
                        {renderInteractive()}
                    </div>
                    <div className={cn(shared.scrollFadeOverlay, shared.fadeBottom)} style={{ opacity: interactiveFade.bottom ? 1 : 0 }} />
                </div>

                {/* Footer: always visible */}
                <div className={styles.trialInteractiveFooter}>
                    <div className={styles.trialFooterGrid}>
                        <button
                            type="button"
                            className={shared.trialFooterBtn}
                            disabled={!wf.canUndo}
                            onClick={wf.undo}
                        >
                            Back
                        </button>
                        <button
                            type="button"
                            className={shared.trialFooterBtn}
                            disabled={
                                interactiveFooter.submitDisabled ||
                                !interactiveFooter.onSubmit
                            }
                            onClick={() => interactiveFooter.onSubmit?.()}
                        >
                            {interactiveFooter.submitLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    // Resolve speaker name for the current modal target
    const modalSpeakerName = useMemo(() => {
        if (!analysisTarget) return "";
        if (analysisTarget.kind === "npc")
            return getSpeakerName(debate, analysisTarget.round.speakerId);
        if (analysisTarget.kind === "opponent_prompt" || analysisTarget.kind === "opponent_response")
            return getSpeakerName(debate, analysisTarget.statement.speakerId);
        return "";
    }, [analysisTarget, debate]);

    return (
        <div style={{ height: '100%', minHeight: 0, width: '100%' }}>
            <TrialLayout
                feedback={feedback}
                wizard={wizard}
                interactive={interactive}
            />
            {analysisTarget && (
                <RoundAnalysisModal
                    target={analysisTarget}
                    allFallacies={debate.logicalFallacies}
                    speakerName={modalSpeakerName}
                    canGuess={canGuess}
                    existingGuess={activeGuess}
                    onGuess={handleGuess}
                    onClose={() => setAnalysisTarget(null)}
                />
            )}
        </div>
    );
};

function ChoiceButton({
    label,
    onClick,
}: {
    label: string;
    onClick: () => void;
}) {
    return (
        <button type="button" className={styles.trialChoiceBtn} onClick={onClick}>
            <span className={styles.trialChoiceBtnInner}>{label}</span>
        </button>
    );
}

export default TrialUI;
