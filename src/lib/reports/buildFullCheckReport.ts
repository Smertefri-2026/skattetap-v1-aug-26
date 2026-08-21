import type { SupabaseClient } from "@supabase/supabase-js";
import { analyzeFullCheck } from "@/lib/ai/fullCheckAssessment";
import { getCaseFacts } from "@/lib/cases/caseFacts";
import { getClaimsWithStatus } from "@/lib/cases/claimsWithStatus";
import type { FullCheckReportContent, Report } from "./types";

const MODEL = "gpt-4.1-mini";

export async function buildFullCheckReport(
  supabase: SupabaseClient,
  caseId: string
): Promise<Report> {
  const { data: caseRow, error: caseError } = await supabase
    .from("cases")
    .select("title, tax_period, tax_type, amount_kr, description")
    .eq("id", caseId)
    .single();
  if (caseError || !caseRow) throw new Error("Fant ikke saken.");

  const [claims, facts, { data: documents }, { data: legalSources }] = await Promise.all([
    getClaimsWithStatus(supabase, caseId),
    getCaseFacts(supabase, caseId),
    supabase.from("documents").select("original_filename").eq("case_id", caseId),
    supabase
      .from("legal_sources")
      .select("source_code, law_reference, provision, topic, short_explanation")
      .eq("source_type", "lov_forskrift")
      .eq("active", true)
      .eq("verification_status", "verified"),
  ]);

  const ai = await analyzeFullCheck({
    caseTitle: caseRow.title,
    taxPeriod: caseRow.tax_period,
    taxType: caseRow.tax_type,
    amountKr: caseRow.amount_kr,
    description: caseRow.description,
    claims: claims.map((c) => ({ statement: c.statement, status: c.status })),
    documentFilenames: (documents ?? []).map((d) => d.original_filename),
    availableRules: (legalSources ?? []).map((r) => ({
      source_code: r.source_code,
      topic: r.topic,
      short_explanation: r.short_explanation,
    })),
  });

  // RuleReference (reports.content's frozen shape) keeps the rule_code key
  // regardless of the live column's name, so old and new reports stay
  // identically shaped -- see reports/types.ts.
  const applicableRules = (legalSources ?? [])
    .filter((r) => ai.relevant_source_codes.includes(r.source_code))
    .map((r) => ({
      rule_code: r.source_code,
      law_reference: r.law_reference ?? "",
      provision: r.provision ?? "",
      short_explanation: r.short_explanation,
    }));

  const content: FullCheckReportContent = {
    summary: ai.summary,
    background: ai.background,
    documented_facts: claims
      .filter((c) => c.status === "documented")
      .map((c) => ({ statement: c.statement, reasoning: c.reasoning })),
    uncertain_or_missing: claims
      .filter((c) => c.status === "undocumented")
      .map((c) => ({ statement: c.statement, reasoning: c.reasoning })),
    conflicting_information: ai.conflicting_notes,
    timeline: facts.timeline.map((t) => ({ date: t.date, label: t.label })),
    parties: facts.parties,
    amounts: facts.amounts.map((a) => ({ label: a.label, amount_kr: a.amount_kr })),
    applicable_rules: applicableRules,
    assessment: ai.assessment,
    documentation_gaps: ai.documentation_gaps,
    recommended_next_steps: ai.recommended_next_steps,
  };

  const { data: report, error: insertError } = await supabase
    .from("reports")
    .insert({ case_id: caseId, type: "full-sjekk", content, model: MODEL })
    .select("*")
    .single();
  if (insertError || !report) throw new Error("Kunne ikke lagre rapporten.");

  return report as Report;
}
