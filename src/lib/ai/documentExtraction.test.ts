import { describe, expect, it, vi } from "vitest";

const { callAiChatJson } = vi.hoisted(() => ({ callAiChatJson: vi.fn() }));
vi.mock("./openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./openai")>();
  return { ...actual, callAiChatJson };
});

const { analyzeDocument } = await import("./documentExtraction");

describe("analyzeDocument", () => {
  it("returnerer et gyldig resultat når KI-svaret følger skjemaet", async () => {
    callAiChatJson.mockImplementation(({ validate }) =>
      validate({
        document_type: "lonnsslipp",
        document_date: "2023-08-14",
        parties: ["Arbeidsgiver AS"],
        amounts: [{ label: "Brutto lønn", amount_kr: 42000 }],
        possible_facts: [
          { statement: "Ansatt fra 14.08.2023", confidence: "high" },
        ],
      })
    );

    const result = await analyzeDocument({
      fileName: "lonnsslipp.pdf",
      extractedText: "...",
    });

    expect(result.document_type).toBe("lonnsslipp");
    expect(result.possible_facts).toHaveLength(1);
  });

  it("kaster hvis KI-svaret ikke følger skjemaet", async () => {
    callAiChatJson.mockImplementation(({ validate }) =>
      validate({ document_type: "ikke-en-gyldig-type" })
    );

    await expect(
      analyzeDocument({ fileName: "x.pdf", extractedText: "..." })
    ).rejects.toThrow();
  });
});
