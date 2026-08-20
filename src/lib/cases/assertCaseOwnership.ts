import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth/requireUser";
import { createClient } from "@/lib/supabase/server";

export async function assertCaseOwnership(caseId: string): Promise<SupabaseClient> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: caseRow } = await supabase
    .from("cases")
    .select("id, user_id")
    .eq("id", caseId)
    .single();
  if (!caseRow || caseRow.user_id !== user.id) {
    throw new Error("Fant ikke saken.");
  }
  return supabase;
}
