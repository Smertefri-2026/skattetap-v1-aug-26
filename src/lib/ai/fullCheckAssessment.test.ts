import { describe, expect, it, vi } from "vitest";

const { callAiChatJson } = vi.hoisted(() => ({ callAiChatJson: vi.fn() }));
vi.mock("./openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./openai")>();
  return { ...actual, callAiChatJson };
});

const { analyzeFullCheck } = await import("./fullCheckAssessment");

const baseInput = {
  caseTitle: "Pendlerfradrag 2023",
  taxPeriod: "2023",
  taxType: "lonn",
  amountKr: 14200,
  description: "Jeg pendlet og glemte fradraget.",
  claims: [{ statement: "Pendlet 6 mil hver vei", status: "documented" }],
  documentFilenames: ["lonnsslipp.pdf"],
  availableRules: [
    { rule_code: "reisefradrag-arbeid", topic: "Reisefradrag", short_explanation: "..." },
  ],
};

describe("analyzeFullCheck", () => {
  it("filtrerer bort rule_code-verdier KI-en dikter opp som ikke finnes i regelverkslisten", async () => {
    callAiChatJson.mockImplementation(({ validate }) =>
      validate({
        summary: "Sammendrag",
        background: "Bakgrunn",
        assessment: "Vurdering",
        relevant_rule_codes: ["reisefradrag-arbeid", "en-oppdiktet-kode"],
        conflicting_notes: [],
        documentation_gaps: [],
        recommended_next_steps: [],
      })
    );

    const result = await analyzeFullCheck(baseInput);
    expect(result.relevant_rule_codes).toEqual(["reisefradrag-arbeid"]);
  });

  it("kaster hvis KI-svaret ikke følger skjemaet", async () => {
    callAiChatJson.mockImplementation(({ validate }) => validate({ summary: "for lite" }));
    await expect(analyzeFullCheck(baseInput)).rejects.toThrow();
  });
});
