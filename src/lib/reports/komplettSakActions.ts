"use server";

import { requireUser } from "@/lib/auth/requireUser";
import { hasAccess } from "@/lib/products/entitlement";
import { createClient } from "@/lib/supabase/server";
import { buildKomplettSakReport } from "./buildKomplettSakReport";
import type { KomplettSakReportContent, Report } from "./types";

export type KomplettSakReportState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success"; report: Report<KomplettSakReportContent> };

export async function generateKomplettSakReport(
  caseId: string,
  // useActionState always calls the action with (prevState, formData); this
  // action needs neither, since regenerating the case file takes no input.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  prevState: KomplettSakReportState
): Promise<KomplettSakReportState> {
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

  if (!(await hasAccess(supabase, caseId, "komplett-sak"))) {
    return { status: "error", error: "Du har ikke tilgang til Komplett sak for denne saken." };
  }

  try {
    const report = await buildKomplettSakReport(supabase, caseId);
    return { status: "success", report };
  } catch {
    return { status: "error", error: "Kunne ikke generere den komplette saksmappen. Prøv igjen." };
  }
}
