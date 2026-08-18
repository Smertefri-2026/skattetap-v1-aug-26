import type { FullCheckReportState } from "./reportActions";
import type { KomplettSakReportState } from "./komplettSakActions";
import type { SkatteendringReportState } from "./skatteendringActions";
import type { KomplettSakReportContent, Report, SkatteendringReportContent } from "./types";

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

export function komplettSakStateFromReport(
  report: Report<KomplettSakReportContent> | null | undefined
): (KomplettSakReportState & { status: "success" }) | undefined {
  if (!report) return undefined;
  return { status: "success", report };
}
