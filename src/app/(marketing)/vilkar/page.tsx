import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vilkår",
  description: "Vilkår for bruk av Skattetap.",
};

export default function VilkarPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="text-3xl font-semibold text-ink">Vilkår for bruk</h1>

      <div className="mt-6 rounded-lg border border-warning-subtle bg-warning-subtle p-5 text-[13.5px] text-warning-ink">
        Dette er et utkast under juridisk gjennomgang, og er ikke endelig
        kvalitetssikret. Innholdet beskriver hvordan tjenesten er ment å
        fungere, men skal ikke leses som ferdige, bindende vilkår før dette
        varselet er fjernet.
      </div>

      <div className="mt-8 flex flex-col gap-7 text-[15px] leading-relaxed text-ink-soft">
        <section>
          <h2 className="text-[16px] font-semibold text-ink">1. Om tjenesten</h2>
          <p className="mt-2">
            Skattetap er en nettbasert tjeneste som hjelper deg å strukturere
            og vurdere opplysninger i en skattesak, ved hjelp av
            kunstig intelligens og egne dokumenter du laster opp. Tjenesten
            gir ingen juridisk fasit og garanterer ikke noe bestemt utfall.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">2. Konto og registrering</h2>
          <p className="mt-2">
            For å bruke tjenesten må du opprette en konto med korrekte
            personopplysninger. Du er selv ansvarlig for å holde
            passordet ditt hemmelig, og for aktivitet som skjer via kontoen
            din.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">3. Kjøp og betaling</h2>
          <p className="mt-2">
            Enkelte produkter i tjenesten er betalte engangskjøp knyttet til
            en spesifikk sak. Priser vises tydelig før kjøp gjennomføres.
            Betaling håndteres av en ekstern betalingsleverandør, og
            Skattetap lagrer ikke kortopplysningene dine selv.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">4. Ansvarsbegrensning</h2>
          <p className="mt-2">
            Vurderinger, forslag og analyser i tjenesten er et strukturert
            utgangspunkt for videre vurdering — ikke juridisk rådgivning og
            ikke en avgjørelse fra Skatteetaten eller andre myndigheter.
            Skattetap er ikke ansvarlig for beslutninger du tar på bakgrunn
            av innholdet i tjenesten.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">5. Oppsigelse</h2>
          <p className="mt-2">
            Du kan når som helst slette kontoen din. Data knyttet til
            gjennomførte kjøp kan likevel oppbevares en periode i tråd med
            gjeldende regnskaps- og bokføringsregler.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">6. Kontakt</h2>
          <p className="mt-2">
            Spørsmål om vilkårene kan rettes til oss via kontaktsiden.
          </p>
        </section>
      </div>
    </main>
  );
}
