import { describe, expect, it, vi } from "vitest";

const { callAiChatJson } = vi.hoisted(() => ({ callAiChatJson: vi.fn() }));
vi.mock("@/lib/ai/openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/openai")>();
  return { ...actual, callAiChatJson };
});

const { analyzeStrategies } = await import("./strategyEngine");

const summaries = [
  {
    case_id: "c1",
    is_primary: true,
    title: "Sak 1",
    description: null,
    tax_period: "2023",
    tax_type: "lonn",
    outcome: "ukjent",
    total_amount_kr: 0,
    documented_claim_count: 0,
    undocumented_claim_count: 0,
    conflicting_claim_count: 0,
    top_documented_facts: [],
    key_gaps: [],
    applicable_rules: [],
    has_komplett_sak_analysis: false,
    relevance_score: 0,
  },
];

const baseInput = {
  patternSummaries: [],
  comparisonSummaries: [],
  financialExposureNote: "0 kr",
  deadlineSummaries: [],
  summaries,
};

describe("analyzeStrategies", () => {
  it("faller tilbake til en tom liste fremfor å godta bare én strategi (skjemaet krever minst to)", async () => {
    // The schema itself enforces plurality (.min(2)) so a model that only
    // proposes one path -- which would read as "the" answer -- can never
    // pass validation and silently become the only option shown.
    callAiChatJson.mockImplementation(({ validate }) =>
      validate({
        strategies: [
          {
            name: "Eneste strategi",
            description: "...",
            relevant_case_indices: [1],
            strengths: [],
            weaknesses: [],
            risks: [],
            consequences: [],
          },
        ],
      })
    );

    const result = await analyzeStrategies(baseInput);
    expect(result.strategies).toEqual([]);
  });

  it("godtar og filtrerer ugyldige case-indekser når minst to strategier er oppgitt", async () => {
    callAiChatJson.mockImplementation(({ validate }) =>
      validate({
        strategies: [
          {
            name: "Strategi A",
            description: "...",
            relevant_case_indices: [1, 99],
            strengths: ["styrke"],
            weaknesses: [],
            risks: [],
            consequences: [],
          },
          {
            name: "Strategi B",
            description: "...",
            relevant_case_indices: [],
            strengths: [],
            weaknesses: ["svakhet"],
            risks: [],
            consequences: [],
          },
        ],
      })
    );

    const result = await analyzeStrategies(baseInput);
    expect(result.strategies).toHaveLength(2);
    expect(result.strategies[0].relevant_case_indices).toEqual([1]);
  });
});
