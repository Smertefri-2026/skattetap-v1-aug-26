import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Personvern",
  description: "Personvernerklæring for Skattetap.",
};

export default function PersonvernPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="text-3xl font-semibold text-ink">Personvernerklæring</h1>

      <div className="mt-6 rounded-lg border border-warning-subtle bg-warning-subtle p-5 text-[13.5px] text-warning-ink">
        Dette er et utkast under juridisk gjennomgang, og er ikke endelig
        kvalitetssikret. Innholdet beskriver hvordan personopplysninger er
        ment å behandles, men skal ikke leses som en ferdig, bindende
        erklæring før dette varselet er fjernet.
      </div>

      <div className="mt-8 flex flex-col gap-7 text-[15px] leading-relaxed text-ink-soft">
        <section>
          <h2 className="text-[16px] font-semibold text-ink">1. Hvilke opplysninger vi samler inn</h2>
          <p className="mt-2">
            Når du oppretter konto lagrer vi navn, adresse, postnummer,
            poststed, mobilnummer og e-post. I tillegg lagres dokumenter du
            selv laster opp, og opplysninger du oppgir i sakene dine.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">2. Hvorfor vi samler dem inn</h2>
          <p className="mt-2">
            Opplysningene brukes for å opprette og administrere kontoen din,
            levere tjenesten, generere rapporter og brev knyttet til dine
            saker, og for å kunne kontakte deg om egen sak. Dersom du har
            samtykket til det, bruker vi også e-posten din til å sende
            nyheter, produktoppdateringer og tilbud.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">3. Behandlingsgrunnlag</h2>
          <p className="mt-2">
            Behandling av kontoopplysninger og sakens innhold skjer for å
            oppfylle avtalen mellom deg og Skattetap. Behandling av
            opplysninger til markedsføring skjer kun basert på ditt eget,
            aktive samtykke, som du når som helst kan trekke tilbake.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">4. Lagring og sikkerhet</h2>
          <p className="mt-2">
            Opplysningene lagres i en database med tilgangskontroll, slik at
            du kun har tilgang til dine egne saker og dokumenter. Vi selger
            aldri opplysningene dine videre.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">5. Dine rettigheter</h2>
          <p className="mt-2">
            Du kan be om innsyn i, retting av eller sletting av
            opplysningene vi har lagret om deg, og du kan når som helst
            trekke tilbake samtykke til markedsføring.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">6. Kontakt</h2>
          <p className="mt-2">
            Spørsmål om personvern kan rettes til oss via kontaktsiden.
          </p>
        </section>
      </div>
    </main>
  );
}
