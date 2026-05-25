/*
 * Marketing copy, per locale (ERY-60 fidelity pass, v0.6 — locale buildout).
 *
 * Single source of truth for the EN / NL / DE marketing surfaces (landing + pricing). The
 * page routes are locale-agnostic shells (`pages/index.astro`, `pages/pricing/index.astro`
 * for `en`; `pages/[locale]/...` for `nl`/`de`) that pull their copy from here so the same
 * kit-faithful markup serves all three languages.
 *
 * Voice: kit voice — calm, utilitarian, short, direct. NL is nl-NL (Dutch directness, no
 * AI filler). DE is plain Hochdeutsch. No invented testimonials/stats, no customer names
 * (Luke's hard rule), no €199/€699 pricing — Luke's three-tier model only:
 *   Free to start (30-day trial) / Hosted (coming soon) / Managed services (get in touch).
 */
import type { Locale } from "@/lib/locale";

export interface FeatureCopy {
  title: string;
  body: string;
}
export interface StepCopy {
  n: string;
  h: string;
  b: string;
  tag: string;
}
export interface IntegrationCopy {
  name: string;
  kind: string;
}
export interface PlanFeature {
  text: string;
  muted?: boolean;
}

export interface LandingCopy {
  title: string;
  description: string;
  hero: {
    tag: string;
    h1: string;
    lead: string;
    ctaPrimary: string;
    ctaSecondary: string;
    ctaTertiary: string;
  };
  product: {
    url: string;
    cell: string;
    queueTitle: string;
    cards: { wo: string; op: string; meta: string; tag: string; tagCls: string; stripe: string }[];
  };
  features: { eyebrow: string; h2: string; lead: string; items: FeatureCopy[] };
  how: { eyebrow: string; h2: string; steps: StepCopy[] };
  api: { eyebrow: string; h2: string; lead: string; bullets: string[] };
  integrations: { eyebrow: string; h2: string; lead: string; items: IntegrationCopy[] };
  pricing: { eyebrow: string; h2: string; lead: string; allLink: string };
  rollout: { eyebrow: string; h2: string; lead: string; points: { h: string; b: string }[]; cta: string };
  cta: { h2: string; lead: string; ctaPrimary: string; ctaSecondary: string };
}

export interface PricingCopy {
  title: string;
  description: string;
  hero: { eyebrow: string; h1: string; lead: string };
  plans: {
    free: { head: string; name: string; price: string; period: string; sub: string; features: PlanFeature[]; cta: string };
    hosted: { head: string; name: string; flag: string; price: string; sub: string; features: PlanFeature[]; ctaSoon: string };
    managed: { head: string; name: string; price: string; sub: string; features: PlanFeature[]; cta: string };
  };
}

/* ---------- shared, locale-invariant product-preview data ---------- */
const productCards = [
  { wo: "WO-4218", op: "Laser cut", meta: "PN-902-A · Stainless 304", tag: "TODAY", tagCls: "today", stripe: "active" },
  { wo: "WO-4225", op: "TIG weld assembly", meta: "PN-1021 · Stainless 304", tag: "SOON", tagCls: "soon", stripe: "pending" },
  { wo: "WO-4221", op: "Press brake bend", meta: "PN-887 · Mild steel", tag: "OVERDUE", tagCls: "overdue", stripe: "on-hold" },
];

