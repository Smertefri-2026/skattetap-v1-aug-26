import { Button } from "@/components/design-system";
import { requireUser } from "@/lib/auth/requireUser";
import { updateMarketingConsent, updateProfile } from "@/lib/profile/actions";
import { createClient } from "@/lib/supabase/server";
import { ChangePasswordForm } from "./ChangePasswordForm";

const inputClass =
  "mt-1.5 w-full rounded-md border border-border-strong bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-primary";
const labelClass = "text-[13px] font-medium text-ink";

export async function ProfileTab() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, address, postal_code, city, phone, marketing_consent")
    .eq("id", user.id)
    .single();

  const createdAt = new Date(user.created_at).toLocaleDateString("no-NO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-[16px] font-semibold text-ink">Min konto</h2>

      <section className="max-w-lg rounded-lg border border-border bg-surface p-6 shadow-sm">
        <p className="text-[14px] font-semibold text-ink">Kontoopplysninger</p>
        <dl className="mt-4 flex flex-col gap-3">
          <div>
            <dt className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
              E-post
            </dt>
            <dd className="mt-1 text-[14.5px] text-ink">{user.email}</dd>
          </div>
          <div>
            <dt className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
              Konto opprettet
            </dt>
            <dd className="mt-1 text-[14.5px] text-ink">{createdAt}</dd>
          </div>
        </dl>
      </section>

      <section className="max-w-lg rounded-lg border border-border bg-surface p-6 shadow-sm">
        <p className="text-[14px] font-semibold text-ink">Personopplysninger</p>
        <form action={updateProfile} className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="first_name" className={labelClass}>
                Fornavn
              </label>
              <input
                id="first_name"
                name="first_name"
                required
                defaultValue={profile?.first_name ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="last_name" className={labelClass}>
                Etternavn
              </label>
              <input
                id="last_name"
                name="last_name"
                required
                defaultValue={profile?.last_name ?? ""}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="address" className={labelClass}>
              Adresse
            </label>
            <input
              id="address"
              name="address"
              required
              defaultValue={profile?.address ?? ""}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-[120px_1fr] gap-4">
            <div>
              <label htmlFor="postal_code" className={labelClass}>
                Postnummer
              </label>
              <input
                id="postal_code"
                name="postal_code"
                required
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                defaultValue={profile?.postal_code ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="city" className={labelClass}>
                Poststed
              </label>
              <input
                id="city"
                name="city"
                required
                defaultValue={profile?.city ?? ""}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="phone" className={labelClass}>
              Mobilnummer
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              defaultValue={profile?.phone ?? ""}
              className={inputClass}
            />
          </div>

          <Button type="submit" className="self-start">
            Lagre endringer
          </Button>
        </form>
      </section>

      <section className="max-w-lg rounded-lg border border-border bg-surface p-6 shadow-sm">
        <p className="text-[14px] font-semibold text-ink">Bytt passord</p>
        <div className="mt-4">
          <ChangePasswordForm />
        </div>
      </section>

      <section className="max-w-lg rounded-lg border border-border bg-surface p-6 shadow-sm">
        <p className="text-[14px] font-semibold text-ink">Markedsføring</p>
        <form action={updateMarketingConsent} className="mt-4 flex flex-col gap-4">
          <label className="flex items-start gap-2.5 text-[13px] text-ink-soft">
            <input
              type="checkbox"
              name="marketing_consent"
              defaultChecked={profile?.marketing_consent ?? false}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border-strong"
            />
            <span>
              Jeg ønsker å motta nyheter, produktoppdateringer og tilbud fra SkatteTap
            </span>
          </label>
          <Button type="submit" variant="secondary" className="self-start">
            Lagre
          </Button>
        </form>
      </section>
    </div>
  );
}
