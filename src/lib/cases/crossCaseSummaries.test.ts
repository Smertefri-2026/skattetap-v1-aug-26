import { describe, expect, it } from "vitest";
import { parseYear, scoreRelevance, summarizeCase } from "./crossCaseSummaries";
import type { CaseSummary } from "./crossCaseSummaries";

function makeSummary(overrides: Partial<CaseSummary>): CaseSummary {
  return {
    case_id: "case-1",
    is_primary: false,
    title: "Test",
    description: null,
    tax_period: "2023",
    tax_type: "lonn",
    outcome: "ukjent",
    total_amount_kr: 0,
    documented_claim_count: 0,
    undocumented_claim_count: 0,
    conflicting_claim_count: 0,
    top_documented_facts: [],
    key_gaps: [],
    applicable_rules: [],
    has_komplett_sak_analysis: false,
    relevance_score: 0,
    ...overrides,
  };
}

describe("parseYear", () => {
  it("finner et 4-sifret årstall i en periodetekst", () => {
    expect(parseYear("2023")).toBe(2023);
    expect(parseYear("Inntektsåret 2022")).toBe(2022);
  });

  it("returnerer null når ingen år kan gjenkjennes", () => {
    expect(parseYear(null)).toBeNull();
    expect(parseYear("ukjent periode")).toBeNull();
  });
});

describe("scoreRelevance", () => {
  it("gir høyere score til en sak med samme skattetype", () => {
    const primary = makeSummary({ tax_type: "lonn", tax_period: "2023" });
    const sameType = makeSummary({ tax_type: "lonn", tax_period: "2020" });
    const differentType = makeSummary({ tax_type: "naering", tax_period: "2020" });

    expect(scoreRelevance(sameType, primary)).toBeGreaterThan(scoreRelevance(differentType, primary));
  });

  it("gir høyere score til et nærliggende år enn et fjernt år", () => {
    const primary = makeSummary({ tax_type: "lonn", tax_period: "2023" });
    const nearYear = makeSummary({ tax_type: "annet", tax_period: "2022" });
    const farYear = makeSummary({ tax_type: "annet", tax_period: "2010" });

    expect(scoreRelevance(nearYear, primary)).toBeGreaterThan(scoreRelevance(farYear, primary));
  });

  it("gir ekstra score for saker med motstridende eller dokumenterte fakta", () => {
    const primary = makeSummary({ tax_type: "lonn", tax_period: "2023" });
    const informative = makeSummary({
      tax_type: "annet",
      tax_period: "1990",
      conflicting_claim_count: 1,
      documented_claim_count: 1,
    });
    const empty = makeSummary({ tax_type: "annet", tax_period: "1990" });

    expect(scoreRelevance(informative, primary)).toBeGreaterThan(scoreRelevance(empty, primary));
  });
});

function makeFakeSupabaseForSummarize(komplettSakTotalAmount: number | null) {
  return {
    from: (table: string) => {
      if (table === "claims") {
        return { select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [] }) }) }) };
      }
      if (table === "reports") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: () =>
                      Promise.resolve({
                        data:
                          komplettSakTotalAmount == null
                            ? null
                            : {
                                content: {
                                  strongest_points: [],
                                  weakest_points: [],
                                  applicable_rules: [],
                                  financial_summary: { total_amount_kr: komplettSakTotalAmount },
                                },
                              },
                      }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "documentation_gaps") {
        return { select: () => ({ eq: () => ({ eq: () => ({ limit: () => Promise.resolve({ data: [] }) }) }) }) };
      }
      throw new Error(`unexpected table ${table}`);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("summarizeCase amount precedence", () => {
  // Regression test: a real E2E run found that a case with a
  // user-entered amount (30 000 kr) but a document containing no
  // monetary figures got summarized as 0 kr, because the Komplett sak
  // analysis's derived total (a real, correctly computed 0) was preferred
  // via `??`, which only falls through on null/undefined -- not 0.
  const baseCaseRow = {
    id: "case-1",
    title: "Test",
    description: null,
    tax_period: "2023",
    tax_type: "lonn",
    outcome: "ukjent",
  };

  it("bruker brukerens eget beløp selv når Komplett sak fant 0 kr i dokumentene", async () => {
    const supabase = makeFakeSupabaseForSummarize(0);
    const result = await summarizeCase(supabase, { ...baseCaseRow, amount_kr: 30000 }, false);
    expect(result.total_amount_kr).toBe(30000);
  });

  it("faller tilbake til Komplett sak sitt utledede beløp når brukeren ikke har oppgitt noe", async () => {
    const supabase = makeFakeSupabaseForSummarize(15000);
    const result = await summarizeCase(supabase, { ...baseCaseRow, amount_kr: null }, false);
    expect(result.total_amount_kr).toBe(15000);
  });

  it("gir 0 når verken brukeren eller Komplett sak har noe beløp", async () => {
    const supabase = makeFakeSupabaseForSummarize(null);
    const result = await summarizeCase(supabase, { ...baseCaseRow, amount_kr: null }, false);
    expect(result.total_amount_kr).toBe(0);
  });
});
