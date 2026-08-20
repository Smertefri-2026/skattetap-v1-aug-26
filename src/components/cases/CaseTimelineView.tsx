import { Badge } from "@/components/design-system";
import type { CaseTimeline } from "@/lib/cases/timeline";

const credibilityTone = {
  high: "success",
  medium: "warning",
  low: "danger",
} as const;

const credibilityLabel = {
  high: "Høy troverdighet",
  medium: "Middels troverdighet",
  low: "Lav troverdighet",
} as const;

export function CaseTimelineView({ timeline }: { timeline: CaseTimeline }) {
  const { events, undatedDocumentCount, missingPeriodWarning } = timeline;

  if (events.length === 0 && undatedDocumentCount === 0) {
    return (
      <p className="text-[13.5px] text-ink-soft">
        Tidslinjen bygges automatisk etter hvert som du laster opp dokumenter.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {missingPeriodWarning && (
        <div className="rounded-md border border-warning bg-warning-subtle px-4 py-3">
          <p className="text-[13px] text-warning-ink">{missingPeriodWarning}</p>
        </div>
      )}

      {events.length > 0 && (
        <ol className="flex flex-col gap-4 border-l-2 border-border pl-5">
          {events.map((event) => (
            <li key={event.documentId} id={`tidslinje-${event.documentId}`} className="relative">
              <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-surface bg-primary" />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12.5px] font-semibold text-ink-faint">
                  {new Date(event.date).toLocaleDateString("no-NO")}
                </span>
                {event.hasConflict && <Badge tone="danger">Motstrid</Badge>}
                {event.credibility && (
                  <Badge tone={credibilityTone[event.credibility]}>
                    {credibilityLabel[event.credibility]}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-[13.5px] font-medium text-ink">{event.fileName}</p>
              {event.keyPoints.length > 0 && (
                <ul className="mt-1.5 flex flex-col gap-1">
                  {event.keyPoints.map((point, i) => (
                    <li key={i} className="text-[12.5px] text-ink-soft">
                      • {point}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}

      {undatedDocumentCount > 0 && (
        <p className="text-[12.5px] text-ink-faint">
          {undatedDocumentCount} dokument{undatedDocumentCount === 1 ? "" : "er"} uten funnet dato,
          vises ikke på tidslinjen.
        </p>
      )}
    </div>
  );
}
