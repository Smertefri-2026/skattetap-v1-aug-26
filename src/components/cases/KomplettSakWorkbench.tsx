import Link from "next/link";
import { DocumentMap, type DocumentMapEntry } from "./DocumentMap";
import { DocumentationGapsList } from "./DocumentationGapsList";
import { GenerateKomplettSakButton } from "./GenerateKomplettSakButton";
import { getCaseConflicts } from "@/lib/cases/conflicts";
import { getClaimsWithStatus } from "@/lib/cases/claimsWithStatus";
import type { Case } from "@/lib/cases/types";
import { komplettSakStateFromReport } from "@/lib/reports/reportQueries";
import type { KomplettSakReportContent, Report } from "@/lib/reports/types";
import { createClient } from "@/lib/supabase/server";

export async function KomplettSakWorkbench({ caseData }: { caseData: Case }) {
  const supabase = await createClient();

  const [{ data: latestReport }, { data: gaps }, claims, conflicts, { data: documents }] = await Promise.all([
    supabase
      .from("reports")
      .select("*")
      .eq("case_id", caseData.id)
      .eq("type", "komplett-sak")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("documentation_gaps")
      .select(
        "id, description, suggested_action, status, importance, recommended_document, claim_id, source_document_id, resolved_at"
      )
      .eq("case_id", caseData.id)
      .order("created_at", { ascending: false }),
    getClaimsWithStatus(supabase, caseData.id),
    getCaseConflicts(supabase, caseData.id),
    supabase
      .from("documents")
      .select("id, original_filename, case_analysis")
      .eq("case_id", caseData.id)
      .eq("extraction_status", "done")
      .order("uploaded_at", { ascending: false }),
  ]);

  const claimStatementById = new Map(claims.map((c) => [c.id, c.statement]));
  const documentFilenameById = new Map((documents ?? []).map((d) => [d.id, d.original_filename as string]));
  const gapsWithClaimContext = (gaps ?? []).map((g) => ({
    ...g,
    affected_claim_statement: g.claim_id ? (claimStatementById.get(g.claim_id) ?? null) : null,
    source_document_filename: g.source_document_id ? (documentFilenameById.get(g.source_document_id) ?? null) : null,
  }));

  const factCountByDoc = new Map<string, number>();
  for (const c of claims) {
    if (c.source_document_id) factCountByDoc.set(c.source_document_id, (factCountByDoc.get(c.source_document_id) ?? 0) + 1);
  }

  const conflictCountByDoc = new Map<string, number>();
  for (const conflict of conflicts.filter((c) => c.status === "open")) {
    for (const docId of [conflict.claimA.sourceDocumentId, conflict.claimB.sourceDocumentId]) {
      if (docId) conflictCountByDoc.set(docId, (conflictCountByDoc.get(docId) ?? 0) + 1);
    }
  }

  const gapCountByDoc = new Map<string, number>();
  for (const g of gaps ?? []) {
    if (g.status === "open" && g.source_document_id) {
      gapCountByDoc.set(g.source_document_id, (gapCountByDoc.get(g.source_document_id) ?? 0) + 1);
    }
  }

  const documentMapEntries: DocumentMapEntry[] = (documents ?? []).map((d) => ({
    id: d.id as string,
    fileName: d.original_filename as string,
    credibility: (d.case_analysis as { credibility?: "high" | "medium" | "low" } | null)?.credibility ?? null,
    factCount: factCountByDoc.get(d.id as string) ?? 0,
    conflictCount: conflictCountByDoc.get(d.id as string) ?? 0,
    gapCount: gapCountByDoc.get(d.id as string) ?? 0,
  }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-[18px] font-semibold text-ink">Komplett sak</h2>
        <p className="mt-1.5 max-w-2xl text-[13.5px] text-ink-soft">
          En dypere analyse enn Full sjekk: samlet kronologi, konfliktdeteksjon mellom
          dokumenter og påstander, vurdering av hvor sterk hver enkelt påstand står,
          dokumentasjonshull med konkrete forslag, økonomisk sammenstilling og en
          skatterettslig vurdering koblet direkte til fakta -- bygget på alt som allerede
          finnes i saken.
        </p>
        <Link
          href={`/min-side/saker/${caseData.id}?steg=full-sjekk`}
          className="mt-1.5 inline-block text-[12.5px] text-primary-ink hover:underline"
        >
          Se grunnlaget i Full sjekk
        </Link>
      </div>

      <section>
        <GenerateKomplettSakButton
          caseId={caseData.id}
          initialReport={komplettSakStateFromReport(
            latestReport as Report<KomplettSakReportContent> | null
          )}
        />
      </section>

      <section>
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
          Dokumentkart
        </p>
        <p className="mt-1 text-[12.5px] text-ink-soft">
          Hvert dokument og hvor mange fakta, konflikter og åpne hull det henger sammen med.
        </p>
        <div className="mt-3">
          <DocumentMap documents={documentMapEntries} />
        </div>
      </section>

      <section>
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
          Dokumentasjonshull
        </p>
        <div className="mt-3">
          <DocumentationGapsList caseId={caseData.id} gaps={gapsWithClaimContext} />
        </div>
      </section>
    </div>
  );
}