const LANDING: Record<Locale, LandingCopy> = {
  en: {
    title: "Eryxon Flow — A calm MES for job shops that ship",
    description:
      "Eryxon Flow tracks jobs through cutting, bending, welding, and assembly — from one tablet on the shop floor to the planner's desktop. Get started for free, plan a managed rollout, or self-host.",
    hero: {
      tag: "v0.6 · self-hostable · BSL 1.1",
      h1: "A calm MES for job shops that ship.",
      lead: "Eryxon Flow tracks jobs through cutting, bending, welding, and assembly — from one tablet on the floor to the planner's desk. No spreadsheets, no whiteboards, no decorative noise.",
      ctaPrimary: "Get started for free",
      ctaSecondary: "Plan a managed rollout",
      ctaTertiary: "Read the docs →",
    },
    product: { url: "app.eryxon.eu/operator/work-queue", cell: "● Laser cutting", queueTitle: "Work queue", cards: productCards },
    features: {
      eyebrow: "What you get",
      h2: "Everything a high-mix, low-volume shop needs.",
      lead: "No add-on store, no per-seat extras, no surprise modules. The full MES from day one — tablet to planner to API.",
      items: [
        { title: "Touch-friendly operator terminals", body: "Kanban work queues organised by production cell. 56px touch targets. Glanceable status, due-date urgency, and elapsed timing from one metre away." },
        { title: "Job & part tracking", body: "Full production visibility through cutting, bending, welding, assembly, finishing. Routing visualisation across cells, WIP limits, and a capacity overview." },
        { title: "3D STEP viewer", body: "Browser-based CAD, no software install. Measurement, exploded views, embedded inside the operator detail modal." },
        { title: "REST API & webhooks", body: "Filtering, pagination, search, and webhook dispatch for every lifecycle event. Built for ERP-to-MES sync, not just point-and-click." },
        { title: "Self-hostable, source-available", body: "BSL 1.1 — free for internal use. Self-host via Docker Compose, or use the hosted version. Converts to Apache 2.0 after the BSL change date." },
        { title: "Multi-tenant, multi-language", body: "Row-level security on PostgreSQL. EN / NL / DE out of the box. Built for shops with one site and groups of shops with many." },
      ],
    },
    how: {
      eyebrow: "How it works",
      h2: "From ERP push to planner dashboard in three steps.",
      steps: [
        { n: "01", h: "Import your jobs", b: "Push from your ERP via the REST API, drop in a CSV, or use a planning adapter. Eryxon Flow normalises parts, operations, and routing so the floor sees one shape regardless of upstream system.", tag: "REST · CSV · webhooks" },
        { n: "02", h: "Operators work the queue", b: "Each cell sees its own tablet. Tap an operation to open it, start the timer, mark good and scrap quantities, raise issues. Real-time updates push back to the planner without a refresh.", tag: "Tablet · 56px touch targets · realtime" },
        { n: "03", h: "Planners watch capacity", b: "A dashboard with WIP limits per cell, due-date heat, and an issue queue. Capacity over 100% is flagged — no surprise overruns on Friday at 16:55.", tag: "Capacity · WIP limits · issue queue" },
      ],
    },
    api: {
      eyebrow: "REST + Webhooks",
      h2: "An API your ERP can actually talk to.",
      lead: "Endpoints with filtering, pagination, search, and webhook dispatch. Built for ERP-to-MES sync — not just point-and-click.",
      bullets: ["Bearer-token auth with scoped API keys", "Idempotent writes with client-supplied keys", "Webhooks for every lifecycle event", "MCP server for AI assistants"],
    },
    integrations: {
      eyebrow: "Integrations",
      h2: "Sits between the systems you already run.",
      lead: "Eryxon Flow takes job intent from your ERP, hands it to the floor as tablet-friendly operations, and pushes results back.",
      items: [
        { name: "REST API", kind: "Integration" },
        { name: "Webhooks", kind: "Events" },
        { name: "CSV import", kind: "Onboarding" },
        { name: "Supabase", kind: "Backend" },
        { name: "PostgreSQL", kind: "Database" },
        { name: "MQTT", kind: "Protocol" },
        { name: "MCP", kind: "AI agents" },
        { name: "3D STEP viewer", kind: "CAD" },
      ],
    },
    pricing: {
      eyebrow: "Pricing",
      h2: "One plan per deployment style.",
      lead: "Try it free for 30 days. Self-host it today, or let us run the rollout for you.",
      allLink: "See full pricing →",
    },
    rollout: {
      eyebrow: "Managed rollout",
      h2: "Want help getting it into production?",
      lead: "Most teams start free and explore on their own. A managed rollout is for shops that want a hand putting Eryxon Flow into daily use.",
      points: [
        { h: "We deploy it", b: "Hosted or on your own infrastructure — whichever fits your shop." },
        { h: "We connect your ERP", b: "Job intent in over REST and webhooks, results back out, no double entry." },
        { h: "We sequence the floor", b: "Cell by cell, so operators adopt it without disruption." },
      ],
      cta: "Get in touch",
    },
    cta: {
      h2: "Try it on your own shop floor.",
      lead: "Get started free for 30 days on the hosted version. Or pull the Docker image and self-host today.",
      ctaPrimary: "Get started for free",
      ctaSecondary: "Read the self-host guide",
    },
  },

  nl: {
    title: "Eryxon Flow — Een rustige MES voor jobshops die leveren",
    description:
      "Eryxon Flow volgt orders door snijden, kanten, lassen en assemblage — van één tablet op de werkvloer tot het bureau van de planner. Begin gratis, plan een begeleide uitrol, of host zelf.",
    hero: {
      tag: "v0.6 · zelf te hosten · BSL 1.1",
      h1: "Een rustige MES voor jobshops die leveren.",
      lead: "Eryxon Flow volgt orders door snijden, kanten, lassen en assemblage — van één tablet op de vloer tot het bureau van de planner. Geen spreadsheets, geen whiteboards, geen ruis.",
      ctaPrimary: "Begin gratis",
      ctaSecondary: "Plan een begeleide uitrol",
      ctaTertiary: "Lees de docs →",
    },
    product: { url: "app.eryxon.eu/operator/work-queue", cell: "● Lasersnijden", queueTitle: "Werkwachtrij", cards: productCards },
    features: {
      eyebrow: "Wat je krijgt",
      h2: "Alles wat een high-mix, low-volume shop nodig heeft.",
      lead: "Geen add-on store, geen kosten per gebruiker, geen verrassingsmodules. De volledige MES vanaf dag één — tablet tot planner tot API.",
      items: [
        { title: "Bedienbare operatorterminals", body: "Kanban-wachtrijen per productiecel. 56px-aanraakdoelen. Status, deadline-urgentie en verstreken tijd af te lezen vanaf een meter afstand." },
        { title: "Order- en onderdeel-tracking", body: "Volledig zicht door snijden, kanten, lassen, assemblage, afwerking. Routing per cel, WIP-limieten en een capaciteitsoverzicht." },
        { title: "3D STEP-viewer", body: "CAD in de browser, geen installatie. Meten, exploded views, ingebouwd in de operator-detailweergave." },
        { title: "REST API & webhooks", body: "Filtering, paginering, zoeken en webhook-dispatch voor elke gebeurtenis. Gebouwd voor ERP-naar-MES-synchronisatie." },
        { title: "Zelf te hosten, source-available", body: "BSL 1.1 — gratis voor intern gebruik. Zelf hosten via Docker Compose, of de gehoste versie gebruiken. Wordt Apache 2.0 na de BSL-wijzigingsdatum." },
        { title: "Multi-tenant, meertalig", body: "Row-level security op PostgreSQL. EN / NL / DE standaard. Voor shops met één locatie en groepen met meerdere." },
      ],
    },
    how: {
      eyebrow: "Hoe het werkt",
      h2: "Van ERP naar planner-dashboard in drie stappen.",
      steps: [
        { n: "01", h: "Importeer je orders", b: "Vanuit je ERP via de REST API, met een CSV, of via een planning-adapter. Eryxon Flow normaliseert onderdelen, bewerkingen en routing zodat de vloer één vorm ziet.", tag: "REST · CSV · webhooks" },
        { n: "02", h: "Operators werken de wachtrij af", b: "Elke cel heeft een eigen tablet. Tik op een bewerking, start de timer, registreer goed- en afkeuraantallen, meld problemen. Realtime-updates gaan terug naar de planner.", tag: "Tablet · 56px-doelen · realtime" },
        { n: "03", h: "Planners bewaken capaciteit", b: "Een dashboard met WIP-limieten per cel, deadline-druk en een meldingenwachtrij. Capaciteit boven 100% wordt gemarkeerd — geen verrassingen op vrijdag om 16:55.", tag: "Capaciteit · WIP-limieten · meldingen" },
      ],
    },
    api: {
      eyebrow: "REST + Webhooks",
      h2: "Een API waar je ERP echt mee kan praten.",
      lead: "Endpoints met filtering, paginering, zoeken en webhook-dispatch. Gebouwd voor ERP-naar-MES-synchronisatie.",
      bullets: ["Bearer-token-auth met scoped API-keys", "Idempotente writes met eigen sleutels", "Webhooks voor elke gebeurtenis", "MCP-server voor AI-assistenten"],
    },
    integrations: {
      eyebrow: "Integraties",
      h2: "Zit tussen de systemen die je al draait.",
      lead: "Eryxon Flow haalt orderintentie uit je ERP, geeft die als bedienbare bewerkingen aan de vloer en stuurt resultaten terug.",
      items: [
        { name: "REST API", kind: "Integratie" },
        { name: "Webhooks", kind: "Events" },
        { name: "CSV-import", kind: "Onboarding" },
        { name: "Supabase", kind: "Backend" },
        { name: "PostgreSQL", kind: "Database" },
        { name: "MQTT", kind: "Protocol" },
        { name: "MCP", kind: "AI-agents" },
        { name: "3D STEP-viewer", kind: "CAD" },
      ],
    },
    pricing: {
      eyebrow: "Prijzen",
      h2: "Eén plan per uitrolvorm.",
      lead: "Probeer het 30 dagen gratis. Host het vandaag zelf, of laat ons de uitrol doen.",
      allLink: "Bekijk alle prijzen →",
    },
    rollout: {
      eyebrow: "Begeleide uitrol",
      h2: "Hulp nodig om het in productie te krijgen?",
      lead: "De meeste teams beginnen gratis en kijken zelf rond. Een begeleide uitrol is voor shops die hulp willen bij het in gebruik nemen van Eryxon Flow.",
      points: [
        { h: "Wij zetten het neer", b: "Gehost of op je eigen infrastructuur — wat bij je shop past." },
        { h: "Wij koppelen je ERP", b: "Orderintentie binnen via REST en webhooks, resultaten terug, geen dubbele invoer." },
        { h: "Wij rollen de vloer uit", b: "Cel voor cel, zodat operators het zonder verstoring oppakken." },
      ],
      cta: "Neem contact op",
    },
    cta: {
      h2: "Probeer het op je eigen werkvloer.",
      lead: "Begin 30 dagen gratis op de gehoste versie. Of pak de Docker-image en host vandaag zelf.",
      ctaPrimary: "Begin gratis",
      ctaSecondary: "Lees de self-host-gids",
    },
  },

  de: {
    title: "Eryxon Flow — Ein ruhiges MES für Lohnfertiger, die liefern",
    description:
      "Eryxon Flow verfolgt Aufträge durch Schneiden, Kanten, Schweißen und Montage — von einem Tablet in der Werkstatt bis zum Schreibtisch des Planers. Kostenlos starten, begleitete Einführung planen oder selbst hosten.",
    hero: {
      tag: "v0.6 · selbst hostbar · BSL 1.1",
      h1: "Ein ruhiges MES für Lohnfertiger, die liefern.",
      lead: "Eryxon Flow verfolgt Aufträge durch Schneiden, Kanten, Schweißen und Montage — von einem Tablet in der Werkstatt bis zum Schreibtisch des Planers. Keine Tabellen, keine Whiteboards, kein Rauschen.",
      ctaPrimary: "Kostenlos starten",
      ctaSecondary: "Begleitete Einführung planen",
      ctaTertiary: "Doku lesen →",
    },
    product: { url: "app.eryxon.eu/operator/work-queue", cell: "● Laserschneiden", queueTitle: "Arbeitsliste", cards: productCards },
    features: {
      eyebrow: "Was du bekommst",
      h2: "Alles, was ein High-Mix-Low-Volume-Betrieb braucht.",
      lead: "Kein Add-on-Store, keine Kosten pro Platz, keine Überraschungsmodule. Das vollständige MES ab Tag eins — Tablet bis Planer bis API.",
      items: [
        { title: "Bedienfreundliche Operator-Terminals", body: "Kanban-Arbeitslisten je Fertigungszelle. 56px-Touch-Ziele. Status, Termindruck und verstrichene Zeit aus einem Meter Entfernung ablesbar." },
        { title: "Auftrags- und Teileverfolgung", body: "Volle Transparenz durch Schneiden, Kanten, Schweißen, Montage, Finish. Routing je Zelle, WIP-Limits und eine Kapazitätsübersicht." },
        { title: "3D-STEP-Viewer", body: "CAD im Browser, keine Installation. Messen, Explosionsansichten, eingebettet in der Operator-Detailansicht." },
        { title: "REST-API & Webhooks", body: "Filterung, Paginierung, Suche und Webhook-Versand für jedes Ereignis. Gebaut für ERP-zu-MES-Synchronisierung." },
        { title: "Selbst hostbar, quelloffen verfügbar", body: "BSL 1.1 — kostenlos für den internen Gebrauch. Selbst hosten per Docker Compose oder die gehostete Version nutzen. Wird nach dem BSL-Stichtag zu Apache 2.0." },
        { title: "Mandantenfähig, mehrsprachig", body: "Row-Level-Security auf PostgreSQL. EN / NL / DE ab Werk. Für Betriebe mit einem Standort und Gruppen mit vielen." },
      ],
    },
    how: {
      eyebrow: "So funktioniert es",
      h2: "Vom ERP-Push zum Planer-Dashboard in drei Schritten.",
      steps: [
        { n: "01", h: "Aufträge importieren", b: "Aus dem ERP über die REST-API, per CSV oder über einen Planungsadapter. Eryxon Flow normalisiert Teile, Arbeitsgänge und Routing, sodass die Werkstatt eine Form sieht.", tag: "REST · CSV · Webhooks" },
        { n: "02", h: "Operatoren arbeiten die Liste ab", b: "Jede Zelle hat ihr eigenes Tablet. Arbeitsgang antippen, Timer starten, Gut- und Ausschussmengen erfassen, Probleme melden. Echtzeit-Updates gehen an den Planer zurück.", tag: "Tablet · 56px-Ziele · Echtzeit" },
        { n: "03", h: "Planer überwachen Kapazität", b: "Ein Dashboard mit WIP-Limits je Zelle, Termindruck und einer Meldungsliste. Kapazität über 100% wird markiert — keine Überraschungen am Freitag um 16:55.", tag: "Kapazität · WIP-Limits · Meldungen" },
      ],
    },
    api: {
      eyebrow: "REST + Webhooks",
      h2: "Eine API, mit der dein ERP wirklich sprechen kann.",
      lead: "Endpunkte mit Filterung, Paginierung, Suche und Webhook-Versand. Gebaut für ERP-zu-MES-Synchronisierung.",
      bullets: ["Bearer-Token-Auth mit scoped API-Keys", "Idempotente Writes mit eigenen Schlüsseln", "Webhooks für jedes Ereignis", "MCP-Server für KI-Assistenten"],
    },
    integrations: {
      eyebrow: "Integrationen",
      h2: "Sitzt zwischen den Systemen, die du schon betreibst.",
      lead: "Eryxon Flow nimmt die Auftragsabsicht aus deinem ERP, übergibt sie der Werkstatt als bedienbare Arbeitsgänge und meldet Ergebnisse zurück.",
      items: [
        { name: "REST-API", kind: "Integration" },
        { name: "Webhooks", kind: "Events" },
        { name: "CSV-Import", kind: "Onboarding" },
        { name: "Supabase", kind: "Backend" },
        { name: "PostgreSQL", kind: "Datenbank" },
        { name: "MQTT", kind: "Protokoll" },
        { name: "MCP", kind: "KI-Agenten" },
        { name: "3D-STEP-Viewer", kind: "CAD" },
      ],
    },
    pricing: {
      eyebrow: "Preise",
      h2: "Ein Plan je Bereitstellungsart.",
      lead: "30 Tage kostenlos testen. Heute selbst hosten oder die Einführung von uns übernehmen lassen.",
      allLink: "Alle Preise ansehen →",
    },
    rollout: {
      eyebrow: "Begleitete Einführung",
      h2: "Hilfe bei der Inbetriebnahme gewünscht?",
      lead: "Die meisten Teams starten kostenlos und erkunden es selbst. Eine begleitete Einführung ist für Betriebe, die Unterstützung bei der Inbetriebnahme von Eryxon Flow möchten.",
      points: [
        { h: "Wir stellen es bereit", b: "Gehostet oder auf deiner eigenen Infrastruktur — wie es zu deinem Betrieb passt." },
        { h: "Wir binden dein ERP an", b: "Auftragsabsicht über REST und Webhooks rein, Ergebnisse zurück, keine Doppelerfassung." },
        { h: "Wir führen die Werkstatt ein", b: "Zelle für Zelle, damit Operatoren es ohne Störung übernehmen." },
      ],
      cta: "Kontakt aufnehmen",
    },
    cta: {
      h2: "Teste es auf deiner eigenen Werkstatt.",
      lead: "30 Tage kostenlos auf der gehosteten Version starten. Oder das Docker-Image ziehen und heute selbst hosten.",
      ctaPrimary: "Kostenlos starten",
      ctaSecondary: "Self-Hosting-Anleitung lesen",
    },
  },
};

