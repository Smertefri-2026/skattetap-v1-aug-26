import { describe, expect, it, vi, beforeEach } from "vitest";

const { extractDocumentText } = vi.hoisted(() => ({ extractDocumentText: vi.fn() }));
vi.mock("./extractDocumentText", () => ({ extractDocumentText }));

const { analyzeDocument } = vi.hoisted(() => ({ analyzeDocument: vi.fn() }));
vi.mock("@/lib/ai/documentExtraction", () => ({ analyzeDocument }));

const { processDocumentUpload } = await import("./processUpload");

function makeFakeSupabase(singleResponses: Record<string, unknown[]>) {
  const inserted: { table: string; payload: unknown }[] = [];
  const updated: { table: string; payload: unknown }[] = [];

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
      select: vi.fn(() => b),
      eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      single: vi.fn(() => Promise.resolve(singleResponses[table]?.shift())),
    };
    return b;
  }

  return {
    client: {
      storage: { from: () => ({ upload: vi.fn(() => Promise.resolve({ error: null })) }) },
      from: (table: string) => builder(table),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    inserted,
    updated,
  };
}

beforeEach(() => {
  extractDocumentText.mockReset();
  analyzeDocument.mockReset();
});

describe("processDocumentUpload", () => {
  it("markerer dokumentet som feilet når tekstuthenting mislykkes, uten å opprette claims", async () => {
    extractDocumentText.mockResolvedValue({
      status: "failed",
      text: null,
      pageCount: null,
      error: "For lite tekst.",
    });

    const { client, inserted, updated } = makeFakeSupabase({
      documents: [{ data: { id: "doc-1" }, error: null }],
    });

    const result = await processDocumentUpload(client, {
      caseId: "case-1",
      fileName: "skanning.pdf",
      mimeType: "application/pdf",
      bytes: new ArrayBuffer(10),
    });

    expect(result.extractionStatus).toBe("failed");
    expect(result.claimsCreated).toBe(0);
    expect(updated.some((u) => u.table === "documents")).toBe(true);
    expect(inserted.some((i) => i.table === "claims")).toBe(false);
    expect(analyzeDocument).not.toHaveBeenCalled();
  });

  it("oppretter én claim + evidence_link + assessment per funnet fakta", async () => {
    extractDocumentText.mockResolvedValue({
      status: "completed",
      text: "innhold",
      pageCount: 1,
      error: null,
    });
    analyzeDocument.mockResolvedValue({
      document_type: "lonnsslipp",
      document_date: "2023-08-14",
      parties: ["Arbeidsgiver AS"],
      amounts: [],
      possible_facts: [
        { statement: "Fakta én", confidence: "high" },
        { statement: "Fakta to", confidence: "medium" },
      ],
    });

    const { client, inserted } = makeFakeSupabase({
      documents: [{ data: { id: "doc-1" }, error: null }],
      claims: [
        { data: { id: "claim-1" }, error: null },
        { data: { id: "claim-2" }, error: null },
      ],
    });

    const result = await processDocumentUpload(client, {
      caseId: "case-1",
      fileName: "lonnsslipp.pdf",
      mimeType: "application/pdf",
      bytes: new ArrayBuffer(10),
    });

    expect(result.extractionStatus).toBe("done");
    expect(result.claimsCreated).toBe(2);
    expect(inserted.filter((i) => i.table === "claims")).toHaveLength(2);
    expect(inserted.filter((i) => i.table === "evidence_links")).toHaveLength(2);

    const assessments = inserted.filter((i) => i.table === "claim_assessments");
    expect(assessments).toHaveLength(2);
    for (const a of assessments) {
      expect(a.payload).toMatchObject({ status: "documented", assessed_by: "system" });
    }
  });

  it("beholder uthentet tekst selv om KI-analysen feiler", async () => {
    extractDocumentText.mockResolvedValue({
      status: "completed",
      text: "innhold",
      pageCount: 1,
      error: null,
    });
    analyzeDocument.mockRejectedValue(new Error("KI feilet"));

    const { client, inserted, updated } = makeFakeSupabase({
      documents: [{ data: { id: "doc-1" }, error: null }],
    });

    const result = await processDocumentUpload(client, {
      caseId: "case-1",
      fileName: "uklar.pdf",
      mimeType: "application/pdf",
      bytes: new ArrayBuffer(10),
    });

    expect(result.extractionStatus).toBe("done");
    expect(result.rejectionReason).toContain("KI-analysen");
    expect(result.claimsCreated).toBe(0);
    expect(inserted.some((i) => i.table === "claims")).toBe(false);
    const docUpdate = updated.find((u) => u.table === "documents");
    expect(docUpdate?.payload).toMatchObject({ extracted_text: "innhold" });
  });
});
