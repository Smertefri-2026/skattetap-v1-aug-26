import { describe, expect, it, vi, beforeEach } from "vitest";

const { documentCaseAnalysisEngine } = vi.hoisted(() => ({ documentCaseAnalysisEngine: vi.fn() }));
vi.mock("./caseAnalysisEngine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./caseAnalysisEngine")>();
  return { ...actual, documentCaseAnalysisEngine };
});

const { runDocumentCaseAnalysis } = await import("./runCaseAnalysis");

beforeEach(() => {
  documentCaseAnalysisEngine.mockReset();
});

const extraction = {
  document_type: "lonnsslipp" as const,
  document_date: "2023-08-14",
  parties: ["Arbeidsgiver AS"],
  amounts: [],
  possible_facts: [
    { statement: "Eget fakta 1", confidence: "high" as const },
    { statement: "Eget fakta 2", confidence: "high" as const },
  ],
};

/**
 * "documents" needs a different array back on each of its several calls
 * within one run (the claim step, the other-documents lookup, the final
 * write) -- a plain per-table default can't express that, so it gets its
 * own shift-based queue. Every other table either resolves a fixed array
 * (tableRows, for a plain .select()) or a queued single-row response (for
 * an .insert().select().single() chain).
 */
function makeFakeSupabase(config: {
  documentsSequence: unknown[][];
  tableRows?: Record<string, unknown[]>;
  singleQueue?: Record<string, unknown[]>;
}) {
  const inserted: { table: string; payload: unknown }[] = [];
  const deletedFrom: { table: string; ids: unknown }[] = [];
  const documentsQueue = [...config.documentsSequence];
  let finalCaseAnalysisWrite: unknown;
  let caseAnalysisNullResetCalled = false;

  function builder(table: string) {
    const singleQueue = config.singleQueue?.[table];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b: any = {
      update: vi.fn((payload: unknown) => {
        if (table === "documents" && payload && typeof payload === "object" && "case_analysis" in payload) {
          const value = (payload as { case_analysis: unknown }).case_analysis;
          if (value === null) {
            caseAnalysisNullResetCalled = true;
          } else if (!(typeof value === "object" && value !== null && "_pending" in value)) {
            finalCaseAnalysisWrite = value;
          }
        }
        return b;
      }),
      insert: vi.fn((payload: unknown) => {
        inserted.push({ table, payload });
        return b;
      }),
      delete: vi.fn(() => {
        return {
          in: (_col: string, ids: unknown) => {
            deletedFrom.push({ table, ids });
            return Promise.resolve({ data: null, error: null });
          },
        };
      }),
      select: vi.fn(() => b),
      eq: vi.fn(() => b),
      neq: vi.fn(() => b),
      is: vi.fn(() => b),
      in: vi.fn(() => b),
      order: vi.fn(() => b),
      single: vi.fn(() =>
        Promise.resolve(singleQueue?.shift() ?? { data: null, error: { message: "no queued response" } })
      ),
      then: (onFulfilled: (v: { data: unknown[] | null; error: null }) => unknown, onRejected?: (e: unknown) => unknown) => {
        const data = table === "documents" ? (documentsQueue.shift() ?? []) : (config.tableRows?.[table] ?? []);
        return Promise.resolve({ data, error: null }).then(onFulfilled, onRejected);
      },
    };
    return b;
  }

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: { from: (table: string) => builder(table) } as any,
    inserted,
    deletedFrom,
    getFinalCaseAnalysisWrite: () => finalCaseAnalysisWrite,
    wasCaseAnalysisNullResetCalled: () => caseAnalysisNullResetCalled,
  };
}

const claimA = { id: "claim-A", source_document_id: "other-doc", statement: "Eksisterende fakta" };
const ownClaim1 = { id: "claim-own-1", source_document_id: "doc-1", statement: "Eget fakta 1" };
const ownClaim2 = { id: "claim-own-2", source_document_id: "doc-1", statement: "Eget fakta 2" };

