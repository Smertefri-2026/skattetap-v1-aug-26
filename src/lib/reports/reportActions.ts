"use server";

import { requireUser } from "@/lib/auth/requireUser";
import { createClient } from "@/lib/supabase/server";
import { buildFullCheckReport } from "./buildFullCheckReport";
import type { Report } from "./types";

export type FullCheckReportState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success"; report: Report };

export async function generateFullCheckReport(
  caseId: string,
  // useActionState always calls the action with (prevState, formData); this
  // action needs neither, since regenerating a report takes no input.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  prevState: FullCheckReportState
): Promise<FullCheckReportState> {
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

  try {
    const report = await buildFullCheckReport(supabase, caseId);
    return { status: "success", report };
  } catch {
    return { status: "error", error: "Kunne ikke generere rapporten. Prøv igjen." };
  }
}
