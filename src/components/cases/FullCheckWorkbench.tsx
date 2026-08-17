import { ClaimsList } from "./ClaimsList";
import { DocumentUploadForm } from "./DocumentUploadForm";
import { DocumentsList } from "./DocumentsList";
import { GenerateReportButton } from "./GenerateReportButton";
import { ManualClaimForm } from "./ManualClaimForm";
import { getCaseFacts } from "@/lib/cases/caseFacts";
import { getClaimsWithStatus } from "@/lib/cases/claimsWithStatus";
import type { Case } from "@/lib/cases/types";
import { fullCheckStateFromReport } from "@/lib/reports/reportQueries";
import { createClient } from "@/lib/supabase/server";

export async function FullCheckWorkbench({ caseData }: { caseData: Case }) {
  const supabase = await createClient();

  const [{ data: documents }, claims, facts, { data: latestReport }] = await Promise.all([
    supabase
      .from("documents")
      .select("id, original_filename, extraction_status, rejection_reason")
      .eq("case_id", caseData.id)
      .order("uploaded_at", { ascending: false }),
    getClaimsWithStatus(supabase, caseData.id),
    getCaseFacts(supabase, caseData.id),
    supabase
      .from("reports")
      .select("*")
      .eq("case_id", caseData.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-[18px] font-semibold text-ink">Full sjekk</h2>
        <p className="mt-1.5 text-[13.5px] text-ink-soft">
          Last opp dokumentasjon, se hva systemet finner, og bygg en strukturert rapport.
        </p>
      </div>

      <section>
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
          Saksopplysninger
        </p>
        <div className="mt-2 flex flex-wrap gap-x-8 gap-y-1 text-[13.5px] text-ink-soft">
          <span>Periode: {caseData.tax_period ?? "ikke oppgitt"}</span>
          <span>Beløp: {caseData.amount_kr != null ? `${caseData.amount_kr} kr` : "ikke oppgitt"}</span>
        </div>
        {caseData.description && (
          <p className="mt-2 text-[13.5px] text-ink-soft">{caseData.description}</p>
        )}
        <a
          href={`/min-side/saker/${caseData.id}?steg=enkel-sjekk`}
          className="mt-1.5 inline-block text-[12.5px] text-primary-ink hover:underline"
        >
          Rediger i Enkel sjekk
        </a>
      </section>

      <section>
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
          Dokumenter
        </p>
        <div className="mt-3 flex flex-col gap-3">
          <DocumentUploadForm caseId={caseData.id} />
          <DocumentsList documents={documents ?? []} />
        </div>
      </section>

      <section>
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
          Fakta og påstander
        </p>
        <div className="mt-3 flex flex-col gap-3">
          <ClaimsList claims={claims} caseId={caseData.id} />
          <ManualClaimForm caseId={caseData.id} />
        </div>
      </section>

      {(facts.timeline.length > 0 || facts.parties.length > 0 || facts.amounts.length > 0) && (
        <section className="grid gap-6 sm:grid-cols-3">
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
              Tidslinje
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              {facts.timeline.map((t) => (
                <li key={`${t.documentId}-${t.date}`} className="text-[13px] text-ink-soft">
                  {t.date} — {t.label}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
              Parter
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              {facts.parties.map((p) => (
                <li key={p} className="text-[13px] text-ink-soft">
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
              Beløp
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              {facts.amounts.map((a) => (
                <li key={`${a.documentId}-${a.label}`} className="text-[13px] text-ink-soft">
                  {a.label}: {a.amount_kr} kr
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section>
        <GenerateReportButton
          caseId={caseData.id}
          initialReport={fullCheckStateFromReport(latestReport)}
        />
      </section>
    </div>
  );
}
