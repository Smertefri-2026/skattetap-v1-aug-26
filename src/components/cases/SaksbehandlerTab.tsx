import { getCaseEntitlement } from "@/lib/products/entitlement";
import { createClient } from "@/lib/supabase/server";
import { SaksbehandlerChat } from "./SaksbehandlerChat";

export interface SaksbehandlerMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  needsEscalation: boolean;
}

export async function SaksbehandlerTab({ caseId }: { caseId: string }) {
  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("case_id", caseId)
    .maybeSingle();

  let initialMessages: SaksbehandlerMessage[] = [];
  if (conversation) {
    const { data: messages } = await supabase
      .from("messages")
      .select("id, role, content, needs_escalation")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

    initialMessages = (messages ?? []).map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      needsEscalation: m.needs_escalation,
    }));
  }

  const entitlement = await getCaseEntitlement(supabase, caseId);

  return (
    <SaksbehandlerChat
      caseId={caseId}
      initialConversationId={conversation?.id ?? null}
      initialMessages={initialMessages}
      canEscalate={entitlement !== null}
    />
  );
}
