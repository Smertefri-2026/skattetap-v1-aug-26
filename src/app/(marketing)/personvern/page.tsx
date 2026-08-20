import type { Metadata } from "next";
import { LegalReviewFlag } from "@/components/marketing/LegalReviewFlag";

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
        erklæring før dette varselet er fjernet. Enkeltavsnitt som krever et
        bevisst juridisk eller forretningsmessig valg er merket særskilt.
      </div>

      <div className="mt-8 flex flex-col gap-7 text-[15px] leading-relaxed text-ink-soft">
        <section>
          <h2 className="text-[16px] font-semibold text-ink">1. Behandlingsansvarlig</h2>
          <p className="mt-2">
            PT Tjenester AS, org.nr. 918 917 349, [registrert adresse] er
            behandlingsansvarlig for personopplysningene som beskrives i
            denne erklæringen.
          </p>
          <LegalReviewFlag>
            Registrert adresse mangler og må fylles inn -- dette er
            obligatorisk informasjon etter personopplysningsloven/GDPR art.
            13, ikke valgfritt. Placeholder satt bevisst i stedet for
            oppdiktede opplysninger.
          </LegalReviewFlag>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">2. Hvilke opplysninger vi samler inn</h2>
          <p className="mt-2">
            Når du oppretter konto lagrer vi navn, adresse, postnummer,
            poststed, mobilnummer og e-post. I tillegg lagres dokumentene du
            selv laster opp, opplysningene du oppgir i sakene dine, og de
            fakta, vurderinger og rapporter Bevismotoren genererer på
            grunnlag av dette. Vi lagrer også grunnleggende bruksdata, som
            når en side ble besøkt eller en handling utført, for å drifte og
            feilsøke tjenesten.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">3. Formål og behandlingsgrunnlag</h2>
          <p className="mt-2">
            Opplysningene brukes for å opprette og administrere kontoen din,
            levere tjenesten, generere rapporter og brev knyttet til dine
            saker, håndtere betaling og kunne kontakte deg om egen sak.
            Behandling av kontoopplysninger og sakens innhold skjer for å
            oppfylle avtalen mellom deg og Skattetap. Grunnleggende
            bruksdata for drift og sikkerhet behandles på grunnlag av
            Skattetaps berettigede interesse i å levere en trygg og
            fungerende tjeneste.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">4. Bruk av kunstig intelligens</h2>
          <p className="mt-2">
            Dokumentene og opplysningene du legger inn i en sak analyseres
            av kunstig intelligens som en del av Bevismotoren, for å trekke
            ut fakta, oppdage motsigelser og foreslå hva som mangler.
            Deler av denne behandlingen skjer hos en ekstern
            KI-leverandør (se punkt 5).
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">5. Databehandlere og mottakere av opplysninger</h2>
          <p className="mt-2">
            Skattetap bruker eksterne leverandører for å drifte tjenesten,
            blant annet til databaselagring og dokumentlagring, betaling og
            KI-basert analyse. Disse behandler opplysninger på vegne av
            Skattetap, og har ikke selvstendig rett til å bruke dem til
            egne formål.
          </p>
          <LegalReviewFlag>
            Fullstendig, navngitt liste over databehandlere bør inn her,
            typisk: Supabase (database, filer og innlogging), Stripe
            (betaling), OpenAI (KI-analyse) og Cloudflare (bot-beskyttelse).
            Bør kvalitetssikres av jurist/DPO opp mot faktiske
            databehandleravtaler (DPA) med hver leverandør, og oppdateres
            om leverandørlisten endres.
          </LegalReviewFlag>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">6. Overføring til land utenfor EU/EØS</h2>
          <p className="mt-2">
            Enkelte av leverandørene nevnt i punkt 5 kan behandle
            opplysninger i land utenfor EU/EØS, blant annet USA. Slik
            overføring skal skje på et gyldig overføringsgrunnlag, for
            eksempel EUs standard personvernbestemmelser (SCC).
          </p>
          <LegalReviewFlag>
            Må bekreftes konkret: hvilke leverandører overfører data ut av
            EU/EØS (særlig aktuelt for KI-leverandøren), og hvilket
            overføringsgrunnlag som faktisk er på plass for hver av dem.
            Ikke publiser denne erklæringen som endelig før dette er
            verifisert.
          </LegalReviewFlag>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">7. Lagringstid</h2>
          <p className="mt-2">
            Vi lagrer opplysningene dine så lenge kontoen din er aktiv.
            Regnskapsopplysninger knyttet til gjennomførte kjøp lagres i
            henhold til bokføringslovens krav, uavhengig av om kontoen
            slettes. Sletter du kontoen, sletter vi øvrige opplysninger
            innen rimelig tid.
          </p>
          <LegalReviewFlag>
            Eksakte lagringstider (spesifikt antall år for regnskapsdata,
            og hva som menes med &quot;rimelig tid&quot; for øvrige opplysninger) må
            fastsettes konkret og kvalitetssikres -- ikke la det stå vagt i
            den endelige versjonen.
          </LegalReviewFlag>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">8. Sikkerhet og lagring</h2>
          <p className="mt-2">
            Opplysningene lagres i en database med tilgangskontroll på
            servernivå, slik at du kun har tilgang til dine egne saker og
            dokumenter -- andre brukere har ikke tilgang til saken din. Vi
            selger aldri opplysningene dine videre.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">9. Informasjonskapsler (cookies)</h2>
          <p className="mt-2">
            Skattetap bruker informasjonskapsler som er nødvendige for at
            innlogging og sikkerhet skal fungere. Enkelte
            tredjepartstjenester vi bruker, blant annet for
            bot-beskyttelse, kan også sette informasjonskapsler.
          </p>
          <LegalReviewFlag>
            Bør kvalitetssikres opp mot ekomlovens krav til samtykke for
            ikke-nødvendige informasjonskapsler. Avklar om noen av
            informasjonskapslene som faktisk settes i dag krever eget
            samtykke (utover det som er unntatt som strengt nødvendig), og
            om det trengs en egen cookie-banner/cookie-side.
          </LegalReviewFlag>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">10. Dine rettigheter</h2>
          <p className="mt-2">
            Du kan be om innsyn i, retting av eller sletting av
            opplysningene vi har lagret om deg, og du kan når som helst
            trekke tilbake samtykke til markedsføring. Du har også rett til
            å klage til Datatilsynet dersom du mener vi behandler
            personopplysningene dine i strid med regelverket.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">11. Markedsføringssamtykke</h2>
          <p className="mt-2">
            Dersom du har krysset av for det ved registrering, bruker vi
            e-posten din til å sende nyheter, produktoppdateringer og
            tilbud. Dette skjer utelukkende basert på ditt eget, aktive
            samtykke. Du kan når som helst trekke samtykket tilbake, uten at
            det påvirker din tilgang til selve tjenesten.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">12. Kontakt og klagerett</h2>
          <p className="mt-2">
            Spørsmål om personvern kan rettes til oss via kontaktsiden. Du
            kan også klage til Datatilsynet.
          </p>
        </section>
      </div>
    </main>
  );
}
