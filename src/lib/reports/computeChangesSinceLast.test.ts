import { describe, expect, it } from "vitest";
import { computeChangesSinceLast } from "./computeChangesSinceLast";

const SINCE = "2026-01-10T00:00:00Z";

function makeFakeSupabase(opts: {
  previousReport: { id: string; created_at: string } | null;
  documents: { original_filename: string; uploaded_at: string }[];
  gaps: { description: string; created_at: string; resolved_at: string | null }[];
  assessments: { status: string; created_at: string; claims: { statement: string } }[];
  claimIds: string[];
}) {
  return {
    from: (table: string) => {
      if (table === "reports") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({ maybeSingle: () => Promise.resolve({ data: opts.previousReport }) }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "claims") {
        return {
          select: () => ({ eq: () => Promise.resolve({ data: opts.claimIds.map((id) => ({ id })) }) }),
        };
      }
      if (table === "documents") {
        return {
          select: () => ({
            eq: () => ({
              gt: (_col: string, since: string) =>
                Promise.resolve({ data: opts.documents.filter((d) => d.uploaded_at > since) }),
            }),
          }),
        };
      }
      if (table === "documentation_gaps") {
        return {
          select: () => ({
            eq: () => ({
              gt: (_col: string, since: string) =>
                Promise.resolve({ data: opts.gaps.filter((g) => g.created_at > since) }),
              not: () => ({
                gt: (_col: string, since: string) =>
                  Promise.resolve({
                    data: opts.gaps.filter((g) => g.resolved_at != null && g.resolved_at > since),
                  }),
              }),
            }),
          }),
        };
      }
      if (table === "claim_assessments") {
        return {
          select: () => ({
            in: () => ({
              gt: (_col: string, since: string) =>
                Promise.resolve({ data: opts.assessments.filter((a) => a.created_at > since) }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("computeChangesSinceLast", () => {
  it("markerer has_previous som false når det ikke finnes noen tidligere analyse", async () => {
    const supabase = makeFakeSupabase({
      previousReport: null,
      documents: [],
      gaps: [],
      assessments: [],
      claimIds: [],
    });
    const result = await computeChangesSinceLast(supabase, "case-1");
    expect(result.has_previous).toBe(false);
  });

  it("finner kun det som er nytt etter forrige analyse, ikke det som fantes fra før", async () => {
    const supabase = makeFakeSupabase({
      previousReport: { id: "report-1", created_at: SINCE },
      documents: [
        { original_filename: "gammelt.pdf", uploaded_at: "2026-01-01T00:00:00Z" },
        { original_filename: "nytt.pdf", uploaded_at: "2026-01-15T00:00:00Z" },
      ],
      gaps: [
        { description: "Gammelt hull", created_at: "2026-01-01T00:00:00Z", resolved_at: null },
        { description: "Nytt hull", created_at: "2026-01-15T00:00:00Z", resolved_at: null },
        {
          description: "Løst hull",
          created_at: "2026-01-01T00:00:00Z",
          resolved_at: "2026-01-16T00:00:00Z",
        },
      ],
      assessments: [
        {
          status: "conflicting",
          created_at: "2026-01-15T00:00:00Z",
          claims: { statement: "Motstridende faktum" },
        },
        {
          status: "documented",
          created_at: "2026-01-15T00:00:00Z",
          claims: { statement: "Nylig bekreftet faktum" },
        },
      ],
      claimIds: ["claim-1", "claim-2"],
    });

    const result = await computeChangesSinceLast(supabase, "case-1");

    expect(result.has_previous).toBe(true);
    expect(result.new_documents).toEqual(["nytt.pdf"]);
    expect(result.new_gaps).toEqual(["Nytt hull"]);
    expect(result.resolved_gaps).toEqual(["Løst hull"]);
    expect(result.new_conflicts).toEqual(["Motstridende faktum"]);
    expect(result.changed_assessments).toEqual(["Nylig bekreftet faktum: nå documented"]);
  });
});
