import React, { useMemo } from "react";
import type { DebateScenarioJson } from "../types/debateEntities";
import sampleDebateJson from "../data/debates/sample-debate.json";
import TrialLayout from "./trial/TrialLayout";
import { useTrialRoundWorkflow } from "./trial/useTrialRoundWorkflow";

const sampleDebate = sampleDebateJson as unknown as DebateScenarioJson;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const TrialUI: React.FC = () => {
    const wf = useTrialRoundWorkflow(sampleDebate);

    // Footer action state derived from game phase
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
        <div className="trial-panel-content">
            <div className="trial-area-title">
                <h2 className="trial-panel-heading">Feedback</h2>
            </div>
            <div className="trial-feedback-scroll">

            {wf.scenario.introduction && (
                <div className="trial-section-box" style={{ fontSize: '1.875rem', lineHeight: 1.375, color: 'rgba(255,255,255,0.80)' }}>
                    <p style={{ color: 'rgba(255,255,255,0.50)' }}>Introduction</p>
                    <p style={{ marginTop: '0.5rem', color: 'rgba(255,255,255,0.90)' }}>{wf.scenario.introduction}</p>
                </div>
            )}

            {/* Round counter */}
            {wf.gamePhase !== "debate_complete" && wf.currentRound && (
                <div className="trial-section-box">
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
            <div className="trial-section-box">
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

            {/* History of completed player rounds */}
            {wf.completedRounds.length > 0 && (
                <div className="trial-section-box" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <p style={{ color: 'rgba(255,255,255,0.50)' }}>Your choices</p>
                    {wf.completedRounds.map((cr) => {
                        const round = wf.scenario.rounds.find(
                            (r) => r.id === cr.roundId,
                        );
                        if (!round || round.kind !== "player") return null;
                        const opt = round.options.find((o) => o.id === cr.optionId);
                        if (!opt) return null;
                        return (
                            <div
                                key={cr.roundId}
                                className="trial-history-entry"
                            >
                                <p style={{ color: 'rgba(255,255,255,0.45)' }}>
                                    Round {cr.roundNumber} —{" "}
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
                            </div>
                        );
                    })}
                </div>
            )}
            </div>
        </div>
    );

    // -----------------------------------------------------------------------
    // Wizard panel
    // -----------------------------------------------------------------------

    const wizard = (
        <div style={{ display: 'flex', height: '100%', minHeight: 0, width: '100%', flexDirection: 'column', gap: '1rem' }}>
            <div className="trial-area-title">
                <h2 className="trial-panel-heading">Wizard</h2>
            </div>
            <div className="trial-wizard-body-wrap">
                <p className="trial-wizard-main-text">
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
                        <div className="trial-section-box" style={{ fontSize: '1.875rem', lineHeight: 1.375 }}>
                            <p style={{ color: 'rgba(255,255,255,0.45)' }}>
                                {npc.speakerId === "barnaby" ? "Barnaby" : npc.speakerId}{" "}
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
                return (
                    <div className="trial-choices">
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
                );
            }

            case "player_confirming": {
                const opt = wf.selectedOption;
                if (!opt) return null;
                return (
                    <div className="trial-section-box" style={{ fontSize: '2.125rem', lineHeight: 1.375, color: 'rgba(255,255,255,0.85)' }}>
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
                if (!response) return null;
                return (
                    <div className="trial-section-box" style={{ fontSize: '1.875rem', lineHeight: 1.375 }}>
                        <p style={{ color: 'rgba(255,255,255,0.45)' }}>Barnaby's response:</p>
                        <p style={{ marginTop: '0.5rem', color: 'rgba(255,255,255,0.85)' }}>
                            {response.statement.sentences.map((s) => s.text).join(" ")}
                        </p>
                    </div>
                );
            }

            case "debate_complete":
                return (
                    <div className="trial-section-box" style={{ fontSize: '1.96875rem', lineHeight: 1.375, color: 'rgba(255,255,255,0.85)' }}>
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
        <div className="trial-interactive-body">
            {/* Title — fixed height, never participates in flex growth */}
            <div className="trial-area-title">
                <h2 className="trial-panel-heading">Interactive</h2>
            </div>

            {/* Body: fills remaining height, clips overflow so children cannot escape */}
            <div className="trial-interactive-scroll-wrap">
                {/* Scroll area: grows to fill, scrolls when content is taller */}
                <div className="trial-scroll-area">
                    {renderInteractive()}
                </div>

                {/* Footer: always visible */}
                <div className="trial-interactive-footer">
                    <div className="trial-footer-grid">
                        <button
                            type="button"
                            className="trial-footer-btn"
                            disabled={!wf.canUndo}
                            onClick={wf.undo}
                        >
                            Back
                        </button>
                        <button
                            type="button"
                            className="trial-footer-btn"
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

    return (
        <div style={{ height: '100%', minHeight: 0, width: '100%' }}>
            <TrialLayout
                feedback={feedback}
                wizard={wizard}
                interactive={interactive}
            />
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
        <button type="button" className="trial-choice-btn" onClick={onClick}>
            <span className="trial-choice-btn-inner">{label}</span>
        </button>
    );
}

export default TrialUI;
