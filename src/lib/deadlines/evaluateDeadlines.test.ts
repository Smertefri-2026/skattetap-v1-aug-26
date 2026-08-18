import { describe, expect, it } from "vitest";
import { evaluateDeadlines } from "./evaluateDeadlines";

function makeFakeSupabase(rules: unknown[]) {
  return {
    from: () => ({
      select: () => ({ eq: () => Promise.resolve({ data: rules }) }),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("evaluateDeadlines", () => {
  it("markerer 'ikke_vurdert' når ingen kvalitetssikret regel finnes, uten å gjette", async () => {
    const supabase = makeFakeSupabase([]);
    const result = await evaluateDeadlines(supabase, [
      { case_id: "case-1", tax_type: "lonn", tax_period: "2023" },
    ]);

    expect(result[0].status).toBe("ikke_vurdert");
    expect(result[0].deadline_date).toBeNull();
    expect(result[0].note).toContain("Ingen kvalitetssikret");
  });

  it("beregner en frist deterministisk når en aktiv, kvalitetssikret regel finnes", async () => {
    const supabase = makeFakeSupabase([
      {
        rule_code: "test-frist",
        deadline_type: "endringsfrist",
        applies_to_tax_type: "lonn",
        months_after_period_end: 36,
        exceptions: [],
        source: "Test",
        valid_from: "2020-01-01",
        valid_to: null,
      },
    ]);

    const result = await evaluateDeadlines(supabase, [
      { case_id: "case-1", tax_type: "lonn", tax_period: "2023" },
    ]);

    expect(result[0].status).toBe("vurdert");
    // 2023-12-31 + 36 months = 2026-12-31
    expect(result[0].deadline_date).toBe("2026-12-31");
    expect(result[0].rule_code).toBe("test-frist");
  });

  it("holder seg til 'ikke_vurdert' når perioden ikke har et gjenkjennbart årstall, selv om en regel finnes", async () => {
    const supabase = makeFakeSupabase([
      {
        rule_code: "test-frist",
        deadline_type: "endringsfrist",
        applies_to_tax_type: null,
        months_after_period_end: 36,
        exceptions: [],
        source: "Test",
        valid_from: "2020-01-01",
        valid_to: null,
      },
    ]);

    const result = await evaluateDeadlines(supabase, [
      { case_id: "case-1", tax_type: "lonn", tax_period: "ukjent periode" },
    ]);

    expect(result[0].status).toBe("ikke_vurdert");
    expect(result[0].note).toContain("gjenkjennbart årsformat");
  });

  it("foretrekker en sakstype-spesifikk regel fremfor en generisk", async () => {
    const supabase = makeFakeSupabase([
      {
        rule_code: "generisk",
        deadline_type: "endringsfrist",
        applies_to_tax_type: null,
        months_after_period_end: 12,
        exceptions: [],
        source: "Generisk",
        valid_from: "2019-01-01",
        valid_to: null,
      },
      {
        rule_code: "lonn-spesifikk",
        deadline_type: "endringsfrist",
        applies_to_tax_type: "lonn",
        months_after_period_end: 24,
        exceptions: [],
        source: "Lønnsspesifikk",
        valid_from: "2020-01-01",
        valid_to: null,
      },
    ]);

    const result = await evaluateDeadlines(supabase, [
      { case_id: "case-1", tax_type: "lonn", tax_period: "2023" },
    ]);

    expect(result[0].rule_code).toBe("lonn-spesifikk");
  });
});
