import { z } from "zod";
import { callAiChatJson, wrapUntrustedContent } from "./openai";

export const SKATTEENDRING_PROPOSAL_INSTRUCTIONS = [
  "Du skriver et strukturert forslag til en henvendelse om skatteendring til Skatteetaten, basert utelukkende på det strukturerte grunnlaget du får oppgitt -- du dikter ALDRI opp nye fakta, dokumenter eller beløp.",
  "proposal_text skal være selve henvendelsesteksten -- saklig, presis og klar til gjennomsyn, IKKE en juridisk konklusjon. Bruk formuleringer som 'det bes om at følgende vurderes' fremfor påstander om at brukeren har rett.",
  "reasoning skal bygge UTELUKKENDE på fakta merket som dokumentert i grunnlaget du får -- ikke på brukerens udokumenterte påstander.",
  "referenced_document_filenames skal kun inneholde filnavn som faktisk finnes i dokumentlisten du får oppgitt. Du dikter aldri opp et filnavn.",
  "relevant_rule_codes skal kun inneholde koder fra regelverkslisten du får oppgitt.",
  "missing_information skal være konkret og knyttet til DENNE saken -- ikke en generisk sjekkliste.",
  "Du svarer utelukkende med det etterspurte JSON-objektet, uten tekst utenfor det.",
].join(" ");

const skatteendringProposalSchema = z.object({
  proposal_text: z.string().min(1).max(4000),
  reasoning: z.string().min(1).max(1500),
  referenced_document_filenames: z.array(z.string()).max(10).catch([]),
  attachments: z.array(z.string().max(200)).max(10).catch([]),
  missing_information: z.array(z.string().max(200)).max(8).catch([]),
  relevant_rule_codes: z.array(z.string()).max(6).catch([]),
});

export type SkatteendringProposal = z.infer<typeof skatteendringProposalSchema>;

export interface SkatteendringProposalInput {
  caseTitle: string;
  taxPeriod: string | null;
  taxType: string;
  amountKr: number | null;
  description: string | null;
  documentedClaims: string[];
  documentFilenames: string[];
  availableRules: { rule_code: string; topic: string; short_explanation: string }[];
  /** Case summary + strongest points from an existing Komplett sak analysis,
   * if the case has one -- lets Skatteendring build on that deeper analysis
   * instead of starting from claims alone. */
  komplettSakContext?: string | null;
}

function buildPrompt(input: SkatteendringProposalInput): string {
  return [
    `Sak: ${input.caseTitle}`,
    `Periode/år: ${input.taxPeriod ?? "ikke oppgitt"}`,
    `Skattetype: ${input.taxType}`,
    `Beløp: ${input.amountKr != null ? `${input.amountKr} kr` : "ikke oppgitt"}`,
    "",
    wrapUntrustedContent("Brukerens forklaring:", input.description ?? "(ingen)"),
    "",
    "Dokumenterte fakta i saken:",
    ...(input.documentedClaims.length ? input.documentedClaims.map((c) => `- ${c}`) : ["(ingen ennå)"]),
    "",
    `Dokumenter i saken: ${input.documentFilenames.join(", ") || "ingen"}`,
    "",
    ...(input.komplettSakContext
      ? [`Grunnlag fra tidligere Komplett sak-analyse: ${input.komplettSakContext}`, ""]
      : []),
    "Tilgjengelig regelverk (bruk KUN disse rule_code-verdiene hvis relevant):",
    ...input.availableRules.map((r) => `- ${r.rule_code}: ${r.topic} -- ${r.short_explanation}`),
    "",
    `Svar med et JSON-objekt på nøyaktig denne formen:
{
  "proposal_text": "selve henvendelsesteksten til Skatteetaten",
  "reasoning": "begrunnelse basert kun på dokumenterte fakta",
  "referenced_document_filenames": ["kun filnavn fra listen over"],
  "attachments": ["hvilke av dokumentene som bør legges ved, og eventuelt hva mer"],
  "missing_information": ["konkrete, saksspesifikke mangler"],
  "relevant_rule_codes": ["kun koder fra listen over"]
}`,
  ].join("\n");
}

export async function analyzeSkatteendringProposal(
  input: SkatteendringProposalInput
): Promise<SkatteendringProposal> {
  const result = await callAiChatJson({
    systemPrompt: SKATTEENDRING_PROPOSAL_INSTRUCTIONS,
    userPrompt: buildPrompt(input),
    validate: (value) => skatteendringProposalSchema.parse(value),
  });

  const validFilenames = new Set(input.documentFilenames);
  const validCodes = new Set(input.availableRules.map((r) => r.rule_code));

  return {
    ...result,
    referenced_document_filenames: result.referenced_document_filenames.filter((f) =>
      validFilenames.has(f)
    ),
    relevant_rule_codes: result.relevant_rule_codes.filter((code) => validCodes.has(code)),
  };
}
