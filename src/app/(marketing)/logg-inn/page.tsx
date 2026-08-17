import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Logg inn",
  description: "Logg inn med e-post for å starte eller fortsette en sak.",
};

export default function LoggInnPage() {
  return (
    <main className="mx-auto max-w-sm px-6 py-24">
      <h1 className="text-2xl font-semibold text-ink">Logg inn</h1>
      <p className="mt-3 text-[14.5px] text-ink-soft">
        Du trenger ikke passord. Skriv inn e-posten din, så sender vi deg en
        lenke.
      </p>
      <div className="mt-8">
        <LoginForm />
      </div>
    </main>
  );
}
