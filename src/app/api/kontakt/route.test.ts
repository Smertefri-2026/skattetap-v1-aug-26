import { afterEach, describe, expect, it, vi } from "vitest";

const { verifyTurnstileToken } = vi.hoisted(() => ({
  verifyTurnstileToken: vi.fn(),
}));
vi.mock("@/lib/turnstile", () => ({ verifyTurnstileToken }));

const { insert } = vi.hoisted(() => ({
  insert: vi.fn(() => Promise.resolve({ error: null })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({ insert }) }),
}));

const { POST } = await import("./route");

function req(body: unknown) {
  return new Request("http://localhost/api/kontakt", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const validBody = {
  name: "Kari Nordmann",
  email: "kari@example.com",
  message: "Dette er en test-melding på over ti tegn.",
  turnstileToken: "token",
};

describe("POST /api/kontakt", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("svarer 503 når Turnstile ikke er konfigurert", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");

    const res = await POST(req(validBody));
    expect(res.status).toBe(503);
  });

  it("svarer 400 på ugyldig utfylling", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");

    const res = await POST(req({ name: "", email: "ikke-epost", message: "" }));
    expect(res.status).toBe(400);
  });

  it("svarer 400 når Turnstile ikke bekrefter mennesket", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    verifyTurnstileToken.mockResolvedValue(false);

    const res = await POST(req(validBody));
    expect(res.status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it("lagrer meldingen i Supabase når alt er gyldig", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    verifyTurnstileToken.mockResolvedValue(true);

    const res = await POST(req(validBody));
    expect(res.status).toBe(200);
    expect(insert).toHaveBeenCalledWith({
      name: validBody.name,
      email: validBody.email,
      message: validBody.message,
    });
  });
});
