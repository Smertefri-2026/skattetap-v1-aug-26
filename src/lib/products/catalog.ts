import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "./types";

export async function getProducts(supabase: SupabaseClient): Promise<Product[]> {
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export async function getProductByCode(
  supabase: SupabaseClient,
  productCode: string
): Promise<Product | null> {
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("product_code", productCode)
    .eq("active", true)
    .single();
  return data ?? null;
}
