import type {
    Fact,
    LogicalFallacy,
    OpeningStatement,
    Statement,
} from "../../types/debateEntities";

export const PLACEHOLDER_LOGICAL_FALLACIES: LogicalFallacy[] = [
    {
        id: "fallacy-strawman",
        label: "Straw man",
        description: "Misrepresenting an argument to make it easier to attack.",
    },
    {
        id: "fallacy-ad-hominem",
        label: "Ad hominem",
        description: "Attacking the person instead of the argument.",
    },
    {
        id: "fallacy-false-dilemma",
        label: "False dilemma",
        description: "Presenting only two options when more exist.",
    },
];

export const PLACEHOLDER_PROPOSITION_OPENING: OpeningStatement = {
    id: "stmt-prop-opening",
    speakerId: "speaker-proposition",
    role: "affirmative",
    sentences: [
        {
            id: "s-po-1",
            text: "We affirm that the policy improves outcomes for the majority.",
            logicalFallacies: [],
        },
        {
            id: "s-po-2",
            text: "Evidence from the pilot program supports a phased rollout.",
            logicalFallacies: [],
        },
    ],
};

export const PLACEHOLDER_OPPOSITION_OPENING: OpeningStatement = {
    id: "stmt-opp-opening",
    speakerId: "speaker-opposition",
    role: "negative",
    sentences: [
        {
            id: "s-oo-1",
            text: "The opposition rejects the claim of net benefit.",
            logicalFallacies: [],
        },
        {
            id: "s-oo-2",
            text: "Costs are understated and risks to vulnerable groups are ignored.",
            logicalFallacies: [],
        },
    ],
};

export const PLACEHOLDER_PROPOSITION_PAST: Statement[] = [
    PLACEHOLDER_PROPOSITION_OPENING,
    {
        id: "stmt-prop-rebuttal-1",
        speakerId: "speaker-proposition",
        sentences: [
            {
                id: "s-pr1-1",
                text: "Our opponents confuse correlation with causation on employment.",
                logicalFallacies: [],
            },
            {
                id: "s-pr1-2",
                text: "Independent audits confirm our fiscal assumptions.",
                logicalFallacies: [],
            },
        ],
    },
];

export const PLACEHOLDER_OPPOSITION_PAST: Statement[] = [
    PLACEHOLDER_OPPOSITION_OPENING,
    {
        id: "stmt-opp-constructive-1",
        speakerId: "speaker-opposition",
        sentences: [
            {
                id: "s-oc1-1",
                text: "The burden of proof has not been met on safety.",
                logicalFallacies: [],
            },
        ],
    },
];

export const PLACEHOLDER_FACTS: Fact[] = [
    {
        id: "fact-1",
        speakerId: "moderator",
        sentences: [
            {
                id: "fs-1-1",
                text: "Participation in the pilot was voluntary.",
                logicalFallacies: [],
            },
            {
                id: "fs-1-2",
                text: "Sample size was twelve thousand households.",
                logicalFallacies: [],
            },
        ],
    },
    {
        id: "fact-2",
        speakerId: "moderator",
        sentences: [
            {
                id: "fs-2-1",
                text: "The report was published in March.",
                logicalFallacies: [],
            },
        ],
    },
];

export const PLACEHOLDER_FINAL_OPTIONS: readonly [
    Statement,
    Statement,
    Statement,
] = [
    {
        id: "final-opt-a",
        speakerId: "player",
        sentences: [
            {
                id: "fo-a-1",
                text: "We should adopt the measure with strict safeguards.",
                logicalFallacies: [],
            },
        ],
    },
    {
        id: "final-opt-b",
        speakerId: "player",
        sentences: [
            {
                id: "fo-b-1",
                text: "We should delay until further study is complete.",
                logicalFallacies: [],
            },
        ],
    },
    {
        id: "final-opt-c",
        speakerId: "player",
        sentences: [
            {
                id: "fo-c-1",
                text: "We should reject the measure and pursue alternatives.",
                logicalFallacies: [],
            },
        ],
    },
];

