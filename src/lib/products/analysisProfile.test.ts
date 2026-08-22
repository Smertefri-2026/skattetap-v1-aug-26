import { describe, expect, it } from "vitest";
import { getCaseAnalysisProfile } from "./analysisProfile";

function makeFakeSupabase(tables: { case_access?: unknown[]; products_by_code?: Record<string, unknown> }) {
  return {
    from: (table: string) => {
      if (table === "case_access") {
        return { select: () => ({ eq: () => Promise.resolve({ data: tables.case_access ?? [], error: null }) }) };
      }
      if (table === "products") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({ data: tables.products_by_code?.["enkel-sjekk"] ?? null, error: null }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table in test fake: ${table}`);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("getCaseAnalysisProfile", () => {
  it("er 'basic' med runsCaseAnalysis:false når casen ikke har kjøpt noe (faller tilbake til enkel-sjekk)", async () => {
    const supabase = makeFakeSupabase({
      case_access: [],
      products_by_code: { "enkel-sjekk": { product_code: "enkel-sjekk", analysis_profile: "basic" } },
    });

    const result = await getCaseAnalysisProfile(supabase, "case-1");
    expect(result).toEqual({ profile: "basic", runsCaseAnalysis: false });
  });

  it("er 'standard' med runsCaseAnalysis:true når casen har kjøpt en betalt tier", async () => {
    const supabase = makeFakeSupabase({
      case_access: [
        {
          product_code: "full-sjekk",
          products: { product_code: "full-sjekk", sort_order: 1, analysis_profile: "standard" },
        },
      ],
    });

    const result = await getCaseAnalysisProfile(supabase, "case-1");
    expect(result).toEqual({ profile: "standard", runsCaseAnalysis: true });
  });
});
