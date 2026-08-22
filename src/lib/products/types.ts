export type PriceType = "one_time" | "recurring";
export type BillingInterval = "month" | "year";
export type ProductScope = "case" | "account";
export type ProductType = "tier" | "capacity_addon";
export type AnalysisProfile = "basic" | "standard";

export interface Product {
  product_code: string;
  name: string;
  price_kr: number;
  sort_order: number;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  active: boolean;
  price_type: PriceType;
  billing_interval: BillingInterval | null;
  scope: ProductScope;
  product_type: ProductType;
  /** Set only on product_type "tier" -- total included capacity. */
  max_documents: number | null;
  max_total_mb: number | null;
  /** Set only on product_type "capacity_addon" -- how much this adds when
   * purchased, on top of whatever the case's tier already includes. */
  addon_documents: number | null;
  addon_total_mb: number | null;
  /** Set only on product_type "tier" -- see analysisProfile.ts. */
  analysis_profile: AnalysisProfile;
}
