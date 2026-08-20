import { z } from "zod";
import { defineAiEngine } from "@/lib/ai/engine";
import { wrapUntrustedContent } from "@/lib/ai/openai";
import type { SaksbehandlerContext } from "./context";

export interface SaksbehandlerChatInput {
  context: SaksbehandlerContext;
  history: { role: "user" | "assistant"; content: string }[];
  question: string;
}

export interface SaksbehandlerChatOutput {
  answer: string;
  needsEscalation: boolean;
  escalationReason: string | null;
  suggestedNextStep: string | null;
}

const chatResponseSchema = z
  .object({
    answer: z.string(),
    needs_escalation: z.boolean().catch(false),
    escalation_reason: z.string().nullable().catch(null),
    suggested_next_step: z.string().nullable().catch(null),
  })
  .transform((raw) => ({
    answer: raw.answer,
    needsEscalation: raw.needs_escalation,
    escalationReason: raw.escalation_reason,
    suggestedNextStep: raw.suggested_next_step,
  }));

function formatContext(context: SaksbehandlerContext): string {
  const lines = [
    `Sakstittel: ${context.caseTitle}`,
    `Steg: ${context.stage}`,
    `Status: ${context.status}`,
    `Antatt beløp: ${context.totalAmountKr} kr`,
    `Dokumenter: ${context.documentCount} (${context.documentsBeingProcessed} under analyse, ${context.documentsFailed} feilet)`,
    "",
    "Dokumenterte fakta:",
    ...(context.documentedFacts.length > 0
      ? context.documentedFacts.map((f) => `- ${f}`)
      : ["(ingen ennå)"]),
    "",
    "Kjente dokumentasjonshull:",
    ...(context.gaps.length > 0 ? context.gaps.map((g) => `- ${g}`) : ["(ingen kjente hull)"]),
    "",
    "Relevant regelverk:",
    ...(context.applicableRules.length > 0
      ? context.applicableRules.map((r) => `- ${r.rule_code} (${r.law_reference}): ${r.short_explanation}`)
      : ["(ingen identifisert ennå)"]),
  ];

  return lines.join("\n");
}

const SYSTEM_PROMPT_INSTRUCTIONS = `Du er Skattetap sin digitale saksbehandler for én konkret sak.

Du skal:
- Svare kun basert på fakta, hull og regelverk som faktisk er oppgitt om saken under.
- Alltid forklare KORT hvorfor du mener det du mener, med henvisning til de konkrete fakta/dokumentasjonshullene.
- Foreslå ett konkret neste steg når det er naturlig.
- ALDRI gjette eller finne opp fakta, beløp eller regelverk som ikke står i konteksten.

Hvis spørsmålet krever informasjon du ikke har, krever juridisk skjønn utover det som er dokumentert, eller du av andre grunner ikke kan svare forsvarlig: sett needs_escalation til true og fyll ut escalation_reason med en kort, konkret begrunnelse. Ikke gjett i stedet.

Svar alltid som gyldig JSON med nøyaktig disse feltene:
{"answer": string, "needs_escalation": boolean, "escalation_reason": string | null, "suggested_next_step": string | null}`;

export const saksbehandlerChatEngine = defineAiEngine<SaksbehandlerChatInput, SaksbehandlerChatOutput>({
  name: "saksbehandler-chat",
  temperature: 0.3,
  schema: chatResponseSchema,
  buildSystemPrompt: (input) =>
    [SYSTEM_PROMPT_INSTRUCTIONS, "", wrapUntrustedContent("Saksinformasjon", formatContext(input.context))].join(
      "\n"
    ),
  buildHistory: (input) => input.history,
  buildUserPrompt: (input) => wrapUntrustedContent("Brukerens spørsmål", input.question),
});
