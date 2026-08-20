"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { createClient } from "@/lib/supabase/server";
import { buildSaksbehandlerContext } from "./context";
import { saksbehandlerChatEngine } from "./chatEngine";

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
  suggestedNextStep: string | null;
  canEscalate: boolean;
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

  const { data: assistantMessage, error: insertAssistantError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role: "assistant",
      content: result.answer,
      needs_escalation: result.needsEscalation,
    })
    .select("id")
    .single();

  if (insertAssistantError || !assistantMessage) {
    throw new Error("Fikk svar, men kunne ikke lagre det.");
  }

  await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

  return {
    conversationId,
    assistantMessageId: assistantMessage.id,
    answer: result.answer,
    needsEscalation: result.needsEscalation,
    escalationReason: result.escalationReason,
    suggestedNextStep: result.suggestedNextStep,
    canEscalate: context.hasPaidEntitlement,
  };
}

export interface RequestEscalationResult {
  ok: boolean;
  message: string;
}

export async function requestEscalation(
  caseId: string,
  conversationId: string,
  messageId: string,
  reason: string
): Promise<RequestEscalationResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const context = await buildSaksbehandlerContext(supabase, caseId);
  if (!context.hasPaidEntitlement) {
    return {
      ok: false,
      message: "Å snakke med en rådgiver er tilgjengelig for saker med et kjøpt produkt.",
    };
  }

  const { error } = await supabase.from("support_escalations").insert({
    case_id: caseId,
    user_id: user.id,
    conversation_id: conversationId,
    message_id: messageId,
    reason,
  });

  if (error) {
    return { ok: false, message: "Kunne ikke sende forespørselen. Prøv igjen." };
  }

  return {
    ok: true,
    message: "Dette spørsmålet krever manuell vurdering. En rådgiver har fått beskjed om saken.",
  };
}
