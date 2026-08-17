import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/design-system";

export const metadata: Metadata = {
  title: "Slik fungerer det",
  description: "De fire stegene i Skattetap, forklart uten juridisk språk.",
};

const steps = [
  {
    n: "1",
    title: "Enkel sjekk",
    tone: "info" as const,
    price: "Gratis",
    body: [
      "Du forteller kort hva saken gjelder: hvilket år eller hvilken periode det handler om, hvilken type skatt, og en kort forklaring med egne ord. Har du et dokument for hånden allerede, kan du legge det ved.",
      "Systemet gir deg en rask, forståelig førstevurdering: hva det har forstått, hvilke forhold som kan være verdt å se nærmere på, og hva som eventuelt mangler for å gå videre. Dette er ikke en juridisk konklusjon — det er et utgangspunkt.",
    ],
  },
  {
    n: "2",
    title: "Full sjekk",
    tone: "success" as const,
    price: "Betalt",
    body: [
      "Her laster du opp dokumentasjonen din — vedtak, kvitteringer, avtaler, korrespondanse. Systemet leser dokumentene, foreslår hva de viser, og du bekrefter eller korrigerer.",
      "Alt samles til én strukturert rapport: dokumenterte fakta, usikre forhold, en tidslinje, relevante skatteregler og en tydelig oversikt over hva som eventuelt mangler av dokumentasjon. Rapporten kan lastes ned som PDF.",
    ],
  },
  {
    n: "3",
    title: "Skatteendring",
    tone: "warning" as const,
    price: "Betalt",
    body: [
      "Basert på rapporten hjelper vi deg å formulere en henvendelse til Skatteetaten — for eksempel en anmodning om endring. Du velger hvilke fakta som skal med, legger ved rapporten, og redigerer teksten selv før du sender den.",
      "Når Skatteetaten svarer, laster du opp svaret i samme steg. Systemet forklarer hva svaret faktisk sier, skiller begrunnelse fra antakelse, og hjelper deg vurdere hva som bør skje videre. Alle versjoner beholdes i historikken.",
    ],
  },
  {
    n: "4",
    title: "Utredning",
    tone: "neutral" as const,
    price: "Betalt",
    body: [
      "For større eller mer sammensatte saker samler utredningen alt som allerede finnes — dokumentasjon, rapport, henvendelser og svar — til ett mer omfattende analysegrunnlag.",
      "Dette kan senere danne grunnlag for videre profesjonell eller juridisk behandling, men er i seg selv ikke en juridisk konklusjon.",
    ],
  },
];

export default function SlikFungererDetPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-3xl font-semibold text-ink">Slik fungerer det</h1>
      <p className="mt-4 max-w-xl text-[15.5px] text-ink-soft">
        Fire steg, i den rekkefølgen du faktisk trenger dem. Du kan stoppe
        etter hvilket som helst steg — ingenting tvinger deg videre.
      </p>

      <div className="mt-12 flex flex-col gap-10">
        {steps.map((step) => (
          <div key={step.n} className="flex gap-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-alt text-[13px] font-semibold text-ink-soft">
              {step.n}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-[18px] font-semibold text-ink">
                  {step.title}
                </h2>
                <Badge tone={step.tone}>{step.price}</Badge>
              </div>
              {step.body.map((p) => (
                <p
                  key={p.slice(0, 20)}
                  className="mt-2.5 text-[14.5px] leading-relaxed text-ink-soft"
                >
                  {p}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-14 rounded-lg border border-border bg-surface-alt p-6">
        <p className="text-[14px] text-ink-soft">
          Skattetap gir deg en strukturert vurdering, ikke en juridisk fasit.
          Vi garanterer ikke noe bestemt resultat i saken din.
        </p>
      </div>

      <Link
        href="/logg-inn"
        className="mt-10 inline-flex rounded-md bg-primary px-6 py-3 text-[14.5px] font-semibold text-white hover:bg-primary-ink"
      >
        Start enkel sjekk
      </Link>
    </main>
  );
}
