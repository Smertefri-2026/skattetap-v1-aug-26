import { describe, expect, it } from "vitest";
import { getCaseEntitlement, getUpgradeQuote, hasAccess } from "./entitlement";

const PRODUCTS = [
  { product_code: "full-sjekk", name: "Full sjekk", price_kr: 599, sort_order: 1, stripe_product_id: null, stripe_price_id: null, active: true },
  { product_code: "skatteendring", name: "Skatteendring", price_kr: 1490, sort_order: 2, stripe_product_id: null, stripe_price_id: null, active: true },
  { product_code: "komplett-sak", name: "Komplett sak", price_kr: 9990, sort_order: 3, stripe_product_id: null, stripe_price_id: null, active: true },
];

function makeFakeSupabase(caseAccessRows: { product_code: string }[]) {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: (col: string, value: string) => {
          if (table === "case_access") {
            return Promise.resolve({
              data: caseAccessRows.map((r) => ({
                product_code: r.product_code,
                products: PRODUCTS.find((p) => p.product_code === r.product_code) ?? null,
              })),
            });
          }
          if (table === "products" && col === "product_code") {
            return {
              eq: () => ({
                single: () =>
                  Promise.resolve({ data: PRODUCTS.find((p) => p.product_code === value) ?? null }),
              }),
            };
          }
          return {
            eq: () => ({ order: () => Promise.resolve({ data: PRODUCTS }) }),
            order: () => Promise.resolve({ data: PRODUCTS }),
          };
        },
      }),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("getCaseEntitlement", () => {
  it("returnerer null når saken ikke har kjøpt noe", async () => {
    const result = await getCaseEntitlement(makeFakeSupabase([]), "case-1");
    expect(result).toBeNull();
  });

  it("returnerer det høyest rangerte produktet ved flere kjøp", async () => {
    const result = await getCaseEntitlement(
      makeFakeSupabase([{ product_code: "full-sjekk" }, { product_code: "skatteendring" }]),
      "case-1"
    );
    expect(result?.product_code).toBe("skatteendring");
  });
});

describe("hasAccess", () => {
  it("gir tilgang til lavere nivåer når man har kjøpt et høyere (trinn-arv)", async () => {
    const supabase = makeFakeSupabase([{ product_code: "komplett-sak" }]);
    expect(await hasAccess(supabase, "case-1", "full-sjekk")).toBe(true);
    expect(await hasAccess(supabase, "case-1", "skatteendring")).toBe(true);
    expect(await hasAccess(supabase, "case-1", "komplett-sak")).toBe(true);
  });

  it("nekter tilgang til et høyere nivå enn det som er kjøpt", async () => {
    const supabase = makeFakeSupabase([{ product_code: "full-sjekk" }]);
    expect(await hasAccess(supabase, "case-1", "skatteendring")).toBe(false);
  });
});

describe("getUpgradeQuote", () => {
  it("krever full pris når saken ikke har kjøpt noe", async () => {
    const quote = await getUpgradeQuote(makeFakeSupabase([]), "case-1", "skatteendring");
    expect(quote?.costKr).toBe(1490);
    expect(quote?.alreadyHasAccess).toBe(false);
  });

  it("krever kun mellomlegget ved oppgradering", async () => {
    const supabase = makeFakeSupabase([{ product_code: "full-sjekk" }]);
    const quote = await getUpgradeQuote(supabase, "case-1", "skatteendring");
    expect(quote?.costKr).toBe(1490 - 599);
  });

  it("krever ingenting og markerer alleredeHarTilgang ved nedgradering eller samme nivå", async () => {
    const supabase = makeFakeSupabase([{ product_code: "komplett-sak" }]);
    const quote = await getUpgradeQuote(supabase, "case-1", "full-sjekk");
    expect(quote?.costKr).toBe(0);
    expect(quote?.alreadyHasAccess).toBe(true);
  });
});
