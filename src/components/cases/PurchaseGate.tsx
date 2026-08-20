import { getUpgradeQuote } from "@/lib/products/entitlement";
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
  const quote = await getUpgradeQuote(supabase, caseId, productCode);

  if (quote?.alreadyHasAccess) return <>{children}</>;

  return (
    <PurchasePrompt
      caseId={caseId}
      productCode={productCode}
      productName={quote?.product.name ?? productCode}
      priceKr={quote?.costKr ?? 0}
      checkoutPending={checkoutPending}
    />
  );
}
