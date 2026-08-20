export type CaseStage =
  | "enkel-sjekk"
  | "full-sjekk"
  | "skatteendring"
  | "komplett-sak"
  | "strategisk-utredning";
export type CaseStatus = "apen" | "under_arbeid" | "fullfort" | "arkivert";

export type NextActionType =
  | "upload_document"
  | "resolve_conflict"
  | "generate_report"
  | "purchase_upgrade"
  | "talk_to_advisor"
  | "provide_information";

export interface Case {
  id: string;
  title: string;
  tax_period: string | null;
  tax_type: string;
  amount_kr: number | null;
  description: string | null;
  stage: CaseStage;
  status: CaseStatus;
  created_at: string;
  updated_at: string;
  next_action: string | null;
  next_action_reasoning: string | null;
  next_action_type: NextActionType | null;
  next_action_computed_at: string | null;
}
