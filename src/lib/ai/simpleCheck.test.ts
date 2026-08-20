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
        case_strength: "lovende",
        case_strength_reasoning: "Konkret, oppgitt reisevei og manglende fradrag.",
        estimated_range_kr: { low_kr: 3000, high_kr: 6000, basis: "Standard kilometersats på oppgitt reisevei." },
      })
    );

    const result = await analyzeSimpleCheck(baseInput);
    expect(result.full_check_recommended).toBe(true);
    expect(result.things_to_investigate).toHaveLength(2);
    expect(result.case_strength).toBe("lovende");
    expect(result.estimated_range_kr).toEqual({
      low_kr: 3000,
      high_kr: 6000,
      basis: "Standard kilometersats på oppgitt reisevei.",
    });
  });

  it("godtar estimated_range_kr som null når det ikke finnes tallgrunnlag", async () => {
    callAiChatJson.mockImplementation(({ validate }) =>
      validate({
        understood_summary: "Du oppgir en uklar situasjon uten konkrete tall.",
        things_to_investigate: [],
        missing_information: ["Konkrete beløp"],
        full_check_recommended: false,
        full_check_reasoning: "For lite konkret til å anbefale Full sjekk ennå.",
        case_strength: "usikkert",
        case_strength_reasoning: "Ingen konkrete tall å vurdere ut fra.",
        estimated_range_kr: null,
      })
    );

    const result = await analyzeSimpleCheck(baseInput);
    expect(result.estimated_range_kr).toBeNull();
  });

  it("faller tilbake til 'usikkert' hvis case_strength ikke er en gyldig verdi", async () => {
    callAiChatJson.mockImplementation(({ validate }) =>
      validate({
        understood_summary: "Du oppgir at du pendlet og ikke førte fradrag.",
        things_to_investigate: [],
        missing_information: [],
        full_check_recommended: false,
        full_check_reasoning: "Uklart.",
        case_strength: "veldig_lovende",
        case_strength_reasoning: "Uklart.",
        estimated_range_kr: null,
      })
    );

    const result = await analyzeSimpleCheck(baseInput);
    expect(result.case_strength).toBe("usikkert");
  });

  it("kaster hvis KI-svaret ikke følger skjemaet", async () => {
    callAiChatJson.mockImplementation(({ validate }) =>
      validate({ understood_summary: "For lite data" })
    );

    await expect(analyzeSimpleCheck(baseInput)).rejects.toThrow();
  });
});
