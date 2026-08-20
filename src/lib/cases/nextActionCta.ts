import type { CaseStage } from "./types";
import type { NextActionType } from "./nextActionEngine";

/**
 * Single source of truth for where "neste anbefalte handling" points, since
 * it's now surfaced in two places (NextActionCard on Levende saksbilde, and
 * the same next_action inside Min saksbehandler) that must never disagree
 * about what a given action_type actually means. Always targets an
 * absolute path with an explicit steg -- callers can't rely on "the
 * default view already is saksbilde" the way the original NextActionCard
 * once did, because this is also rendered from the saksbehandler steg.
 */
export function nextActionCta(
  actionType: NextActionType,
  caseId: string,
  stage: CaseStage
): { label: string; href: string } | null {
  switch (actionType) {
    case "upload_document":
      return { label: "Last opp dokument", href: `/min-side/saker/${caseId}?steg=saksbilde#dokumenter` };
    case "resolve_conflict":
      return { label: "Avklar konflikten", href: `/min-side/saker/${caseId}?steg=saksbilde#konflikter` };
    case "generate_report":
    case "purchase_upgrade":
      return { label: "Gå videre", href: `/min-side/saker/${caseId}?steg=${stage}` };
    case "talk_to_advisor":
      return { label: "Snakk med Min saksbehandler", href: `/min-side/saker/${caseId}?steg=saksbehandler` };
    case "provide_information":
      return null;
  }
}
