import type { SupabaseClient } from "@supabase/supabase-js";

export interface AiCallLogEntry {
  engine: string;
  model: string;
  caseId?: string;
  userId?: string;
  durationMs: number;
  status: "success" | "error";
  errorMessage?: string;
}

/** Best-effort: a logging failure must never take down the AI call it was
 * describing, so errors here are swallowed rather than thrown. */
export async function logAiCall(supabase: SupabaseClient, entry: AiCallLogEntry): Promise<void> {
  try {
    await supabase.from("ai_call_log").insert({
      engine: entry.engine,
      model: entry.model,
      case_id: entry.caseId ?? null,
      user_id: entry.userId ?? null,
      duration_ms: entry.durationMs,
      status: entry.status,
      error_message: entry.errorMessage ?? null,
    });
  } catch {
    // Logging is diagnostic, not load-bearing -- never let it break a
    // real AI call or mask the original error.
  }
}
