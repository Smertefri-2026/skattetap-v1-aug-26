import Link from "next/link";
import { Badge } from "@/components/design-system";
import { EvidenceEngineShowcase } from "@/components/marketing/EvidenceEngineShowcase";
import { ProductLadder } from "@/components/marketing/ProductLadder";

const trustPoints = [
  "Gratis å starte",
  "Ingen garantier — kun det som faktisk er dokumentert",
  "Du bestemmer hva som lastes opp",
];

const evidencePrinciples = [
  {
    title: "Dokumenterer",
    body: "Hver påstand kobles til dokumentet den faktisk kommer fra — aldri en løs oppsummering.",
  },
  {
    title: "Begrunner",
    body: "Enhver vurdering har en forklaring du kan lese, ikke bare en konklusjon.",
  },
  {
    title: "Sier fra",
    body: "Mangler noe eller motsier informasjonen hverandre, sier vi konkret hva det gjelder.",
  },
];

export default function Home() {
  return (
    <main>
      <section className="mx-auto max-w-3xl px-6 pt-20 pb-14 text-center">
        <Badge tone="neutral">Din digitale skattesaksbehandler</Badge>
        <h1 className="mt-5 text-4xl font-semibold text-ink sm:text-[44px] sm:leading-[1.1]">
          Har du betalt for mye skatt?
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[16.5px] text-ink-soft">
          Skattetap går gjennom saken din slik en fagperson ville gjort: dokumenterer hver
          påstand til kilden, forklarer hver vurdering, og sier tydelig fra når noe mangler
          eller motsier hverandre.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/logg-inn?tab=registrer"
            className="rounded-md bg-primary px-6 py-3 text-[14.5px] font-semibold text-white hover:bg-primary-ink"
          >
            Start enkel sjekk — gratis
          </Link>
          <Link
            href="/eksempel"
            className="rounded-md border border-border-strong bg-surface px-6 py-3 text-[14.5px] font-semibold text-ink hover:bg-surface-alt"
          >
            Se eksempelrapport
          </Link>
        </div>
        <ul className="mx-auto mt-9 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {trustPoints.map((point) => (
            <li key={point} className="text-[12.5px] text-ink-faint">
              {point}
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-border bg-surface-alt">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <p className="text-center text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
            Evidence Engine
          </p>
          <h2 className="mt-2 text-center text-2xl font-semibold text-ink">
            Skattetap gjetter aldri
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-[15px] text-ink-soft">
            Alt du oppgir selv, det som faktisk bekreftes av dokumentene dine, og det som er en
            KI-vurdering holdes tydelig fra hverandre gjennom hele saken. Slik ser det ut i
            praksis:
          </p>

          <div className="mx-auto mt-8 max-w-xl">
            <EvidenceEngineShowcase />
          </div>

          <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-3">
            {evidencePrinciples.map((p) => (
              <div key={p.title}>
                <p className="text-[14px] font-semibold text-ink">{p.title}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-center text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
          Fra spørsmål til svar
        </p>
        <h2 className="mt-2 text-center text-2xl font-semibold text-ink">
          Fem tydelige steg, du velger hvor langt du går
        </h2>
        <div className="mt-8">
          <ProductLadder />
        </div>
        <p className="mx-auto mt-6 max-w-xl text-center text-[13.5px] text-ink-soft">
          Enkel sjekk er alltid gratis og krever ingen dokumenter — det er her de aller fleste
          starter.
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
            href="/logg-inn?tab=registrer"
            className="mt-6 inline-flex rounded-md bg-primary px-6 py-3 text-[14.5px] font-semibold text-white hover:bg-primary-ink"
          >
            Start enkel sjekk
          </Link>
        </div>
      </section>
    </main>
  );
}
