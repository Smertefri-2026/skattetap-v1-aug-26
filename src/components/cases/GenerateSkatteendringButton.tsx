"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/design-system";
import {
  generateSkatteendringReport,
  type SkatteendringReportState,
} from "@/lib/reports/skatteendringActions";
import { SkatteendringProposalView } from "./SkatteendringProposalView";

function SubmitButton({ hasReport }: { hasReport: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Genererer forslag..." : hasReport ? "Generer nytt forslag" : "Generer forslag til skatteendring"}
    </Button>
  );
}

const initialState: SkatteendringReportState = { status: "idle" };

export function GenerateSkatteendringButton({
  caseId,
  initialReport,
}: {
  caseId: string;
  initialReport?: SkatteendringReportState & { status: "success" };
}) {
  const [state, formAction] = useActionState(
    generateSkatteendringReport.bind(null, caseId),
    initialReport ?? initialState
  );

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction}>
        <SubmitButton hasReport={state.status === "success"} />
      </form>
      {state.status === "error" && <p className="text-[13px] text-danger-ink">{state.error}</p>}
      {state.status === "success" && (
        <SkatteendringProposalView report={state.report} caseId={caseId} />
      )}
    </div>
  );
}
