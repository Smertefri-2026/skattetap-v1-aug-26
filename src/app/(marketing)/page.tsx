import Link from "next/link";
import { Badge } from "@/components/design-system";

const steps = [
  {
    n: "1",
    title: "Enkel sjekk",
    desc: "Svar på noen få spørsmål om saken din. Gratis, og du får svar med en gang.",
  },
  {
    n: "2",
    title: "Full sjekk",
    desc: "Last opp dokumentene dine. Vi bygger en strukturert rapport med fakta, tidslinje og regelverk.",
  },
  {
    n: "3",
    title: "Skatteendring",
    desc: "Vi hjelper deg å formulere henvendelsen til Skatteetaten, og tolker svaret når det kommer.",
  },
  {
    n: "4",
    title: "Utredning",
    desc: "For større saker: alt grunnlaget samlet til videre vurdering.",
  },
];

export default function Home() {
  return (
    <main>
      <section className="mx-auto max-w-3xl px-6 pt-20 pb-16 text-center">
        <Badge tone="info">Gratis å sjekke</Badge>
        <h1 className="mt-5 text-4xl font-semibold text-ink sm:text-[44px] sm:leading-[1.1]">
          Har du betalt for mye skatt?
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[16.5px] text-ink-soft">
          Skattetap hjelper deg å finne ut om det finnes fradrag, feil skatt
          eller andre forhold som er verdt å se nærmere på — basert på dine
          egne opplysninger og dokumenter.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/logg-inn"
            className="rounded-md bg-primary px-6 py-3 text-[14.5px] font-semibold text-white hover:bg-primary-ink"
          >
            Start enkel sjekk — gratis
          </Link>
          <Link
            href="/slik-fungerer-det"
            className="rounded-md border border-border-strong bg-surface px-6 py-3 text-[14.5px] font-semibold text-ink hover:bg-surface-alt"
          >
            Slik fungerer det
          </Link>
        </div>
      </section>

      <section className="border-y border-border bg-surface-alt">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <p className="text-center text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
            Fra spørsmål til svar
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div
                key={step.n}
                className="rounded-lg border border-border bg-surface p-5 shadow-sm"
              >
                <span className="font-mono text-[12px] text-ink-faint">
                  Steg {step.n}
                </span>
                <h3 className="mt-2 text-[15px] font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h2 className="text-2xl font-semibold text-ink">
          Vi blander aldri det du forteller med det som er dokumentert
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] text-ink-soft">
          Alt du oppgir selv, det som faktisk bekreftes av dokumentene dine,
          og det som er en KI-vurdering holdes tydelig fra hverandre gjennom
          hele saken — slik at du alltid vet hva som er fakta og hva som er
          en vurdering.
        </p>
      </section>

      <section className="border-t border-border bg-surface-alt">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="text-2xl font-semibold text-ink">
            Klar for å se hva saken din inneholder?
          </h2>
          <p className="mt-3 text-[15px] text-ink-soft">
            Den enkle sjekken tar noen minutter og koster ingenting.
          </p>
          <Link
            href="/logg-inn"
            className="mt-6 inline-flex rounded-md bg-primary px-6 py-3 text-[14.5px] font-semibold text-white hover:bg-primary-ink"
          >
            Start enkel sjekk
          </Link>
        </div>
      </section>
    </main>
  );
}
