import { describe, expect, it, vi } from "vitest";

const { getUpgradeQuote } = vi.hoisted(() => ({ getUpgradeQuote: vi.fn() }));
vi.mock("@/lib/products/entitlement", () => ({ getUpgradeQuote }));

const { getStripeClient } = vi.hoisted(() => ({ getStripeClient: vi.fn() }));
vi.mock("@/lib/stripe/client", () => ({ getStripeClient }));

const { createAdminClient } = vi.hoisted(() => ({
  createAdminClient: vi.fn(() => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            gte: () => ({
              order: () => ({ limit: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
            }),
          }),
        }),
      }),
      insert: () => ({
        select: () => ({ single: () => Promise.resolve({ data: { id: "purchase-1" }, error: null }) }),
      }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    }),
  })),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));

const { createCheckoutSession } = await import("./createCheckout");

const baseProduct = {
  product_code: "skattetap-pluss",
  name: "Skattetap+",
  price_kr: 990,
  sort_order: 5,
  stripe_product_id: null,
  stripe_price_id: null,
  active: true,
};

describe("createCheckoutSession", () => {
  it("nekter å opprette checkout for et abonnementsprodukt (ikke støttet ennå)", async () => {
    getUpgradeQuote.mockResolvedValue({
      product: { ...baseProduct, price_type: "recurring", billing_interval: "year", scope: "account" },
      alreadyHasAccess: false,
      costKr: 990,
    });

    await expect(
      createCheckoutSession({
        caseId: "case-1",
        userId: "user-1",
        productCode: "skattetap-pluss",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      })
    ).rejects.toThrow("støttes ikke");

    expect(getStripeClient).not.toHaveBeenCalled();
  });

  it("nekter å opprette checkout når saken allerede har tilgang", async () => {
    getUpgradeQuote.mockResolvedValue({
      product: { ...baseProduct, price_type: "one_time", billing_interval: null, scope: "case" },
      alreadyHasAccess: true,
      costKr: 0,
    });

    await expect(
      createCheckoutSession({
        caseId: "case-1",
        userId: "user-1",
        productCode: "full-sjekk",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      })
    ).rejects.toThrow("allerede tilgang");
  });
});
