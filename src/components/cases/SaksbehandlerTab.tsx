import type { ResolvedChatReference } from "@/lib/saksbehandler/actions";
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

  return (
    <SaksbehandlerChat
      caseId={caseId}
      initialConversationId={conversation?.id ?? null}
      initialMessages={initialMessages}
    />
  );
}
