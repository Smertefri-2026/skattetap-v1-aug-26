import { getProductByCode } from "@/lib/products/catalog";
import { hasAccess } from "@/lib/products/entitlement";
import { createClient } from "@/lib/supabase/server";
import { PurchasePrompt } from "./PurchasePrompt";

export async function PurchaseGate({
  caseId,
  productCode,
  checkoutPending,
  children,
}: {
  caseId: string;
  productCode: string;
  checkoutPending: boolean;
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const [granted, product] = await Promise.all([
    hasAccess(supabase, caseId, productCode),
    getProductByCode(supabase, productCode),
  ]);

  if (granted) return <>{children}</>;

  return (
    <PurchasePrompt
      caseId={caseId}
      productCode={productCode}
      productName={product?.name ?? productCode}
      priceKr={product?.price_kr ?? 0}
      checkoutPending={checkoutPending}
    />
  );
}
