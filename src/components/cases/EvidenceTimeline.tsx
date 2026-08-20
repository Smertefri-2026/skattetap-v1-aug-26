import { Badge } from "@/components/design-system";
import type { BadgeTone } from "@/components/design-system";

export interface TimelineEntryView {
  key: string;
  date: string | null;
  label: string;
  badge?: { tone: BadgeTone; label: string };
}

/**
 * Generic visual timeline -- takes plain {date, label, badge} entries, no
 * opinion about where they came from, so it works equally for a live
 * per-document timeline or a report's frozen chronology snapshot.
 */
export function EvidenceTimeline({ entries }: { entries: TimelineEntryView[] }) {
  if (entries.length === 0) {
    return <p className="text-[13px] text-ink-faint">Ingen hendelser identifisert ennå.</p>;
  }

  return (
    <ol className="flex flex-col gap-4 border-l-2 border-border pl-5">
      {entries.map((entry) => (
        <li key={entry.key} className="relative">
          <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-surface bg-primary" />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] font-semibold text-ink-faint">{entry.date ?? "Udatert"}</span>
            {entry.badge && <Badge tone={entry.badge.tone}>{entry.badge.label}</Badge>}
          </div>
          <p className="mt-1 text-[13px] text-ink-soft">{entry.label}</p>
        </li>
      ))}
    </ol>
  );
}
