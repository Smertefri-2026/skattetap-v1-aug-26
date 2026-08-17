export interface Product {
  product_code: string;
  name: string;
  price_kr: number;
  sort_order: number;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  active: boolean;
}
