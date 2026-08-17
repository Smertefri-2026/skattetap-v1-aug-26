import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Om Skattetap",
  description: "Hvem står bak Skattetap, og hva produktet faktisk er.",
};

export default function OmPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="text-3xl font-semibold text-ink">Om Skattetap</h1>

      <div className="mt-8 flex flex-col gap-6 text-[15px] leading-relaxed text-ink-soft">
        <p>
          Skattetap er bygget for å gjøre det enklere å oppdage og undersøke
          forhold i egen skatt som er verdt å se nærmere på — fradrag som er
          glemt, feil i grunnlaget, eller andre uklarheter.
        </p>
        <p>
          Vi bruker kunstig intelligens til å lese dokumenter og strukturere
          informasjon, men systemet skiller alltid tydelig mellom det du selv
          forteller, det som faktisk er dokumentert, og det som er en
          KI-vurdering. De tre skal aldri blandes sammen.
        </p>
        <div className="rounded-lg border border-border bg-surface-alt p-6">
          <p className="text-[14px] font-semibold text-ink">
            Hva Skattetap ikke er
          </p>
          <p className="mt-2 text-[14px] text-ink-soft">
            Skattetap gir ingen juridisk fasit og garanterer ikke noe
            bestemt utfall. Vurderingene i produktet er et strukturert
            utgangspunkt for videre vurdering — ikke en avgjørelse.
          </p>
        </div>
        <p>
          All dokumentasjon lagres knyttet til din egen sak, med
          tilgangskontroll på serversiden. Vi selger aldri data videre.
        </p>
      </div>
    </main>
  );
}
