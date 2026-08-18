import { describe, expect, it, vi } from "vitest";

const { callAiChatJson } = vi.hoisted(() => ({ callAiChatJson: vi.fn() }));
vi.mock("@/lib/ai/openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/openai")>();
  return { ...actual, callAiChatJson };
});

const { analyzeChronologyAndConflicts } = await import("./chronologyAndConflicts");
const { indexClaims } = await import("./shared");

const claims = indexClaims([
  { statement: "Faktum A", origin: "ai_suggested", status: "documented" },
  { statement: "Faktum B", origin: "ai_suggested", status: "documented" },
]);

const baseInput = {
  caseTitle: "Test",
  description: null,
  claims,
  documentSummaries: ["dok.pdf"],
};

describe("analyzeChronologyAndConflicts", () => {
  it("filtrerer bort ugyldige claim-indekser i konflikter og faktastyrke", async () => {
    callAiChatJson.mockImplementation(({ validate }) =>
      validate({
        chronology: [],
        conflicts: [
          { claim_indices: [1, 2], description: "Ekte konflikt", severity: "high" },
          { claim_indices: [1, 99], description: "Oppdiktet indeks", severity: "low" },
        ],
        fact_strength: [
          { claim_index: 1, strength: "strong", reasoning: "..." },
          { claim_index: 5, strength: "weak", reasoning: "..." },
        ],
      })
    );

    const result = await analyzeChronologyAndConflicts(baseInput);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].description).toBe("Ekte konflikt");
    expect(result.fact_strength).toHaveLength(1);
    expect(result.fact_strength[0].claim_index).toBe(1);
  });

  it("dropper en konflikt helt hvis den mister nok gyldige indekser til å bli under to", async () => {
    callAiChatJson.mockImplementation(({ validate }) =>
      validate({
        chronology: [],
        conflicts: [{ claim_indices: [1, 99], description: "Kun én gyldig igjen", severity: "medium" }],
        fact_strength: [],
      })
    );

    const result = await analyzeChronologyAndConflicts(baseInput);
    expect(result.conflicts).toHaveLength(0);
  });
});
