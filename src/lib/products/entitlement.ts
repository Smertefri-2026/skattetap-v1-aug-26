import type { SupabaseClient } from "@supabase/supabase-js";
import { getProductByCode, getProducts } from "./catalog";
import type { Product } from "./types";

/**
 * The highest-tier product a case currently has access to, or null if none
 * has been purchased. Because every product row includes everything with a
 * lower sort_order (tier inheritance), the case's entitlement is fully
 * described by its single highest-ranked purchase -- no separate "includes"
 * list needed anywhere.
 *
 * Reads only case_access, never case_capacity_purchases -- capacity add-ons
 * never write a case_access row (see the Stripe webhook's
 * grantPurchasedProduct), so a case's entitlement.price_kr here is always
 * a tier price alone. This is what keeps getUpgradeQuote's mellomlegg
 * correct below: add-on spend can never leak into it.
 */
export async function getCaseEntitlement(
  supabase: SupabaseClient,
  caseId: string
): Promise<Product | null> {
  const { data } = await supabase
    .from("case_access")
    .select("product_code, products(*)")
    .eq("case_id", caseId);

  const products = (data ?? [])
    .map((row) => row.products as unknown as Product | null)
    .filter((p): p is Product => p != null);

  if (products.length === 0) return null;

  return products.reduce((highest, p) => (p.sort_order > highest.sort_order ? p : highest));
}

export async function hasAccess(
  supabase: SupabaseClient,
  caseId: string,
  productCode: string
): Promise<boolean> {
  const target = await getProductByCode(supabase, productCode);
  if (!target) return false;

  const entitlement = await getCaseEntitlement(supabase, caseId);
  return (entitlement?.sort_order ?? -1) >= target.sort_order;
}

export interface UpgradeQuote {
  product: Product;
  alreadyHasAccess: boolean;
  costKr: number;
}

/** costKr is always the difference between the target tier's price and
 * whatever tier the case has already paid for -- never the full price on
 * an upgrade, and never reduced by capacity add-on spend (entitlement.
 * price_kr above can only ever be a tier price -- see getCaseEntitlement). */
export async function getUpgradeQuote(
  supabase: SupabaseClient,
  caseId: string,
  productCode: string
): Promise<UpgradeQuote | null> {
  const products = await getProducts(supabase);
  const target = products.find((p) => p.product_code === productCode);
  if (!target) return null;

  const entitlement = await getCaseEntitlement(supabase, caseId);
  const alreadyHasAccess = (entitlement?.sort_order ?? -1) >= target.sort_order;
  const costKr = Math.max(0, target.price_kr - (entitlement?.price_kr ?? 0));

  return { product: target, alreadyHasAccess, costKr };
}
