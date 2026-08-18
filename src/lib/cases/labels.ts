import type { BadgeTone } from "@/components/design-system";
import type { CaseStage, CaseStatus } from "./types";

export const stageLabels: Record<CaseStage, string> = {
  "enkel-sjekk": "Enkel sjekk",
  "full-sjekk": "Full sjekk",
  skatteendring: "Skatteendring",
  "komplett-sak": "Komplett sak",
  "strategisk-utredning": "Strategisk utredning",
};

export const stageOrder: CaseStage[] = [
  "enkel-sjekk",
  "full-sjekk",
  "skatteendring",
  "komplett-sak",
  "strategisk-utredning",
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
