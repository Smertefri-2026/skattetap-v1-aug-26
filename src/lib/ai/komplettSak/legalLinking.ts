import { z } from "zod";
import { callAiChatJson } from "@/lib/ai/openai";
import { formatIndexedClaims, isValidClaimIndex, type IndexedClaim } from "./shared";

export const LEGAL_LINKING_INSTRUCTIONS = [
  "Du er den skatterettslige vurderingsmotoren i Skattetap. Du kobler hvert relevante faktum til regelverket som kan gjelde for det, og skriver en samlet skatterettslig vurdering.",
  "Du bruker UTELUKKENDE source_code-verdier fra regelverkslisten du får oppgitt -- du dikter aldri opp en kode eller et lovsitat.",
  "legal_assessment er en SKATTERETTSLIG vurdering, atskilt fra generell KI-synes-vurdering -- den skal utelukkende resonnere ut fra det oppgitte regelverket og de oppgitte fakta, aldri fra antakelser om hva som er 'rimelig' eller 'sannsynlig utfall'.",
  "Du konkluderer aldri med at brukeren har eller ikke har krav på noe -- du beskriver kun hvorfor et regelverkspunkt kan være relevant for et gitt faktum.",
  "Du referer alltid til fakta ved deres [nummer] fra listen du får oppgitt.",
  "Du svarer utelukkende med det etterspurte JSON-objektet, uten tekst utenfor det.",
].join(" ");

const legalLinkingSchema = z.object({
  claim_source_links: z
    .array(
      z.object({
        claim_index: z.number().int(),
        source_codes: z.array(z.string()).max(4).catch([]),
      })
    )
    .max(20)
    .catch([]),
  legal_assessment: z.string().min(1).max(2000),
});

export type LegalLinkingResult = z.infer<typeof legalLinkingSchema>;

export interface LegalLinkingInput {
  caseTitle: string;
  claims: IndexedClaim[];
  availableRules: { source_code: string; topic: string; short_explanation: string }[];
}

function buildPrompt(input: LegalLinkingInput): string {
  return [
    `Sak: ${input.caseTitle}`,
    "",
    "Fakta/påstander i saken:",
    formatIndexedClaims(input.claims),
    "",
    "Tilgjengelig regelverk (bruk KUN disse source_code-verdiene):",
    ...input.availableRules.map((r) => `- ${r.source_code}: ${r.topic} -- ${r.short_explanation}`),
    "",
    `Svar med et JSON-objekt på nøyaktig denne formen:
{
  "claim_source_links": [{ "claim_index": 1, "source_codes": ["kun koder fra listen over"] }],
  "legal_assessment": "samlet skatterettslig vurdering basert kun på oppgitt regelverk"
}`,
  ].join("\n");
}

export async function analyzeLegalLinking(input: LegalLinkingInput): Promise<LegalLinkingResult> {
  const result = await callAiChatJson({
    systemPrompt: LEGAL_LINKING_INSTRUCTIONS,
    userPrompt: buildPrompt(input),
    validate: (value) => legalLinkingSchema.parse(value),
  });

  const validCodes = new Set(input.availableRules.map((r) => r.source_code));

  return {
    ...result,
    claim_source_links: result.claim_source_links
      .filter((l) => isValidClaimIndex(input.claims, l.claim_index))
      .map((l) => ({ ...l, source_codes: l.source_codes.filter((code) => validCodes.has(code)) })),
  };
}
