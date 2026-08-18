import { describe, expect, it, vi } from "vitest";

const { callAiChatJson } = vi.hoisted(() => ({ callAiChatJson: vi.fn() }));
vi.mock("@/lib/ai/openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/openai")>();
  return { ...actual, callAiChatJson };
});

const { analyzePatterns } = await import("./patternEngine");

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
  {
    case_id: "c2",
    is_primary: false,
    title: "Sak 2",
    description: null,
    tax_period: "2022",
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

describe("analyzePatterns", () => {
  it("dropper mønstre med ugyldige sak-indekser og faller ikke under to gjenværende", async () => {
    callAiChatJson.mockImplementation(({ validate }) =>
      validate({
        patterns: [
          { description: "Ekte mønster", case_indices: [1, 2], pattern_type: "gjentakende_fradrag" },
          { description: "Oppdiktet sak", case_indices: [1, 99], pattern_type: "annet" },
        ],
      })
    );

    const result = await analyzePatterns(summaries);
    expect(result.patterns).toHaveLength(1);
    expect(result.patterns[0].description).toBe("Ekte mønster");
  });
});
