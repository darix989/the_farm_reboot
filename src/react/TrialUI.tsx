import React, { useMemo } from "react";
import type { DebateScenarioJson } from "../types/debateEntities";
import sampleDebateJson from "../data/debates/sample-debate.json";
import TrialLayout from "./trial/TrialLayout";
import type { EvidenceCategory } from "./trial/useTrialRoundWorkflow";
import { statementTitle, useTrialRoundWorkflow } from "./trial/useTrialRoundWorkflow";

const sampleDebate = sampleDebateJson as unknown as DebateScenarioJson;

const sectionBox =
    "rounded-lg border border-white/25 bg-black/30 p-4 md:p-5 ring-1 ring-white/5";

const btnClass =
    "rounded-lg border-2 border-white/35 bg-black/45 px-9 py-6 text-left text-[1.96875rem] leading-snug text-white/90 shadow-sm transition-colors hover:border-cyan-500/70 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/35 disabled:hover:text-white/90";

const btnRowClass = `${btnClass} w-full`;

/** Footer actions: equal slots in a centered row with gaps. */
const btnFooterActionClass =
    "box-border flex min-h-[5.5rem] w-full min-w-0 items-center justify-center whitespace-normal rounded-lg border-2 border-white/35 bg-black/45 px-2 py-3 text-center text-[clamp(0.9375rem,1.35vw,1.375rem)] font-medium leading-snug text-white/90 shadow-sm transition-colors hover:border-cyan-500/70 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/35 disabled:hover:text-white/90 sm:px-3 sm:py-4 sm:text-[clamp(1rem,1.5vw,1.625rem)]";

const interactiveScrollClass =
    "min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]";

