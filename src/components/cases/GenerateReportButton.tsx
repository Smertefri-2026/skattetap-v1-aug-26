"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/design-system";
import { generateFullCheckReport, type FullCheckReportState } from "@/lib/reports/reportActions";
import { FullCheckReportView } from "./FullCheckReportView";

function SubmitButton({ hasReport }: { hasReport: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Genererer rapport..." : hasReport ? "Generer ny rapport" : "Generer Full sjekk-rapport"}
    </Button>
  );
}

const initialState: FullCheckReportState = { status: "idle" };

export function GenerateReportButton({
  caseId,
  initialReport,
}: {
  caseId: string;
  initialReport?: FullCheckReportState & { status: "success" };
}) {
  const [state, formAction] = useActionState(
    generateFullCheckReport.bind(null, caseId),
    initialReport ?? initialState
  );

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction}>
        <SubmitButton hasReport={state.status === "success"} />
      </form>
      {state.status === "error" && <p className="text-[13px] text-danger-ink">{state.error}</p>}
      {state.status === "success" && (
        <FullCheckReportView report={state.report} caseId={caseId} />
      )}
    </div>
  );
}
