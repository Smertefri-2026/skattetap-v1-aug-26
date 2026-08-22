import { describe, expect, it } from "vitest";
import { getCaseCapacity, checkUploadAllowed } from "./capacity";

const komplettSakProduct = {
  product_code: "komplett-sak",
  name: "Komplett sak",
  price_kr: 9990,
  sort_order: 3,
  max_documents: 25,
  max_total_mb: 150,
  addon_documents: null,
  addon_total_mb: null,
  active: true,
};

const enkelSjekkProduct = {
  product_code: "enkel-sjekk",
  name: "Enkel sjekk",
  price_kr: 0,
  sort_order: 0,
  max_documents: 3,
  max_total_mb: 15,
  addon_documents: null,
  addon_total_mb: null,
  active: true,
};

/** Table-keyed fake: each entry is either a plain array (returned for a
 * non-count select) or {count} (returned when .select(..., {head:true})
 * is used), or a single-row response for a chain ending in .single(). */
function makeFakeSupabase(tables: {
  case_access?: unknown[];
  case_capacity_purchases?: unknown[];
  products_by_code?: Record<string, unknown>;
  products_in?: unknown[];
  documents_count?: number;
  documents_sizes?: { size_bytes: number }[];
}) {
  return {
    from: (table: string) => {
      if (table === "case_access") {
        return { select: () => ({ eq: () => Promise.resolve({ data: tables.case_access ?? [], error: null }) }) };
      }
      if (table === "case_capacity_purchases") {
        return {
          select: () => ({ eq: () => Promise.resolve({ data: tables.case_capacity_purchases ?? [], error: null }) }),
        };
      }
      if (table === "products") {
        return {
          select: () => ({
            eq: (_col: string, code?: string) => {
              void code;
              return {
                eq: () => ({
                  single: () => Promise.resolve({ data: tables.products_by_code?.["enkel-sjekk"] ?? null, error: null }),
                }),
              };
            },
            in: () => Promise.resolve({ data: tables.products_in ?? [], error: null }),
          }),
        };
      }
      if (table === "documents") {
        return {
          select: (_cols?: string, opts?: { head?: boolean }) =>
            opts?.head
              ? { eq: () => Promise.resolve({ count: tables.documents_count ?? 0, data: null, error: null }) }
              : { eq: () => Promise.resolve({ data: tables.documents_sizes ?? [], error: null }) },
        };
      }
      throw new Error(`unexpected table in test fake: ${table}`);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("getCaseCapacity", () => {
  it("er 'normal' godt under grensen, og gir ingen anbefalt oppgradering på en add-on-berettiget sak", async () => {
    const supabase = makeFakeSupabase({
      case_access: [{ product_code: "komplett-sak", products: komplettSakProduct }],
      case_capacity_purchases: [],
      documents_count: 5,
      documents_sizes: Array(5).fill({ size_bytes: 1024 * 1024 }),
    });

    const capacity = await getCaseCapacity(supabase, "case-1");
    expect(capacity.maxDocuments).toBe(25);
    expect(capacity.maxTotalMb).toBe(150);
    expect(capacity.documentsUsed).toBe(5);
    expect(capacity.mbUsed).toBe(5);
    expect(capacity.status).toBe("normal");
    expect(capacity.canBuyExtraCapacity).toBe(true);
    expect(capacity.recommendedUpgradeStage).toBeNull();
  });

  it("summerer tilleggskapasitet fra flere case_capacity_purchases-rader", async () => {
    const supabase = makeFakeSupabase({
      case_access: [{ product_code: "komplett-sak", products: komplettSakProduct }],
      case_capacity_purchases: [{ product_code: "komplett-sak-tillegg" }, { product_code: "komplett-sak-tillegg" }],
      products_in: [{ product_code: "komplett-sak-tillegg", addon_documents: 10, addon_total_mb: 100 }],
      documents_count: 3,
      documents_sizes: [],
    });

    const capacity = await getCaseCapacity(supabase, "case-1");
    // Base 25/150 + two purchases of +10/+100 each = 45/350.
    expect(capacity.maxDocuments).toBe(45);
    expect(capacity.maxTotalMb).toBe(350);
  });

  it("anbefaler oppgradering, ikke tilleggskapasitet, på et nivå som ikke er add-on-berettiget", async () => {
    const fullSjekkProduct = { ...komplettSakProduct, product_code: "full-sjekk", sort_order: 1, max_documents: 10, max_total_mb: 50 };
    const supabase = makeFakeSupabase({
      case_access: [{ product_code: "full-sjekk", products: fullSjekkProduct }],
      case_capacity_purchases: [],
      documents_count: 10,
      documents_sizes: Array(10).fill({ size_bytes: 5 * 1024 * 1024 }),
    });

    const capacity = await getCaseCapacity(supabase, "case-1");
    expect(capacity.status).toBe("limit_reached");
    expect(capacity.canBuyExtraCapacity).toBe(false);
    expect(capacity.recommendedUpgradeStage).toBe("skatteendring");
  });

  it("faller tilbake til enkel-sjekk sine grenser når saken ikke har kjøpt noe", async () => {
    const supabase = makeFakeSupabase({
      case_access: [],
      case_capacity_purchases: [],
      products_by_code: { "enkel-sjekk": enkelSjekkProduct },
      documents_count: 2,
      documents_sizes: [{ size_bytes: 6 * 1024 * 1024 }, { size_bytes: 6.5 * 1024 * 1024 }],
    });

    const capacity = await getCaseCapacity(supabase, "case-1");
    expect(capacity.maxDocuments).toBe(3);
    expect(capacity.maxTotalMb).toBe(15);
    // 12.5 of 15 MB = ~83 % -> near_limit.
    expect(capacity.status).toBe("near_limit");
  });
});

describe("checkUploadAllowed", () => {
  it("blokkerer opplasting som ville sprengt MB-grensen, selv med ledig dokumentplass", async () => {
    const supabase = makeFakeSupabase({
      case_access: [],
      case_capacity_purchases: [],
      products_by_code: { "enkel-sjekk": enkelSjekkProduct },
      documents_count: 1,
      documents_sizes: [{ size_bytes: 14 * 1024 * 1024 }],
    });

    // 14 MB already used of 15 MB included -- a new 5 MB file must be rejected.
    const result = await checkUploadAllowed(supabase, "case-1", 5 * 1024 * 1024);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toContain("Enkel sjekk");
    }
  });

  it("tillater opplasting godt innenfor grensen", async () => {
    const supabase = makeFakeSupabase({
      case_access: [{ product_code: "komplett-sak", products: komplettSakProduct }],
      case_capacity_purchases: [],
      documents_count: 2,
      documents_sizes: [{ size_bytes: 1024 * 1024 }, { size_bytes: 1024 * 1024 }],
    });

    const result = await checkUploadAllowed(supabase, "case-1", 1024 * 1024);
    expect(result.allowed).toBe(true);
  });
});
