"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { createClient } from "@/lib/supabase/server";
import { buildSaksbehandlerContext, type SaksbehandlerNextAction } from "./context";
import { saksbehandlerChatEngine, sanitizeChatReferences } from "./chatEngine";
import { resolveChatReferences, type ResolvedChatReference } from "./resolveReferences";

export type { ResolvedChatReference } from "./resolveReferences";

const MAX_HISTORY_MESSAGES = 12;

async function getOrCreateConversation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  caseId: string,
  userId: string
) {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("case_id", caseId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ case_id: caseId, user_id: userId })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error("Kunne ikke starte samtale med saksbehandleren.");
  }

  return created.id as string;
}

const questionSchema = z.string().trim().min(1).max(2000);

export interface SendMessageResult {
  conversationId: string;
  assistantMessageId: string;
  answer: string;
  needsEscalation: boolean;
  escalationReason: string | null;
  references: ResolvedChatReference[];
  nextAction: SaksbehandlerNextAction | null;
}

export async function sendMessage(caseId: string, question: string): Promise<SendMessageResult> {
  const user = await requireUser();
  const parsedQuestion = questionSchema.parse(question);

  const supabase = await createClient();
  const conversationId = await getOrCreateConversation(supabase, caseId, user.id);

  const { data: priorMessages } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY_MESSAGES);

  const history = (priorMessages ?? [])
    .slice()
    .reverse()
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const { error: insertUserError } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, role: "user", content: parsedQuestion });

  if (insertUserError) {
    throw new Error("Kunne ikke sende meldingen.");
  }

  const context = await buildSaksbehandlerContext(supabase, caseId);

  const result = await saksbehandlerChatEngine(
    { context, history, question: parsedQuestion },
    { supabase, caseId, userId: user.id }
  );

  const references = resolveChatReferences(sanitizeChatReferences(result.references, context), context, caseId);

  const { data: assistantMessage, error: insertAssistantError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role: "assistant",
      content: result.answer,
      needs_escalation: result.needsEscalation,
      reference_links: references,
    })
    .select("id")
    .single();

  if (insertAssistantError || !assistantMessage) {
    throw new Error("Fikk svar, men kunne ikke lagre det.");
  }

  await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

  // Internal-only signal, not a customer promise: Skattetap has no advisor
  // who picks these up and acts on them today, so nothing here is ever
  // shown to the customer as "someone will look at this." It's purely a
  // quality/support-queue record for staff, gated to paid cases the same
  // way the old customer-facing escalation action used to be.
  if (result.needsEscalation && context.hasPaidEntitlement) {
    await supabase.from("support_escalations").insert({
      case_id: caseId,
      user_id: user.id,
      conversation_id: conversationId,
      message_id: assistantMessage.id,
      reason: result.escalationReason ?? "Saksbehandleren kunne ikke svare forsvarlig ut fra tilgjengelig informasjon.",
    });
  }

  return {
    conversationId,
    assistantMessageId: assistantMessage.id,
    answer: result.answer,
    needsEscalation: result.needsEscalation,
    escalationReason: result.escalationReason,
    references,
    nextAction: context.nextAction,
  };
}
