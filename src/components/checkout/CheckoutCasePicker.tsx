import Link from "next/link";
import { Button, Card } from "@/components/design-system";
import { createCase } from "@/lib/cases/actions";
import type { CaseStage } from "@/lib/cases/types";

interface CaseOption {
  id: string;
  title: string;
}

/**
 * The logged-in half of column 2. Lists the user's cases as selectable
 * links (?sak=<id>, same page) plus an inline create-new-case form --
 * both reuse the existing createCase server action unchanged (extended
 * with an optional returnTo="utsjekk" so creation lands back here instead
 * of jumping to the case page). No new case-creation logic.
 *
 * Sign-out posts to the existing /auth/signout route (now extended with
 * an optional "next" field) with the current product baked in, so a
 * visitor who logs out to switch accounts lands back on the same
 * ?produkt= instead of losing their selection.
 */
export function CheckoutCasePicker({
  produkt,
  cases,
  selectedCaseId,
  email,
}: {
  produkt: CaseStage;
  cases: CaseOption[];
  selectedCaseId?: string;
  email: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-alt p-4">
        <p className="text-[13px] text-ink-soft">
          Du er logget inn som <span className="font-semibold text-ink">{email}</span>
        </p>
        <form action="/auth/signout" method="post">
          <input type="hidden" name="next" value={`/utsjekk?produkt=${produkt}`} />
          <button type="submit" className="shrink-0 text-[12.5px] font-medium text-ink-faint hover:text-ink hover:underline">
            Logg ut
          </button>
        </form>
      </div>

      <p className="mt-5 text-[13px] font-medium text-ink">Hvilken sak gjelder kjøpet?</p>

      {cases.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {cases.map((c) => {
            const selected = c.id === selectedCaseId;
            return (
              <li key={c.id}>
                <Link href={`/utsjekk?produkt=${produkt}&sak=${c.id}`}>
                  <Card selected={selected} className="flex items-center justify-between !p-4">
                    <span className="text-[13.5px] font-medium text-ink">{c.title}</span>
                    {selected && <span className="text-[12px] font-semibold text-primary-ink">Valgt</span>}
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <form
        action={createCase}
        className="mt-4 flex flex-col gap-3 rounded-md border border-border bg-surface p-4 sm:flex-row sm:items-end"
      >
        <input type="hidden" name="steg" value={produkt} />
        <input type="hidden" name="returnTo" value="utsjekk" />
        <div className="flex-1">
          <label htmlFor="checkout-new-case-title" className="text-[13px] font-medium text-ink">
            {cases.length > 0 ? "Eller opprett en ny sak" : "Opprett din første sak"}
          </label>
          <input
            id="checkout-new-case-title"
            name="title"
            required
            minLength={3}
            maxLength={200}
            placeholder="F.eks. Pendlerfradrag 2023"
            className="mt-1.5 w-full rounded-md border border-border-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-primary"
          />
        </div>
        <Button type="submit" variant={cases.length === 0 ? "primary" : "secondary"}>
          Opprett sak
        </Button>
      </form>
    </div>
  );
}
