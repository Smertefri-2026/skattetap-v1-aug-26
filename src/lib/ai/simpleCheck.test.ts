import { describe, expect, it, vi } from "vitest";

const { callAiChatJson } = vi.hoisted(() => ({ callAiChatJson: vi.fn() }));
vi.mock("./openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./openai")>();
  return { ...actual, callAiChatJson };
});

const { analyzeSimpleCheck } = await import("./simpleCheck");

const baseInput = {
  title: "Pendlerfradrag 2023",
  taxPeriod: "2023",
  taxType: "lonn",
  amountKr: 14200,
  description: "Jeg pendlet 6 mil hver vei og glemte reisefradraget.",
};

describe("analyzeSimpleCheck", () => {
  it("returnerer et gyldig resultat når KI-svaret følger skjemaet", async () => {
    callAiChatJson.mockImplementation(({ validate }) =>
      validate({
        understood_summary: "Du oppgir at du pendlet og ikke førte fradrag.",
        things_to_investigate: ["Reiseavstand", "Antall arbeidsdager"],
        missing_information: ["Dokumentasjon for reisevei"],
        full_check_recommended: true,
        full_check_reasoning: "Det kan være grunnlag for reisefradrag.",
      })
    );

    const result = await analyzeSimpleCheck(baseInput);
    expect(result.full_check_recommended).toBe(true);
    expect(result.things_to_investigate).toHaveLength(2);
  });

  it("kaster hvis KI-svaret ikke følger skjemaet", async () => {
    callAiChatJson.mockImplementation(({ validate }) =>
      validate({ understood_summary: "For lite data" })
    );

    await expect(analyzeSimpleCheck(baseInput)).rejects.toThrow();
  });
});
