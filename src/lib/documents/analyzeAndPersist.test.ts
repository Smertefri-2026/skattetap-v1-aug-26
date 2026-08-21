import { describe, expect, it, vi, beforeEach } from "vitest";

const { analyzeDocument } = vi.hoisted(() => ({ analyzeDocument: vi.fn() }));
vi.mock("@/lib/ai/documentExtraction", () => ({ analyzeDocument }));

const { runDocumentCaseAnalysis } = vi.hoisted(() => ({ runDocumentCaseAnalysis: vi.fn() }));
vi.mock("./runCaseAnalysis", () => ({ runDocumentCaseAnalysis }));

const { analyzeAndPersistDocument, clearDocumentAnalysisArtifacts } = await import("./analyzeAndPersist");

function makeFakeSupabase(singleResponses: Record<string, unknown[]>) {
  const inserted: { table: string; payload: unknown }[] = [];
  const updated: { table: string; payload: unknown }[] = [];
  const deletedFrom: string[] = [];

  function builder(table: string) {
    const b = {
      insert: vi.fn((payload: unknown) => {
        inserted.push({ table, payload });
        return b;
      }),
      update: vi.fn((payload: unknown) => {
        updated.push({ table, payload });
        return b;
      }),
      delete: vi.fn(() => {
        deletedFrom.push(table);
        return b;
      }),
      select: vi.fn(() => b),
      eq: vi.fn(() => b),
      single: vi.fn(() => Promise.resolve(singleResponses[table]?.shift() ?? { data: null, error: { message: "no more responses queued" } })),
      // The real PostgrestFilterBuilder is itself thenable -- code that
      // calls .then()/.catch() straight on a chain (instead of awaiting
      // it) relies on that, so the fake needs to honor it too.
      then: (onFulfilled: (value: { data: null; error: null }) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled),
    };
    return b;
  }

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: { from: (table: string) => builder(table) } as any,
    inserted,
    updated,
    deletedFrom,
  };
}

const extraction = {
  document_type: "lonnsslipp",
  document_date: "2023-08-14",
  parties: ["Arbeidsgiver AS"],
  amounts: [],
  possible_facts: [
    { statement: "Fakta én", confidence: "high" as const },
    { statement: "Fakta to", confidence: "medium" as const },
  ],
};

beforeEach(() => {
  analyzeDocument.mockReset();
  runDocumentCaseAnalysis.mockReset();
});

describe("analyzeAndPersistDocument", () => {
  it("oppretter claims, evidence_links og assessments for hvert fakta, og kjører saksanalysen med alle claim-id-ene", async () => {
    analyzeDocument.mockResolvedValue(extraction);
    runDocumentCaseAnalysis.mockResolvedValue(null);

    const { client, inserted, updated } = makeFakeSupabase({
      claims: [
        { data: { id: "claim-1" }, error: null },
        { data: { id: "claim-2" }, error: null },
      ],
    });

    const result = await analyzeAndPersistDocument(client, {
      caseId: "case-1",
      documentId: "doc-1",
      fileName: "lonnsslipp.pdf",
      extractedText: "innhold",
    });

    expect(result).toEqual({ status: "done", rejectionReason: null, claimsCreated: 2 });
    expect(inserted.filter((i) => i.table === "claims")).toHaveLength(2);
    expect(inserted.filter((i) => i.table === "evidence_links")).toHaveLength(2);
    expect(inserted.filter((i) => i.table === "claim_assessments")).toHaveLength(2);

    const docUpdate = updated.find(
      (u) => u.table === "documents" && (u.payload as { extraction_status?: string }).extraction_status === "done"
    );
    expect(docUpdate).toBeDefined();

    expect(runDocumentCaseAnalysis).toHaveBeenCalledTimes(1);
    expect(runDocumentCaseAnalysis.mock.calls[0][1]).toMatchObject({
      documentId: "doc-1",
      ownClaimIds: ["claim-1", "claim-2"],
    });
  });

  it("ruller tilbake og markerer dokumentet feilet når KI-analysen kaster, uten å kjøre saksanalyse", async () => {
    analyzeDocument.mockRejectedValue(new Error("KI feilet"));

    const { client, inserted, updated, deletedFrom } = makeFakeSupabase({});

    const result = await analyzeAndPersistDocument(client, {
      caseId: "case-1",
      documentId: "doc-1",
      fileName: "uklar.pdf",
      extractedText: "innhold",
    });

    expect(result.status).toBe("failed");
    expect(result.rejectionReason).toBe("Vi klarte ikke å analysere dokumentet. Du kan prøve analysen på nytt.");
    expect(result.claimsCreated).toBe(0);
    expect(inserted.some((i) => i.table === "claims")).toBe(false);

    // Rollback runs even though nothing was actually created yet -- it's
    // unconditional cleanup, not a check for what needs cleaning.
    expect(deletedFrom).toEqual(expect.arrayContaining(["evidence_links", "documentation_gaps", "claims"]));

    const docUpdate = updated.find((u) => u.table === "documents");
    expect(docUpdate?.payload).toMatchObject({
      extraction_status: "failed",
      extracted_text: "innhold",
      rejection_reason: "Vi klarte ikke å analysere dokumentet. Du kan prøve analysen på nytt.",
    });
    expect(runDocumentCaseAnalysis).not.toHaveBeenCalled();
  });

  it("ruller tilbake alt og markerer feilet -- uten konfliktanalyse -- når ikke alle fakta kunne lagres som claims", async () => {
    analyzeDocument.mockResolvedValue(extraction);

    // First fact's claim insert succeeds; second fails on all 3 retry
    // attempts. A real document/case would never end up with a claim
    // that has no counterpart to pair a conflict against -- this proves
    // it structurally, not just by convention.
    const { client, updated, deletedFrom } = makeFakeSupabase({
      claims: [
        { data: { id: "claim-1" }, error: null },
        { data: null, error: { message: "insert failed" } },
        { data: null, error: { message: "insert failed" } },
        { data: null, error: { message: "insert failed" } },
      ],
    });

    const result = await analyzeAndPersistDocument(client, {
      caseId: "case-1",
      documentId: "doc-1",
      fileName: "lonnsslipp.pdf",
      extractedText: "innhold",
    });

    expect(result).toEqual({
      status: "failed",
      rejectionReason: "Vi klarte ikke å lagre alle opplysningene fra dokumentet. Du kan prøve analysen på nytt.",
      claimsCreated: 0,
    });
    expect(deletedFrom).toEqual(expect.arrayContaining(["evidence_links", "documentation_gaps", "claims"]));

    const docUpdate = updated.find(
      (u) => u.table === "documents" && (u.payload as { extraction_status?: string }).extraction_status === "failed"
    );
    expect(docUpdate).toBeDefined();

    // The structural guarantee behind Fase A.2's konflikt-fix: a
    // case_conflicts row is only ever possible once every one of this
    // document's own facts is confirmed saved -- so an incomplete document
    // never reaches the pass that could create one.
    expect(runDocumentCaseAnalysis).not.toHaveBeenCalled();
  }, 10_000);

  it("er idempotent på nytt forsøk: clearDocumentAnalysisArtifacts fjerner alt et tidligere forsøk kan ha opprettet", async () => {
    const { client, deletedFrom } = makeFakeSupabase({});
    await clearDocumentAnalysisArtifacts(client, { documentId: "doc-1" });
    expect(deletedFrom).toEqual(["evidence_links", "documentation_gaps", "claims"]);
  });
});
