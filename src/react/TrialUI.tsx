import React, { useMemo } from "react";
import type { DebateScenarioJson } from "../types/debateEntities";
import sampleDebateJson from "../data/debates/sample-debate.json";
import TrialLayout from "./trial/TrialLayout";
import { useTrialRoundWorkflow } from "./trial/useTrialRoundWorkflow";

const sampleDebate = sampleDebateJson as unknown as DebateScenarioJson;

// ---------------------------------------------------------------------------
// Shared style tokens
// ---------------------------------------------------------------------------

const sectionBox =
    "rounded-lg border border-white/25 bg-black/30 p-4 md:p-5 ring-1 ring-white/5";

const btnRowClass =
    "w-full min-w-0 max-w-full overflow-hidden rounded-lg border-2 border-white/35 bg-black/45 px-9 py-6 text-left text-[1.96875rem] leading-snug text-white/90 shadow-sm transition-colors hover:border-cyan-500/70 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/35 disabled:hover:text-white/90";

const btnFooterActionClass =
    "box-border flex min-h-[5.5rem] w-full min-w-0 items-center justify-center whitespace-normal rounded-lg border-2 border-white/35 bg-black/45 px-2 py-3 text-center text-[clamp(0.9375rem,1.35vw,1.375rem)] font-medium leading-snug text-white/90 shadow-sm transition-colors hover:border-cyan-500/70 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/35 disabled:hover:text-white/90 sm:px-3 sm:py-4 sm:text-[clamp(1rem,1.5vw,1.625rem)]";

