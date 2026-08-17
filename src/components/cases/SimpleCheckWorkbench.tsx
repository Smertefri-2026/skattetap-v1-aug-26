import { SimpleCheckForm } from "./SimpleCheckForm";
import { simpleCheckResultFromRow } from "@/lib/cases/simpleCheckQueries";
import type { Case } from "@/lib/cases/types";
import { createClient } from "@/lib/supabase/server";

export async function SimpleCheckWorkbench({ caseData }: { caseData: Case }) {
  const supabase = await createClient();
  const { data: latest } = await supabase
    .from("case_assessments")
    .select("output")
    .eq("case_id", caseData.id)
    .eq("kind", "enkel-sjekk")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-[18px] font-semibold text-ink">Enkel sjekk</h2>
        <p className="mt-1.5 text-[13.5px] text-ink-soft">
          Fortell kort hva saken gjelder. Du får en førstevurdering med en
          gang -- ingen dokumenter nødvendig ennå.
        </p>
      </div>
      <SimpleCheckForm
        caseId={caseData.id}
        defaults={{
          taxPeriod: caseData.tax_period,
          taxType: caseData.tax_type,
          amountKr: caseData.amount_kr,
          description: caseData.description,
        }}
        initialResult={simpleCheckResultFromRow(latest)}
      />
    </div>
  );
}
