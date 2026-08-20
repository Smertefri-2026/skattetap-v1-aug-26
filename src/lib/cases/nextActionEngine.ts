import { z } from "zod";
import { defineAiEngine } from "@/lib/ai/engine";
import { wrapUntrustedContent } from "@/lib/ai/openai";
import type { NextActionType } from "./types";

export type { NextActionType };

const ACTION_TYPES: NextActionType[] = [
  "upload_document",
  "resolve_conflict",
  "generate_report",
  "purchase_upgrade",
  "talk_to_advisor",
  "provide_information",
];

export interface NextActionInput {
  caseTitle: string;
  documentedFacts: string[];
  undocumentedFacts: string[];
  conflicts: { statementA: string; statementB: string }[];
  openGaps: { description: string; importance: string }[];
  currentTier: string;
  hasReportForCurrentTier: boolean;
}

export interface NextActionOutput {
  action: string;
  reasoning: string;
  actionType: NextActionType;
}

const responseSchema = z
  .object({
    action: z.string().min(1).max(150),
    reasoning: z.string().min(1).max(300),
    action_type: z.enum(ACTION_TYPES as [NextActionType, ...NextActionType[]]).catch("provide_information"),
  })
  .transform((raw) => ({
    action: raw.action,
    reasoning: raw.reasoning,
    actionType: raw.action_type,
  }));

function formatConflicts(conflicts: NextActionInput["conflicts"]): string {
  if (conflicts.length === 0) return "(ingen konflikter)";
  return conflicts.map((c, i) => `${i + 1}. "${c.statementA}" motsier "${c.statementB}"`).join("\n");
}

function formatGaps(gaps: NextActionInput["openGaps"]): string {
  if (gaps.length === 0) return "(ingen åpne dokumentasjonshull)";
  return gaps.map((g, i) => `${i + 1}. ${g.description} -- ${g.importance}`).join("\n");
}

const SYSTEM_PROMPT = `Du er "next-action"-motoren i en Evidence Engine-basert saksbehandlingsplattform. Du foreslår ÉN konkret neste handling for brukeren, basert utelukkende på den faktiske saksstatusen under -- aldri en generisk sjekkliste.

Prioriter i denne rekkefølgen, men bruk skjønn: (1) motsigelser som bør avklares før noe annet gir mening, (2) det åpne dokumentasjonshullet med størst betydning, (3) om saken er klar for neste rapportnivå (send da action_type "generate_report"), (4) om et høyere nivå ville gitt reell tilleggsverdi akkurat nå (send "purchase_upgrade"), (5) om spørsmålet egentlig krever en samtale (send "talk_to_advisor"), (6) om det rett og slett mangler grunnleggende informasjon fra brukeren selv (send "provide_information").

action skal være kort og konkret (f.eks. "Last opp arbeidsavtalen som viser fast arbeidssted", ikke "skaff mer dokumentasjon"). reasoning skal vise til de KONKRETE forholdene under, ikke generelle formuleringer.

Svar alltid som gyldig JSON med nøyaktig disse feltene:
{"action": string, "reasoning": string, "action_type": "upload_document"|"resolve_conflict"|"generate_report"|"purchase_upgrade"|"talk_to_advisor"|"provide_information"}`;

export const nextActionEngine = defineAiEngine<NextActionInput, NextActionOutput>({
  name: "case-next-action",
  temperature: 0.2,
  schema: responseSchema,
  buildSystemPrompt: () => SYSTEM_PROMPT,
  buildUserPrompt: (input) =>
    wrapUntrustedContent(
      "Saksstatus",
      [
        `Sak: ${input.caseTitle}`,
        `Nåværende nivå: ${input.currentTier}`,
        `Rapport generert for nåværende nivå: ${input.hasReportForCurrentTier ? "ja" : "nei"}`,
        "",
        "Dokumenterte fakta:",
        ...(input.documentedFacts.length ? input.documentedFacts.map((f) => `- ${f}`) : ["(ingen)"]),
        "",
        "Udokumenterte fakta:",
        ...(input.undocumentedFacts.length ? input.undocumentedFacts.map((f) => `- ${f}`) : ["(ingen)"]),
        "",
        "Konflikter:",
        formatConflicts(input.conflicts),
        "",
        "Åpne dokumentasjonshull:",
        formatGaps(input.openGaps),
      ].join("\n")
    ),
});
