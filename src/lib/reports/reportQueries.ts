import type { FullCheckReportState } from "./reportActions";
import type { Report } from "./types";

export function fullCheckStateFromReport(
  report: Report | null | undefined
): (FullCheckReportState & { status: "success" }) | undefined {
  if (!report) return undefined;
  return { status: "success", report };
}
