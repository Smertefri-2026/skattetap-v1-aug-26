import type { FullCheckReportState } from "./reportActions";
import type { SkatteendringReportState } from "./skatteendringActions";
import type { Report, SkatteendringReportContent } from "./types";

export function fullCheckStateFromReport(
  report: Report | null | undefined
): (FullCheckReportState & { status: "success" }) | undefined {
  if (!report) return undefined;
  return { status: "success", report };
}

export function skatteendringStateFromReport(
  report: Report<SkatteendringReportContent> | null | undefined
): (SkatteendringReportState & { status: "success" }) | undefined {
  if (!report) return undefined;
  return { status: "success", report };
}
