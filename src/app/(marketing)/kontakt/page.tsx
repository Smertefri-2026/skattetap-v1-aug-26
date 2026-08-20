import Link from "next/link";
import type { Metadata } from "next";
import { ContactForm } from "@/components/marketing/ContactForm";

export const metadata: Metadata = {
  title: "Kontakt",
  description: "Ta kontakt med SkatteTap.",
};

export default function KontaktPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-20">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <h1 className="text-3xl font-semibold text-ink">Kontakt oss</h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft">
            Har du spørsmål om produktet, priser eller noe annet generelt? Send oss en melding under.
          </p>

          <div className="mt-8 max-w-md rounded-lg border border-border bg-surface-alt p-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4 text-primary-ink" aria-hidden="true">
                  <path d="M4 5h16v11H8l-4 4V5Z" />
                </svg>
              </div>
              <p className="text-[13.5px] font-semibold text-ink">Gjelder det en konkret sak?</p>
            </div>
            <p className="mt-2.5 text-[13px] leading-relaxed text-ink-soft">
              Er du allerede i gang med en sak, får du raskere svar av{" "}
              <span className="font-medium text-ink">Min saksbehandler</span> inne i saken din --
              den kjenner dokumentene, tidslinjen og status akkurat der og da.
            </p>
            <Link href="/logg-inn" className="mt-2.5 inline-block text-[12.5px] font-medium text-primary-ink hover:underline">
              Gå til Min side
            </Link>
          </div>
        </div>

        <div>
          <ContactForm />
        </div>
      </div>
    </main>
  );
}
