# Skattetap — arkitekturdokumentasjon

Dette dokumentet er referansen for hvordan Skattetap er bygget, hvorfor, og hvordan en ny
utvikler skal orientere seg. Det beskriver systemet **slik det faktisk er** per fase 9
(Strategisk utredning), ikke slik vi ønsker det var — inkludert kjent gjeld, se
["Kjent gjeld og bevisste avvik"](#kjent-gjeld-og-bevisste-avvik) til slutt.

## Innhold

1. [Designfilosofi](#designfilosofi)
2. [Prosjektstruktur](#prosjektstruktur)
3. [Design system](#design-system)
4. [Datamodell](#datamodell)
5. [Row Level Security](#row-level-security)
6. [Auth](#auth)
7. [Evidence Engine](#evidence-engine)
8. [Dokumentpipeline](#dokumentpipeline)
9. [AI-motorene](#ai-motorene)
10. [Rapportarkitektur (PDF/JSON)](#rapportarkitektur-pdfjson)
11. [Produktkatalog og entitlements](#produktkatalog-og-entitlements)
12. [Stripe / kjøpsflyt](#stripe--kjøpsflyt)
13. [Supabase Storage](#supabase-storage)
14. [Integrasjoner](#integrasjoner)
15. [Testing](#testing)
16. [Drift / hosting](#drift--hosting)
17. [Hvordan en ny utvikler bør lese dette prosjektet](#hvordan-en-ny-utvikler-bør-lese-dette-prosjektet)
18. [Kjent gjeld og bevisste avvik](#kjent-gjeld-og-bevisste-avvik)

---

## Designfilosofi

Tre prinsipper er fulgt gjennom hele bygget, strengere enn noe annet valg:

1. **Bruk deterministisk kode der det er mulig, AI der det gir verdi.** Beløp summeres
   aldri av en språkmodell. Frister beregnes aldri av en språkmodell. "Hva er nytt siden
   sist" beregnes aldri av en språkmodell. AI brukes til å *lese, tolke og resonnere* —
   aldri til å *regne* eller *slå opp fasit*.
2. **Skill alltid: dokumenterte fakta / brukerens egen forklaring / KI-vurdering /
   skatterettslig vurdering / manglende dokumentasjon.** Dette er ikke en UI-konvensjon,
   det er en datamodell-regel (`claims.origin`, `claim_assessments.status`,
   `claim_assessments.assessed_by`) som håndheves helt ned til hvordan AI-prompter er
   skrevet.
3. **Aldri gjett.** Der systemet ikke har et sikkert grunnlag, sier det det — det gjetter
   ikke et beløp, en frist, en regel-kode eller en konklusjon. Se spesielt
   [Fristmotoren](#fristmotoren) som er det strengeste eksempelet på dette prinsippet.

Alt annet — hvilken database, hvilket betalingssystem, hvilket rammeverk — er
implementasjonsdetaljer valgt for å tjene disse tre prinsippene, ikke omvendt.

---

## Prosjektstruktur

```
src/
  app/                        Next.js App Router
    (marketing)/               Offentlige sider (delt layout m/ header+footer)
    api/                       Route handlers (checkout, webhook, opplasting, PDF/JSON)
    auth/                      OAuth-callback og signout
    min-side/                  Innlogget kontrollsenter + saksarbeidsflate
  components/
    design-system/             Button, Card, Badge — de eneste UI-primitivene
    marketing/                 Offentlig nettside-komponenter
    min-side/                  Faner på Min side
    cases/                     Alt som hører til saksarbeidsflaten (~25 filer)
  lib/
    ai/                        Alle AI-motorer, gruppert per fase/nivå
    auth/                      requireUser()
    cases/                     Sak-relatert domenelogikk (claims, facts, labels)
    deadlines/                 Fristmotoren (deterministisk)
    documents/                 Opplasting + tekstuttrekk
    documentationGaps/         Server actions for å løse/gjenåpne hull
    products/                  Produktkatalog + entitlement-logikk
    purchases/                 Stripe checkout-opprettelse + refusjon
    reports/                   Rapport-byggere, PDF-rendring, typer
    skatteendring/             Skatteetaten-svar-pipeline
    stripe/                    Stripe-klient
    supabase/                  Klienter (browser/server/admin)
supabase/
  migrations/                  Alle databaseendringer, kronologisk, aldri manuelle
```

Konvensjon: `lib/<domene>/` inneholder ren logikk (server actions, byggere, spørringer).
`components/<område>/` inneholder React. En "workbench" (`FullCheckWorkbench.tsx`,
`KomplettSakWorkbench.tsx`, osv.) er alltid en server-komponent som henter data og
komponerer mindre klient-komponenter — den inneholder aldri selve AI-logikken.

---

## Design system

Definert som CSS-variabler i `src/app/globals.css`, konsumert av Tailwind 4 sitt
`@theme inline`-oppsett. Tre komponenter dekker alt: `Button` (primary/secondary/ghost/
danger), `Card` (default/selected), `Badge` (info/success/warning/danger/neutral).

| Token | Verdi | Bruk |
|---|---|---|
| `--color-page` | `#F7F9FC` | Sidebakgrunn |
| `--color-surface` | `#FFFFFF` | Kort, paneler |
| `--color-primary` | `#2F6FED` | Eneste "call to action"-farge |
| `--color-success` / `--color-warning` / `--color-danger` | grønn/oransje/rød | Kun semantisk status, aldri dekorativt |
| Radius | `sm` 8px, `md` 12px, `lg` 16px | Tre nivåer, ingen flere |
| Skygge | `sm`/`md` | To nivåer, svært diskrete |

Fargekodingen er delt mellom design system og Evidence Engine med hensikt: `success` =
dokumentert, `neutral` = brukerens forklaring/udokumentert, `warning` = motstridende,
`info` = KI-vurdering. Samme farge betyr alltid samme ting, i hele produktet.

---

## Datamodell

### Kjernekjede (saken)

```
cases ──< documents ──< claims ──< claim_assessments (append-only, versjonert)
  │                        │
  │                        └──< evidence_links >── documents
  │
  ├──< case_assessments        (Enkel sjekk-resultater — se "Kjent gjeld")
  ├──< reports                 (Full sjekk / Skatteendring / Komplett sak / Strategisk utredning)
  ├──< documentation_gaps      (konkrete, løsbare hull — ikke bare rapport-tekst)
  ├──< skatteetaten_responses  (append-only tolkninger av innkomne svar)
  ├──< purchases                (historikk, append-only)
  └──< case_access              (gjeldende tilgang — kun skrevet av webhook)
```

**`cases`** — saksroten. `stage` styrer hvilket steg brukeren ser (`?steg=`), men gir
**ingen tilgang** — det gjør `case_access`. `outcome` er ett felt
(`ukjent`/`medhold`/`delvis_medhold`/`avslag`/`trukket_avsluttet`), oppdatert automatisk
når et Skatteetaten-svar tolkes eksplisitt sier det. Se ["Kjent gjeld"](#kjent-gjeld-og-bevisste-avvik)
for hvorfor dette IKKE er versjonert, i motsetning til nesten alt annet i systemet.

**`claims`** — selve utsagnet/påstanden. `origin` er `'user'` (brukerens eget notat) eller
`'ai_suggested'` (funnet i et dokument). `ai_original_statement` bevares alltid uendret;
`statement` er gjeldende (mulig korrigert) tekst. En claim har **aldri** en status-kolonne
— se `claim_assessments`.

**`claim_assessments`** — append-only. Hver rad er én vurdering av én claims
dokumentasjonsstatus på ett tidspunkt: `status` (`documented`/`undocumented`/`conflicting`),
`assessed_by` (`system` = deterministisk, `ai` = språkmodell), `reasoning`. Gjeldende
status for en claim er alltid **den nyeste raden**, hentet med
`getClaimsWithStatus()` (`lib/cases/claimsWithStatus.ts`). En reassessment overskriver
aldri — den legger til en ny rad. Dette er det som gjør ekte konfliktdeteksjon mulig uten
å miste historikk (fase 8).

**`documents`** — én rad per opplastet fil. `extracted_text` og `ai_extraction` (rå
KI-funn: type, dato, parter, beløp, mulige fakta) er atskilt fra brukerkorreksjon — det
finnes ingen brukerkorreksjons-kolonne på `documents` ennå fordi UI for å redigere
dokumentnivå-funn ikke er bygget (kun claim-nivå redigering via `ClaimsList.tsx`).

**`documentation_gaps`** — konkrete, sporbare hull. `status` (`open`/`resolved`) og
`resolved_at` (lagt til i fase 8-tillegget) gjør det mulig å beregne
["hva er nytt siden sist"](#rapportarkitektur-pdfjson) helt deterministisk.

**`reports`** — én tabell for fire ulike rapporttyper (`full-sjekk`, `skatteendring`,
`komplett-sak`, `strategisk-utredning`), skilt med `type` + `content jsonb`. Append-only:
en ny generering er en ny rad, aldri en oppdatering. Dette er bevisst — se
[Rapportarkitektur](#rapportarkitektur-pdfjson).

**`tax_rules`** — pluggbart regelverk. AI får **kun** sitere `rule_code`-verdier som
faktisk finnes her; alle motorer filtrerer AI-svar mot denne listen i kode (forsvar i
dybden, ikke bare i prompten). Seedet med tre eksempelregler, tydelig merket som
eksempelinnhold — ikke en juridisk ferdigvurdert liste.

**`tax_deadline_rules`** — strukturert, versjonert, med `valid_from`/`valid_to`,
`exceptions jsonb`, og `quality_assured boolean default false`. RLS selv (ikke bare
applikasjonskode) skjuler enhver rad som ikke er `quality_assured = true`. **Ingen rader
er seedet** — fristmotoren viser "ikke vurdert" helt til noen kvalitetssikrer en regel.

**`products` / `purchases` / `case_access`** — se [Produktkatalog](#produktkatalog-og-entitlements).

### Full ER-oversikt

```
auth.users ──1:1── profiles
     │
     └──1:N── cases ──1:N── documents
                 │              │
                 │              └──1:N── evidence_links ──N:1── claims
                 ├──1:N── claims ──1:N── claim_assessments
                 ├──1:N── case_assessments        (Enkel sjekk)
                 ├──1:N── reports                 (Full sjekk / Skatteendring / Komplett sak / Strategisk utredning)
                 ├──1:N── documentation_gaps
                 ├──1:N── skatteetaten_responses ──N:1── documents
                 ├──1:N── purchases ──N:1── products
                 └──1:N── case_access ──N:1── products, purchases

products (katalog, ingen FK til cases)
tax_rules (katalog)
tax_deadline_rules (katalog)
contact_messages (uavhengig av cases)
```

---

## Row Level Security

Gjennomgående mønster: **eierskap avgjør lesetilgang, service role avgjør skrivetilgang
til alt som representerer penger eller tillit.**

- Alle case-relaterte tabeller: `select`/`insert` for `auth.uid() = user_id` (direkte) eller
  via `exists (select 1 from cases where cases.id = X.case_id and cases.user_id = auth.uid())`
  (indirekte, for tabeller som henger under en sak).
- **`case_access` har ingen skrive-policy for innloggede brukere i det hele tatt.** Kun
  Stripe-webhooken (service role, signaturverifisert) kan gi tilgang. En bruker kan aldri
  låse opp seg selv, uansett hva klientkoden gjør.
- **`purchases` har ingen update-policy for innloggede brukere.** Kun webhooken kan
  markere et kjøp fullført. (Dette avdekket en reell feil i fase 6 — se
  ["Kjent gjeld"](#kjent-gjeld-og-bevisste-avvik).)
- **`tax_deadline_rules` filtrerer på `quality_assured = true` i selve RLS-policyen**, ikke
  bare i spørringskoden — en fremtidig kodefeil kan aldri lekke en ukvalitetssikret regel.
- **`products`** er lesbar av absolutt alle (også anonyme) fordi prising er offentlig
  markedsføringsinformasjon og vises på `/priser` før innlogging.
- Ingen tabell har `delete`-policy for innloggede brukere med mindre det er eksplisitt
  ment å være en brukerhandling (f.eks. ingen — vi sletter aldri saksdata via klienten).

Testet direkte (ikke antatt) i hver fase: en ekte annenbruker kan aldri se en annens
saker, dokumenter, kjøp eller rapporter. Se [Testing](#testing).

---

## Auth

Passordløs (magic link) via Supabase Auth. `@supabase/ssr` med tre klienter:

- `lib/supabase/client.ts` — nettleser (klientkomponenter).
- `lib/supabase/server.ts` — server-komponenter/actions, leser/skriver auth-cookies.
- `lib/supabase/admin.ts` — service role, **kun** i route handlers/server actions som
  eksplisitt trenger å omgå RLS (webhook, checkout-opprettelse, refusjon). Importeres
  aldri i en klientkomponent.

`src/proxy.ts` (Next.js 16 sin etterfølger til middleware) fornyer auth-token på hver
forespørsel slik at server-komponenter alltid ser en gyldig sesjon.

`requireUser()` (`lib/auth/requireUser.ts`) er inngangsporten til alt innlogget innhold —
redirecter til `/logg-inn` hvis ingen sesjon.

---

## Evidence Engine

Kjeden er: **Case → Claim/Faktum → Document → Evidence link → Claim assessment**.

Det sentrale designvalget (presisert eksplisitt i fase 4): en claim er *selve utsagnet*,
ikke en fastslått sannhet. Dokumentasjonsstatus lever separat i `claim_assessments`, som
er append-only. Dette betyr at et faktum kan gå fra `undocumented` → `documented` →
`conflicting` over tid, uten at noen tidligere vurdering noensinne overskrives eller
mistes.

Automatisk kjede ved opplasting (`lib/documents/processUpload.ts`):

```
1. Fil lastes opp til Storage
2. documents-rad opprettes (status: extracting)
3. Tekst trekkes ut (unpdf) — avvises hvis for lite maskinlesbar tekst
4. AI identifiserer type/dato/parter/beløp/mulige fakta
5. Hvert mulig faktum blir: én claim (origin='ai_suggested')
                            + én evidence_link (relationship='supports')
                            + én claim_assessment (status='documented', assessed_by='system')
```

Bruker kan bekrefte eller redigere en KI-foreslått claim (`ClaimsList.tsx` +
`claimActions.ts`) — `ai_original_statement` endres aldri, uansett hvor mange ganger
brukeren redigerer `statement`.

Konfliktdeteksjon (fase 8) er ikke automatisk ved opplasting — den kjører når Komplett
sak- eller Strategisk utredning-motoren eksplisitt sammenligner flere claims og finner en
reell motsigelse, og legger da til en ny `claim_assessments`-rad med
`status='conflicting', assessed_by='ai'`.

---

## Dokumentpipeline

`lib/documents/extractDocumentText.ts` bruker `unpdf` og avviser PDF-er med for lite
maskinlesbar tekst (typisk skannede bilder uten OCR) — heller enn å sende nesten tomt
innhold videre til KI-analysen. Terskelen er `max(100, antall_sider * 75)` meningsfulle
tegn.

`lib/ai/documentExtraction.ts` er det første stedet rå, ubetrodd dokumenttekst når en
språkmodell — pakket med `wrapUntrustedContent()` (se [AI-motorene](#ai-motorene)) og med
det strengeste skjemaet i kodebasen, fordi output herfra blir input til alt som bygger
videre på det.

**Kjent, rettet feil:** tidlig instruks sa "utelat felt du ikke finner grunnlag for" —
modellen hoppet da over hele `amounts`-feltet for et dokument uten beløp, som krasjet
valideringen (zod krevde feltet). Rettet på to nivåer: prompten ber nå eksplisitt om tom
liste `[]` i stedet for utelatelse, OG hvert AI-skjema i **hele** kodebasen (18 filer) har
`.catch()`-fallback på liste-/enum-/nullable-felt som forsvar i dybden.

---

## AI-motorene

Alle AI-kall går gjennom `lib/ai/openai.ts`: `callAiChatJson()` (retry/timeout, strukturert
JSON via `response_format: json_object`, zod-validering med `.catch()`-fallback) og
`wrapUntrustedContent()` (pakker brukerskrevet/opplastet tekst med tydelige avgrensningsmerker
som nøytraliserer forsøk på prompt injection).

| Fase | Motor | Fil | AI eller deterministisk |
|---|---|---|---|
| 3 | Enkel sjekk-vurdering | `ai/simpleCheck.ts` | AI |
| 4 | Dokumentekstraksjon | `ai/documentExtraction.ts` | AI |
| 5 | Full sjekk-vurdering | `ai/fullCheckAssessment.ts` | AI |
| 7 | Skatteendring-forslag | `ai/skatteendringProposal.ts` | AI |
| 7 | Skatteetaten-svar-tolkning | `ai/skatteetatenResponseInterpretation.ts` | AI |
| 8 | Kronologi + konfliktdeteksjon | `ai/komplettSak/chronologyAndConflicts.ts` | AI |
| 8 | Dokumentasjonshull + økonomi | `ai/komplettSak/gapsAndFinancials.ts` | AI (beløp er kode) |
| 8 | Regelverkskobling | `ai/komplettSak/legalLinking.ts` | AI |
| 8 | Strategisk syntese | `ai/komplettSak/strategicSynthesis.ts` | AI |
| 9 | Sakssammendrag | `cases/crossCaseSummaries.ts` | **Deterministisk** |
| 9 | Relevansrangering | `cases/crossCaseSummaries.ts` | **Deterministisk** |
| 9 | Mønster-motor | `ai/strategiskUtredning/patternEngine.ts` | AI |
| 9 | Sammenligningsmotor | `ai/strategiskUtredning/comparisonEngine.ts` | AI |
| 9 | Fristmotor | `deadlines/evaluateDeadlines.ts` | **100 % deterministisk** |
| 9 | Strategi-/scenariomotor | `ai/strategiskUtredning/strategyEngine.ts` | AI |
| 9 | Prioriterings-/syntesemotor | `ai/strategiskUtredning/synthesisEngine.ts` | AI |
| 9 | Samlet økonomisk eksponering | `reports/buildStrategiskUtredningReport.ts` | **Deterministisk** |

### Fristmotoren

Det strengeste eksempelet på "aldri gjett": ren funksjon, ingen AI-kall. Finner ingen
`quality_assured = true`-regel som matcher sakens skattetype og er aktiv i dag → returnerer
`status: 'ikke_vurdert'`. Kan ikke tolke `tax_period` som et årstall → samme. Kan beregne
→ `periode_slutt + months_after_period_end måneder`, med regelens `exceptions` listet
uendret (aldri vurdert av AI om et unntak faktisk gjelder — det er en fremtidig,
menneskelig/juridisk vurdering).

### Sikkerhetsmønstre felles for alle motorer

- **Referanser til claims/saker er alltid 1-baserte indekser inn i en liste modellen selv
  fikk oppgitt** — aldri UUID-er. En modell kan ikke hallusinere en gyldig indeks; ugyldige
  indekser filtreres bort i kode før noe brukes videre.
- **`rule_code`-verdier filtreres alltid mot faktiske `tax_rules`-rader** etter AI-kallet,
  uavhengig av hva prompten ba om.
- **Strategi-/scenariomotoren har `.min(2)` i zod-skjemaet** — en modell kan strukturelt
  aldri returnere kun én strategi presentert som den riktige veien.

---

## Rapportarkitektur (PDF/JSON)

Én prinsipp gjennom fire rapporttyper: **strukturert `content jsonb` er sannheten, web,
PDF og JSON-eksport rendrer alle samme data.** Ingen egen fritekst-generering for PDF.

```
lib/reports/
  build<Type>Report.ts     Orkestrerer: hent grunnlag → kjør motor(er) → sett sammen
                            content → INSERT ny rad i reports (aldri UPDATE)
  render<Type>Pdf.ts       content → PdfWriter (delt, enkel tekstflyt-hjelper)
  <type>Actions.ts         Server action: sjekk eierskap + tilgang → kall build-funksjonen
  types.ts                 Ett innholds-interface per rapporttype
```

`pdfWriter.ts` er delt mellom alle fire PDF-rendrere — samme visuelle språk uansett
rapporttype.

`/api/cases/[id]/reports/[reportId]/pdf` og `.../json` er generiske ruter som leser
`report.type` og dispatcher til riktig renderer/serialiserer. JSON-eksport er bevisst
generisk (fungerer automatisk for enhver ny rapporttype) fordi "saksmappen skal kunne
brukes videre" — utenfor Skattetap også.

**"Hva er nytt siden sist"** (Komplett sak, fase 8-tillegg) er beregnet i
`computeChangesSinceLast()` — sammenligner `created_at`/`resolved_at`-tidsstempler mot
forrige rapports tidsstempel. Ingen AI-kall; rene databasespørringer.

---

## Produktkatalog og entitlements

`products`-tabellen erstatter en hardkodet enum. Hvert produkt har `sort_order`
(rangering), `price_kr`, `price_type` (`one_time`/`recurring` — forberedt for et
fremtidig abonnement), `scope` (`case`/`account`), `stripe_product_id`.

**Trinn-arv er en ren funksjon av `sort_order`**, ikke en vedlikeholdt "inkluderer"-liste:

```ts
hasAccess(caseId, productCode) =
  case sitt høyest rangerte kjøpte produkt.sort_order >= productCode sitt sort_order
```

**Oppgradering koster alltid kun mellomlegget**:

```ts
upgradeCost = target.price_kr - (nåværende_entitlement?.price_kr ?? 0)
```

Et nytt produkt senere er én rad i `products` — ingen kodeendring i verken
trinn-arv- eller prisberegning.

`PurchaseGate` (server-komponent) er det eneste stedet en arbeidsflate faktisk sjekkes
mot betaling — selve arbeidsflaten (`FullCheckWorkbench` osv.) antar alltid at tilgang
allerede er verifisert av den som render'er den.

---

## Stripe / kjøpsflyt

```
Bruker trykker "Kjøp" (PurchasePrompt, klient)
  → POST /api/cases/[id]/checkout
    → requireUser() + eierskapssjekk
    → createCheckoutSession() (lib/purchases/createCheckout.ts)
        → beregner mellomlegg (getUpgradeQuote)
        → gjenbruker en fortsatt åpen Stripe-sesjon fra siste 30 min (unngår dupliserte forsøk)
        → oppretter purchases-rad (status: pending)
        → stripe.checkout.sessions.create() med price_data (dynamisk beløp, ikke fast Price)
        → lagrer stripe_checkout_session_id
  → Bruker betaler hos Stripe (redirect)
  → Stripe sender checkout.session.completed
    → POST /api/stripe/webhook (signaturverifisert)
        → oppdaterer purchases (status: completed) -- idempotent, sjekker status før skriving
        → upsert case_access (onConflict, ignoreDuplicates) -- tåler webhook-retry uten dobbel tildeling
```

**Viktig arkitekturvalg:** `createCheckoutSession()` bruker service role-klienten internt,
ikke brukerens RLS-begrensede klient — fordi `purchases` bevisst ikke har en
update-policy for innloggede brukere (kun webhooken skal kunne fullføre et kjøp). Dette
ble oppdaget som en reell feil under testing i fase 6 (se
["Kjent gjeld"](#kjent-gjeld-og-bevisste-avvik)): den opprinnelige koden brukte
brukerklienten og `stripe_checkout_session_id` ble aldri lagret, fordi RLS filtrerer rader
stille i stedet for å kaste feil.

Refusjon (`lib/purchases/refundPurchase.ts`, ikke koblet til noe UI ennå — venter på
Admin/fase 10): kaller `stripe.refunds.create`, setter `purchases.status = 'refunded'`,
**sletter** den tilhørende `case_access`-raden (tilgang skal ikke bestå etter refusjon,
men kjøpshistorikken beholdes).

Verifisert med et ekte Stripe test-kort-kjøp gjennom hele kjeden (ikke bare simulert) i
fase 6.

---

## Supabase Storage

Én privat bucket, `documents`. Filsti er alltid `<case_id>/<uuid>-<filnavn>`. RLS på
`storage.objects` bruker `storage.foldername(name)[1]` (første stiseksjon = case_id) mot
`cases.user_id = auth.uid()` for select/insert/delete — samme eierskapsmønster som resten
av systemet, ikke et eget regelsett for filer.

---

## Integrasjoner

| Tjeneste | Rolle | Grense |
|---|---|---|
| **Supabase** | Auth, Postgres, Storage | RLS på alle tabeller; service role kun server-side |
| **Stripe** | Betaling | Webhook-signatur påkrevd; ingen klient-side opplåsing |
| **OpenAI** | Alle AI-motorer | `gpt-4.1-mini`, kun server-side kall |
| **Turnstile** | Bot-beskyttelse | Kontaktskjema |
| **Vercel** | Hosting | **Ikke satt opp ennå** — se [Drift](#drift--hosting) |

Ingen e-posttjeneste er koblet til (Resend ble bevisst tatt ut igjen — kontaktskjemaet
lagrer i `contact_messages` i stedet, se admin-behov i fase 10).

---

## Testing

Prinsipp: ekte ende-til-ende-tester der det er mulig, ikke bare mocks. Hver fase er
verifisert med et midlertidig skript som:

1. Oppretter en ekte testbruker (Supabase admin API), en ekte sak.
2. Kjører den faktiske pipelinen mot ekte OpenAI/Stripe/Supabase — ikke simulert.
3. Verifiserer RLS eksplisitt: en annen ekte testbruker kan aldri se dataene.
4. Rydder opp alt (sletter testbruker, som kaskaderer til alt annet) før skriptet avsluttes.

Dette har funnet tre reelle feil som enhetstester med mocks aldri ville avdekket:
`stripe_checkout_session_id` som ikke ble lagret (RLS-feil), dokumentekstraksjon som
krasjet på dokumenter uten beløp (skjema/prompt-mismatch), og feil beløpsprioritering i
sakssammendrag (`??` mot `0`).

60 enhetstester (`vitest`) dekker all deterministisk logikk og AI-skjemaenes
forsvar-i-dybden-filtrering (ugyldige indekser, oppdiktede regel-koder, for få
strategier) — ved å mocke selve AI-kallet, ikke ved å stole på at modellen alltid svarer
riktig.

---

## Drift / hosting

**Status: kun lokal utvikling mot en ekte Supabase-sky-database.** Appen har aldri vært
deployet til Vercel eller noe annet produksjonsmiljø. `.env.local` inneholder ekte
Supabase- og Stripe-testnøkler; ingen produksjonsnøkler finnes noe sted. Dette er den
klareste enkeltmangelen før noe kan vises til en ekte bruker, og bør trolig løses tidlig
i neste fase uansett hva annet som prioriteres.

---

## Hvordan en ny utvikler bør lese dette prosjektet

1. Les `AGENTS.md`/spesifikasjonen for *hvorfor* (produktfilosofi, prinsippene i
   [Designfilosofi](#designfilosofi)).
2. Les denne filen for *hvordan delene henger sammen*.
3. Start i `src/app/min-side/saker/[id]/page.tsx` — dette er saksarbeidsflaten, og alt
   annet henger av den. Følg importene derfra: `PurchaseGate` → en `*Workbench.tsx` →
   en `Generate*Button.tsx` → en `*Actions.ts` server action → en `build*Report.ts`
   → én eller flere `lib/ai/*.ts`-motorer.
4. Én migrasjon (`supabase/migrations/*.sql`) tilsvarer stort sett én fase — filnavnene
   er kronologiske og kommentarene forklarer *hvorfor*, ikke bare *hva*.
5. Aldri gjør en databaseendring uten en migrasjon i repoet. Aldri stol på at RLS er
   riktig uten å faktisk teste det med to ekte brukere.

---

## Kjent gjeld og bevisste avvik

Ærlig liste, ikke pyntet:

1. **Enkel sjekk bruker en egen tabell (`case_assessments`) i stedet for `reports`.**
   Dette ble bygget i fase 3, før `reports`-mønsteret (append-only, delt PDF/JSON) fantes.
   Hadde jeg bygget fase 3 i dag, ville Enkel sjekk vært `reports` med
   `type='enkel-sjekk'`. Lav risiko å rette nå (lite data), stigende kostnad å utsette.
2. **`cases.outcome` er ett mutable felt, ikke versjonert** — eneste sted i systemet der
   "append-only der historikk er viktig" ikke er fulgt. En sak kan ha flere
   Skatteetaten-svar over tid; hvert nytt svar overskriver forrige `outcome` i stedet for
   å legge til historikk. Inkonsekvent med resten av arkitekturen.
3. **Duplisert claim-/sak-indekseringslogikk** mellom `ai/komplettSak/shared.ts` og
   `ai/strategiskUtredning/shared.ts` — samme mønster bygget to ganger fordi hver fase
   føltes selvstendig da den ble bygget.
4. **Ingen delt `defineAiEngine()`-abstraksjon** — 18 AI-motorfiler gjentar samme
   systemPrompt/schema/validate-boilerplate. Bevisst ikke bygget tidlig (for å unngå
   abstraksjon før mønsteret var bevist), men mønsteret er nå bevist 18 ganger.
5. **`ReportsTab.tsx` (Min side) er ikke oppdatert siden fase 5.** Den henter `type` fra
   databasen men bruker den aldri: alle rapporter vises med "Full sjekk"-badge, og alle
   lenker til `?steg=full-sjekk` uansett faktisk type — en Skatteendring- eller Komplett
   sak-rapport sender brukeren til feil steg i saken. Reell, konkret feil, ikke bare
   kosmetisk.
6. **Ingen produksjons-deploy** — se [Drift](#drift--hosting).
7. **Ingen e-postvarsling** noe sted i systemet (kvittering, rapport klar, frist
   nærmer seg) — kun in-app.
8. **Fristmotoren har ingen kvalitetssikrede regler** — helt tomt inntil noen faktisk
   legger inn og kvalitetssikrer ekte fristregler. Dette er riktig og bevisst (aldri
   gjett), men betyr at fristmotorens verdi i dag er arkitektonisk bevist, ikke reelt
   levert til en bruker ennå.
