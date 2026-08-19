import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/marketing/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Velg nytt passord",
  description: "Velg et nytt passord for kontoen din.",
};

export default function TilbakestillPassordPage() {
  return (
    <main className="mx-auto max-w-sm px-6 py-24">
      <h1 className="text-2xl font-semibold text-ink">Velg nytt passord</h1>
      <p className="mt-3 text-[14.5px] text-ink-soft">
        Skriv inn et nytt passord for kontoen din.
      </p>
      <div className="mt-8">
        <ResetPasswordForm />
      </div>
    </main>
  );
}
