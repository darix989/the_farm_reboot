import React from "react";
import type { DebateScenarioJson } from "../types/debateEntities";
import sampleDebateJson from "../data/debates/sample-debate.json";
import { Trial } from "../phaser/scenes/Trial";
import { GameManager } from "../utils/gameManager";
import TrialLayout from "./trial/TrialLayout";
import type { EvidenceCategory } from "./trial/useTrialRoundWorkflow";
import { statementTitle, useTrialRoundWorkflow } from "./trial/useTrialRoundWorkflow";

const sampleDebate = sampleDebateJson as unknown as DebateScenarioJson;

const sectionBox =
    "rounded-lg border border-white/25 bg-black/30 p-4 md:p-5 ring-1 ring-white/5";

const btnClass =
    "rounded-lg border-2 border-white/35 bg-black/45 px-9 py-6 text-left text-[2.625rem] leading-snug text-white/90 shadow-sm transition-colors hover:border-cyan-500/70 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/35 disabled:hover:text-white/90";

const btnRowClass = `${btnClass} w-full`;

const TrialUI: React.FC = () => {
    const wf = useTrialRoundWorkflow(sampleDebate);

    const handleGameOver = () => {
        const scene = GameManager.getCurrentScene() as Trial;
        if (scene?.gameOver) {
            scene.gameOver();
        } else if (scene) {
            scene.scene.start("GameOver");
        }
    };

    const opponentOpeningById = (id: string | null) =>
        id ? wf.scenario.opponentOpening.find((o) => o.id === id) : undefined;

    const sentenceListClass =
        "mt-2 list-inside list-decimal space-y-2 text-white/85 [list-style-position:outside] pl-1";

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
            {wf.targetSummary && (
                <div className={`${sectionBox} text-[2.125rem] leading-snug`}>
                    <p className="text-white/50">Target</p>
                    <p className="text-white/90">{wf.targetSummary}</p>
                </div>
            )}
            {wf.evidences.length > 0 && (
                <div className={`${sectionBox} text-[2.125rem] leading-snug`}>
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
            {wf.roundComplete && wf.finalChoice && (
                <div
                    className={`${sectionBox} shrink-0 text-[2.125rem] leading-snug ring-cyan-500/20`}
                >
                    <p className="text-white/50">Final choice</p>
                    <p className="text-white/90">
                        {wf.finalChoice.sentences[0]?.text ?? wf.finalChoice.id}
                    </p>
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
        <div className="flex h-full max-w-full min-h-0 min-w-0 w-full flex-col gap-4 overflow-hidden">
            <div className="trial-area-title shrink-0 rounded-lg border border-white/25 bg-black/35">
                <h2 className="text-4xl font-semibold uppercase tracking-wide text-cyan-400/90">
                    Wizard
                </h2>
            </div>
            <div className="trial-wizard-body-wrap">
                <p className="trial-wizard-main-text text-[2.625rem] leading-relaxed text-white/85">
                    {wf.wizardMessage}
                </p>
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
                    <div className="flex flex-col gap-6 overflow-y-auto">
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
                    <div className="flex flex-col gap-6 overflow-y-auto">
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
                    <div className="flex min-h-0 flex-1 flex-col gap-9">
                        <div className="flex flex-col gap-6 overflow-y-auto">
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
                        <button
                            type="button"
                            disabled={!wf.canSubmitEvidences}
                            className={btnRowClass}
                            onClick={() =>
                                wf.dispatch({ type: "submit_evidences" })
                            }
                        >
                            Submit evidences
                        </button>
                    </div>
                );
            case "evidence_statements":
                return (
                    <div className="flex flex-col gap-6 overflow-y-auto">
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
                    <div className="flex flex-col gap-6 overflow-y-auto">
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
                    <div className="flex flex-col gap-6 overflow-y-auto">
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
                    <div className="flex flex-col gap-6 overflow-y-auto">
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
                    <div className="flex flex-col gap-6 overflow-y-auto">
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
            case "final_statements":
                return (
                    <div className="flex flex-col gap-6 overflow-y-auto">
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
                        <ChoiceButton
                            label={
                                wf.hasMoreAssemblyRoundsAfterComplete
                                    ? "Next assembly round"
                                    : "Finish debate"
                            }
                            onClick={() =>
                                wf.dispatch({
                                    type: "continue_after_round_complete",
                                })
                            }
                        />
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
                    <div className="flex flex-col gap-6 overflow-y-auto">
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
            return (
                <div className="flex flex-col gap-6">
                    <div
                        className={`${sectionBox} text-[2.125rem] leading-snug text-white/75`}
                    >
                        <p>
                            Opponent and your constructive lines are shown in
                            Feedback. Continue when you are ready to assemble
                            your next statement.
                        </p>
                    </div>
                    <ChoiceButton
                        label="Continue to assembly"
                        onClick={() =>
                            wf.dispatch({ type: "continue_after_constructive" })
                        }
                    />
                </div>
            );
        }

        if (wf.gamePhase === "debate_complete") {
            return (
                <div
                    className={`${sectionBox} text-[2.625rem] leading-snug text-white/85`}
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
                className={`${sectionBox} min-h-0 flex-1 overflow-hidden p-3 md:p-4`}
            >
                <div className="flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain pr-1">
                    {renderInteractive()}
                </div>
            </div>
            <div className={`${sectionBox} flex shrink-0 flex-col gap-5`}>
                <button
                    type="button"
                    className={btnRowClass}
                    disabled={!wf.canUndo}
                    onClick={wf.undo}
                >
                    Undo
                </button>
                <button
                    type="button"
                    className={btnRowClass}
                    onClick={handleGameOver}
                >
                    Game over (dev)
                </button>
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