const interactiveScrollClass =
    "min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]";

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
        <div className="flex flex-col gap-4">
            <div className="trial-area-title shrink-0 rounded-lg border border-white/25 bg-black/35">
                <h2 className="text-4xl font-semibold uppercase tracking-wide text-cyan-400/90">
                    Feedback
                </h2>
            </div>

            {wf.scenario.introduction && (
                <div className={`${sectionBox} text-[1.875rem] leading-snug text-white/80`}>
                    <p className="text-white/50">Introduction</p>
                    <p className="mt-2 text-white/90">{wf.scenario.introduction}</p>
                </div>
            )}

            {/* Round counter */}
            {wf.gamePhase !== "debate_complete" && wf.currentRound && (
                <div className={sectionBox}>
                    <p className="text-[2.125rem] leading-snug text-white/85">
                        <span className="text-white/50">Round </span>
                        <span className="text-white/90">
                            {wf.currentRound.roundNumber} / {wf.totalRounds}
                        </span>
                        <span className="ml-4 capitalize text-white/50 text-[1.625rem]">
                            {wf.currentRound.type.replace(/_/g, " ")}
                        </span>
                    </p>
                </div>
            )}

            {/* Score */}
            <div className={sectionBox}>
                <p className="text-[2.125rem] leading-snug text-white/85">
                    <span className="text-white/50">Score </span>
                    <span
                        className={
                            wf.totalScore > 0
                                ? "text-cyan-300"
                                : wf.totalScore < 0
                                  ? "text-red-400"
                                  : "text-white/90"
                        }
                    >
                        {wf.totalScore > 0 ? "+" : ""}
                        {wf.totalScore}
                    </span>
                    <span className="ml-3 text-[1.375rem] text-white/35">
                        / {wf.maxPossibleScore}
                    </span>
                </p>
            </div>

            {/* History of completed player rounds */}
            {wf.completedRounds.length > 0 && (
                <div className={`${sectionBox} flex flex-col gap-3`}>
                    <p className="text-white/50">Your choices</p>
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
                                className="border-t border-white/10 pt-3 text-[1.625rem] leading-snug"
                            >
                                <p className="text-white/45">
                                    Round {cr.roundNumber} —{" "}
                                    <span
                                        className={
                                            opt.quality === "effective"
                                                ? "text-cyan-400"
                                                : opt.quality === "logical_fallacy"
                                                  ? "text-red-400"
                                                  : "text-white/50"
                                        }
                                    >
                                        {opt.quality === "effective"
                                            ? "Effective"
                                            : opt.quality === "logical_fallacy"
                                              ? "Logical fallacy"
                                              : "Ineffective"}
                                    </span>{" "}
                                    <span
                                        className={
                                            cr.impact > 0
                                                ? "text-cyan-300"
                                                : cr.impact < 0
                                                  ? "text-red-400"
                                                  : "text-white/40"
                                        }
                                    >
                                        ({cr.impact > 0 ? "+" : ""}
                                        {cr.impact})
                                    </span>
                                </p>
                                <p className="mt-1 text-white/75">
                                    {opt.sentences[0]?.text ?? ""}
                                </p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    // -----------------------------------------------------------------------
    // Wizard panel
    // -----------------------------------------------------------------------

    const wizard = (
        <div className="box-border flex h-full max-w-full min-h-0 min-w-0 w-full flex-col overflow-hidden">
            <div className="trial-area-title box-border flex h-[10%] max-h-[10%] min-h-0 shrink-0 flex-col justify-center overflow-hidden rounded-lg border border-white/25 bg-black/35">
                <h2 className="text-4xl font-semibold uppercase tracking-wide text-cyan-400/90">
                    Wizard
                </h2>
            </div>
            <div className="box-border flex h-[90%] max-h-[90%] min-h-0 w-full flex-col overflow-hidden">
                <div className="trial-wizard-body-wrap h-full min-h-0 overflow-y-auto overscroll-contain px-2 py-3 [scrollbar-gutter:stable] md:px-3">
                    <p className="trial-wizard-main-text text-[1.96875rem] leading-relaxed text-white/85">
                        {wf.wizardMessage}
                    </p>

                    {/* Show opponent prompt in wizard when it exists */}
                    {wf.gamePhase === "player_choosing" &&
                        wf.currentPlayerRound?.opponentPrompt && (
                            <div className={`${sectionBox} mt-4 text-[1.75rem] leading-snug`}>
                                <p className="text-white/45">Barnaby asks:</p>
                                <p className="mt-2 text-white/85">
                                    {wf.currentPlayerRound.opponentPrompt.sentences
                                        .map((s) => s.text)
                                        .join(" ")}
                                </p>
                            </div>
                        )}

                    {/* Show chosen option full text in confirming phase */}
                    {wf.gamePhase === "player_confirming" && wf.selectedOption && (
                        <div className={`${sectionBox} mt-4 text-[1.75rem] leading-snug`}>
                            <p className="text-white/45">Your statement</p>
                            <p className="mt-2 text-white/85">
                                {wf.selectedOption.sentences.map((s) => s.text).join(" ")}
                            </p>
                        </div>
                    )}

                    {/* Show NPC response in npc_responding phase */}
                    {wf.gamePhase === "npc_responding" &&
                        wf.activeOpponentResponse && (
                            <div className={`${sectionBox} mt-4 text-[1.75rem] leading-snug`}>
                                <p className="text-white/45">Barnaby responds:</p>
                                <p className="mt-2 text-white/85">
                                    {wf.activeOpponentResponse.statement.sentences
                                        .map((s) => s.text)
                                        .join(" ")}
                                </p>
                            </div>
                        )}
                </div>
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
                    <div className="flex flex-col gap-4">
                        <div className={`${sectionBox} text-[1.875rem] leading-snug`}>
                            <p className="text-white/45">
                                {npc.speakerId === "barnaby" ? "Barnaby" : npc.speakerId}{" "}
                                speaks:
                            </p>
                            <p className="mt-2 text-white/85">
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
                    <div className="flex flex-col gap-6">
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
                    <div className={`${sectionBox} text-[2.125rem] leading-snug text-white/85`}>
                        <p className="text-white/50">Your choice (full text)</p>
                        <p className="mt-2 text-white/85">
                            {opt.sentences.map((s) => s.text).join(" ")}
                        </p>
                        <p className="mt-6 border-t border-white/10 pt-4 text-[1.625rem] leading-snug text-white/45">
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
                    <div className={`${sectionBox} text-[1.875rem] leading-snug`}>
                        <p className="text-white/45">Barnaby's response:</p>
                        <p className="mt-2 text-white/85">
                            {response.statement.sentences.map((s) => s.text).join(" ")}
                        </p>
                    </div>
                );
            }

            case "debate_complete":
                return (
                    <div className={`${sectionBox} text-[1.96875rem] leading-snug text-white/85`}>
                        <p>The debate is finished.</p>
                        <p className="mt-4 text-[1.625rem] text-white/50">
                            Final score:{" "}
                            <span
                                className={
                                    wf.totalScore > 0
                                        ? "text-cyan-300"
                                        : wf.totalScore < 0
                                          ? "text-red-400"
                                          : "text-white/70"
                                }
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
        <div className="flex h-full min-h-0 flex-col gap-4">
            <div className="trial-area-title shrink-0 rounded-lg border border-white/25 bg-black/35">
                <h2 className="text-4xl font-semibold uppercase tracking-wide text-cyan-400/90">
                    Interactive
                </h2>
            </div>
            <div
                className={`${sectionBox} flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-3 md:p-4`}
            >
                <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
                    <div className={interactiveScrollClass}>
                        {renderInteractive()}
                    </div>
                    <div className="flex w-full min-w-0 shrink-0 justify-center border-t border-white/15 pt-4">
                        <div className="grid w-full max-w-4xl grid-cols-2 items-stretch gap-4 px-2 sm:gap-6 sm:px-4 md:gap-8">
                            <button
                                type="button"
                                className={btnFooterActionClass}
                                disabled={!wf.canUndo}
                                onClick={wf.undo}
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                className={btnFooterActionClass}
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
        </div>
    );

    return (
        <div className="h-full min-h-0 w-full">
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
        <button type="button" className={btnRowClass} onClick={onClick}>
            <span className="block min-w-0 truncate">{label}</span>
        </button>
    );
}

export default TrialUI;
