import type { SimpleCheckResult } from "@/lib/ai/simpleCheck";
import type { SimpleCheckState } from "./simpleCheckActions";

export function simpleCheckResultFromRow(
  row: { output: unknown } | null | undefined
): (SimpleCheckState & { status: "success" }) | undefined {
  if (!row) return undefined;
  return { status: "success", result: row.output as SimpleCheckResult };
}
