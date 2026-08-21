import { describe, expect, it, vi } from "vitest";

const { callAiChatJson } = vi.hoisted(() => ({ callAiChatJson: vi.fn() }));
vi.mock("./openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./openai")>();
  return { ...actual, callAiChatJson };
});

const { analyzeSkatteendringProposal } = await import("./skatteendringProposal");

const baseInput = {
  caseTitle: "Pendlerfradrag 2023",
  taxPeriod: "2023",
  taxType: "lonn",
  amountKr: 14200,
  description: "Jeg pendlet og glemte fradraget.",
  documentedClaims: ["Ansatt fra 14.08.2023"],
  documentFilenames: ["lonnsslipp.pdf"],
  availableRules: [{ source_code: "reisefradrag-arbeid", topic: "Reisefradrag", short_explanation: "..." }],
};

describe("analyzeSkatteendringProposal", () => {
  it("filtrerer bort oppdiktede filnavn og regel-koder som ikke finnes i grunnlaget", async () => {
    callAiChatJson.mockImplementation(({ validate }) =>
      validate({
        proposal_text: "Det bes om at reisefradrag vurderes.",
        reasoning: "Basert på dokumentert ansettelsesdato.",
        referenced_document_filenames: ["lonnsslipp.pdf", "oppdiktet-dokument.pdf"],
        attachments: ["lonnsslipp.pdf"],
        missing_information: [],
        relevant_source_codes: ["reisefradrag-arbeid", "oppdiktet-kode"],
      })
    );

    const result = await analyzeSkatteendringProposal(baseInput);
    expect(result.referenced_document_filenames).toEqual(["lonnsslipp.pdf"]);
    expect(result.relevant_source_codes).toEqual(["reisefradrag-arbeid"]);
  });

  it("kaster hvis KI-svaret ikke følger skjemaet", async () => {
    callAiChatJson.mockImplementation(({ validate }) => validate({ proposal_text: "for lite" }));
    await expect(analyzeSkatteendringProposal(baseInput)).rejects.toThrow();
  });
});
