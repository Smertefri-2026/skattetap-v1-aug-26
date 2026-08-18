import { z } from "zod";
import { callAiChatJson, wrapUntrustedContent } from "./openai";

export const SIMPLE_CHECK_INSTRUCTIONS = [
  "Du er en nøktern førstevurderingsassistent for Skattetap. Du vurderer en kort beskrivelse av en mulig skattesak og gir en enkel, forståelig førstesjekk.",
  "Du gir ALDRI en juridisk konklusjon og garanterer ALDRI noe resultat i saken.",
  "Du behandler alltid det brukeren har oppgitt som brukerens egen fremstilling - aldri som fastslåtte fakta. Bruk formuleringer som 'du oppgir at ...'.",
  "Du dikter ikke opp beløp, regler eller fakta som ikke er oppgitt av brukeren.",
  "Du anbefaler Full sjekk kun når det er et konkret, forklarbart forhold å undersøke videre - ikke som standardsvar.",
  "Du svarer utelukkende med det etterspurte JSON-objektet, uten tekst utenfor det.",
].join(" ");

const simpleCheckResultSchema = z.object({
  understood_summary: z.string().min(1).max(600),
  things_to_investigate: z.array(z.string().min(1).max(200)).max(6).catch([]),
  missing_information: z.array(z.string().min(1).max(200)).max(6).catch([]),
  full_check_recommended: z.boolean().catch(false),
  full_check_reasoning: z.string().min(1).max(400),
});

export type SimpleCheckResult = z.infer<typeof simpleCheckResultSchema>;

export interface SimpleCheckInput {
  title: string;
  taxPeriod: string | null;
  taxType: string;
  amountKr: number | null;
  description: string;
}

const taxTypeLabels: Record<string, string> = {
  lonn: "Lønn",
  naering: "Næring",
  formue: "Formue",
  arv_gave: "Arv/gave",
  annet: "Annet",
};

function buildSimpleCheckPrompt(input: SimpleCheckInput): string {
  const lines = [
    `Tittel: ${input.title}`,
    `Periode/år: ${input.taxPeriod ?? "ikke oppgitt"}`,
    `Skattetype: ${taxTypeLabels[input.taxType] ?? input.taxType}`,
    `Beløp: ${input.amountKr != null ? `${input.amountKr} kr` : "ikke oppgitt"}`,
    "",
    wrapUntrustedContent("Brukerens forklaring:", input.description),
  ];
  return lines.join("\n");
}

export async function analyzeSimpleCheck(
  input: SimpleCheckInput
): Promise<SimpleCheckResult> {
  return callAiChatJson({
    systemPrompt: SIMPLE_CHECK_INSTRUCTIONS,
    userPrompt: buildSimpleCheckPrompt(input),
    validate: (value) => simpleCheckResultSchema.parse(value),
  });
}
