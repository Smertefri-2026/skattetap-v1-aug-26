import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/design-system";

export const metadata: Metadata = {
  title: "Priser",
  description: "Enkel sjekk er alltid gratis. Du betaler først når du går videre.",
};

const tiers = [
  {
    name: "Enkel sjekk",
    price: "Gratis",
    desc: "Rask førstevurdering av saken din, uten dokumentopplasting.",
    highlight: true,
  },
  {
    name: "Full sjekk",
    price: "Pris fastsettes",
    desc: "Full dokumentanalyse, strukturert rapport og PDF.",
    highlight: false,
  },
  {
    name: "Skatteendring",
    price: "Pris fastsettes",
    desc: "Hjelp til å formulere og følge opp henvendelsen til Skatteetaten.",
    highlight: false,
  },
  {
    name: "Utredning",
    price: "Pris fastsettes",
    desc: "Utvidet analysegrunnlag for større eller mer sammensatte saker.",
    highlight: false,
  },
];

export default function PriserPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-20">
      <h1 className="text-3xl font-semibold text-ink">Priser</h1>
      <p className="mt-4 max-w-xl text-[15.5px] text-ink-soft">
        Du starter alltid gratis. Betaling kommer først når du selv velger å
        gå videre til neste steg — og du betaler kun for det du faktisk
        bruker.
      </p>

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={
              tier.highlight
                ? "rounded-lg border border-primary bg-primary-subtle p-6"
                : "rounded-lg border border-border bg-surface p-6 shadow-sm"
            }
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-ink">
                {tier.name}
              </h2>
              {tier.highlight ? (
                <Badge tone="info">{tier.price}</Badge>
              ) : (
                <span className="text-[13px] font-medium text-ink-faint">
                  {tier.price}
                </span>
              )}
            </div>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft">
              {tier.desc}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Link
          href="/logg-inn"
          className="inline-flex rounded-md bg-primary px-6 py-3 text-[14.5px] font-semibold text-white hover:bg-primary-ink"
        >
          Start enkel sjekk — gratis
        </Link>
      </div>
    </main>
  );
}
