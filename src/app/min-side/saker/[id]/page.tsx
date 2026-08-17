import { notFound } from "next/navigation";
import { CaseContextPanel } from "@/components/cases/CaseContextPanel";
import { CaseWorkbenchPlaceholder } from "@/components/cases/CaseWorkbenchPlaceholder";
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
  searchParams: Promise<{ steg?: string }>;
}) {
  const { id } = await params;
  const { steg } = await searchParams;

  const supabase = await createClient();
  const { data: caseData } = await supabase
    .from("cases")
    .select("*")
    .eq("id", id)
    .single<Case>();

  if (!caseData) notFound();

  const activeStage: CaseStage = isStage(steg) ? steg : caseData.stage;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-ink">{caseData.title}</h1>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        <div className="flex-1">
          <CaseWorkbenchPlaceholder stage={activeStage} />
        </div>
        <CaseContextPanel caseData={caseData} activeStage={activeStage} />
      </div>
    </main>
  );
}
