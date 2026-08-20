"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import { hasAccess } from "@/lib/products/entitlement";
import { createClient } from "@/lib/supabase/server";
import { buildSkatteendringReport } from "./buildSkatteendringReport";
import type { Report, SkatteendringReportContent } from "./types";

export type SkatteendringReportState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success"; report: Report<SkatteendringReportContent> };

export async function generateSkatteendringReport(
  caseId: string,
  // useActionState always calls the action with (prevState, formData); this
  // action needs neither, since regenerating a proposal takes no input.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  prevState: SkatteendringReportState
): Promise<SkatteendringReportState> {
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

  if (!(await hasAccess(supabase, caseId, "skatteendring"))) {
    return { status: "error", error: "Du har ikke tilgang til Skatteendring for denne saken." };
  }

  try {
    const report = await buildSkatteendringReport(supabase, caseId);
    // useActionState updates this component's own state, but doesn't
    // re-fetch the parent Server Component's data (e.g. the status banner
    // computed from latestReport at page load) -- without this, the page
    // would keep showing the pre-generation status until a hard reload.
    revalidatePath(`/min-side/saker/${caseId}`);
    return { status: "success", report };
  } catch {
    return { status: "error", error: "Kunne ikke generere forslaget. Prøv igjen." };
  }
}
