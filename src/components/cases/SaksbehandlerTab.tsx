import type { ResolvedChatReference } from "@/lib/saksbehandler/actions";
import type { SaksbehandlerNextAction } from "@/lib/saksbehandler/context";
import type { Case } from "@/lib/cases/types";
import { createClient } from "@/lib/supabase/server";
import { SaksbehandlerChat } from "./SaksbehandlerChat";

export interface SaksbehandlerMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  needsEscalation: boolean;
  references: ResolvedChatReference[];
}

export async function SaksbehandlerTab({ caseData }: { caseData: Case }) {
  const supabase = await createClient();
  const caseId = caseData.id;

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("case_id", caseId)
    .maybeSingle();

  let initialMessages: SaksbehandlerMessage[] = [];
  if (conversation) {
    const { data: messages } = await supabase
      .from("messages")
      .select("id, role, content, needs_escalation, reference_links")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

    initialMessages = (messages ?? []).map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      needsEscalation: m.needs_escalation,
      references: (m.reference_links as ResolvedChatReference[] | null) ?? [],
    }));
  }

  // Read straight off the case row -- the same field NextActionCard renders
  // on Levende saksbilde -- rather than recomputed here, so the two views
  // can never show a different "neste anbefalte handling" for the same case.
  const initialNextAction: SaksbehandlerNextAction | null = caseData.next_action
    ? {
        action: caseData.next_action,
        reasoning: caseData.next_action_reasoning ?? "",
        actionType: caseData.next_action_type ?? "provide_information",
      }
    : null;

  // Same "only unambiguous when there's exactly one" rule nextActionCta.ts
  // documents -- see SaksbildeView.tsx for the full reasoning.
  const { data: openGaps } = await supabase
    .from("documentation_gaps")
    .select("id")
    .eq("case_id", caseId)
    .eq("status", "open");
  const singleOpenGapId = openGaps && openGaps.length === 1 ? openGaps[0].id : undefined;

  return (
    <SaksbehandlerChat
      caseId={caseId}
      caseStage={caseData.stage}
      initialConversationId={conversation?.id ?? null}
      initialMessages={initialMessages}
      initialNextAction={initialNextAction}
      singleOpenGapId={singleOpenGapId}
    />
  );
}
