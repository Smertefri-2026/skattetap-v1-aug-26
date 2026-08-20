import type { SaksbehandlerContext } from "./context";
import type { ChatReference } from "./chatEngine";

export interface ResolvedChatReference {
  type: ChatReference["type"];
  label: string;
  href: string;
}

/**
 * Turns a sanitized {type, number} reference into something the UI can
 * render directly -- label and href always come from the actual context
 * data the model saw, never from the model's own text, so a reference can
 * never point somewhere the case doesn't actually have. Route-construction
 * (not engine logic) is why this lives in its own module rather than
 * chatEngine.ts: the engine itself stays free of Skattetap's URL shape.
 * Split out of actions.ts (rather than kept private there) because a
 * "use server" file may only export async server actions -- this is a
 * plain synchronous mapping function.
 */
export function resolveChatReferences(
  references: ChatReference[],
  context: SaksbehandlerContext,
  caseId: string
): ResolvedChatReference[] {
  const base = `/min-side/saker/${caseId}`;
  return references.map((r): ResolvedChatReference => {
    switch (r.type) {
      case "document": {
        const doc = context.documents[r.number - 1];
        return { type: r.type, label: doc.fileName, href: `${base}?steg=saksbilde#dokument-${doc.id}` };
      }
      case "timeline": {
        const event = context.timelineEvents[r.number - 1];
        return { type: r.type, label: event.fileName, href: `${base}?steg=saksbilde#tidslinje-${event.documentId}` };
      }
      case "conflict": {
        const conflict = context.openConflicts[r.number - 1];
        return {
          type: r.type,
          label: `${conflict.statementA} / ${conflict.statementB}`,
          href: `${base}?steg=saksbilde#konflikt-${conflict.id}`,
        };
      }
      case "gap": {
        const gap = context.gaps[r.number - 1];
        return { type: r.type, label: gap.description, href: `${base}?steg=saksbilde#hull-${gap.id}` };
      }
      case "report": {
        const report = context.reports[r.number - 1];
        return { type: r.type, label: report.type, href: `${base}?steg=${report.type}` };
      }
    }
  });
}
