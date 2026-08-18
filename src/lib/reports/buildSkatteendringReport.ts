import type { SupabaseClient } from "@supabase/supabase-js";
import { analyzeSkatteendringProposal } from "@/lib/ai/skatteendringProposal";
import { getClaimsWithStatus } from "@/lib/cases/claimsWithStatus";
import type { Report, SkatteendringReportContent } from "./types";

const MODEL = "gpt-4.1-mini";

export async function buildSkatteendringReport(
  supabase: SupabaseClient,
  caseId: string
): Promise<Report<SkatteendringReportContent>> {
  const { data: caseRow, error: caseError } = await supabase
    .from("cases")
    .select("title, tax_period, tax_type, amount_kr, description")
    .eq("id", caseId)
    .single();
  if (caseError || !caseRow) throw new Error("Fant ikke saken.");

  const [claims, { data: documents }, { data: taxRules }] = await Promise.all([
    getClaimsWithStatus(supabase, caseId),
    supabase.from("documents").select("id, original_filename").eq("case_id", caseId),
    supabase.from("tax_rules").select("rule_code, law_reference, provision, topic, short_explanation"),
  ]);

  const documentedClaims = claims.filter((c) => c.status === "documented").map((c) => c.statement);
  const documentFilenames = (documents ?? []).map((d) => d.original_filename);

  const ai = await analyzeSkatteendringProposal({
    caseTitle: caseRow.title,
    taxPeriod: caseRow.tax_period,
    taxType: caseRow.tax_type,
    amountKr: caseRow.amount_kr,
    description: caseRow.description,
    documentedClaims,
    documentFilenames,
    availableRules: (taxRules ?? []).map((r) => ({
      rule_code: r.rule_code,
      topic: r.topic,
      short_explanation: r.short_explanation,
    })),
  });

  const filenameToId = new Map((documents ?? []).map((d) => [d.original_filename, d.id]));
  const applicableRules = (taxRules ?? []).filter((r) =>
    ai.relevant_rule_codes.includes(r.rule_code)
  );

  const content: SkatteendringReportContent = {
    proposal_text: ai.proposal_text,
    reasoning: ai.reasoning,
    referenced_documents: ai.referenced_document_filenames.map((filename) => ({
      document_id: filenameToId.get(filename) ?? "",
      filename,
      relevance: "Referert i forslaget til skatteendring.",
    })),
    attachments: ai.attachments,
    missing_information: ai.missing_information,
    applicable_rules: applicableRules,
  };

  const { data: report, error: insertError } = await supabase
    .from("reports")
    .insert({ case_id: caseId, type: "skatteendring", content, model: MODEL })
    .select("*")
    .single();
  if (insertError || !report) throw new Error("Kunne ikke lagre forslaget.");

  return report as Report<SkatteendringReportContent>;
}
