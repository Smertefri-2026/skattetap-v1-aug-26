import Link from "next/link";
import { Button } from "@/components/design-system";
import { createCase } from "@/lib/cases/actions";
import { getProductByCode } from "@/lib/products/catalog";
import { createClient } from "@/lib/supabase/server";

/**
 * Lands here after a visitor picks a paid tier on the homepage's product
 * ladder and completes auth (see the "next" param threaded through
 * logg-inn -> auth/confirm). Purchases are case-scoped, so this doesn't
 * check out anything itself -- it just gets the user to the right
 * case's ?steg=<product>, where the existing PurchaseGate/checkout flow
 * takes over completely unchanged. Not rendered for "enkel-sjekk" (free,
 * no purchase to route towards) or an unrecognized product code.
 */
export async function ProductIntentBanner({ productCode }: { productCode: string }) {
  const supabase = await createClient();
  const [product, { data: cases }] = await Promise.all([
    getProductByCode(supabase, productCode),
    supabase.from("cases").select("id, title").order("updated_at", { ascending: false }),
  ]);

  if (!product) return null;

  return (
    <section className="mb-8 rounded-lg border border-primary bg-primary-subtle p-6">
      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-primary-ink">Du valgte</p>
      <p className="mt-1 text-[17px] font-semibold text-ink">
        {product.name} — {product.price_kr.toLocaleString("no-NO")} kr
      </p>
      <p className="mt-1.5 text-[13px] text-primary-ink">
        Velg hvilken sak dette skal gjelde, eller opprett en ny.
      </p>

      {cases && cases.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {cases.map((c) => (
            <li key={c.id}>
              <Link
                href={`/min-side/saker/${c.id}?steg=${productCode}`}
                className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3 text-[13.5px] font-medium text-ink hover:border-primary"
              >
                {c.title}
                <span className="text-primary-ink">Fortsett →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <form action={createCase} className="mt-4 flex flex-col gap-3 rounded-md bg-surface p-4 sm:flex-row sm:items-end">
        <input type="hidden" name="steg" value={productCode} />
        <div className="flex-1">
          <label htmlFor="new-case-title" className="text-[13px] font-medium text-ink">
            Eller opprett en ny sak
          </label>
          <input
            id="new-case-title"
            name="title"
            required
            minLength={3}
            maxLength={200}
            placeholder="F.eks. Pendlerfradrag 2023"
            className="mt-1.5 w-full rounded-md border border-border-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-primary"
          />
        </div>
        <Button type="submit">Opprett og fortsett</Button>
      </form>
    </section>
  );
}
