"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/design-system";
import {
  generateKomplettSakReport,
  type KomplettSakReportState,
} from "@/lib/reports/komplettSakActions";
import { KomplettSakReportView } from "./KomplettSakReportView";

function SubmitButton({ hasReport }: { hasReport: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending
        ? "Bygger den komplette saksmappen..."
        : hasReport
          ? "Bygg ny saksmappe"
          : "Bygg komplett saksmappe"}
    </Button>
  );
}

const initialState: KomplettSakReportState = { status: "idle" };

export function GenerateKomplettSakButton({
  caseId,
  initialReport,
}: {
  caseId: string;
  initialReport?: KomplettSakReportState & { status: "success" };
}) {
  const [state, formAction] = useActionState(
    generateKomplettSakReport.bind(null, caseId),
    initialReport ?? initialState
  );

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction}>
        <SubmitButton hasReport={state.status === "success"} />
      </form>
      {state.status === "error" && <p className="text-[13px] text-danger-ink">{state.error}</p>}
      {state.status === "success" && (
        <KomplettSakReportView report={state.report} caseId={caseId} />
      )}
    </div>
  );
}
