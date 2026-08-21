import { describe, expect, it, vi } from "vitest";

const { callAiChatJson } = vi.hoisted(() => ({ callAiChatJson: vi.fn() }));
vi.mock("@/lib/ai/openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/openai")>();
  return { ...actual, callAiChatJson };
});

const { legalQuestionEngine, sanitizeLegalQuestions } = await import("./legalQuestionEngine");
const { indexClaims } = await import("@/lib/ai/komplettSak/shared");

const claims = indexClaims([
  { statement: "Kunden kjøpte utstyr for kr 20 000", origin: "ai_suggested", status: "documented" },
]);

describe("sanitizeLegalQuestions", () => {
  it("filtrerer bort ugyldige claim-indekser og tom spørsmålstekst", () => {
    const result = sanitizeLegalQuestions(
      {
        questions: [
          { question: "Har kunden rett til fradrag for utstyret?", claimIndices: [1, 99] },
          { question: "   ", claimIndices: [1] },
        ],
      },
      claims
    );

    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].claimIndices).toEqual([1]);
  });
});

describe("legalQuestionEngine", () => {
  it("returnerer identifiserte rettsspørsmål fra et gyldig KI-svar", async () => {
    callAiChatJson.mockImplementation(({ validate }) =>
      validate({
        questions: [{ question: "Har kunden rett til fradrag for utstyret?", claim_numbers: [1] }],
      })
    );

    const result = await legalQuestionEngine(
      { caseTitle: "Test", taxType: "naering", description: null, claims },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { supabase: {} as any, caseId: "case-1" }
    );

    expect(result.questions).toEqual([
      { question: "Har kunden rett til fradrag for utstyret?", claimIndices: [1] },
    ]);
  });
});