const TrialUI: React.FC = () => {
    const wf = useTrialRoundWorkflow(sampleDebate);

    const interactiveFooter = useMemo(() => {
        const canStepBack =
            wf.canUndo ||
            wf.canUndoConstructiveSummary ||
            wf.canUndoFinalStatementConfirm;

        let submitLabel = "Submit";
        let submitDisabled = true;
        let onSubmit: (() => void) | undefined;

        if (wf.gamePhase === "assembly" && wf.step.kind === "evidence_category") {
            submitLabel = "Submit evidences";
            submitDisabled = !wf.canSubmitEvidences;
            onSubmit = () => wf.dispatch({ type: "submit_evidences" });
        } else if (
            wf.gamePhase === "assembly" &&
            wf.step.kind === "final_statement_confirm" &&
            wf.finalChoice
        ) {
            submitLabel = "Submit closing statement";
            submitDisabled = false;
            onSubmit = () => wf.dispatch({ type: "submit_final_closing" });
        } else if (
            wf.gamePhase === "constructive_opponent" &&
            wf.constructiveStep.kind === "constructive_summary"
        ) {
            submitLabel = "Submit";
            submitDisabled = false;
            onSubmit = () =>
                wf.dispatch({ type: "continue_after_constructive" });
        } else if (
            wf.gamePhase === "assembly" &&
            wf.step.kind === "round_complete"
        ) {
            submitLabel = wf.hasMoreAssemblyRoundsAfterComplete
                ? "Next assembly round"
                : "Finish debate";
            submitDisabled = false;
            onSubmit = () =>
                wf.dispatch({ type: "continue_after_round_complete" });
        }

        return {
            canStepBack,
            submitLabel,
            submitDisabled,
            onSubmit,
        };
    }, [
        wf.gamePhase,
        wf.constructiveStep,
        wf.step,
        wf.finalChoice,
        wf.canSubmitEvidences,
        wf.hasMoreAssemblyRoundsAfterComplete,
        wf.canUndo,
        wf.canUndoConstructiveSummary,
        wf.canUndoFinalStatementConfirm,
        wf.dispatch,
    ]);

    const opponentOpeningById = (id: string | null) =>
        id ? wf.scenario.opponentOpening.find((o) => o.id === id) : undefined;

    const sentenceListClass =
        "mt-2 list-inside list-decimal space-y-2 text-white/85 [list-style-position:outside] pl-1";

    /** Target + evidences are still being picked; preview lives in the wizard until evidences are submitted. */
    const isAssemblyEvidenceDraftPhase =
        wf.gamePhase === "assembly" &&
        (wf.step.kind === "evidence_category" ||
            wf.step.kind === "evidence_statements" ||
            wf.step.kind === "evidence_sentences" ||
            wf.step.kind === "evidence_facts" ||
            wf.step.kind === "evidence_fact_sentences" ||
            wf.step.kind === "evidence_fallacies" ||
            wf.step.kind === "evidence_fallacy_use_to");

    const showAssemblyPreviewInFeedback =
        !isAssemblyEvidenceDraftPhase &&
        wf.gamePhase === "assembly" &&
        (wf.targetSummary != null || wf.evidences.length > 0);

    const renderAssemblyPreview = (bodyTextClass: string) => (
        <>
            {wf.targetSummary && (
                <div className={`${sectionBox} ${bodyTextClass} leading-snug`}>
                    <p className="text-white/50">Target</p>
                    <p className="text-white/90">{wf.targetSummary}</p>
                </div>
            )}
            {wf.evidences.length > 0 && (
                <div className={`${sectionBox} ${bodyTextClass} leading-snug`}>
                    <p className="text-white/50">
                        Evidence ({wf.evidences.length})
                    </p>
                    <ul className="mt-3 list-inside list-disc space-y-2.5 border-t border-white/10 pt-3 text-white/85">
                        {wf.evidenceSummaries.map((e) => (
                            <li key={e.key}>{e.text}</li>
                        ))}
                    </ul>
                </div>
            )}
        </>
    );

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
            {wf.gamePhase === "assembly" && (
                <div className={sectionBox}>
                    <p className="text-[2.125rem] leading-snug text-white/85">
                        <span className="text-white/50">Assembly round </span>
                        <span className="text-white/90">
                            {wf.assemblyRoundIndex + 1} / {wf.assemblyRoundCount}
                        </span>
                    </p>
                </div>
            )}
            {wf.gamePhase === "constructive_opponent" &&
                wf.constructiveStep.kind === "choose_player_constructive" &&
                wf.scenario.playerSide === "opposition" &&
                wf.randomOpponentOpeningId && (
                    <div className={`${sectionBox} text-[1.875rem] leading-snug`}>
                        <p className="text-white/50">
                            1. Proposition opening (drawn first)
                        </p>
                        <ol className={sentenceListClass}>
                            {opponentOpeningById(
                                wf.randomOpponentOpeningId,
                            )?.sentences.map((s) => (
                                <li key={s.id} className="pl-1">
                                    {s.text}
                                </li>
                            ))}
                        </ol>
                        <p className="mt-4 text-[1.625rem] leading-snug text-white/45">
                            You will respond with your opposition constructive
                            next.
                        </p>
                    </div>
                )}
            {wf.chosenPlayerConstructive && wf.chosenOpponentOpeningId && (
                <div className={`${sectionBox} text-[1.875rem] leading-snug`}>
                    {wf.scenario.playerSide === "proposition" ? (
                        <>
                            <p className="text-white/50">
                                1. Your constructive (proposition)
                            </p>
                            <ol className={sentenceListClass}>
                                {wf.chosenPlayerConstructive.sentences.map((s) => (
                                    <li key={s.id} className="pl-1">
                                        {s.text}
                                    </li>
                                ))}
                            </ol>
                            <p className="mt-6 text-white/50">
                                2. Opposition opening
                            </p>
                            <ol className={sentenceListClass}>
                                {opponentOpeningById(
                                    wf.chosenOpponentOpeningId,
                                )?.sentences.map((s) => (
                                    <li key={s.id} className="pl-1">
                                        {s.text}
                                    </li>
                                ))}
                            </ol>
                        </>
                    ) : (
                        <>
                            <p className="text-white/50">
                                1. Proposition opening
                            </p>
                            <ol className={sentenceListClass}>
                                {opponentOpeningById(
                                    wf.chosenOpponentOpeningId,
                                )?.sentences.map((s) => (
                                    <li key={s.id} className="pl-1">
                                        {s.text}
                                    </li>
                                ))}
                            </ol>
                            <p className="mt-6 text-white/50">
                                2. Your constructive (opposition)
                            </p>
                            <ol className={sentenceListClass}>
                                {wf.chosenPlayerConstructive.sentences.map((s) => (
                                    <li key={s.id} className="pl-1">
                                        {s.text}
                                    </li>
                                ))}
                            </ol>
                        </>
                    )}
                </div>
            )}
            {wf.roundKind && wf.gamePhase === "assembly" && (
                <div className={sectionBox}>
                    <p className="text-[2.125rem] leading-snug text-white/85">
                        <span className="text-white/50">Round: </span>
                        <span className="capitalize">{wf.roundKind}</span>
                    </p>
                </div>
            )}
            {showAssemblyPreviewInFeedback &&
                renderAssemblyPreview("text-[2.125rem]")}
            {wf.finalChoice && (
                <div
                    className={`${sectionBox} shrink-0 text-[2.125rem] leading-snug ring-cyan-500/20`}
                >
                    <p className="text-white/50">Closing statement</p>
                    <ol className={sentenceListClass}>
                        {wf.finalChoice.sentences.map((s) => (
                            <li key={s.id} className="pl-1">
                                {s.text}
                            </li>
                        ))}
                    </ol>
                    {wf.finalAssembledChoice != null && (
                        <p className="mt-3 border-t border-white/10 pt-3 text-[1.875rem] text-white/60">
                            Impact: {wf.finalAssembledChoice.impact}
                        </p>
                    )}
                </div>
            )}
        </div>
    );

    const wizard = (
        <div className="box-border flex h-full max-w-full min-h-0 min-w-0 w-full flex-col gap-0 overflow-hidden">
            <div className="trial-area-title box-border flex h-[10%] max-h-[10%] min-h-0 shrink-0 flex-col justify-center overflow-hidden rounded-lg border border-white/25 bg-black/35">
                <h2 className="text-4xl font-semibold uppercase tracking-wide text-cyan-400/90">
                    Wizard
                </h2>
            </div>
            {/*
              Grid (not flex + h-1/2): equal 45%/45% of column inside this 90% band; minmax(0,1fr) keeps
              rows from growing past half when instruction text is long, so the bottom draft area is not squeezed.
            */}
            <div className="box-border grid h-[90%] max-h-[90%] min-h-0 min-w-0 shrink-0 grid-cols-1 overflow-hidden rounded-md border border-white/10 [grid-template-rows:minmax(0,1fr)_minmax(0,1fr)]">
                <div className="flex min-h-0 min-w-0 flex-col overflow-hidden border-b border-white/15">
                    <div className="trial-wizard-body-wrap h-full min-h-0">
                        <p className="trial-wizard-main-text text-[1.96875rem] leading-relaxed text-white/85">
                            {wf.wizardMessage}
                        </p>
                    </div>
                </div>
                <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
                    {isAssemblyEvidenceDraftPhase &&
                    (wf.targetSummary != null || wf.evidences.length > 0) ? (
                        <div className="h-full min-h-0 overflow-y-auto overscroll-contain px-2 py-3 [scrollbar-gutter:stable] md:px-3">
                            <p className="mb-2 shrink-0 text-[1.125rem] font-medium uppercase tracking-wide text-white/45">
                                Your assembly (draft)
                            </p>
                            <div className="flex flex-col gap-3">
                                {renderAssemblyPreview(
                                    "text-[clamp(1rem,2.8vw,1.5rem)]",
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );

    const renderAssemblyInteractive = () => {
        const { step } = wf;

        switch (step.kind) {
            case "round_kind":
                return (
                    <div className="flex flex-col gap-6">
                        <ChoiceButton
                            label="Crossfire"
                            onClick={() =>
                                wf.dispatch({
                                    type: "select_round",
                                    value: "crossfire",
                                })
                            }
                        />
                        <ChoiceButton
                            label="Rebuttal"
                            onClick={() =>
                                wf.dispatch({
                                    type: "select_round",
                                    value: "rebuttal",
                                })
                            }
                        />
                    </div>
                );
            case "target_side":
                return (
                    <div className="flex flex-col gap-6">
                        <ChoiceButton
                            label="Proposition"
                            onClick={() =>
                                wf.dispatch({
                                    type: "select_target_side",
                                    side: "proposition",
                                })
                            }
                        />
                        <ChoiceButton
                            label="Opposition"
                            onClick={() =>
                                wf.dispatch({
                                    type: "select_target_side",
                                    side: "opposition",
                                })
                            }
                        />
                    </div>
                );
            case "target_statements":
                return (
                    <div className="flex flex-col gap-6">
                        {wf.statementsForSide(step.side).map((st) => (
                            <ChoiceButton
                                key={st.id}
                                label={statementTitle(st)}
                                onClick={() =>
                                    wf.dispatch({
                                        type: "select_target_statement",
                                        statementId: st.id,
                                    })
                                }
                            />
                        ))}
                    </div>
                );
            case "target_sentences": {
                const st = wf.getStatement(step.side, step.statementId);
                if (!st) return null;
                return (
                    <div className="flex flex-col gap-6">
                        {st.sentences.map((s) => (
                            <ChoiceButton
                                key={s.id}
                                label={s.text}
                                onClick={() =>
                                    wf.dispatch({
                                        type: "select_target_sentence",
                                        sentenceId: s.id,
                                    })
                                }
                            />
                        ))}
                    </div>
                );
            }
            case "evidence_category":
                return (
                    <div className="flex flex-col gap-6">
                        <ChoiceButton
                            label="Proposition"
                            onClick={() =>
                                wf.dispatch({
                                    type: "select_evidence_category",
                                    category:
                                        "proposition" as EvidenceCategory,
                                })
                            }
                        />
                        <ChoiceButton
                            label="Opposition"
                            onClick={() =>
                                wf.dispatch({
                                    type: "select_evidence_category",
                                    category:
                                        "opposition" as EvidenceCategory,
                                })
                            }
                        />
                        <ChoiceButton
                            label="Facts"
                            onClick={() =>
                                wf.dispatch({
                                    type: "select_evidence_category",
                                    category: "facts" as EvidenceCategory,
                                })
                            }
                        />
                        <ChoiceButton
                            label="Logical fallacies"
                            onClick={() =>
                                wf.dispatch({
                                    type: "select_evidence_category",
                                    category:
                                        "logical_fallacies" as EvidenceCategory,
                                })
                            }
                        />
                    </div>
                );
            case "evidence_statements":
                return (
                    <div className="flex flex-col gap-6">
                        {wf.statementsForSide(step.side).map((st) => (
                            <ChoiceButton
                                key={st.id}
                                label={statementTitle(st)}
                                onClick={() =>
                                    wf.dispatch({
                                        type: "select_evidence_statement",
                                        statementId: st.id,
                                    })
                                }
                            />
                        ))}
                    </div>
                );
            case "evidence_sentences": {
                const st = wf.getStatement(step.side, step.statementId);
                if (!st) return null;
                return (
                    <div className="flex flex-col gap-6">
                        {st.sentences.map((s) => (
                            <ChoiceButton
                                key={s.id}
                                label={s.text}
                                onClick={() =>
                                    wf.dispatch({
                                        type: "select_evidence_sentence",
                                        sentenceId: s.id,
                                    })
                                }
                            />
                        ))}
                    </div>
                );
            }
            case "evidence_facts":
                return (
                    <div className="flex flex-col gap-6">
                        {wf.facts.map((fact) => (
                            <ChoiceButton
                                key={fact.id}
                                label={fact.sentences[0]?.text ?? fact.id}
                                onClick={() =>
                                    wf.dispatch({
                                        type: "select_evidence_fact",
                                        factId: fact.id,
                                    })
                                }
                            />
                        ))}
                    </div>
                );
            case "evidence_fact_sentences": {
                const fact = wf.getFact(step.factId);
                if (!fact) return null;
                return (
                    <div className="flex flex-col gap-6">
                        {fact.sentences.map((s) => (
                            <ChoiceButton
                                key={s.id}
                                label={s.text}
                                onClick={() =>
                                    wf.dispatch({
                                        type: "select_evidence_fact_sentence",
                                        sentenceId: s.id,
                                    })
                                }
                            />
                        ))}
                    </div>
                );
            }
            case "evidence_fallacies":
                return (
                    <div className="flex flex-col gap-6">
                        {wf.logicalFallacies.map((f) => (
                            <ChoiceButton
                                key={f.id}
                                label={`${f.label} — ${f.description}`}
                                onClick={() =>
                                    wf.dispatch({
                                        type: "select_evidence_fallacy",
                                        fallacyId: f.id,
                                    })
                                }
                            />
                        ))}
                    </div>
                );
            case "evidence_fallacy_use_to":
                return (
                    <div className="flex flex-col gap-6">
                        <ChoiceButton
                            label="Apply — use this fallacy to frame how the argument works"
                            onClick={() =>
                                wf.dispatch({
                                    type: "select_fallacy_use_to",
                                    useTo: "apply",
                                })
                            }
                        />
                        <ChoiceButton
                            label="Spot — call out this fallacy in the other side’s material"
                            onClick={() =>
                                wf.dispatch({
                                    type: "select_fallacy_use_to",
                                    useTo: "spot",
                                })
                            }
                        />
                    </div>
                );
            case "final_statements":
                return (
                    <div className="flex flex-col gap-6">
                        {wf.finalOptions.map((st) => (
                            <ChoiceButton
                                key={st.id}
                                label={statementTitle(st)}
                                onClick={() =>
                                    wf.dispatch({
                                        type: "select_final",
                                        statementId: st.id,
                                    })
                                }
                            />
                        ))}
                    </div>
                );
            case "final_statement_confirm": {
                const closing = wf.finalChoice;
                if (!closing) return null;
                return (
                    <div className="flex flex-col gap-6">
                        <div
                            className={`${sectionBox} text-[2.125rem] leading-snug text-white/85`}
                        >
                            <p className="text-white/50">
                                Your closing statement (full text)
                            </p>
                            <ol className={sentenceListClass}>
                                {closing.sentences.map((s) => (
                                    <li key={s.id} className="pl-1">
                                        {s.text}
                                    </li>
                                ))}
                            </ol>
                            <p className="mt-6 border-t border-white/10 pt-4 text-[1.625rem] leading-snug text-white/45">
                                Feedback shows the same text. Submit locks in
                                this closing and cannot be undone.
                            </p>
                        </div>
                    </div>
                );
            }
            case "round_complete":
                return (
                    <div className="flex flex-col gap-6">
                        <div
                            className={`${sectionBox} text-[2.125rem] leading-snug text-white/80`}
                        >
                            <p>
                                {wf.hasMoreAssemblyRoundsAfterComplete
                                    ? "This assembly round is complete."
                                    : "This was the last assembly round."}
                            </p>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const renderInteractive = () => {
        if (wf.gamePhase === "constructive_opponent") {
            if (wf.constructiveStep.kind === "choose_player_constructive") {
                return (
                    <div className="flex flex-col gap-6">
                        {wf.playerConstructiveChoices.map((p) => (
                            <ChoiceButton
                                key={p.id}
                                label={statementTitle(p)}
                                onClick={() =>
                                    wf.dispatch({
                                        type: "select_player_constructive",
                                        statementId: p.id,
                                    })
                                }
                            />
                        ))}
                    </div>
                );
            }
            const opening = wf.chosenPlayerConstructive;
            if (!opening) return null;
            return (
                <div className="flex flex-col gap-6">
                    <div
                        className={`${sectionBox} text-[2.125rem] leading-snug text-white/85`}
                    >
                        <p className="text-white/50">
                            Your opening (full statement)
                        </p>
                        <ol className={sentenceListClass}>
                            {opening.sentences.map((s) => (
                                <li key={s.id} className="pl-1">
                                    {s.text}
                                </li>
                            ))}
                        </ol>
                        <p className="mt-6 border-t border-white/10 pt-4 text-[1.625rem] leading-snug text-white/45">
                            The opposition response is in Feedback. Submit locks
                            in your opening and cannot be undone.
                        </p>
                    </div>
                </div>
            );
        }

        if (wf.gamePhase === "debate_complete") {
            return (
                <div
                    className={`${sectionBox} text-[1.96875rem] leading-snug text-white/85`}
                >
                    <p>The debate is finished.</p>
                </div>
            );
        }

        return renderAssemblyInteractive();
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
                <div className={`flex min-h-0 min-w-0 flex-1 flex-col gap-4`}>
                    <div className={interactiveScrollClass}>
                        {renderInteractive()}
                    </div>
                    <div className="flex w-full min-w-0 shrink-0 justify-center border-t border-white/15 pt-4">
                        <div className="grid w-full max-w-4xl grid-cols-2 items-stretch gap-4 px-2 sm:gap-6 sm:px-4 md:gap-8">
                            <button
                                type="button"
                                className={btnFooterActionClass}
                                disabled={!interactiveFooter.canStepBack}
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
            {label}
        </button>
    );
}

export default TrialUI;
