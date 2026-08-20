import type { Metadata } from "next";
import { Badge } from "@/components/design-system";
import { CaseHistoryIllustration } from "@/components/marketing/CaseHistoryIllustration";

export const metadata: Metadata = {
  title: "Om SkatteTap",
  description: "Hvem står bak SkatteTap, og hva produktet faktisk er.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-faint">{title}</h2>
      <div className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">{children}</div>
    </div>
  );
}

export default function OmPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="text-3xl font-semibold text-ink">Om SkatteTap</h1>
      <p className="mt-4 text-[15.5px] leading-relaxed text-ink-soft">
        SkatteTap er bygget for å gjøre det enklere å oppdage og undersøke forhold i egen skatt
        som er verdt å se nærmere på — fradrag som er glemt, feil i grunnlaget, eller andre
        uklarheter.
      </p>

      <div className="mt-12 flex flex-col gap-10">
        <Section title="Hvorfor vi bygget SkatteTap">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex-1">
              <p>
                Etter mer enn 20 år med egne skattesaker, skattekrav og omfattende dokumentasjon i
                møte med Skatteetaten, har vi sett hvor krevende det kan være å få oversikt over en
                sak. Dokumenter, datoer, beløp og vurderinger kan strekke seg over mange år.
              </p>
              <p className="mt-3">
                Samtidig har kunstig intelligens gjort det mulig å analysere store mengder
                dokumentasjon på en helt ny måte. Derfor bygget vi SkatteTap og vår egen
                Bevismotor — for å gjøre det enklere å samle dokumentasjonen, finne fakta, oppdage
                motstridende opplysninger og se hva som fortsatt mangler.
              </p>
              <p className="mt-3">
                KI vil trolig bli en stadig større del av både offentlig forvaltning og hverdagen
                vår. SkatteTap bruker teknologien allerede nå, men med ett prinsipp vi ikke går på
                akkord med: KI skal ikke gjette. Vurderinger skal kunne spores tilbake til
                dokumentasjonen.
              </p>
            </div>
            <div className="aspect-[4/5] w-full max-w-[280px] shrink-0 rounded-lg border border-border bg-surface-alt p-4">
              <CaseHistoryIllustration />
            </div>
          </div>
        </Section>

        <Section title="SkatteTaps Bevismotor — vårt viktigste prinsipp">
          <p>
            Vi bruker kunstig intelligens til å lese dokumenter og strukturere informasjon. Men et
            system som gjetter, er verdiløst i en skattesak. Derfor bygger alt i SkatteTap på ett
            prinsipp vi kaller Bevismotoren: det du selv forteller, det som faktisk er
            dokumentert, og det som er en KI-vurdering, holdes alltid tydelig fra hverandre.
          </p>
          <p className="mt-3">
            Ingenting blandes sammen, og du kan alltid se hvorfor systemet mener det det mener --
            hvilket dokument en påstand kommer fra, hvorfor to opplysninger motsier hverandre, og
            konkret hva som mangler for å komme videre.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="success">Dokumentert</Badge>
            <Badge tone="warning">Motstridende</Badge>
            <Badge tone="neutral">Dokumentasjonshull</Badge>
          </div>
        </Section>

        <Section title="Hva SkatteTap ikke er">
          <div className="rounded-lg border border-border bg-surface-alt p-6">
            <p className="text-[14px] text-ink-soft">
              SkatteTap gir ingen juridisk fasit og garanterer ikke noe bestemt utfall.
              Vurderingene i produktet er et strukturert utgangspunkt for videre vurdering — ikke
              en avgjørelse.
            </p>
          </div>
        </Section>

        <Section title="Personvern og sikkerhet">
          <p>
            Dokumentene og opplysningene dine er knyttet til din egen sak og tilgangsstyrt på
            serversiden -- andre brukere har aldri tilgang til saken din. Vi selger aldri data
            videre.
          </p>
        </Section>
      </div>
    </main>
  );
}
