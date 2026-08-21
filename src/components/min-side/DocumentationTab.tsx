import { DocumentList, type DocumentRow } from "./DocumentList";
import { GlobalDocumentUpload } from "./GlobalDocumentUpload";
import { createClient } from "@/lib/supabase/server";

export async function DocumentationTab() {
  const supabase = await createClient();
  const [{ data: cases }, { data: documents }] = await Promise.all([
    supabase.from("cases").select("id, title").neq("status", "arkivert").order("title"),
    supabase
      .from("documents")
      .select("id, original_filename, extraction_status, case_id, uploaded_at, cases(title)")
      .order("uploaded_at", { ascending: false }),
  ]);

  const casesList = cases ?? [];
  const rows: DocumentRow[] = (documents ?? []).map((doc) => ({
    id: doc.id,
    original_filename: doc.original_filename,
    extraction_status: doc.extraction_status,
    case_id: doc.case_id,
    uploaded_at: doc.uploaded_at,
    caseTitle: (doc.cases as unknown as { title: string } | null)?.title ?? "Sak",
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-semibold text-ink">Dokumentasjon</h2>
        <GlobalDocumentUpload cases={casesList} />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface-alt p-8 text-center">
          <p className="text-[14.5px] font-semibold text-ink">Ingen dokumenter ennå</p>
          <p className="mt-1 text-[13.5px] text-ink-soft">
            Last opp dokumentasjon til en sak for å bygge saksbildet.
          </p>
        </div>
      ) : (
        <DocumentList documents={rows} cases={casesList} />
      )}
    </div>
  );
}
