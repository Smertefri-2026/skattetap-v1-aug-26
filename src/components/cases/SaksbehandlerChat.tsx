"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/design-system";
import { sendMessage, type ResolvedChatReference } from "@/lib/saksbehandler/actions";
import type { SaksbehandlerMessage } from "./SaksbehandlerTab";

const referenceTypeLabel: Record<ResolvedChatReference["type"], string> = {
  document: "Dokument",
  timeline: "Tidslinje",
  conflict: "Konflikt",
  gap: "Dokumentasjonshull",
  report: "Rapport",
};

function ReferenceChips({ references }: { references: ResolvedChatReference[] }) {
  if (references.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {references.map((ref, i) => (
        <Link
          key={i}
          href={ref.href}
          className="inline-flex items-center gap-1 rounded-full border border-border-strong bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink-soft hover:border-primary hover:text-primary-ink"
        >
          <span className="text-ink-faint">{referenceTypeLabel[ref.type]}:</span> {ref.label}
        </Link>
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: SaksbehandlerMessage }) {
  return (
    <li className={message.role === "user" ? "flex justify-end" : "flex flex-col items-start"}>
      <div
        className={
          message.role === "user"
            ? "max-w-[80%] rounded-lg bg-primary px-4 py-2.5 text-[13.5px] text-white"
            : "max-w-[80%] rounded-lg bg-surface-alt px-4 py-2.5 text-[13.5px] text-ink"
        }
      >
        {message.content}
      </div>
      {message.role === "assistant" && <ReferenceChips references={message.references} />}
    </li>
  );
}

const COMPACT_VISIBLE_MESSAGES = 2;

export function SaksbehandlerChat({
  caseId,
  initialConversationId,
  initialMessages,
}: {
  caseId: string;
  initialConversationId: string | null;
  initialMessages: SaksbehandlerMessage[];
}) {
  const [, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState<SaksbehandlerMessage[]>(initialMessages);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [escalationReason, setEscalationReason] = useState<string | null>(null);
  // Compact by design: a long conversation must never take over the rest
  // of the saksbilde, especially on mobile, so the default view only ever
  // shows the tail of it -- "Vis hele samtalen" is an explicit opt-in, not
  // something that creeps open on its own as messages arrive.
  const [expanded, setExpanded] = useState(false);

  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant");
  const hasOlderMessages = messages.length > COMPACT_VISIBLE_MESSAGES;
  const compactMessages = messages.slice(-COMPACT_VISIBLE_MESSAGES);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasScrolledOnOpen = useRef(false);
  // Updated from real scroll events, not re-derived from a scrollHeight
  // snapshot taken at some other arbitrary time -- a long reply can still
  // be reflowing right after it's added, which made a one-shot
  // scrollHeight/scrollTop calculation land short of the true bottom.
  const isPinnedToBottom = useRef(true);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!expanded || !container) return;
    function handleScroll() {
      if (!container) return;
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      isPinnedToBottom.current = distanceFromBottom < 120;
    }
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [expanded]);

  // Opening the full conversation lands on the latest message with the
  // input already in view, not the top. scrollIntoView on a trailing
  // sentinel (rather than manually assigning scrollTop = scrollHeight)
  // scrolls to wherever the content actually ends up after layout, instead
  // of a height read that can be a frame stale.
  useEffect(() => {
    if (!expanded) {
      hasScrolledOnOpen.current = false;
      return;
    }
    if (!hasScrolledOnOpen.current) {
      bottomRef.current?.scrollIntoView({ block: "end" });
      hasScrolledOnOpen.current = true;
      isPinnedToBottom.current = true;
    }
  }, [expanded]);

  // A newly-arrived message only pulls the view down with it if the user
  // was already reading near the bottom. If they've scrolled up into older
  // history, a forced scroll would yank them away from what they're
  // reading.
  useEffect(() => {
    if (!expanded || !hasScrolledOnOpen.current) return;
    if (isPinnedToBottom.current) {
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
  }, [expanded, messages.length]);

  async function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!question.trim() || sending) return;

    const userQuestion = question.trim();
    setQuestion("");
    setError(null);
    setEscalationReason(null);

    const optimisticUserMessage: SaksbehandlerMessage = {
      id: `optimistic-${Date.now()}`,
      role: "user",
      content: userQuestion,
      needsEscalation: false,
      references: [],
    };
    setMessages((prev) => [...prev, optimisticUserMessage]);
    setSending(true);

    try {
      const result = await sendMessage(caseId, userQuestion);
      setConversationId(result.conversationId);
      setEscalationReason(result.escalationReason);
      setMessages((prev) => [
        ...prev,
        {
          id: result.assistantMessageId,
          role: "assistant",
          content: result.answer,
          needsEscalation: result.needsEscalation,
          references: result.references,
        },
      ]);
    } catch {
      setError("Kunne ikke sende meldingen. Prøv igjen.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col rounded-lg border border-border bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
        <div>
          <p className="text-[14px] font-semibold text-ink">Min saksbehandler</p>
          <p className="mt-0.5 text-[12.5px] text-ink-faint">
            Kjenner hele saken -- dokumenter, tidslinje, konflikter, dokumentasjonshull og rapporter.
          </p>
        </div>
        {expanded && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="shrink-0 text-[12.5px] font-medium text-primary-ink hover:underline"
          >
            Vis kompakt visning
          </button>
        )}
      </div>

      {expanded ? (
        <div ref={scrollContainerRef} className="h-[500px] overflow-y-auto px-5 py-4">
          {messages.length === 0 ? (
            <p className="text-[13.5px] text-ink-soft">
              Spør om hva som helst knyttet til denne saken -- status, hva som mangler, eller hva
              neste steg bør være.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
            </ul>
          )}
          {sending && <p className="mt-4 text-[12.5px] text-ink-faint">Saksbehandleren svarer...</p>}
          <div ref={bottomRef} />
        </div>
      ) : (
        <div className="px-5 py-4">
          {messages.length === 0 ? (
            <p className="text-[13.5px] text-ink-soft">
              Spør om hva som helst knyttet til denne saken -- status, hva som mangler, eller hva
              neste steg bør være.
            </p>
          ) : (
            <>
              {hasOlderMessages && (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="mb-3 text-[12.5px] font-medium text-primary-ink hover:underline"
                >
                  Vis hele samtalen ({messages.length} meldinger)
                </button>
              )}
              <ul className="flex flex-col gap-4">
                {compactMessages.map((m) => (
                  <MessageBubble key={m.id} message={m} />
                ))}
              </ul>
            </>
          )}
          {sending && <p className="mt-4 text-[12.5px] text-ink-faint">Saksbehandleren svarer...</p>}
        </div>
      )}

      {/* Informational only -- SkatteTap has no internal advisors who pick
          up a case from here, so this never offers or implies a human
          will personally follow up. It just explains, honestly, why the
          answer above is limited and what would help. */}
      {lastAssistantMessage?.needsEscalation && (
        <div className="border-t border-border bg-warning-subtle px-5 py-3">
          <p className="text-[13px] text-warning-ink">
            {escalationReason ?? "Dette spørsmålet kan ikke vurderes sikkert ut fra opplysningene vi har nå."}
          </p>
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
