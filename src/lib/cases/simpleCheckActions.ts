"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/requireUser";
import { createClient } from "@/lib/supabase/server";
import { analyzeSimpleCheck, type SimpleCheckResult } from "@/lib/ai/simpleCheck";

const simpleCheckSchema = z.object({
  taxPeriod: z.string().trim().max(50).optional(),
  taxType: z.enum(["lonn", "naering", "formue", "arv_gave", "annet"]),
  amountKr: z.string().trim().optional(),
  description: z.string().trim().min(20).max(4000),
});

export type SimpleCheckState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "success"; result: SimpleCheckResult };

export async function submitSimpleCheck(
  caseId: string,
  _prevState: SimpleCheckState,
  formData: FormData
): Promise<SimpleCheckState> {
  const user = await requireUser();

  const parsed = simpleCheckSchema.safeParse({
    taxPeriod: formData.get("taxPeriod") ?? undefined,
    taxType: formData.get("taxType"),
    amountKr: formData.get("amountKr") ?? undefined,
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return { status: "error", error: "Fyll ut skjemaet på nytt -- noen felt mangler eller er for korte." };
  }

  const amountKr = parsed.data.amountKr ? Number(parsed.data.amountKr) : null;
  if (amountKr != null && (Number.isNaN(amountKr) || amountKr < 0)) {
    return { status: "error", error: "Beløpet må være et gyldig, positivt tall." };
  }

  const supabase = await createClient();
  const { data: caseData, error: caseError } = await supabase
    .from("cases")
    .select("id, title, user_id")
    .eq("id", caseId)
    .single();

  if (caseError || !caseData || caseData.user_id !== user.id) {
    return { status: "error", error: "Fant ikke saken." };
  }

  const input = {
    title: caseData.title,
    taxPeriod: parsed.data.taxPeriod || null,
    taxType: parsed.data.taxType,
    amountKr,
    description: parsed.data.description,
  };

  let result: SimpleCheckResult;
  try {
    result = await analyzeSimpleCheck(input);
  } catch {
    return { status: "error", error: "KI-analysen feilet. Prøv igjen om litt." };
  }

  await supabase
    .from("cases")
    .update({
      tax_period: input.taxPeriod,
      tax_type: input.taxType,
      amount_kr: input.amountKr,
      description: input.description,
      status: "under_arbeid",
    })
    .eq("id", caseId);

  await supabase.from("case_assessments").insert({
    case_id: caseId,
    kind: "enkel-sjekk",
    input,
    output: result,
    model: "gpt-4.1-mini",
  });

  return { status: "success", result };
}
