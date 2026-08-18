"use server";

import { requireUser } from "@/lib/auth/requireUser";
import { hasAccess } from "@/lib/products/entitlement";
import { createClient } from "@/lib/supabase/server";
import { buildStrategiskUtredningReport } from "./buildStrategiskUtredningReport";
import type { Report, StrategiskUtredningReportContent } from "./types";

export type StrategiskUtredningReportState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success"; report: Report<StrategiskUtredningReportContent> };

export async function generateStrategiskUtredningReport(
  caseId: string,
  // useActionState always calls the action with (prevState, formData); this
  // action needs neither, since regenerating the utredning takes no input.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  prevState: StrategiskUtredningReportState
): Promise<StrategiskUtredningReportState> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: caseRow } = await supabase
    .from("cases")
    .select("id, user_id")
    .eq("id", caseId)
    .single();
  if (!caseRow || caseRow.user_id !== user.id) {
    return { status: "error", error: "Fant ikke saken." };
  }

  if (!(await hasAccess(supabase, caseId, "strategisk-utredning"))) {
    return { status: "error", error: "Du har ikke tilgang til Strategisk utredning for denne saken." };
  }

  try {
    const report = await buildStrategiskUtredningReport(supabase, caseId);
    return { status: "success", report };
  } catch {
    return { status: "error", error: "Kunne ikke generere den strategiske utredningen. Prøv igjen." };
  }
}
