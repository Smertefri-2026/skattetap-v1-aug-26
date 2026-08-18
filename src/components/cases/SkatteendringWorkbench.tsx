import Link from "next/link";
import { GenerateSkatteendringButton } from "./GenerateSkatteendringButton";
import { SkatteetatenResponseUploadForm } from "./SkatteetatenResponseUploadForm";
import { SkatteetatenResponsesList } from "./SkatteetatenResponsesList";
import type { Case } from "@/lib/cases/types";
import { skatteendringStateFromReport } from "@/lib/reports/reportQueries";
import type { Report, SkatteendringReportContent } from "@/lib/reports/types";
import { createClient } from "@/lib/supabase/server";

export async function SkatteendringWorkbench({ caseData }: { caseData: Case }) {
  const supabase = await createClient();

  const [{ data: latestReport }, { data: responses }] = await Promise.all([
    supabase
      .from("reports")
      .select("*")
      .eq("case_id", caseData.id)
      .eq("type", "skatteendring")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("skatteetaten_responses")
      .select("id, interpretation, created_at")
      .eq("case_id", caseData.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-[18px] font-semibold text-ink">Skatteendring</h2>
        <p className="mt-1.5 text-[13.5px] text-ink-soft">
          Bygger videre på dokumentasjonen og de dokumenterte fakta fra Full sjekk --
          ingenting tastes inn på nytt.
        </p>
        <Link
          href={`/min-side/saker/${caseData.id}?steg=full-sjekk`}
          className="mt-1.5 inline-block text-[12.5px] text-primary-ink hover:underline"
        >
          Se grunnlaget i Full sjekk
        </Link>
      </div>

      <section>
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
          Forslag til skatteendring
        </p>
        <div className="mt-3">
          <GenerateSkatteendringButton
            caseId={caseData.id}
            initialReport={skatteendringStateFromReport(
              latestReport as Report<SkatteendringReportContent> | null
            )}
          />
        </div>
      </section>

      <section>
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
          Svar fra Skatteetaten
        </p>
        <div className="mt-3 flex flex-col gap-4">
          <SkatteetatenResponseUploadForm caseId={caseData.id} />
          <SkatteetatenResponsesList responses={responses ?? []} />
        </div>
      </section>
    </div>
  );
}
