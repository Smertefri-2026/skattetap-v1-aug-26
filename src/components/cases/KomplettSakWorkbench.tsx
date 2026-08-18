import Link from "next/link";
import { GenerateKomplettSakButton } from "./GenerateKomplettSakButton";
import type { Case } from "@/lib/cases/types";
import { komplettSakStateFromReport } from "@/lib/reports/reportQueries";
import type { KomplettSakReportContent, Report } from "@/lib/reports/types";
import { createClient } from "@/lib/supabase/server";

export async function KomplettSakWorkbench({ caseData }: { caseData: Case }) {
  const supabase = await createClient();

  const { data: latestReport } = await supabase
    .from("reports")
    .select("*")
    .eq("case_id", caseData.id)
    .eq("type", "komplett-sak")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

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
    </div>
  );
}
