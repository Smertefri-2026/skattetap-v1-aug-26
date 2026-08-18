export interface FullCheckReportContent {
  summary: string;
  background: string;
  documented_facts: { statement: string; reasoning: string }[];
  uncertain_or_missing: { statement: string; reasoning: string }[];
  conflicting_information: string[];
  timeline: { date: string; label: string }[];
  parties: string[];
  amounts: { label: string; amount_kr: number }[];
  applicable_rules: {
    rule_code: string;
    law_reference: string;
    provision: string;
    short_explanation: string;
  }[];
  assessment: string;
  documentation_gaps: string[];
  recommended_next_steps: string[];
}

export interface SkatteendringReportContent {
  proposal_text: string;
  reasoning: string;
  referenced_documents: { document_id: string; filename: string; relevance: string }[];
  attachments: string[];
  missing_information: string[];
  applicable_rules: {
    rule_code: string;
    law_reference: string;
    provision: string;
    short_explanation: string;
  }[];
}

export type ReportContent = FullCheckReportContent | SkatteendringReportContent;

export interface Report<T extends ReportContent = FullCheckReportContent> {
  id: string;
  case_id: string;
  type: "full-sjekk" | "skatteendring";
  content: T;
  model: string;
  created_at: string;
}
