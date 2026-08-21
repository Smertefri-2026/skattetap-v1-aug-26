import { describe, expect, it, vi, beforeEach } from "vitest";

const { extractDocumentText } = vi.hoisted(() => ({ extractDocumentText: vi.fn() }));
vi.mock("./extractDocumentText", () => ({ extractDocumentText }));

const { analyzeAndPersistDocument } = vi.hoisted(() => ({ analyzeAndPersistDocument: vi.fn() }));
vi.mock("./analyzeAndPersist", () => ({ analyzeAndPersistDocument }));

const { processDocumentUpload } = await import("./processUpload");

function makeFakeSupabase(singleResponses: Record<string, unknown[]>) {
  const updated: { table: string; payload: unknown }[] = [];

  function builder(table: string) {
    const b = {
      insert: vi.fn(() => b),
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
    updated,
  };
}

beforeEach(() => {
  extractDocumentText.mockReset();
  analyzeAndPersistDocument.mockReset();
});

describe("processDocumentUpload", () => {
  it("markerer dokumentet som feilet når tekstuthenting mislykkes, uten å starte analyse", async () => {
    extractDocumentText.mockResolvedValue({
      status: "failed",
      text: null,
      pageCount: null,
      error: "For lite tekst.",
    });

    const { client, updated } = makeFakeSupabase({
      documents: [{ data: { id: "doc-1" }, error: null }],
    });

    const result = await processDocumentUpload(client, {
      caseId: "case-1",
      fileName: "skanning.pdf",
      mimeType: "application/pdf",
      bytes: new ArrayBuffer(10),
    });

    expect(result).toEqual({
      documentId: "doc-1",
      extractionStatus: "failed",
      rejectionReason: "For lite tekst.",
      claimsCreated: 0,
    });
    expect(
      updated.some(
        (u) =>
          u.table === "documents" &&
          (u.payload as { extraction_status?: string }).extraction_status === "failed"
      )
    ).toBe(true);
    expect(analyzeAndPersistDocument).not.toHaveBeenCalled();
  });

  it("delegerer til analyzeAndPersistDocument når teksten hentes ut, og returnerer resultatet dets uendret", async () => {
    extractDocumentText.mockResolvedValue({
      status: "completed",
      text: "innhold",
      pageCount: 1,
      error: null,
    });
    analyzeAndPersistDocument.mockResolvedValue({
      status: "done",
      rejectionReason: null,
      claimsCreated: 2,
    });

    const { client } = makeFakeSupabase({
      documents: [{ data: { id: "doc-1" }, error: null }],
    });

    const result = await processDocumentUpload(client, {
      caseId: "case-1",
      fileName: "lonnsslipp.pdf",
      mimeType: "application/pdf",
      bytes: new ArrayBuffer(10),
      userId: "user-1",
    });

    expect(analyzeAndPersistDocument).toHaveBeenCalledWith(client, {
      caseId: "case-1",
      documentId: "doc-1",
      fileName: "lonnsslipp.pdf",
      extractedText: "innhold",
      userId: "user-1",
    });
    expect(result).toEqual({
      documentId: "doc-1",
      extractionStatus: "done",
      rejectionReason: null,
      claimsCreated: 2,
    });
  });
});
