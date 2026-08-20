import type { Metadata } from "next";
import { LegalReviewFlag } from "@/components/marketing/LegalReviewFlag";

export const metadata: Metadata = {
  title: "Vilkår",
  description: "Vilkår for bruk av SkatteTap.",
};

export default function VilkarPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="text-3xl font-semibold text-ink">Vilkår for bruk</h1>

      <div className="mt-6 rounded-lg border border-warning-subtle bg-warning-subtle p-5 text-[13.5px] text-warning-ink">
        Dette er et utkast under juridisk gjennomgang, og er ikke endelig
        kvalitetssikret. Innholdet beskriver hvordan tjenesten er ment å
        fungere, men skal ikke leses som ferdige, bindende vilkår før dette
        varselet er fjernet. Enkeltavsnitt som krever et bevisst juridisk
        eller forretningsmessig valg er merket særskilt.
      </div>

      <div className="mt-8 flex flex-col gap-7 text-[15px] leading-relaxed text-ink-soft">
        <section>
          <h2 className="text-[16px] font-semibold text-ink">1. Om tjenesten</h2>
          <p className="mt-2">
            SkatteTap er en nettbasert tjeneste som hjelper deg å strukturere
            og vurdere opplysninger i en skattesak, ved hjelp av
            kunstig intelligens og egne dokumenter du laster opp. Tjenesten
            gir ingen juridisk fasit og garanterer ikke noe bestemt utfall.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">2. Hva SkatteTap er -- og ikke er</h2>
          <p className="mt-2">
            SkatteTap er ikke et advokatfirma og tilbyr ikke juridisk
            bistand eller rådgivning. SkatteTap er heller ikke en autorisert
            regnskapsfører eller skatterådgiver, og vurderingene i tjenesten
            erstatter ikke rådgivning fra en advokat, autorisert
            regnskapsfører eller andre kvalifiserte fagpersoner. Det du får i
            SkatteTap er en strukturert, KI-støttet gjennomgang av egne
            opplysninger og dokumenter -- et utgangspunkt for videre
            vurdering, ikke en konklusjon du kan legge til grunn som riktig
            uten selv å vurdere den.
          </p>
          <LegalReviewFlag>
            Kjerneformulering for å unngå at SkatteTap fremstår som om
            selskapet tilbyr tjenester forbeholdt advokater (jf.
            domstolloven kap. 11) eller autoriserte regnskapsførere (jf.
            regnskapsførerloven). Bør kvalitetssikres opp mot gjeldende
            regelverk om beskyttede titler og hva som regnes som
            rettshjelpsvirksomhet.
          </LegalReviewFlag>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">3. Bevismotoren og hvordan vurderinger produseres</h2>
          <p className="mt-2">
            SkatteTap bruker det vi kaller <strong className="text-ink">SkatteTaps Bevismotor</strong>:
            et sett prinsipper for hvordan systemet behandler informasjon.
            Det du selv oppgir, det som faktisk er dokumentert i det du
            laster opp, og det som er en KI-vurdering, holdes alltid
            tydelig fra hverandre og blandes aldri sammen. Systemet finner
            ikke på opplysninger -- er det usikkert, sier det fra i stedet
            for å gjette.
          </p>
          <p className="mt-2">
            Deler av analysen utføres av kunstig intelligens, herunder
            språkmodeller levert av en ekstern leverandør. Vurderingene som
            produseres kontrolleres ikke rutinemessig av et menneske før du
            ser dem.
          </p>
          <LegalReviewFlag>
            Beskrivelsen av at KI-vurderinger normalt ikke gjennomgås av et
            menneske før visning bør vurderes opp mot eventuelle krav til
            informasjon om automatiserte avgjørelser/profilering (GDPR art.
            13-15, 22) og eventuelt EU-forordningen om kunstig intelligens
            (AI-forordningen), avhengig av hvordan tjenesten klassifiseres.
          </LegalReviewFlag>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">4. Konto og registrering</h2>
          <p className="mt-2">
            For å bruke tjenesten må du opprette en konto med korrekte
            personopplysninger. Du er selv ansvarlig for å holde
            passordet ditt hemmelig, og for aktivitet som skjer via kontoen
            din.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">5. Produktnivåer, kjøp og oppgradering</h2>
          <p className="mt-2">
            Enkel sjekk er gratis og krever ikke betaling. De øvrige
            produktnivåene -- Full sjekk, Skatteendring, Komplett sak og
            Strategisk utredning -- er betalte engangskjøp knyttet til en
            spesifikk sak, ikke et abonnement. Prisen for hvert nivå vises
            tydelig før kjøp gjennomføres.
          </p>
          <p className="mt-2">
            Kjøper du et høyere nivå etter at du allerede har kjøpt et
            lavere nivå på samme sak, betaler du kun differansen mellom
            prisene -- aldri full pris på nytt.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">6. Betaling</h2>
          <p className="mt-2">
            Betaling håndteres av Stripe, en ekstern betalingsleverandør.
            SkatteTap lagrer ikke kortopplysningene dine selv. Kjøpet
            regnes som gjennomført når betalingen er bekreftet av Stripe.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">7. Angrerett ved kjøp av digitale tjenester</h2>
          <p className="mt-2">
            Ved kjøp av et betalt produktnivå får du tilgang til analysen
            umiddelbart etter gjennomført betaling. Etter angrerettloven kan
            forbrukerens angrerett ved kjøp av digitalt innhold/digitale
            tjenester som leveres straks, bortfalle når du uttrykkelig har
            samtykket til at leveringen starter før angrefristen er ute, og
            du har bekreftet at du dermed mister angreretten.
          </p>
          <LegalReviewFlag>
            Kritisk funn: kjøpsflyten i produktet i dag har <strong>ingen</strong>{" "}
            eksplisitt samtykke- eller bekreftelsessteg for dette før
            betaling -- brukeren klikker rett fra &quot;Kjøp&quot;-knappen til
            Stripes betalingsside. Uten et slikt steg er det usikkert om
            SkatteTap faktisk kan påberope seg unntaket fra angreretten.
            Dette bør avklares med jurist, og mest sannsynlig krever det et
            eget avkrysningsfelt/bekreftelsessteg i kjøpsflyten (en
            produktendring, ikke bare en tekstendring) før dette avsnittet
            kan anses dekkende. Eksakt paragrafhenvisning i angrerettloven
            bør også kvalitetssikres.
          </LegalReviewFlag>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">8. Refusjon</h2>
          <p className="mt-2">
            Som følge av at digitale tjenester leveres umiddelbart, gis det
            normalt ikke refusjon etter at en analyse eller rapport er
            generert. Oppstår det en teknisk feil som gjør at du ikke får
            det du har betalt for, kan du kontakte oss for å få saken
            vurdert. Refusjon i slike tilfeller behandles manuelt av
            SkatteTap og skjer i så fall tilbake til opprinnelig
            betalingsmiddel via Stripe.
          </p>
          <LegalReviewFlag>
            Refusjonsmekanismen finnes teknisk (administrativ refusjon via
            Stripe), men det er ingen selvbetjent løsning i produktet i
            dag -- brukeren må ta kontakt. Selve refusjonsvilkåret (hva som
            faktisk gir rett til refusjon, og forholdet til pkt. 7 om
            angrerett) bør formuleres og kvalitetssikres av jurist.
          </LegalReviewFlag>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">9. Ansvarsbegrensning</h2>
          <p className="mt-2">
            Vurderinger, forslag og analyser i tjenesten er et strukturert
            utgangspunkt for videre vurdering -- ikke juridisk rådgivning og
            ikke en avgjørelse fra Skatteetaten eller andre myndigheter.
            SkatteTap er ikke ansvarlig for beslutninger du tar på bakgrunn
            av innholdet i tjenesten, for utfallet av en henvendelse til
            Skatteetaten, eller for indirekte tap som følge av bruk av
            tjenesten.
          </p>
          <LegalReviewFlag>
            Omfanget av ansvarsbegrensningen (direkte vs. indirekte tap,
            eventuelle beløpsmessige tak, unntak for grov uaktsomhet/forsett)
            bør fastsettes og kvalitetssikres av jurist -- gjeldende
            forbrukervernlovgivning setter grenser for hvor langt et
            selskap kan fraskrive seg ansvar overfor forbrukere.
          </LegalReviewFlag>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">10. Oppsigelse og sletting av konto</h2>
          <p className="mt-2">
            Ønsker du å avslutte kontoen din, kan du kontakte oss for å få
            den slettet. Data knyttet til gjennomførte kjøp kan likevel
            oppbevares en periode i tråd med gjeldende regnskaps- og
            bokføringsregler.
          </p>
          <LegalReviewFlag>
            Produktet har i dag ingen selvbetjent &quot;slett konto&quot;-funksjon --
            sletting må gjøres manuelt av SkatteTap etter henvendelse.
            Teksten over er tilpasset dette (kontakt oss, ikke et
            selvbetjent alternativ). Vurder om selvbetjent sletting bør
            bygges, og bekreft nøyaktig oppbevaringstid for regnskapsdata
            med jurist/regnskapsfører.
          </LegalReviewFlag>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">11. Endringer i vilkårene</h2>
          <p className="mt-2">
            SkatteTap kan oppdatere disse vilkårene. Vesentlige endringer
            varsles på rimelig måte, for eksempel på denne siden eller ved
            e-post. Fortsatt bruk av tjenesten etter en endring innebærer at
            du godtar de oppdaterte vilkårene.
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">12. Lovvalg og verneting</h2>
          <p className="mt-2">
            Disse vilkårene er underlagt norsk rett. Tvister søkes løst i
            minnelighet; løses de ikke, hører de inn under de ordinære
            norske domstolene.
          </p>
          <LegalReviewFlag>
            Standard lovvalgs-/vernetingsklausul -- bør kvalitetssikres av
            jurist, inkludert om forbrukervernregler gjør at forbrukeren
            uansett kan reise sak der vedkommende bor.
          </LegalReviewFlag>
        </section>

        <section>
          <h2 className="text-[16px] font-semibold text-ink">13. Kontakt</h2>
          <p className="mt-2">
            Spørsmål om vilkårene kan rettes til oss via kontaktsiden.
          </p>
        </section>
      </div>
    </main>
  );
}
