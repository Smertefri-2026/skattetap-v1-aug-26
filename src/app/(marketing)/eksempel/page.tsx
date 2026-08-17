import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/design-system";

export const metadata: Metadata = {
  title: "Eksempel",
  description: "Et gjennomarbeidet, fiktivt eksempel på en sak i Skattetap.",
};

export default function EksempelPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <Badge tone="neutral">Fiktivt eksempel</Badge>
      <h1 className="mt-4 text-3xl font-semibold text-ink">
        Pendlerfradraget Kari glemte i to år
      </h1>
      <p className="mt-4 max-w-xl text-[15.5px] text-ink-soft">
        Personen, tallene og dokumentene under er oppdiktet, men prosessen er
        realistisk for hvordan en sak beveger seg gjennom Skattetap.
      </p>

      <div className="mt-12 flex flex-col gap-10">
        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[12px] text-ink-faint">
              Steg 1
            </span>
            <h2 className="text-[16px] font-semibold text-ink">
              Enkel sjekk
            </h2>
          </div>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">
            Kari begynte å pendle 6 mil hver vei til en ny jobb i 2023, men
            oppdaget aldri at hun kunne føre reisefradrag. Hun fylte inn
            perioden, jobbskiftet og en kort forklaring i Enkel sjekk.
          </p>
          <div className="mt-4 rounded-md bg-primary-subtle p-4">
            <p className="text-[13.5px] font-semibold text-primary-ink">
              Systemets førstevurdering
            </p>
            <p className="mt-1.5 text-[13.5px] text-primary-ink">
              Reiseavstanden og perioden du oppgir kan gi grunnlag for
              reisefradrag for både 2023 og 2024. Dette er ikke bekreftet av
              dokumentasjon ennå — last opp lønnsslipper eller
              arbeidskontrakt i Full sjekk for å gå videre.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[12px] text-ink-faint">
              Steg 2
            </span>
            <h2 className="text-[16px] font-semibold text-ink">Full sjekk</h2>
          </div>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">
            Kari lastet opp arbeidskontrakten og seks lønnsslipper. Systemet
            identifiserte arbeidsgiver, startdato og lønnsperiode automatisk,
            og hun bekreftet reiseavstanden selv.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="success">Dokumentert: jobbstart 14.08.2023</Badge>
            <Badge tone="success">Dokumentert: arbeidssted</Badge>
            <Badge tone="neutral">Brukerens forklaring: reiseavstand</Badge>
            <Badge tone="warning">Mangler: dokumentasjon for 2024</Badge>
          </div>
          <p className="mt-4 text-[14.5px] leading-relaxed text-ink-soft">
            Rapporten anslo et samlet uutnyttet fradrag på omkring{" "}
            <strong className="text-ink">14 200 kr</strong> for 2023, med et
            tilsvarende forhold for 2024 som manglet dokumentasjon.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[12px] text-ink-faint">
              Steg 3
            </span>
            <h2 className="text-[16px] font-semibold text-ink">
              Skatteendring
            </h2>
          </div>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">
            Skattetap satte opp et utkast til endringsanmodning for 2023, med
            rapporten som vedlegg. Kari leste gjennom, justerte ett avsnitt
            selv, og sendte den til Skatteetaten.
          </p>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">
            Da svaret kom seks uker senere, lastet hun det opp i samme steg.
            Systemet forklarte at Skatteetaten hadde gitt medhold i fradraget,
            og pekte på at 2024 fortsatt sto åpent fordi dokumentasjonen
            manglet.
          </p>
        </div>
      </div>

      <div className="mt-14 text-center">
        <Link
          href="/logg-inn"
          className="inline-flex rounded-md bg-primary px-6 py-3 text-[14.5px] font-semibold text-white hover:bg-primary-ink"
        >
          Start din egen enkle sjekk
        </Link>
      </div>
    </main>
  );
}
