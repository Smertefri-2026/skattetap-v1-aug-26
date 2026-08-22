import { describe, expect, it, vi } from "vitest";

const { getUpgradeQuote } = vi.hoisted(() => ({ getUpgradeQuote: vi.fn() }));
vi.mock("@/lib/products/entitlement", () => ({ getUpgradeQuote }));

const { getProductByCode } = vi.hoisted(() => ({ getProductByCode: vi.fn() }));
vi.mock("@/lib/products/catalog", () => ({ getProductByCode }));

const { getStripeClient } = vi.hoisted(() => ({ getStripeClient: vi.fn() }));
vi.mock("@/lib/stripe/client", () => ({ getStripeClient }));

const { createAdminClient } = vi.hoisted(() => ({
  createAdminClient: vi.fn(() => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              gte: () => ({
                order: () => ({ limit: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
              }),
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
  product_type: "tier" as const,
  max_documents: null,
  max_total_mb: null,
  addon_documents: null,
  addon_total_mb: null,
};

describe("createCheckoutSession", () => {
  it("nekter å opprette checkout for et abonnementsprodukt (ikke støttet ennå)", async () => {
    getProductByCode.mockResolvedValue({ ...baseProduct, price_type: "recurring", billing_interval: "year", scope: "account" });

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
    getProductByCode.mockResolvedValue({ ...baseProduct, price_type: "one_time", billing_interval: null, scope: "case" });
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

  it("priser et capacity_addon-produkt til full pris og hopper over allerede-har-tilgang-sjekken", async () => {
    getUpgradeQuote.mockClear();
    getProductByCode.mockResolvedValue({
      ...baseProduct,
      product_code: "komplett-sak-tillegg",
      product_type: "capacity_addon",
      price_kr: 1500,
      price_type: "one_time",
      billing_interval: null,
      scope: "case",
      addon_documents: 10,
      addon_total_mb: 100,
    });

    type SessionCreateArgs = { line_items: { price_data: { unit_amount: number } }[] };
    const createSession = vi.fn((args: SessionCreateArgs) => {
      void args;
      return Promise.resolve({ id: "sess-1", url: "https://checkout.stripe.com/sess-1" });
    });
    getStripeClient.mockReturnValue({ checkout: { sessions: { create: createSession } } });

    const url = await createCheckoutSession({
      caseId: "case-1",
      userId: "user-1",
      productCode: "komplett-sak-tillegg",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
    });

    expect(url).toBe("https://checkout.stripe.com/sess-1");
    expect(getUpgradeQuote).not.toHaveBeenCalled();
    const [sessionArgs] = createSession.mock.calls[0];
    expect(sessionArgs.line_items[0].price_data.unit_amount).toBe(150000);
  });
});
