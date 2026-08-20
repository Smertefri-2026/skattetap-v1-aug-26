import { GenerateStrategiskUtredningButton } from "./GenerateStrategiskUtredningButton";
import type { Case } from "@/lib/cases/types";
import { strategiskUtredningStateFromReport } from "@/lib/reports/reportQueries";
import type { Report, StrategiskUtredningReportContent } from "@/lib/reports/types";
import { createClient } from "@/lib/supabase/server";

export async function StrategiskUtredningWorkbench({ caseData }: { caseData: Case }) {
  const supabase = await createClient();

  const [{ data: latestReport }, { count: totalCaseCount }] = await Promise.all([
    supabase
      .from("reports")
      .select("*")
      .eq("case_id", caseData.id)
      .eq("type", "strategisk-utredning")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // RLS already scopes this to the logged-in user's own cases -- no
    // explicit user_id filter needed, same as every other cases query.
    supabase.from("cases").select("id", { count: "exact", head: true }),
  ]);

  const hasOnlyOneCase = (totalCaseCount ?? 0) <= 1;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-[18px] font-semibold text-ink">Strategisk utredning</h2>
        <p className="mt-1.5 max-w-2xl text-[13.5px] text-ink-soft">
          Den mest avanserte analysen Skattetap kan produsere: mønstre på tvers av dine saker og
          skatteår, sammenligning av fakta og utfall, fristvurdering, samlet økonomisk
          eksponering, og flere alternative strategier -- ingen presentert som den sikre veien
          videre.
        </p>
      </div>

      {hasOnlyOneCase && (
        <div className="rounded-md border border-warning bg-warning-subtle p-4">
          <p className="text-[13px] font-medium text-warning-ink">
            Du har foreløpig bare denne ene saken registrert.
          </p>
          <p className="mt-1 text-[12.5px] text-warning-ink">
            Mønstre og sammenligninger mellom saker/år krever flere saker å sammenligne med, så de
            delene av utredningen vil ha begrenset grunnlag. Vurderingen av denne saken alene --
            fristvurdering, økonomisk eksponering og strategier -- er fortsatt fullverdig.
          </p>
        </div>
      )}

      <section>
        <GenerateStrategiskUtredningButton
          caseId={caseData.id}
          initialReport={strategiskUtredningStateFromReport(
            latestReport as Report<StrategiskUtredningReportContent> | null
          )}
        />
      </section>
    </div>
  );
}