const PRICING: Record<Locale, PricingCopy> = {
  en: {
    title: "Pricing — Eryxon Flow",
    description: "Start free for 30 days, run a managed rollout, or use the hosted version when it lands. One plan per deployment style.",
    hero: { eyebrow: "Pricing", h1: "One plan per deployment style.", lead: "Try it free for 30 days. Run it self-hosted today, or let us put it into production for you." },
    plans: {
      free: { head: "Free to start", name: "Free to start", price: "Free", period: "· 30-day trial", sub: "Run the full product for 30 days. No card.", cta: "Start free",
        features: [{ text: "Full feature access for 30 days" }, { text: "Operator terminals on your tablets" }, { text: "REST API and webhooks" }, { text: "No card up front" }] },
      hosted: { head: "Hosted", name: "Hosted", flag: "Coming soon", price: "Coming soon", sub: "Fully managed at app.eryxon.eu. Pricing lands soon.", ctaSoon: "Coming soon",
        features: [{ text: "Hosted and run for you" }, { text: "Daily backups" }, { text: "Updates handled automatically" }, { text: "Pricing to be announced", muted: true }] },
      managed: { head: "Managed services", name: "Managed services", price: "Let's talk", sub: "We deploy it, connect your ERP, and roll it out across the floor.", cta: "Get in touch",
        features: [{ text: "Deployment on your infrastructure" }, { text: "ERP integration over REST and webhooks" }, { text: "Rollout sequenced cell by cell" }, { text: "Scoped to your shop" }] },
    },
  },
  nl: {
    title: "Prijzen — Eryxon Flow",
    description: "Begin 30 dagen gratis, kies een begeleide uitrol, of gebruik de gehoste versie zodra die er is. Eén plan per uitrolvorm.",
    hero: { eyebrow: "Prijzen", h1: "Eén plan per uitrolvorm.", lead: "Probeer het 30 dagen gratis. Host het vandaag zelf, of laat ons het voor je in productie zetten." },
    plans: {
      free: { head: "Begin gratis", name: "Begin gratis", price: "Gratis", period: "· proef van 30 dagen", sub: "Draai het volledige product 30 dagen. Geen kaart.", cta: "Begin gratis",
        features: [{ text: "Volledige toegang voor 30 dagen" }, { text: "Operatorterminals op je tablets" }, { text: "REST API en webhooks" }, { text: "Geen kaart vooraf" }] },
      hosted: { head: "Gehost", name: "Gehost", flag: "Binnenkort", price: "Binnenkort", sub: "Volledig beheerd op app.eryxon.eu. Prijs volgt binnenkort.", ctaSoon: "Binnenkort",
        features: [{ text: "Gehost en voor je gedraaid" }, { text: "Dagelijkse back-ups" }, { text: "Updates automatisch geregeld" }, { text: "Prijs wordt aangekondigd", muted: true }] },
      managed: { head: "Managed services", name: "Managed services", price: "Even overleggen", sub: "Wij zetten het neer, koppelen je ERP en rollen het uit over de vloer.", cta: "Neem contact op",
        features: [{ text: "Uitrol op jouw infrastructuur" }, { text: "ERP-koppeling via REST en webhooks" }, { text: "Uitrol cel voor cel ingepland" }, { text: "Toegesneden op jouw shop" }] },
    },
  },
  de: {
    title: "Preise — Eryxon Flow",
    description: "30 Tage kostenlos starten, eine begleitete Einführung wählen oder die gehostete Version nutzen, sobald sie da ist. Ein Plan je Bereitstellungsart.",
    hero: { eyebrow: "Preise", h1: "Ein Plan je Bereitstellungsart.", lead: "30 Tage kostenlos testen. Heute selbst hosten oder von uns in Produktion bringen lassen." },
    plans: {
      free: { head: "Kostenlos starten", name: "Kostenlos starten", price: "Kostenlos", period: "· 30-Tage-Test", sub: "Das vollständige Produkt 30 Tage nutzen. Keine Karte.", cta: "Kostenlos starten",
        features: [{ text: "Voller Zugriff für 30 Tage" }, { text: "Operator-Terminals auf deinen Tablets" }, { text: "REST-API und Webhooks" }, { text: "Keine Karte vorab" }] },
      hosted: { head: "Gehostet", name: "Gehostet", flag: "Demnächst", price: "Demnächst", sub: "Voll verwaltet auf app.eryxon.eu. Preise folgen in Kürze.", ctaSoon: "Demnächst",
        features: [{ text: "Gehostet und für dich betrieben" }, { text: "Tägliche Backups" }, { text: "Updates automatisch erledigt" }, { text: "Preise werden bekanntgegeben", muted: true }] },
      managed: { head: "Managed Services", name: "Managed Services", price: "Sprechen wir", sub: "Wir stellen es bereit, binden dein ERP an und führen es über die Werkstatt ein.", cta: "Kontakt aufnehmen",
        features: [{ text: "Bereitstellung auf deiner Infrastruktur" }, { text: "ERP-Anbindung über REST und Webhooks" }, { text: "Einführung Zelle für Zelle geplant" }, { text: "Auf deinen Betrieb zugeschnitten" }] },
    },
  },
};

export function landingCopy(locale: Locale): LandingCopy {
  return LANDING[locale];
}
export function pricingCopy(locale: Locale): PricingCopy {
  return PRICING[locale];
}
