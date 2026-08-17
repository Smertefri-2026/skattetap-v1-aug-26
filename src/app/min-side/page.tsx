import type { Metadata } from "next";
import { MinSideTabs } from "@/components/min-side/MinSideTabs";
import { CasesTab } from "@/components/min-side/CasesTab";
import { EmptyTab } from "@/components/min-side/EmptyTab";
import { ProfileTab } from "@/components/min-side/ProfileTab";

export const metadata: Metadata = {
  title: "Min side",
};

const validTabs = ["saker", "dokumentasjon", "rapporter", "kjop", "profil"] as const;
type Tab = (typeof validTabs)[number];

function isTab(value: string | undefined): value is Tab {
  return validTabs.includes(value as Tab);
}

export default async function MinSidePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab: Tab = isTab(params.tab) ? params.tab : "saker";

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <MinSideTabs active={tab} />
      <div className="pt-8">
        {tab === "saker" && <CasesTab />}
        {tab === "dokumentasjon" && (
          <EmptyTab
            title="Dokumentasjon"
            body="Dokumenter fra alle sakene dine vises her når du har lastet opp noe."
          />
        )}
        {tab === "rapporter" && (
          <EmptyTab
            title="Rapporter"
            body="Enkle sjekker, fulle rapporter, skatteendringer og utredninger samles her etter hvert som de genereres."
          />
        )}
        {tab === "kjop" && (
          <EmptyTab
            title="Kjøp"
            body="Kjøpshistorikk, kvitteringer og tilgang vises her når du har kjøpt noe."
          />
        )}
        {tab === "profil" && <ProfileTab />}
      </div>
    </main>
  );
}
