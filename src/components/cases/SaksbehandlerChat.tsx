"use client";

import { useState } from "react";
import { Button } from "@/components/design-system";
import { requestEscalation, sendMessage } from "@/lib/saksbehandler/actions";
import type { SaksbehandlerMessage } from "./SaksbehandlerTab";

type EscalationState = "idle" | "sending" | "sent" | "denied";

export function SaksbehandlerChat({
  caseId,
  initialConversationId,
  initialMessages,
  canEscalate,
}: {
  caseId: string;
  initialConversationId: string | null;
  initialMessages: SaksbehandlerMessage[];
  canEscalate: boolean;
}) {
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState<SaksbehandlerMessage[]>(initialMessages);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [escalationState, setEscalationState] = useState<EscalationState>("idle");
  const [escalationNote, setEscalationNote] = useState<string | null>(null);

  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant");

  async function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!question.trim() || sending) return;

    const userQuestion = question.trim();
    setQuestion("");
    setError(null);
    setEscalationState("idle");
    setEscalationNote(null);

    const optimisticUserMessage: SaksbehandlerMessage = {
      id: `optimistic-${Date.now()}`,
      role: "user",
      content: userQuestion,
      needsEscalation: false,
    };
    setMessages((prev) => [...prev, optimisticUserMessage]);
    setSending(true);

    try {
      const result = await sendMessage(caseId, userQuestion);
      setConversationId(result.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          id: result.assistantMessageId,
          role: "assistant",
          content: result.answer,
          needsEscalation: result.needsEscalation,
        },
      ]);
    } catch {
      setError("Kunne ikke sende meldingen. Prøv igjen.");
    } finally {
      setSending(false);
    }
  }

  async function handleEscalate() {
    if (!conversationId || !lastAssistantMessage) return;
    setEscalationState("sending");

    try {
      const result = await requestEscalation(
        caseId,
        conversationId,
        lastAssistantMessage.id,
        lastAssistantMessage.content
      );
      setEscalationNote(result.message);
      setEscalationState(result.ok ? "sent" : "denied");
    } catch {
      setEscalationNote("Kunne ikke sende forespørselen. Prøv igjen.");
      setEscalationState("denied");
    }
  }

  return (
    <div className="flex h-[600px] flex-col rounded-lg border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <p className="text-[14px] font-semibold text-ink">Min saksbehandler</p>
        <p className="mt-0.5 text-[12.5px] text-ink-faint">
          Kjenner saken din -- fakta, dokumentasjon og status.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {messages.length === 0 ? (
          <p className="text-[13.5px] text-ink-soft">
            Spør om hva som helst knyttet til denne saken -- status, hva som mangler, eller hva
            neste steg bør være.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {messages.map((m) => (
              <li
                key={m.id}
                className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[80%] rounded-lg bg-primary px-4 py-2.5 text-[13.5px] text-white"
                      : "max-w-[80%] rounded-lg bg-surface-alt px-4 py-2.5 text-[13.5px] text-ink"
                  }
                >
                  {m.content}
                </div>
              </li>
            ))}
          </ul>
        )}
        {sending && <p className="mt-4 text-[12.5px] text-ink-faint">Saksbehandleren svarer...</p>}
      </div>

      {lastAssistantMessage?.needsEscalation && escalationState !== "sent" && (
        <div className="border-t border-border bg-warning-subtle px-5 py-3">
          <p className="text-[13px] text-warning-ink">
            Dette spørsmålet krever manuell vurdering. Ønsker du at en rådgiver skal se på saken?
          </p>
          {canEscalate ? (
            <Button
              type="button"
              variant="secondary"
              className="mt-2"
              onClick={handleEscalate}
              disabled={escalationState === "sending"}
            >
              {escalationState === "sending" ? "Sender..." : "Ja, be om hjelp fra en rådgiver"}
            </Button>
          ) : (
            <p className="mt-2 text-[12.5px] text-ink-faint">
              Tilgjengelig for saker med et kjøpt produkt.
            </p>
          )}
        </div>
      )}

      {escalationNote && (
        <div className="border-t border-border px-5 py-3">
          <p className="text-[13px] text-ink-soft">{escalationNote}</p>
        </div>
      )}

      <form onSubmit={handleSend} className="flex gap-2 border-t border-border px-5 py-4">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Skriv en melding..."
          disabled={sending}
          className="flex-1 rounded-md border border-border-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-primary"
        />
        <Button type="submit" disabled={sending || !question.trim()}>
          Send
        </Button>
      </form>
      {error && <p className="px-5 pb-3 text-[13px] text-danger-ink">{error}</p>}
    </div>
  );
}
