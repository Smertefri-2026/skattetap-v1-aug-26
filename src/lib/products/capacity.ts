import type { SupabaseClient } from "@supabase/supabase-js";
import { stageOrder } from "@/lib/cases/labels";
import type { CaseStage } from "@/lib/cases/types";
import { getProductByCode } from "./catalog";
import { getCaseEntitlement } from "./entitlement";
import type { Product } from "./types";

const BYTES_PER_MB = 1024 * 1024;
const NEAR_LIMIT_RATIO = 0.8;

/** Only these two tiers make commercial sense to sell more capacity on --
 * everywhere else, the right answer to "I need more room" is to upgrade to
 * the next tier, not to buy an add-on and get a bigger tier cheaper piece
 * by piece. A simple, centrally-editable rule, not a schema column. */
const ADDON_ELIGIBLE_STAGES: CaseStage[] = ["komplett-sak", "strategisk-utredning"];

export type CapacityStatus = "normal" | "near_limit" | "limit_reached";

export interface CaseCapacity {
  currentTier: Product;
  maxDocuments: number;
  maxTotalMb: number;
  documentsUsed: number;
  mbUsed: number;
  status: CapacityStatus;
  /** Next tier to recommend when the limit is reached and the case isn't
   * on an add-on-eligible tier yet -- null once there's no higher tier or
   * the case is already add-on-eligible (extra capacity is the answer). */
  recommendedUpgradeStage: CaseStage | null;
  canBuyExtraCapacity: boolean;
}

/** Effective capacity = the case's current tier's included amount, plus
 * every capacity add-on ever purchased for this specific case (not the
 * account) -- summed, since add-ons are meant to stack. */
export async function getCaseCapacity(supabase: SupabaseClient, caseId: string): Promise<CaseCapacity> {
  const entitlement = await getCaseEntitlement(supabase, caseId);
  const currentTier = entitlement ?? (await getProductByCode(supabase, "enkel-sjekk"));
  if (!currentTier) {
    throw new Error("Fant ikke produktdata for enkel-sjekk -- er migrasjonen kjørt?");
  }

  const { data: addonPurchases } = await supabase
    .from("case_capacity_purchases")
    .select("product_code")
    .eq("case_id", caseId);

  let extraDocuments = 0;
  let extraMb = 0;
  const addonCodes = [...new Set((addonPurchases ?? []).map((p) => p.product_code as string))];
  if (addonCodes.length > 0) {
    const { data: addonProducts } = await supabase
      .from("products")
      .select("product_code, addon_documents, addon_total_mb")
      .in("product_code", addonCodes);
    const byCode = new Map((addonProducts ?? []).map((p) => [p.product_code as string, p]));
    for (const purchase of addonPurchases ?? []) {
      const product = byCode.get(purchase.product_code as string);
      extraDocuments += product?.addon_documents ?? 0;
      extraMb += product?.addon_total_mb ?? 0;
    }
  }

  const maxDocuments = (currentTier.max_documents ?? 0) + extraDocuments;
  const maxTotalMb = (currentTier.max_total_mb ?? 0) + extraMb;

  const [{ count: documentsUsed }, { data: sizeRows }] = await Promise.all([
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("case_id", caseId),
    supabase.from("documents").select("size_bytes").eq("case_id", caseId),
  ]);
  const bytesUsed = (sizeRows ?? []).reduce((sum, d) => sum + (d.size_bytes ?? 0), 0);
  const mbUsed = bytesUsed / BYTES_PER_MB;

  const ratio = Math.max(
    maxDocuments > 0 ? (documentsUsed ?? 0) / maxDocuments : 0,
    maxTotalMb > 0 ? mbUsed / maxTotalMb : 0
  );
  const status: CapacityStatus = ratio >= 1 ? "limit_reached" : ratio >= NEAR_LIMIT_RATIO ? "near_limit" : "normal";

  const stageIndex = stageOrder.indexOf(currentTier.product_code as CaseStage);
  const isAddonEligible = ADDON_ELIGIBLE_STAGES.includes(currentTier.product_code as CaseStage);
  const recommendedUpgradeStage =
    !isAddonEligible && stageIndex >= 0 && stageIndex < stageOrder.length - 1 ? stageOrder[stageIndex + 1] : null;

  return {
    currentTier,
    maxDocuments,
    maxTotalMb,
    documentsUsed: documentsUsed ?? 0,
    mbUsed,
    status,
    recommendedUpgradeStage,
    canBuyExtraCapacity: isAddonEligible,
  };
}

/** Server-side gate for one more upload of a given size -- the real
 * enforcement, checked right before any extraction/AI call, not just a UI
 * hint. Re-derives capacity fresh rather than trusting a client-supplied
 * count, since the client-side display is informational only. */
export async function checkUploadAllowed(
  supabase: SupabaseClient,
  caseId: string,
  newFileBytes: number
): Promise<{ allowed: true } | { allowed: false; reason: string; capacity: CaseCapacity }> {
  const capacity = await getCaseCapacity(supabase, caseId);
  const newFileMb = newFileBytes / BYTES_PER_MB;

  if (capacity.documentsUsed + 1 > capacity.maxDocuments) {
    return {
      allowed: false,
      reason: `Saken har nådd dokumentgrensen som inngår i ${capacity.currentTier.name} (${capacity.maxDocuments} dokumenter).`,
      capacity,
    };
  }
  if (capacity.mbUsed + newFileMb > capacity.maxTotalMb) {
    return {
      allowed: false,
      reason: `Saken har nådd datamengden som inngår i ${capacity.currentTier.name} (${capacity.maxTotalMb} MB).`,
      capacity,
    };
  }
  return { allowed: true };
}
