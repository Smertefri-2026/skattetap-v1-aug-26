import type { Metadata } from "next";
import { ContactForm } from "@/components/marketing/ContactForm";

export const metadata: Metadata = {
  title: "Kontakt",
  description: "Ta kontakt med Skattetap.",
};

export default function KontaktPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <h1 className="text-3xl font-semibold text-ink">Kontakt oss</h1>
      <p className="mt-3 text-[15px] text-ink-soft">
        Har du spørsmål om produktet eller en konkret sak? Send oss en
        melding.
      </p>
      <div className="mt-8">
        <ContactForm />
      </div>
    </main>
  );
}
