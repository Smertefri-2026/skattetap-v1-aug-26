import { describe, expect, it } from "vitest";
import { getClaimsWithStatus } from "./claimsWithStatus";

function makeFakeSupabase(claims: unknown[], assessments: unknown[]) {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: table === "claims" ? claims : null }),
        }),
        in: () => ({
          order: () => Promise.resolve({ data: table === "claim_assessments" ? assessments : null }),
        }),
      }),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("getClaimsWithStatus", () => {
  it("bruker den nyeste vurderingen per claim, ikke den første", async () => {
    const claims = [{ id: "c1", statement: "Fakta 1" }];
    const assessments = [
      { claim_id: "c1", status: "undocumented", reasoning: "Først", created_at: "2026-01-01" },
      { claim_id: "c1", status: "documented", reasoning: "Deretter", created_at: "2026-01-02" },
    ];

    const result = await getClaimsWithStatus(makeFakeSupabase(claims, assessments), "case-1");

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("documented");
    expect(result[0].reasoning).toBe("Deretter");
  });

  it("gir 'undocumented' som standard når claim mangler vurdering", async () => {
    const claims = [{ id: "c1", statement: "Fakta uten vurdering" }];
    const result = await getClaimsWithStatus(makeFakeSupabase(claims, []), "case-1");

    expect(result[0].status).toBe("undocumented");
  });

  it("returnerer tom liste uten å spørre om vurderinger når saken ikke har claims", async () => {
    const result = await getClaimsWithStatus(makeFakeSupabase([], []), "case-1");
    expect(result).toEqual([]);
  });
});
