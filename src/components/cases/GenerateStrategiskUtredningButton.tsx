"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/design-system";
import {
  generateStrategiskUtredningReport,
  type StrategiskUtredningReportState,
} from "@/lib/reports/strategiskUtredningActions";
import { StrategiskUtredningReportView } from "./StrategiskUtredningReportView";

function SubmitButton({ hasReport }: { hasReport: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending
        ? "Bygger den strategiske utredningen..."
        : hasReport
          ? "Bygg ny strategisk utredning"
          : "Bygg strategisk utredning"}
    </Button>
  );
}

const initialState: StrategiskUtredningReportState = { status: "idle" };

export function GenerateStrategiskUtredningButton({
  caseId,
  initialReport,
}: {
  caseId: string;
  initialReport?: StrategiskUtredningReportState & { status: "success" };
}) {
  const [state, formAction] = useActionState(
    generateStrategiskUtredningReport.bind(null, caseId),
    initialReport ?? initialState
  );

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction}>
        <SubmitButton hasReport={state.status === "success"} />
      </form>
      {state.status === "error" && <p className="text-[13px] text-danger-ink">{state.error}</p>}
      {state.status === "success" && (
        <StrategiskUtredningReportView report={state.report} caseId={caseId} />
      )}
    </div>
  );
}
