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

  const [claims, { data: documents }, { data: legalSources }, { data: komplettSak }] = await Promise.all([
    getClaimsWithStatus(supabase, caseId),
    supabase.from("documents").select("id, original_filename").eq("case_id", caseId),
    supabase
      .from("legal_sources")
      .select("source_code, law_reference, provision, topic, short_explanation")
      .eq("source_type", "lov_forskrift")
      .eq("active", true)
      .eq("verification_status", "verified"),
    supabase
      .from("reports")
      .select("content")
      .eq("case_id", caseId)
      .eq("type", "komplett-sak")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const komplettSakContent = komplettSak?.content as
    | { case_summary?: string; strongest_points?: string[] }
    | undefined;
  const komplettSakContext = komplettSakContent
    ? [komplettSakContent.case_summary, ...(komplettSakContent.strongest_points ?? [])]
        .filter(Boolean)
        .join(" ")
    : null;

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
    availableRules: (legalSources ?? []).map((r) => ({
      source_code: r.source_code,
      topic: r.topic,
      short_explanation: r.short_explanation,
    })),
    komplettSakContext,
  });

  const filenameToId = new Map((documents ?? []).map((d) => [d.original_filename, d.id]));
  // RuleReference (reports.content's frozen shape) keeps the rule_code key
  // regardless of the live column's name -- see reports/types.ts.
  const applicableRules = (legalSources ?? [])
    .filter((r) => ai.relevant_source_codes.includes(r.source_code))
    .map((r) => ({
      rule_code: r.source_code,
      law_reference: r.law_reference ?? "",
      provision: r.provision ?? "",
      short_explanation: r.short_explanation,
    }));

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
