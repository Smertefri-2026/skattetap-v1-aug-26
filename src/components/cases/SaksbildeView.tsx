import { Badge } from "@/components/design-system";
import { ClaimsList } from "./ClaimsList";
import { CaseTimelineView } from "./CaseTimelineView";
import { ConflictWorkspace } from "./ConflictWorkspace";
import { DocumentInsightList } from "./DocumentInsightList";
import { DocumentUploadForm } from "./DocumentUploadForm";
import { DocumentationGapsList } from "./DocumentationGapsList";
import { FinancialPotentialCard, type DocumentAmountRow } from "./FinancialPotentialCard";
import { NextActionCard } from "./NextActionCard";
import { ReportHistoryList } from "./ReportHistoryList";
import { SaksbehandlerCallout } from "./SaksbehandlerCallout";
import { getCaseConflicts } from "@/lib/cases/conflicts";
import { getClaimsWithStatus } from "@/lib/cases/claimsWithStatus";
import { statusLabels, statusTones } from "@/lib/cases/labels";
import { buildCaseTimeline } from "@/lib/cases/timeline";
import type { Case } from "@/lib/cases/types";
import { getCaseEntitlement } from "@/lib/products/entitlement";
import { createClient } from "@/lib/supabase/server";

/**
 * The living case picture: one continuously-updated view of everything
 * known about a case, assembled from data every existing engine already
 * writes (documents, claims, claim_assessments, evidence_links,
 * documentation_gaps) plus the document-level case_analysis pass. Nothing
 * here is generated on demand the way a report is -- it just reflects
 * whatever is true about the case right now. Reports remain a separate,
 * point-in-time export of a slice of this same state, not the other way
 * around.
 */
export async function SaksbildeView({ caseData }: { caseData: Case }) {
  const supabase = await createClient();

  const [{ data: documents }, claims, { data: gaps }, conflicts, entitlement, { data: reports }] = await Promise.all([
    supabase
      .from("documents")
      .select("id, original_filename, extraction_status, rejection_reason, ai_extraction, case_analysis")
      .eq("case_id", caseData.id)
      .order("uploaded_at", { ascending: false }),
    getClaimsWithStatus(supabase, caseData.id),
    supabase
      .from("documentation_gaps")
      .select("id, description, suggested_action, status, importance, recommended_document, claim_id")
      .eq("case_id", caseData.id)
      .order("created_at", { ascending: false }),
    getCaseConflicts(supabase, caseData.id),
    getCaseEntitlement(supabase, caseData.id),
    supabase
      .from("reports")
      .select("id, type, created_at")
      .eq("case_id", caseData.id)
      .order("created_at", { ascending: false }),
  ]);

  const timeline = await buildCaseTimeline(supabase, caseData.id, caseData.tax_period);

  const documented = claims.filter((c) => c.status === "documented").length;
  const conflicting = claims.filter((c) => c.status === "conflicting").length;
  const undocumented = claims.filter((c) => c.status === "undocumented").length;

  const claimStatementById = new Map(claims.map((c) => [c.id, c.statement]));
  const gapsWithClaimContext = (gaps ?? []).map((g) => ({
    ...g,
    affected_claim_statement: g.claim_id ? (claimStatementById.get(g.claim_id) ?? null) : null,
  }));

  const documentAmounts: DocumentAmountRow[] = (documents ?? []).flatMap((d) => {
    const extraction = d.ai_extraction as { amounts?: { label: string; amount_kr: number }[] } | null;
    return (extraction?.amounts ?? []).map((a) => ({
      documentFileName: d.original_filename as string,
      label: a.label,
      amountKr: a.amount_kr,
    }));
  });

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
            Saken akkurat nå
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTones[caseData.status]}>{statusLabels[caseData.status]}</Badge>
            <Badge tone="info">{entitlement ? entitlement.name : "Enkel sjekk (gratis)"}</Badge>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-6">
          <div>
            <p className="text-[20px] font-semibold text-ink">{documented}</p>
            <p className="text-[12px] text-ink-soft">dokumenterte fakta</p>
          </div>
          <div>
            <p className="text-[20px] font-semibold text-ink">{undocumented}</p>
            <p className="text-[12px] text-ink-soft">udokumenterte fakta</p>
          </div>
          <a href="#konflikter" className="hover:opacity-80">
            <p className="text-[20px] font-semibold text-warning-ink">{conflicting}</p>
            <p className="text-[12px] text-ink-soft">motstridende fakta</p>
          </a>
          <div>
            <p className="text-[20px] font-semibold text-ink">
              {gaps?.filter((g) => g.status === "open").length ?? 0}
            </p>
            <p className="text-[12px] text-ink-soft">åpne dokumentasjonshull</p>
          </div>
        </div>
      </section>

      <NextActionCard
        caseId={caseData.id}
        stage={caseData.stage}
        action={caseData.next_action}
        reasoning={caseData.next_action_reasoning}
        actionType={caseData.next_action_type}
      />

      <SaksbehandlerCallout caseId={caseData.id} />

      <FinancialPotentialCard userStatedAmountKr={caseData.amount_kr} documentAmounts={documentAmounts} />

      <section id="dokumenter">
        <h2 className="text-[16px] font-semibold text-ink">Dokumenter</h2>
        <div className="mt-4">
          <DocumentUploadForm caseId={caseData.id} />
        </div>
        <div className="mt-4">
          <DocumentInsightList documents={documents ?? []} />
        </div>
      </section>

      <section>
        <h2 className="text-[16px] font-semibold text-ink">Tidslinje</h2>
        <div className="mt-4">
          <CaseTimelineView timeline={timeline} />
        </div>
      </section>

      <section id="fakta">
        <h2 className="text-[16px] font-semibold text-ink">Fakta og påstander</h2>
        <div className="mt-4">
          <ClaimsList claims={claims} caseId={caseData.id} />
        </div>
      </section>

      <section id="konflikter">
        <h2 className="text-[16px] font-semibold text-ink">Konflikter</h2>
        <p className="mt-1.5 max-w-2xl text-[13px] text-ink-soft">
          Her ligger hver motsigelse Bevismotoren har funnet mellom dokumentene i saken, én og én: hvilken
          påstand som strider mot hvilken, hvorfor, og hva som konkret avklarer den.
        </p>
        <div className="mt-4">
          <ConflictWorkspace caseId={caseData.id} conflicts={conflicts} />
        </div>
      </section>

      <section>
        <h2 className="text-[16px] font-semibold text-ink">Dokumentasjonshull</h2>
        <div className="mt-4">
          <DocumentationGapsList caseId={caseData.id} gaps={gapsWithClaimContext} />
        </div>
      </section>

      <section>
        <h2 className="text-[16px] font-semibold text-ink">Rapporthistorikk</h2>
        <div className="mt-4">
          <ReportHistoryList
            caseId={caseData.id}
            reports={(reports ?? []).map((r) => ({ id: r.id, type: r.type, createdAt: r.created_at }))}
          />
        </div>
      </section>
    </div>
  );
}