describe("runDocumentCaseAnalysis", () => {
  it("gjennomfører en full analyse: gap, motstrid-par og credibility, og skriver case_analysis til slutt", async () => {
    documentCaseAnalysisEngine.mockResolvedValue({
      keyPoints: ["Et poeng"],
      credibility: "high",
      credibilityReasoning: "Fordi ...",
      contradictions: [{ claimIndex: 1, ownFactIndex: 1, clarifyingQuestion: "Hvilket beløp stemmer?", recommendedDocument: null }],
      supportsClaimIndices: [],
      relatedDocumentIndices: [],
      documentGaps: [{ description: "Mangler kvittering", importance: "høy", recommendedDocument: null }],
      recommendedNextDocuments: [],
    });

    const { client, inserted, getFinalCaseAnalysisWrite } = makeFakeSupabase({
      documentsSequence: [
        [{ id: "doc-1" }], // claim step succeeds
        [{ id: "other-doc", original_filename: "annet.pdf", ai_extraction: { document_type: "kvittering" } }], // other documents
      ],
      tableRows: {
        claims: [claimA, ownClaim1, ownClaim2],
        claim_assessments: [
          { claim_id: "claim-A", status: "documented", reasoning: "x", created_at: "2026-01-01T00:00:00Z" },
          { claim_id: "claim-own-1", status: "documented", reasoning: "x", created_at: "2026-01-01T00:00:00Z" },
          { claim_id: "claim-own-2", status: "documented", reasoning: "x", created_at: "2026-01-01T00:00:00Z" },
        ],
      },
      singleQueue: {
        documentation_gaps: [{ data: { id: "gap-1" }, error: null }],
        evidence_links: [{ data: { id: "link-1" }, error: null }],
        claim_assessments: [{ data: { id: "assessment-1" }, error: null }],
        case_conflicts: [{ data: { id: "conflict-1" }, error: null }],
      },
    });

    const result = await runDocumentCaseAnalysis(client, {
      caseId: "case-1",
      documentId: "doc-1",
      fileName: "lonnsslipp.pdf",
      extraction,
    });

    expect(result).not.toBeNull();
    expect(inserted.find((i) => i.table === "documentation_gaps")).toBeDefined();
    expect(inserted.find((i) => i.table === "case_conflicts")).toMatchObject({
      table: "case_conflicts",
      payload: expect.objectContaining({ claim_a_id: "claim-A", claim_b_id: "claim-own-1" }),
    });

    const finalWrite = getFinalCaseAnalysisWrite() as { credibility?: string } | undefined;
    expect(finalWrite?.credibility).toBe("high");
  });

  it("returnerer null uten å kalle KI-motoren når case_analysis allerede er satt (claimet feiler)", async () => {
    const { client, inserted } = makeFakeSupabase({
      documentsSequence: [[]], // claim step: 0 rows -- already claimed/analyzed
    });

    const result = await runDocumentCaseAnalysis(client, {
      caseId: "case-1",
      documentId: "doc-1",
      fileName: "lonnsslipp.pdf",
      extraction,
    });

    expect(result).toBeNull();
    expect(documentCaseAnalysisEngine).not.toHaveBeenCalled();
    expect(inserted).toHaveLength(0);
  });

  it("ruller tilbake alt denne omgangen opprettet, og nullstiller case_analysis, når et innsett feiler underveis", async () => {
    documentCaseAnalysisEngine.mockResolvedValue({
      keyPoints: [],
      credibility: "medium",
      credibilityReasoning: "...",
      contradictions: [{ claimIndex: 1, ownFactIndex: 1, clarifyingQuestion: "?", recommendedDocument: null }],
      supportsClaimIndices: [],
      relatedDocumentIndices: [],
      documentGaps: [{ description: "Mangler noe", importance: "høy", recommendedDocument: null }],
      recommendedNextDocuments: [],
    });

    const { client, deletedFrom, getFinalCaseAnalysisWrite, wasCaseAnalysisNullResetCalled } = makeFakeSupabase({
      documentsSequence: [[{ id: "doc-1" }], []],
      tableRows: {
        claims: [claimA, ownClaim1, ownClaim2],
        claim_assessments: [],
      },
      singleQueue: {
        // The gap insert succeeds...
        documentation_gaps: [{ data: { id: "gap-1" }, error: null }],
        // ...but the evidence_link insert for the contradiction fails.
        evidence_links: [{ data: null, error: { message: "insert failed" } }],
      },
    });

    const result = await runDocumentCaseAnalysis(client, {
      caseId: "case-1",
      documentId: "doc-1",
      fileName: "lonnsslipp.pdf",
      extraction,
    });

    expect(result).toBeNull();
    // The gap that DID succeed before the failure is rolled back too --
    // never left as a half-finished pass a retry could duplicate on top of.
    expect(deletedFrom.find((d) => d.table === "documentation_gaps")).toBeDefined();
    // case_analysis is reset to null (released), not left as the pending
    // claim sentinel and not left as a partial result.
    expect(getFinalCaseAnalysisWrite()).toBeUndefined();
    expect(wasCaseAnalysisNullResetCalled()).toBe(true);
  });
});
