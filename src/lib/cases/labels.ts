import type { BadgeTone } from "@/components/design-system";
import type { CaseStage, CaseStatus } from "./types";

export const stageLabels: Record<CaseStage, string> = {
  "enkel-sjekk": "Enkel sjekk",
  "full-sjekk": "Full sjekk",
  skatteendring: "Skatteendring",
  utredning: "Utredning",
};

export const stageOrder: CaseStage[] = [
  "enkel-sjekk",
  "full-sjekk",
  "skatteendring",
  "utredning",
];

export const statusLabels: Record<CaseStatus, string> = {
  apen: "Åpen",
  under_arbeid: "Under arbeid",
  fullfort: "Fullført",
  arkivert: "Arkivert",
};

export const statusTones: Record<CaseStatus, BadgeTone> = {
  apen: "info",
  under_arbeid: "warning",
  fullfort: "success",
  arkivert: "neutral",
};
