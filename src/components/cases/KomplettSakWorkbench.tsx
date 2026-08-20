import Link from "next/link";
import { DocumentationGapsList } from "./DocumentationGapsList";
import { GenerateKomplettSakButton } from "./GenerateKomplettSakButton";
import { getClaimsWithStatus } from "@/lib/cases/claimsWithStatus";
import type { Case } from "@/lib/cases/types";
import { komplettSakStateFromReport } from "@/lib/reports/reportQueries";
import type { KomplettSakReportContent, Report } from "@/lib/reports/types";
import { createClient } from "@/lib/supabase/server";

export async function KomplettSakWorkbench({ caseData }: { caseData: Case }) {
  const supabase = await createClient();

  const [{ data: latestReport }, { data: gaps }, claims] = await Promise.all([
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
      .select("id, description, suggested_action, status, importance, recommended_document, claim_id")
      .eq("case_id", caseData.id)
      .order("created_at", { ascending: false }),
    getClaimsWithStatus(supabase, caseData.id),
  ]);

  const claimStatementById = new Map(claims.map((c) => [c.id, c.statement]));
  const gapsWithClaimContext = (gaps ?? []).map((g) => ({
    ...g,
    affected_claim_statement: g.claim_id ? (claimStatementById.get(g.claim_id) ?? null) : null,
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
          Dokumentasjonshull
        </p>
        <div className="mt-3">
          <DocumentationGapsList caseId={caseData.id} gaps={gapsWithClaimContext} />
        </div>
      </section>
    </div>
  );
}
