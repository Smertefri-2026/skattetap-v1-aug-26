import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

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
    vi.restoreAllMocks();
  });

  it("svarer 503 når kontaktskjemaet ikke er konfigurert", async () => {
    vi.stubEnv("CONTACT_EMAIL_TO", "");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");

    const res = await POST(req(validBody));
    expect(res.status).toBe(503);
  });

  it("svarer 400 på ugyldig utfylling", async () => {
    vi.stubEnv("CONTACT_EMAIL_TO", "post@example.com");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");

    const res = await POST(req({ name: "", email: "ikke-epost", message: "" }));
    expect(res.status).toBe(400);
  });
});
