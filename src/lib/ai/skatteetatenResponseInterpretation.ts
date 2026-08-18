import { z } from "zod";
import { callAiChatJson, wrapUntrustedContent } from "./openai";

export const RESPONSE_INTERPRETATION_INSTRUCTIONS = [
  "Du tolker et svar fra Skatteetaten på en tidligere henvendelse om skatteendring, og forklarer det på klart norsk for brukeren.",
  "Du skiller ALLTID mellom fem ting og blander dem aldri: (1) dokumenterte forhold Skatteetaten viser til, (2) rettslige vurderinger Skatteetaten gjør, (3) antakelser Skatteetaten synes å legge til grunn, (4) forhold brukerens henvendelse tok opp som IKKE er besvart, (5) eventuelle nye dokumentasjonsbehov Skatteetaten ber om.",
  "Du dikter ikke opp innhold som ikke faktisk står i svaret.",
  "detected_outcome settes til 'medhold', 'delvis_medhold' eller 'avslag' KUN hvis svaret eksplisitt og utvetydig sier dette. Er du i tvil, bruk 'ukjent'. Aldri gjett.",
  "suggested_next_steps skal være konkrete forslag til hva brukeren bør vurdere videre -- ikke en juridisk konklusjon om utfallet.",
  "Du svarer utelukkende med det etterspurte JSON-objektet, uten tekst utenfor det.",
].join(" ");

const responseInterpretationSchema = z.object({
  summary_plain_language: z.string().min(1).max(1200),
  documented_findings: z.array(z.string().max(300)).max(8).catch([]),
  legal_assessments: z.array(z.string().max(300)).max(8).catch([]),
  assumptions: z.array(z.string().max(300)).max(8).catch([]),
  unanswered_points: z.array(z.string().max(300)).max(8).catch([]),
  new_documentation_needs: z.array(z.string().max(300)).max(8).catch([]),
  suggested_next_steps: z.array(z.string().max(300)).max(6).catch([]),
  detected_outcome: z
    .enum(["ukjent", "medhold", "delvis_medhold", "avslag", "trukket_avsluttet"])
    .catch("ukjent"),
});

export type ResponseInterpretation = z.infer<typeof responseInterpretationSchema>;

export interface ResponseInterpretationInput {
  caseTitle: string;
  proposalSummary: string | null;
  responseText: string;
}

function buildPrompt(input: ResponseInterpretationInput): string {
  return [
    `Sak: ${input.caseTitle}`,
    input.proposalSummary
      ? `Tidligere henvendelse (sammendrag): ${input.proposalSummary}`
      : "Ingen tidligere henvendelse registrert i saken.",
    "",
    wrapUntrustedContent("Svar fra Skatteetaten (uthentet tekst):", input.responseText),
    "",
    `Svar med et JSON-objekt på nøyaktig denne formen:
{
  "summary_plain_language": "hva svaret betyr, på klart norsk",
  "documented_findings": ["dokumenterte forhold Skatteetaten viser til"],
  "legal_assessments": ["rettslige vurderinger Skatteetaten gjør"],
  "assumptions": ["antakelser Skatteetaten synes å legge til grunn"],
  "unanswered_points": ["forhold fra henvendelsen som ikke er besvart"],
  "new_documentation_needs": ["nye dokumentasjonsbehov Skatteetaten ber om"],
  "suggested_next_steps": ["konkrete forslag til hva brukeren bør vurdere videre"],
  "detected_outcome": "ukjent | medhold | delvis_medhold | avslag | trukket_avsluttet"
}`,
  ].join("\n");
}

export async function interpretSkatteetatenResponse(
  input: ResponseInterpretationInput
): Promise<ResponseInterpretation> {
  return callAiChatJson({
    systemPrompt: RESPONSE_INTERPRETATION_INSTRUCTIONS,
    userPrompt: buildPrompt(input),
    validate: (value) => responseInterpretationSchema.parse(value),
  });
}
