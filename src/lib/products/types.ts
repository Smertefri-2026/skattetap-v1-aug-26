export type PriceType = "one_time" | "recurring";
export type BillingInterval = "month" | "year";
export type ProductScope = "case" | "account";

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
}
