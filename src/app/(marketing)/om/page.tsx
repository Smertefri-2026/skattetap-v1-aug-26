import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Om Skattetap",
  description: "Hvem står bak Skattetap, og hva produktet faktisk er.",
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
      <h1 className="text-3xl font-semibold text-ink">Om Skattetap</h1>
      <p className="mt-4 text-[15.5px] leading-relaxed text-ink-soft">
        Skattetap er bygget for å gjøre det enklere å oppdage og undersøke forhold i egen skatt
        som er verdt å se nærmere på — fradrag som er glemt, feil i grunnlaget, eller andre
        uklarheter.
      </p>

      <div className="mt-12 flex flex-col gap-10">
        <Section title="Evidence Engine — vårt viktigste prinsipp">
          <p>
            Vi bruker kunstig intelligens til å lese dokumenter og strukturere informasjon. Men et
            system som gjetter, er verdiløst i en skattesak. Derfor bygger alt i Skattetap på ett
            prinsipp vi kaller Evidence Engine: det du selv forteller, det som faktisk er
            dokumentert, og det som er en KI-vurdering, holdes alltid tydelig fra hverandre.
          </p>
          <p className="mt-3">
            Ingenting blandes sammen, og du kan alltid se hvorfor systemet mener det det mener --
            hvilket dokument en påstand kommer fra, hvorfor to opplysninger motsier hverandre, og
            konkret hva som mangler for å komme videre.
          </p>
        </Section>

        <Section title="Hva Skattetap ikke er">
          <div className="rounded-lg border border-border bg-surface-alt p-6">
            <p className="text-[14px] text-ink-soft">
              Skattetap gir ingen juridisk fasit og garanterer ikke noe bestemt utfall.
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
