import { describe, expect, it, vi } from "vitest";

const { callAiChatJson } = vi.hoisted(() => ({ callAiChatJson: vi.fn() }));
vi.mock("@/lib/ai/openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/openai")>();
  return { ...actual, callAiChatJson };
});

const { legalSourceAnalysisEngine, sanitizeLegalSourceAnalysis } = await import("./legalSourceAnalysisEngine");

describe("sanitizeLegalSourceAnalysis", () => {
  it("filtrerer bort siteringer av kilder utenfor kandidatlisten den fikk", () => {
    const result = sanitizeLegalSourceAnalysis(
      {
        sources: [
          {
            sourceIndex: 1,
            locatorType: null,
            locatorValue: null,
            bmSummary: "x",
            relevanceReasoning: "y",
            supports: "kunden",
          },
          {
            sourceIndex: 5,
            locatorType: null,
            locatorValue: null,
            bmSummary: "x",
            relevanceReasoning: "y",
            supports: "kunden",
          },
        ],
        ourAssessment: "Vurdering",
      },
      1
    );

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].sourceIndex).toBe(1);
  });
});

describe("legalSourceAnalysisEngine", () => {
  it("returnerer siteringer og en samlet vurdering fra et gyldig KI-svar", async () => {
    callAiChatJson.mockImplementation(({ validate }) =>
      validate({
        sources: [
          {
            source_number: 1,
            locator_type: "paragraf",
            locator_value: "§ 6-44",
            bm_summary: "Gir fradrag for reisekostnader over en bunnbeløpsgrense.",
            relevance_reasoning: "Direkte relevant for spørsmålet om reisefradrag.",
            supports: "kunden",
          },
        ],
        our_assessment: "Kildene taler for at fradrag kan gis.",
      })
    );

    const result = await legalSourceAnalysisEngine(
      {
        question: "Har kunden rett til reisefradrag?",
        relatedClaimStatements: ["Kunden reiste 6 mil hver vei"],
        candidateSources: [
          {
            sourceCode: "reisefradrag-arbeid",
            sourceType: "lov_forskrift",
            citation: null,
            topic: "Reisefradrag",
            shortExplanation: "...",
          },
        ],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { supabase: {} as any, caseId: "case-1" }
    );

    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].supports).toBe("kunden");
    expect(result.ourAssessment).toContain("fradrag");
  });
});
