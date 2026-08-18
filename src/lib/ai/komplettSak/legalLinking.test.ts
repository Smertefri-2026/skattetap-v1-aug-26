import { describe, expect, it, vi } from "vitest";

const { callAiChatJson } = vi.hoisted(() => ({ callAiChatJson: vi.fn() }));
vi.mock("@/lib/ai/openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/openai")>();
  return { ...actual, callAiChatJson };
});

const { analyzeLegalLinking } = await import("./legalLinking");
const { indexClaims } = await import("./shared");

const claims = indexClaims([{ statement: "Faktum A", origin: "ai_suggested", status: "documented" }]);

describe("analyzeLegalLinking", () => {
  it("filtrerer bort oppdiktede regel-koder og ugyldige claim-indekser", async () => {
    callAiChatJson.mockImplementation(({ validate }) =>
      validate({
        claim_rule_links: [
          { claim_index: 1, rule_codes: ["ekte-kode", "oppdiktet-kode"] },
          { claim_index: 42, rule_codes: ["ekte-kode"] },
        ],
        legal_assessment: "Vurdering",
      })
    );

    const result = await analyzeLegalLinking({
      caseTitle: "Test",
      claims,
      availableRules: [{ rule_code: "ekte-kode", topic: "Tema", short_explanation: "..." }],
    });

    expect(result.claim_rule_links).toHaveLength(1);
    expect(result.claim_rule_links[0].rule_codes).toEqual(["ekte-kode"]);
  });
});
