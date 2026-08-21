import { describe, expect, it, vi, beforeEach } from "vitest";

const { legalQuestionEngine } = vi.hoisted(() => ({ legalQuestionEngine: vi.fn() }));
vi.mock("./legalQuestionEngine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./legalQuestionEngine")>();
  return { ...actual, legalQuestionEngine };
});

const { legalSourceAnalysisEngine } = vi.hoisted(() => ({ legalSourceAnalysisEngine: vi.fn() }));
vi.mock("./legalSourceAnalysisEngine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./legalSourceAnalysisEngine")>();
  return { ...actual, legalSourceAnalysisEngine };
});

const { runLegalAnalysis } = await import("./runLegalAnalysis");

function makeFakeSupabase(config: { tableRows?: Record<string, unknown[]>; singleQueue?: Record<string, unknown[]> }) {
  const inserted: { table: string; payload: unknown }[] = [];
  const updated: { table: string; payload: unknown }[] = [];

  function builder(table: string) {
    const singleQueue = config.singleQueue?.[table];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b: any = {
      insert: vi.fn((payload: unknown) => {
        inserted.push({ table, payload });
        return b;
      }),
      update: vi.fn((payload: unknown) => {
        updated.push({ table, payload });
        return b;
      }),
      select: vi.fn(() => b),
      eq: vi.fn(() => b),
      in: vi.fn(() => b),
      order: vi.fn(() => b),
      limit: vi.fn(() => b),
      single: vi.fn(() =>
        Promise.resolve(singleQueue?.shift() ?? { data: null, error: { message: "no queued response" } })
      ),
      maybeSingle: vi.fn(() => Promise.resolve(singleQueue?.shift() ?? { data: null, error: null })),
      then: (onFulfilled: (v: { data: unknown[]; error: null }) => unknown) =>
        Promise.resolve({ data: config.tableRows?.[table] ?? [], error: null }).then(onFulfilled),
    };
    return b;
  }

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: { from: (table: string) => builder(table) } as any,
    inserted,
    updated,
  };
}

const baseClaim = {
  id: "claim-1",
  case_id: "case-1",
  statement: "Kunden kjøpte utstyr for kr 20 000",
  ai_original_statement: null,
  origin: "ai_suggested" as const,
  source_document_id: "doc-1",
  confirmed_by_user: false,
  created_at: "2026-01-01T00:00:00Z",
};

const baseAssessment = {
  claim_id: "claim-1",
  status: "documented" as const,
  reasoning: "Funnet i dokument.",
  created_at: "2026-01-01T00:00:01Z",
};

const verifiedSource = {
  id: "src-1",
  source_code: "reisefradrag-arbeid",
  source_type: "lov_forskrift",
  citation: null,
  topic: "Reisefradrag",
  short_explanation: "...",
};

beforeEach(() => {
  legalQuestionEngine.mockReset();
  legalSourceAnalysisEngine.mockReset();
});

describe("runLegalAnalysis", () => {
  it("identifiserer rettsspørsmål, lagrer koblinger, og kjører rettskildeanalyse som fullfører run-en", async () => {
    legalQuestionEngine.mockResolvedValue({
      questions: [{ question: "Har kunden rett til fradrag for utstyret?", claimIndices: [1] }],
    });
    legalSourceAnalysisEngine.mockResolvedValue({
      sources: [
        {
          sourceIndex: 1,
          locatorType: "paragraf",
          locatorValue: "§ 6-44",
          bmSummary: "Gir fradrag for kostnaden.",
          relevanceReasoning: "Direkte relevant.",
          supports: "kunden",
        },
      ],
      ourAssessment: "Kildene taler for kunden.",
    });

    const { client, inserted, updated } = makeFakeSupabase({
      tableRows: {
        claims: [baseClaim],
        claim_assessments: [baseAssessment],
        legal_questions: [],
        legal_sources: [verifiedSource],
        legal_question_claims: [{ claim_id: "claim-1" }],
      },
      singleQueue: {
        cases: [{ data: { title: "Sak", tax_type: "naering", description: null }, error: null }],
        legal_questions: [
          { data: { id: "q-1", question: "Har kunden rett til fradrag for utstyret?" }, error: null },
        ],
        legal_analysis_runs: [
          { data: null, error: null }, // completed-run check: none yet
          { data: { id: "run-1" }, error: null }, // insert result
        ],
      },
    });

    await runLegalAnalysis(client, "case-1", "user-1");

    expect(inserted.some((i) => i.table === "legal_questions")).toBe(true);
    expect(inserted.some((i) => i.table === "legal_question_claims")).toBe(true);
    expect(inserted.some((i) => i.table === "legal_analysis_runs")).toBe(true);

    const sourceInsert = inserted.find((i) => i.table === "legal_question_sources");
    expect(sourceInsert?.payload).toMatchObject({
      legal_analysis_run_id: "run-1",
      legal_source_id: "src-1",
      supports: "kunden",
    });

    const assessmentInsert = inserted.find((i) => i.table === "legal_question_assessments");
    expect(assessmentInsert?.payload).toMatchObject({
      legal_analysis_run_id: "run-1",
      our_assessment: "Kildene taler for kunden.",
    });

    const completedUpdate = updated.find(
      (u) => u.table === "legal_analysis_runs" && (u.payload as { status?: string }).status === "completed"
    );
    expect(completedUpdate).toBeDefined();
  });

  it("hopper over identifisering når saken allerede har rettsspørsmål, og over kildeanalyse når spørsmålet allerede har en fullført run", async () => {
    const { client, inserted } = makeFakeSupabase({
      tableRows: {
        claims: [baseClaim],
        claim_assessments: [baseAssessment],
        legal_questions: [{ id: "q-1", question: "Har kunden rett til fradrag for utstyret?" }],
        legal_sources: [],
      },
      singleQueue: {
        cases: [{ data: { title: "Sak", tax_type: "naering", description: null }, error: null }],
        legal_analysis_runs: [{ data: { id: "existing-run" }, error: null }],
      },
    });

    await runLegalAnalysis(client, "case-1");

    expect(legalQuestionEngine).not.toHaveBeenCalled();
    expect(legalSourceAnalysisEngine).not.toHaveBeenCalled();
    expect(inserted.some((i) => i.table === "legal_questions")).toBe(false);
    expect(inserted.some((i) => i.table === "legal_analysis_runs")).toBe(false);
  });

  it("markerer run som failed, ikke completed, når rettskildeanalysen feiler -- uten å lagre halvferdige siteringer", async () => {
    legalSourceAnalysisEngine.mockRejectedValue(new Error("KI feilet"));

    const { client, updated, inserted } = makeFakeSupabase({
      tableRows: {
        claims: [baseClaim],
        claim_assessments: [baseAssessment],
        legal_questions: [{ id: "q-1", question: "Har kunden rett til fradrag for utstyret?" }],
        legal_sources: [verifiedSource],
        legal_question_claims: [{ claim_id: "claim-1" }],
      },
      singleQueue: {
        cases: [{ data: { title: "Sak", tax_type: "naering", description: null }, error: null }],
        legal_analysis_runs: [
          { data: null, error: null },
          { data: { id: "run-1" }, error: null },
        ],
      },
    });

    await runLegalAnalysis(client, "case-1");

    expect(inserted.some((i) => i.table === "legal_question_sources")).toBe(false);
    expect(inserted.some((i) => i.table === "legal_question_assessments")).toBe(false);
    const failedUpdate = updated.find(
      (u) => u.table === "legal_analysis_runs" && (u.payload as { status?: string }).status === "failed"
    );
    expect(failedUpdate).toBeDefined();
  });
});
