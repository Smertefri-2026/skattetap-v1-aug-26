"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/design-system";
import { nextActionCta } from "@/lib/cases/nextActionCta";
import { sendMessage, type ResolvedChatReference } from "@/lib/saksbehandler/actions";
import type { SaksbehandlerNextAction } from "@/lib/saksbehandler/context";
import type { CaseStage } from "@/lib/cases/types";
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

function NextActionStrip({
  caseId,
  caseStage,
  nextAction,
  singleOpenGapId,
}: {
  caseId: string;
  caseStage: CaseStage;
  nextAction: SaksbehandlerNextAction | null;
  singleOpenGapId?: string;
}) {
  if (!nextAction) return null;
  const cta = nextActionCta(nextAction.actionType, caseId, caseStage, singleOpenGapId);

  return (
    <div className="border-b border-border bg-primary-subtle px-5 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-ink">
        Neste anbefalte handling
      </p>
      <p className="mt-1 text-[13px] font-medium text-ink">{nextAction.action}</p>
      {cta && (
        <Link href={cta.href} className="mt-1.5 inline-block text-[12.5px] font-medium text-primary-ink hover:underline">
          {cta.label} →
        </Link>
      )}
    </div>
  );
}

export function SaksbehandlerChat({
  caseId,
  caseStage,
  initialConversationId,
  initialMessages,
  initialNextAction,
  singleOpenGapId,
}: {
  caseId: string;
  caseStage: CaseStage;
  initialConversationId: string | null;
  initialMessages: SaksbehandlerMessage[];
  initialNextAction: SaksbehandlerNextAction | null;
  singleOpenGapId?: string;
}) {
  const [, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState<SaksbehandlerMessage[]>(initialMessages);
  const [nextAction, setNextAction] = useState(initialNextAction);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [escalationReason, setEscalationReason] = useState<string | null>(null);

  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant");

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasScrolledOnMount = useRef(false);
  // Updated from real scroll events, not re-derived from a scrollHeight
  // snapshot taken at some other arbitrary time -- a long reply can still
  // be reflowing right after it's added, which made a one-shot
  // scrollHeight/scrollTop calculation land short of the true bottom.
  const isPinnedToBottom = useRef(true);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    function handleScroll() {
      if (!container) return;
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      isPinnedToBottom.current = distanceFromBottom < 120;
    }
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Opening the chat lands on the latest message with the input already in
  // view, not the top -- and a newly-arrived message only pulls the view
  // down with it if the user was already reading near the bottom. If
  // they've scrolled up into older history, a forced scroll would yank
  // them away from what they're reading. scrollIntoView on a trailing
  // sentinel (rather than manually assigning scrollTop = scrollHeight)
  // scrolls to wherever the content actually ends up after layout, instead
  // of a height read that can be a frame stale.
  useEffect(() => {
    if (!hasScrolledOnMount.current) {
      bottomRef.current?.scrollIntoView({ block: "end" });
      hasScrolledOnMount.current = true;
      isPinnedToBottom.current = true;
      return;
    }

    if (isPinnedToBottom.current) {
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages.length]);

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
      setNextAction(result.nextAction);
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
    <div className="flex h-[600px] flex-col rounded-lg border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <p className="text-[14px] font-semibold text-ink">Min saksbehandler</p>
        <p className="mt-0.5 text-[12.5px] text-ink-faint">
          Kjenner hele saken -- dokumenter, tidslinje, konflikter, dokumentasjonshull og rapporter.
        </p>
      </div>

      <NextActionStrip caseId={caseId} caseStage={caseStage} nextAction={nextAction} singleOpenGapId={singleOpenGapId} />

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-5 py-4">
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
                className={m.role === "user" ? "flex justify-end" : "flex flex-col items-start"}
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
                {m.role === "assistant" && <ReferenceChips references={m.references} />}
              </li>
            ))}
          </ul>
        )}
        {sending && <p className="mt-4 text-[12.5px] text-ink-faint">Saksbehandleren svarer...</p>}
        <div ref={bottomRef} />
      </div>

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
