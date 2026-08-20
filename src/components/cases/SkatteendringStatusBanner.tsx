import { Badge } from "@/components/design-system";
import type { BadgeTone } from "@/components/design-system";
import type { SkatteendringStatusInfo } from "@/lib/skatteendring/status";

const statusTone: Record<SkatteendringStatusInfo["status"], BadgeTone> = {
  not_started: "neutral",
  proposal_ready: "info",
  response_interpreted: "info",
  new_documentation_needed: "warning",
};

export function SkatteendringStatusBanner({ status }: { status: SkatteendringStatusInfo }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <Badge tone={statusTone[status.status]}>{status.label}</Badge>
      <p className="mt-2.5 text-[13.5px] text-ink-soft">{status.description}</p>
    </section>
  );
}
