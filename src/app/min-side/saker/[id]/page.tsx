import { notFound } from "next/navigation";
import { CaseContextPanel } from "@/components/cases/CaseContextPanel";
import { CaseWorkbenchPlaceholder } from "@/components/cases/CaseWorkbenchPlaceholder";
import { FullCheckWorkbench } from "@/components/cases/FullCheckWorkbench";
import { KomplettSakWorkbench } from "@/components/cases/KomplettSakWorkbench";
import { PurchaseGate } from "@/components/cases/PurchaseGate";
import { SimpleCheckWorkbench } from "@/components/cases/SimpleCheckWorkbench";
import { SkatteendringWorkbench } from "@/components/cases/SkatteendringWorkbench";
import { getDocumentationSummary } from "@/lib/cases/documentationSummary";
import { stageOrder } from "@/lib/cases/labels";
import type { Case, CaseStage } from "@/lib/cases/types";
import { createClient } from "@/lib/supabase/server";

function isStage(value: string | undefined): value is CaseStage {
  return stageOrder.includes(value as CaseStage);
}

export default async function CaseWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ steg?: string; checkout?: string }>;
}) {
  const { id } = await params;
  const { steg, checkout } = await searchParams;

  const supabase = await createClient();
  const { data: caseData } = await supabase
    .from("cases")
    .select("*")
    .eq("id", id)
    .single<Case>();

  if (!caseData) notFound();

  const activeStage: CaseStage = isStage(steg) ? steg : caseData.stage;
  const documentation = await getDocumentationSummary(supabase, caseData.id);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-ink">{caseData.title}</h1>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        <div className="flex-1">
          {activeStage === "enkel-sjekk" && <SimpleCheckWorkbench caseData={caseData} />}
          {activeStage === "full-sjekk" && (
            <PurchaseGate
              caseId={caseData.id}
              productCode="full-sjekk"
              checkoutPending={checkout === "success"}
            >
              <FullCheckWorkbench caseData={caseData} />
            </PurchaseGate>
          )}
          {activeStage === "skatteendring" && (
            <PurchaseGate
              caseId={caseData.id}
              productCode="skatteendring"
              checkoutPending={checkout === "success"}
            >
              <SkatteendringWorkbench caseData={caseData} />
            </PurchaseGate>
          )}
          {activeStage === "komplett-sak" && (
            <PurchaseGate
              caseId={caseData.id}
              productCode="komplett-sak"
              checkoutPending={checkout === "success"}
            >
              <KomplettSakWorkbench caseData={caseData} />
            </PurchaseGate>
          )}
          {activeStage === "strategisk-utredning" && (
            <CaseWorkbenchPlaceholder stage={activeStage} />
          )}
        </div>
        <CaseContextPanel
          caseData={caseData}
          activeStage={activeStage}
          documentation={documentation}
        />
      </div>
    </main>
  );
}
