import { z } from "zod";
import { callAiChatJson, wrapUntrustedContent } from "./openai";

export const FULL_CHECK_INSTRUCTIONS = [
  "Du skriver deler av en strukturert Full sjekk-rapport for Skattetap. Strukturen og alle fakta (påstander, dokumenter, tidslinje) er allerede fastlagt av systemet og gitt deg som kontekst -- du dikter ALDRI opp nye fakta, dokumenter eller hendelser.",
  "I 'background' gjengir du brukerens egen fremstilling som nettopp det -- bruk formuleringer som 'brukeren opplyser at ...'. Fremstill det aldri som et etablert faktum.",
  "I 'summary' beskriver du nøkternt hvor saken står ut fra de oppgitte fakta -- ALDRI en konklusjon om utfallet av saken.",
  "I 'assessment' bruker du UTELUKKENDE rule_code-verdier fra regelverkslisten du får oppgitt. Du dikter aldri opp en regel-kode eller et lovsitat. Du konkluderer aldri med at regelverket er brutt eller at brukeren har krav på noe -- du beskriver kun hvorfor et punkt kan være relevant å vurdere videre.",
  "relevant_rule_codes skal kun inneholde koder som faktisk finnes i listen du fikk oppgitt.",
  "conflicting_notes brukes kun hvis to eller flere oppgitte fakta faktisk motsier hverandre -- finner du ingen motsigelser, returner en tom liste. Du dikter aldri opp en konflikt.",
  "documentation_gaps og recommended_next_steps skal være konkrete og knyttet til DENNE saken, ikke en generisk sjekkliste.",
  "Du svarer utelukkende med det etterspurte JSON-objektet, uten tekst utenfor det.",
].join(" ");

const fullCheckAssessmentSchema = z.object({
  summary: z.string().min(1).max(800),
  background: z.string().min(1).max(1000),
  assessment: z.string().min(1).max(1200),
  relevant_rule_codes: z.array(z.string()).max(6).catch([]),
  conflicting_notes: z.array(z.string().max(300)).max(6).catch([]),
  documentation_gaps: z.array(z.string().max(200)).max(8).catch([]),
  recommended_next_steps: z.array(z.string().max(200)).max(6).catch([]),
});

export type FullCheckAssessment = z.infer<typeof fullCheckAssessmentSchema>;

export interface FullCheckAssessmentInput {
  caseTitle: string;
  taxPeriod: string | null;
  taxType: string;
  amountKr: number | null;
  description: string | null;
  claims: { statement: string; status: string }[];
  documentFilenames: string[];
  availableRules: { rule_code: string; topic: string; short_explanation: string }[];
}

function buildPrompt(input: FullCheckAssessmentInput): string {
  const lines = [
    `Sak: ${input.caseTitle}`,
    `Periode/år: ${input.taxPeriod ?? "ikke oppgitt"}`,
    `Skattetype: ${input.taxType}`,
    `Beløp: ${input.amountKr != null ? `${input.amountKr} kr` : "ikke oppgitt"}`,
    "",
    wrapUntrustedContent("Brukerens forklaring:", input.description ?? "(ingen)"),
    "",
    "Fakta/påstander identifisert i saken:",
    ...input.claims.map((c) => `- ${c.statement} [status: ${c.status}]`),
    "",
    `Dokumenter i saken: ${input.documentFilenames.join(", ") || "ingen"}`,
    "",
    "Tilgjengelig regelverk (bruk KUN disse rule_code-verdiene hvis relevant):",
    ...input.availableRules.map((r) => `- ${r.rule_code}: ${r.topic} -- ${r.short_explanation}`),
    "",
    `Svar med et JSON-objekt på nøyaktig denne formen:
{
  "summary": "kort, nøktern oppsummering av hvor saken står",
  "background": "brukerens fremstilling, gjengitt som nettopp det",
  "assessment": "vurdering som kun refererer regel-koder fra listen over",
  "relevant_rule_codes": ["kun koder fra listen over"],
  "conflicting_notes": ["kun hvis faktiske motsigelser finnes"],
  "documentation_gaps": ["konkrete, saksspesifikke mangler"],
  "recommended_next_steps": ["konkrete neste steg"]
}`,
  ];
  return lines.join("\n");
}

export async function analyzeFullCheck(
  input: FullCheckAssessmentInput
): Promise<FullCheckAssessment> {
  const result = await callAiChatJson({
    systemPrompt: FULL_CHECK_INSTRUCTIONS,
    userPrompt: buildPrompt(input),
    validate: (value) => fullCheckAssessmentSchema.parse(value),
  });

  const validCodes = new Set(input.availableRules.map((r) => r.rule_code));
  return {
    ...result,
    relevant_rule_codes: result.relevant_rule_codes.filter((code) => validCodes.has(code)),
  };
}
