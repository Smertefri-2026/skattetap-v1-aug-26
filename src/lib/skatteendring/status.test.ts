import { describe, expect, it } from "vitest";
import { computeSkatteendringStatus } from "./status";

describe("computeSkatteendringStatus", () => {
  it("er 'not_started' uten forslag og uten svar", () => {
    const result = computeSkatteendringStatus({ hasProposal: false, latestResponse: null });
    expect(result.status).toBe("not_started");
  });

  it("er 'proposal_ready' med forslag men uten svar", () => {
    const result = computeSkatteendringStatus({ hasProposal: true, latestResponse: null });
    expect(result.status).toBe("proposal_ready");
  });

  it("er 'response_interpreted' når svaret ikke etterspør ny dokumentasjon", () => {
    const result = computeSkatteendringStatus({
      hasProposal: true,
      latestResponse: { newDocumentationNeeds: [] },
    });
    expect(result.status).toBe("response_interpreted");
  });

  it("er 'new_documentation_needed' og prioriteres over response_interpreted", () => {
    const result = computeSkatteendringStatus({
      hasProposal: true,
      latestResponse: { newDocumentationNeeds: ["Kvittering for reiseutgifter"] },
    });
    expect(result.status).toBe("new_documentation_needed");
  });
});
