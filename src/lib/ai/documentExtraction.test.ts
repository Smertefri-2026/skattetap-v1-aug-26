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

  it("faller tilbake til trygge standardverdier i stedet for å kaste, selv om KI-svaret er ufullstendig", async () => {
    // Documented bug this guards against: a real document with no amounts
    // caused the model to omit the "amounts" key entirely (per the old
    // "utelat felt du ikke finner grunnlag for" instruction), which crashed
    // the whole extraction. .catch() on every field means malformed or
    // missing fields degrade to a safe empty/neutral result instead.
    callAiChatJson.mockImplementation(({ validate }) =>
      validate({ document_type: "ikke-en-gyldig-type" })
    );

    const result = await analyzeDocument({ fileName: "x.pdf", extractedText: "..." });

    expect(result.document_type).toBe("annet");
    expect(result.amounts).toEqual([]);
    expect(result.parties).toEqual([]);
    expect(result.possible_facts).toEqual([]);
  });
});
