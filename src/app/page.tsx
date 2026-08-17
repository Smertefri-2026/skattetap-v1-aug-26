import { Badge, Button, Card } from "@/components/design-system";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-6 py-24">
      <Badge tone="info">Under bygging</Badge>
      <h1 className="text-3xl font-semibold text-ink">Skattetap.no</h1>
      <p className="text-ink-soft">
        Design system-skallet er på plass. Forsiden bygges i fase 1.
      </p>
      <Card className="flex items-center justify-between">
        <span className="text-sm text-ink-soft">Enkel sjekk</span>
        <Button variant="primary">Start</Button>
      </Card>
    </main>
  );
}
