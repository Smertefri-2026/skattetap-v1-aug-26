import { describe, expect, it, vi } from "vitest";

const { callAiChatJson } = vi.hoisted(() => ({ callAiChatJson: vi.fn() }));
vi.mock("./openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./openai")>();
  return { ...actual, callAiChatJson };
});

const { interpretSkatteetatenResponse } = await import("./skatteetatenResponseInterpretation");

const baseInput = {
  caseTitle: "Pendlerfradrag 2023",
  proposalSummary: "Ba om vurdering av reisefradrag.",
  responseText: "Skatteetaten gir medhold i kravet om reisefradrag for 2023.",
};

describe("interpretSkatteetatenResponse", () => {
  it("returnerer et gyldig resultat med et konkret utfall", async () => {
    callAiChatJson.mockImplementation(({ validate }) =>
      validate({
        summary_plain_language: "Skatteetaten gir medhold i reisefradraget.",
        documented_findings: ["Reiseavstand på 6 mil er lagt til grunn"],
        legal_assessments: ["Skatteloven § 6-44 gir grunnlag for fradraget"],
        assumptions: [],
        unanswered_points: [],
        new_documentation_needs: [],
        suggested_next_steps: ["Kontroller at fradraget er ført i skattemeldingen"],
        detected_outcome: "medhold",
      })
    );

    const result = await interpretSkatteetatenResponse(baseInput);
    expect(result.detected_outcome).toBe("medhold");
  });

  it("faller konservativt tilbake til 'ukjent' hvis KI-en oppgir et ugyldig utfall, i stedet for å kaste", async () => {
    callAiChatJson.mockImplementation(({ validate }) =>
      validate({
        summary_plain_language: "x",
        documented_findings: [],
        legal_assessments: [],
        assumptions: [],
        unanswered_points: [],
        new_documentation_needs: [],
        suggested_next_steps: [],
        detected_outcome: "sannsynlig-medhold",
      })
    );

    const result = await interpretSkatteetatenResponse(baseInput);
    expect(result.detected_outcome).toBe("ukjent");
  });

  it("kaster fortsatt hvis selve sammendraget mangler (ingen trygg standardverdi for det)", async () => {
    callAiChatJson.mockImplementation(({ validate }) =>
      validate({
        documented_findings: [],
        legal_assessments: [],
        assumptions: [],
        unanswered_points: [],
        new_documentation_needs: [],
        suggested_next_steps: [],
        detected_outcome: "ukjent",
      })
    );

    await expect(interpretSkatteetatenResponse(baseInput)).rejects.toThrow();
  });
});
