export type CaseStage = "enkel-sjekk" | "full-sjekk" | "skatteendring" | "utredning";
export type CaseStatus = "apen" | "under_arbeid" | "fullfort" | "arkivert";

export interface Case {
  id: string;
  title: string;
  tax_period: string | null;
  tax_type: string;
  stage: CaseStage;
  status: CaseStatus;
  created_at: string;
  updated_at: string;
}
