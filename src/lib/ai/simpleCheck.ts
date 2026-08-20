import { z } from "zod";
import { callAiChatJson, wrapUntrustedContent } from "./openai";

export const SIMPLE_CHECK_INSTRUCTIONS = [
  "Du er en nøktern førstevurderingsassistent for Skattetap. Du vurderer en kort beskrivelse av en mulig skattesak og gir en enkel, forståelig førstesjekk.",
  "Du gir ALDRI en juridisk konklusjon og garanterer ALDRI noe resultat i saken.",
  "Du behandler alltid det brukeren har oppgitt som brukerens egen fremstilling - aldri som fastslåtte fakta. Bruk formuleringer som 'du oppgir at ...'.",
  "Du dikter ikke opp beløp, regler eller fakta som ikke er oppgitt av brukeren.",
  "Du anbefaler Full sjekk kun når det er et konkret, forklarbart forhold å undersøke videre - ikke som standardsvar.",
  "case_strength er din kvalitative helhetsvurdering av hvor lovende saken virker basert KUN på det brukeren har oppgitt.",
  "estimated_range_kr er et forsiktig spenn i kroner -- ALDRI et konkret ett-tall -- og skal KUN fylles ut når brukerens egen beskrivelse faktisk gir et tallmessig grunnlag (et oppgitt beløp, en kjent sats, et konkret fradrag med kjent størrelsesorden). Har du ikke et reelt grunnlag: sett estimated_range_kr til null. Aldri gjett et spenn bare for å ha noe å vise -- et oppdiktet spenn er verre enn intet spenn.",
  "Du svarer utelukkende med det etterspurte JSON-objektet, uten tekst utenfor det.",
].join(" ");

const simpleCheckResultSchema = z.object({
  understood_summary: z.string().min(1).max(600),
  things_to_investigate: z.array(z.string().min(1).max(200)).max(6).catch([]),
  missing_information: z.array(z.string().min(1).max(200)).max(6).catch([]),
  full_check_recommended: z.boolean().catch(false),
  full_check_reasoning: z.string().min(1).max(400),
  case_strength: z.enum(["lovende", "usikkert", "lite_sannsynlig"]).catch("usikkert"),
  case_strength_reasoning: z.string().min(1).max(400),
  estimated_range_kr: z
    .object({
      low_kr: z.number().min(0),
      high_kr: z.number().min(0),
      basis: z.string().min(1).max(300),
    })
    .nullable()
    .catch(null),
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
    "",
    `Svar med et JSON-objekt på nøyaktig denne formen:
{
  "understood_summary": "kort oppsummering av det brukeren oppgir, gjengitt som nettopp det -- ikke som fastslåtte fakta",
  "things_to_investigate": ["konkrete forhold verdt å se nærmere på"],
  "missing_information": ["konkret informasjon som mangler for å vurdere saken bedre"],
  "full_check_recommended": true eller false,
  "full_check_reasoning": "kort, konkret begrunnelse for anbefalingen",
  "case_strength": "lovende" | "usikkert" | "lite_sannsynlig",
  "case_strength_reasoning": "kort, konkret begrunnelse for helhetsvurderingen",
  "estimated_range_kr": {"low_kr": number, "high_kr": number, "basis": "hvilket konkret grunnlag spennet bygger på"} eller null hvis det ikke finnes noe reelt tallgrunnlag
}`,
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
