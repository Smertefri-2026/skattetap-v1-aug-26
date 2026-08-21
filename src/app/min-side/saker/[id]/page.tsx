import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CaseContextPanel } from "@/components/cases/CaseContextPanel";
import { FullCheckWorkbench } from "@/components/cases/FullCheckWorkbench";
import { KomplettSakWorkbench } from "@/components/cases/KomplettSakWorkbench";
import { PurchaseGate } from "@/components/cases/PurchaseGate";
import { SaksbildeView } from "@/components/cases/SaksbildeView";
import { SimpleCheckWorkbench } from "@/components/cases/SimpleCheckWorkbench";
import { SkatteendringWorkbench } from "@/components/cases/SkatteendringWorkbench";
import { StrategiskUtredningWorkbench } from "@/components/cases/StrategiskUtredningWorkbench";
import { getSidebarOpenItems } from "@/lib/cases/openItems";
import { stageOrder } from "@/lib/cases/labels";
import type { Case, CaseStage } from "@/lib/cases/types";
import { getCaseEntitlement } from "@/lib/products/entitlement";
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

  // Min saksbehandler is no longer a separate view -- it lives inside
  // saksbilde now (see SaksbildeView.tsx), so this old URL just becomes an
  // anchor into that same page instead of a dead/duplicate surface.
  if (steg === "saksbehandler") {
    redirect(`/min-side/saker/${id}?steg=saksbilde#saksbehandler`);
  }

  const supabase = await createClient();
  const { data: caseData } = await supabase
    .from("cases")
    .select("*")
    .eq("id", id)
    .single<Case>();

  if (!caseData) notFound();

  const activeStage: CaseStage = isStage(steg) ? steg : caseData.stage;
  const showSaksbilde = !steg || steg === "saksbilde";
  const [entitlement, sidebarOpenItems] = await Promise.all([
    getCaseEntitlement(supabase, caseData.id),
    getSidebarOpenItems(supabase, caseData.id),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-col gap-1">
        {!showSaksbilde && (
          <Link
            href={`/min-side/saker/${caseData.id}`}
            className="text-[12.5px] font-medium text-ink-faint hover:text-ink-soft"
          >
            ← Tilbake til saksbildet
          </Link>
        )}
        <h1 className="text-2xl font-semibold text-ink">{caseData.title}</h1>
      </div>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        <div className="flex-1">
          {showSaksbilde && <SaksbildeView caseData={caseData} />}
          {!showSaksbilde && (
            <>
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
                <PurchaseGate
                  caseId={caseData.id}
                  productCode="strategisk-utredning"
                  checkoutPending={checkout === "success"}
                >
                  <StrategiskUtredningWorkbench caseData={caseData} />
                </PurchaseGate>
              )}
            </>
          )}
        </div>
        <CaseContextPanel
          caseData={caseData}
          activeStage={activeStage}
          entitlement={entitlement}
          singleOpenGapId={sidebarOpenItems.singleOpenGapId}
          otherOpenItems={sidebarOpenItems.otherOpenItems}
        />
      </div>
    </main>
  );
}
