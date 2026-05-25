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
 * (Luke's hard rule). FOSS-first three-way model:
 *   Free / self-hosted (Apache 2.0, push the free trial as the low-friction entry) /
 *   Hosted (paid, flat rate, unlimited users — we host it) /
 *   Managed (installed on-prem at the customer, with updates, monitoring, backups).
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
    title: "Eryxon Flow — A calm, open-source MES for job shops that ship",
    description:
      "Eryxon Flow tracks jobs through cutting, bending, welding, and assembly — from one tablet on the shop floor to the planner's desktop. Free and open source. Self-host it, let us host it, or have it run on-prem for you.",
    hero: {
      tag: "Open source · Apache 2.0 · self-hostable",
      h1: "A calm, open-source MES for job shops that ship.",
      lead: "Eryxon Flow tracks jobs through cutting, bending, welding, and assembly — from one tablet on the floor to the planner's desk. Free and open source, with excellent self-hosting. No spreadsheets, no whiteboards, no decorative noise.",
      ctaPrimary: "Start free trial",
      ctaSecondary: "Self-host it free",
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
        { title: "Free and open source", body: "Apache 2.0 — free for any use, including commercial. Self-host via Docker Compose with no feature gates, or let us host it. Fork it, audit it, keep it." },
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
      h2: "Three ways to run it.",
      lead: "Self-host it free and open source. Let us host it at a flat rate, unlimited users. Or have it run on-prem with updates, monitoring, and backups handled.",
      allLink: "See full pricing →",
    },
    rollout: {
      eyebrow: "Hosted & managed",
      h2: "Rather not run it yourself?",
      lead: "The software is free and open source — self-host it whenever you want. If you'd rather not, we'll host it for you, or install and run it on your own infrastructure.",
      points: [
        { h: "Hosted", b: "We run it for you at a flat rate. Unlimited users, daily backups, updates handled." },
        { h: "Managed on-prem", b: "Installed on your infrastructure, with updates, monitoring, and backups taken care of." },
        { h: "ERP connected", b: "Job intent in over REST and webhooks, results back out, no double entry." },
      ],
      cta: "Get in touch",
    },
    cta: {
      h2: "Try it on your own shop floor.",
      lead: "Start a free trial in minutes. Or pull the Docker image and self-host it free — it's open source, no strings.",
      ctaPrimary: "Start free trial",
      ctaSecondary: "Read the self-host guide",
    },
  },

  nl: {
    title: "Eryxon Flow — Een rustige, open-source MES voor jobshops die leveren",
    description:
      "Eryxon Flow volgt orders door snijden, kanten, lassen en assemblage — van één tablet op de werkvloer tot het bureau van de planner. Gratis en open source. Host zelf, laat ons hosten, of laat het on-prem bij je draaien.",
    hero: {
      tag: "Open source · Apache 2.0 · zelf te hosten",
      h1: "Een rustige, open-source MES voor jobshops die leveren.",
      lead: "Eryxon Flow volgt orders door snijden, kanten, lassen en assemblage — van één tablet op de vloer tot het bureau van de planner. Gratis en open source, met uitstekende self-hosting. Geen spreadsheets, geen whiteboards, geen ruis.",
      ctaPrimary: "Start gratis trial",
      ctaSecondary: "Host zelf, gratis",
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
        { title: "Gratis en open source", body: "Apache 2.0 — gratis voor elk gebruik, ook commercieel. Zelf hosten via Docker Compose zonder feature-slot, of laat ons hosten. Forken, auditen, houden." },
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
      h2: "Drie manieren om het te draaien.",
      lead: "Host zelf, gratis en open source. Laat ons hosten tegen een vast tarief, onbeperkt gebruikers. Of laat het on-prem draaien met updates, monitoring en back-ups geregeld.",
      allLink: "Bekijk alle prijzen →",
    },
    rollout: {
      eyebrow: "Gehost & managed",
      h2: "Liever niet zelf draaien?",
      lead: "De software is gratis en open source — host zelf wanneer je wilt. Wil je dat liever niet, dan hosten wij het voor je, of installeren en draaien we het op je eigen infrastructuur.",
      points: [
        { h: "Gehost", b: "Wij draaien het voor je tegen een vast tarief. Onbeperkt gebruikers, dagelijkse back-ups, updates geregeld." },
        { h: "Managed on-prem", b: "Geïnstalleerd op je eigen infrastructuur, met updates, monitoring en back-ups geregeld." },
        { h: "ERP gekoppeld", b: "Orderintentie binnen via REST en webhooks, resultaten terug, geen dubbele invoer." },
      ],
      cta: "Neem contact op",
    },
    cta: {
      h2: "Probeer het op je eigen werkvloer.",
      lead: "Start binnen een paar minuten een gratis trial. Of pak de Docker-image en host het zelf, gratis — het is open source, zonder addertjes.",
      ctaPrimary: "Start gratis trial",
      ctaSecondary: "Lees de self-host-gids",
    },
  },

  de: {
    title: "Eryxon Flow — Ein ruhiges, quelloffenes MES für Lohnfertiger, die liefern",
    description:
      "Eryxon Flow verfolgt Aufträge durch Schneiden, Kanten, Schweißen und Montage — von einem Tablet in der Werkstatt bis zum Schreibtisch des Planers. Kostenlos und quelloffen. Selbst hosten, von uns hosten lassen oder on-prem betreiben lassen.",
    hero: {
      tag: "Open Source · Apache 2.0 · selbst hostbar",
      h1: "Ein ruhiges, quelloffenes MES für Lohnfertiger, die liefern.",
      lead: "Eryxon Flow verfolgt Aufträge durch Schneiden, Kanten, Schweißen und Montage — von einem Tablet in der Werkstatt bis zum Schreibtisch des Planers. Kostenlos und quelloffen, mit erstklassigem Self-Hosting. Keine Tabellen, keine Whiteboards, kein Rauschen.",
      ctaPrimary: "Kostenlos testen",
      ctaSecondary: "Selbst hosten, kostenlos",
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
        { title: "Kostenlos und quelloffen", body: "Apache 2.0 — kostenlos für jeden Einsatz, auch kommerziell. Selbst hosten per Docker Compose ohne Feature-Sperren oder von uns hosten lassen. Forken, prüfen, behalten." },
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
      h2: "Drei Wege, es zu betreiben.",
      lead: "Selbst hosten, kostenlos und quelloffen. Von uns hosten lassen zum Pauschalpreis, unbegrenzte Nutzer. Oder on-prem betreiben lassen mit Updates, Monitoring und Backups.",
      allLink: "Alle Preise ansehen →",
    },
    rollout: {
      eyebrow: "Gehostet & Managed",
      h2: "Lieber nicht selbst betreiben?",
      lead: "Die Software ist kostenlos und quelloffen — hoste sie selbst, wann immer du willst. Wenn nicht, hosten wir sie für dich oder installieren und betreiben sie auf deiner eigenen Infrastruktur.",
      points: [
        { h: "Gehostet", b: "Wir betreiben es für dich zum Pauschalpreis. Unbegrenzte Nutzer, tägliche Backups, Updates erledigt." },
        { h: "Managed on-prem", b: "Auf deiner Infrastruktur installiert, mit Updates, Monitoring und Backups." },
        { h: "ERP angebunden", b: "Auftragsabsicht über REST und Webhooks rein, Ergebnisse zurück, keine Doppelerfassung." },
      ],
      cta: "Kontakt aufnehmen",
    },
    cta: {
      h2: "Teste es auf deiner eigenen Werkstatt.",
      lead: "Starte in wenigen Minuten kostenlos. Oder zieh das Docker-Image und hoste es selbst, kostenlos — es ist quelloffen, ohne Haken.",
      ctaPrimary: "Kostenlos testen",
      ctaSecondary: "Self-Hosting-Anleitung lesen",
    },
  },
};

const PRICING: Record<Locale, PricingCopy> = {
  en: {
    title: "Pricing — Eryxon Flow",
    description: "Self-host it free and open source, let us host it at a flat rate with unlimited users, or have it run on-prem with updates, monitoring, and backups. Three ways to run it.",
    hero: { eyebrow: "Pricing", h1: "Three ways to run it.", lead: "The software is free and open source. Self-host it, let us host it at a flat rate, or have it run on-prem for you." },
    plans: {
      free: { head: "Free / self-hosted", name: "Free / self-hosted", price: "Free", period: "· open source", sub: "Apache 2.0, no feature gates. Self-host it forever, or start a free trial.", cta: "Start free trial",
        features: [{ text: "Full product, no feature gates" }, { text: "Self-host via Docker Compose" }, { text: "Operator terminals on your tablets" }, { text: "REST API and webhooks" }, { text: "Apache 2.0 — fork it, keep it" }] },
      hosted: { head: "Hosted", name: "Hosted", flag: "Unlimited users", price: "Flat rate", sub: "We host it for you at app.eryxon.eu. One flat rate, unlimited users.", ctaSoon: "Get in touch",
        features: [{ text: "We host and run it for you" }, { text: "Flat rate, unlimited users" }, { text: "Daily backups" }, { text: "Updates handled automatically" }] },
      managed: { head: "Managed on-prem", name: "Managed on-prem", price: "Let's talk", sub: "Installed on your own infrastructure, with updates, monitoring, and backups handled.", cta: "Get in touch",
        features: [{ text: "Installed on your infrastructure" }, { text: "Updates, monitoring, and backups" }, { text: "ERP integration over REST and webhooks" }, { text: "Scoped to your shop" }] },
    },
  },
  nl: {
    title: "Prijzen — Eryxon Flow",
    description: "Host zelf, gratis en open source, laat ons hosten tegen een vast tarief met onbeperkt gebruikers, of laat het on-prem draaien met updates, monitoring en back-ups. Drie manieren om het te draaien.",
    hero: { eyebrow: "Prijzen", h1: "Drie manieren om het te draaien.", lead: "De software is gratis en open source. Host zelf, laat ons hosten tegen een vast tarief, of laat het on-prem voor je draaien." },
    plans: {
      free: { head: "Gratis / self-hosted", name: "Gratis / self-hosted", price: "Gratis", period: "· open source", sub: "Apache 2.0, geen feature-slot. Host voor altijd zelf, of start een gratis trial.", cta: "Start gratis trial",
        features: [{ text: "Volledig product, geen feature-slot" }, { text: "Zelf hosten via Docker Compose" }, { text: "Operatorterminals op je tablets" }, { text: "REST API en webhooks" }, { text: "Apache 2.0 — forken, houden" }] },
      hosted: { head: "Gehost", name: "Gehost", flag: "Onbeperkt gebruikers", price: "Vast tarief", sub: "Wij hosten het voor je op app.eryxon.eu. Eén vast tarief, onbeperkt gebruikers.", ctaSoon: "Neem contact op",
        features: [{ text: "Wij hosten en draaien het voor je" }, { text: "Vast tarief, onbeperkt gebruikers" }, { text: "Dagelijkse back-ups" }, { text: "Updates automatisch geregeld" }] },
      managed: { head: "Managed on-prem", name: "Managed on-prem", price: "Even overleggen", sub: "Geïnstalleerd op je eigen infrastructuur, met updates, monitoring en back-ups geregeld.", cta: "Neem contact op",
        features: [{ text: "Geïnstalleerd op jouw infrastructuur" }, { text: "Updates, monitoring en back-ups" }, { text: "ERP-koppeling via REST en webhooks" }, { text: "Toegesneden op jouw shop" }] },
    },
  },
  de: {
    title: "Preise — Eryxon Flow",
    description: "Selbst hosten, kostenlos und quelloffen, von uns hosten lassen zum Pauschalpreis mit unbegrenzten Nutzern oder on-prem betreiben lassen mit Updates, Monitoring und Backups. Drei Wege, es zu betreiben.",
    hero: { eyebrow: "Preise", h1: "Drei Wege, es zu betreiben.", lead: "Die Software ist kostenlos und quelloffen. Selbst hosten, von uns hosten lassen zum Pauschalpreis oder on-prem für dich betreiben lassen." },
    plans: {
      free: { head: "Kostenlos / selbst gehostet", name: "Kostenlos / selbst gehostet", price: "Kostenlos", period: "· Open Source", sub: "Apache 2.0, keine Feature-Sperren. Für immer selbst hosten oder kostenlos testen.", cta: "Kostenlos testen",
        features: [{ text: "Volles Produkt, keine Feature-Sperren" }, { text: "Selbst hosten per Docker Compose" }, { text: "Operator-Terminals auf deinen Tablets" }, { text: "REST-API und Webhooks" }, { text: "Apache 2.0 — forken, behalten" }] },
      hosted: { head: "Gehostet", name: "Gehostet", flag: "Unbegrenzte Nutzer", price: "Pauschalpreis", sub: "Wir hosten es für dich auf app.eryxon.eu. Ein Pauschalpreis, unbegrenzte Nutzer.", ctaSoon: "Kontakt aufnehmen",
        features: [{ text: "Wir hosten und betreiben es für dich" }, { text: "Pauschalpreis, unbegrenzte Nutzer" }, { text: "Tägliche Backups" }, { text: "Updates automatisch erledigt" }] },
      managed: { head: "Managed on-prem", name: "Managed on-prem", price: "Sprechen wir", sub: "Auf deiner eigenen Infrastruktur installiert, mit Updates, Monitoring und Backups.", cta: "Kontakt aufnehmen",
        features: [{ text: "Auf deiner Infrastruktur installiert" }, { text: "Updates, Monitoring und Backups" }, { text: "ERP-Anbindung über REST und Webhooks" }, { text: "Auf deinen Betrieb zugeschnitten" }] },
    },
  },
};

/* ---------- Roadmap (public Canny board) ---------- */
export interface RoadmapCopy {
  title: string;
  description: string;
  hero: { eyebrow: string; h1: string; lead: string };
  /** Intro shown above the embedded board. */
  intro: string;
  /** Fallback link-out card for when the embed is blocked. */
  fallback: { label: string; note: string; cta: string };
  /** Button that opens the board in a new tab. */
  openLabel: string;
}

/** Public Canny roadmap board. Single source of truth for the embed + link-out. */
export const CANNY_ROADMAP_URL = "https://eryxon.canny.io/";

const ROADMAP: Record<Locale, RoadmapCopy> = {
  en: {
    title: "Roadmap — Eryxon Flow",
    description: "What's planned, in progress, and shipped for Eryxon Flow. Public roadmap, open to feedback and votes.",
    hero: {
      eyebrow: "Roadmap",
      h1: "What's next for Eryxon Flow.",
      lead: "Our roadmap is public. See what's planned, in progress, and shipped — and tell us what matters to your shop.",
    },
    intro: "The board below is live from our public roadmap. Vote on what you need, or post an idea.",
    fallback: {
      label: "Public roadmap",
      note: "If the board doesn't load here, it opens directly on Canny.",
      cta: "Open the roadmap",
    },
    openLabel: "Open in Canny ↗",
  },
  nl: {
    title: "Roadmap — Eryxon Flow",
    description: "Wat gepland, in uitvoering en uitgebracht is voor Eryxon Flow. Publieke roadmap, open voor feedback en stemmen.",
    hero: {
      eyebrow: "Roadmap",
      h1: "Wat komt er aan voor Eryxon Flow.",
      lead: "Onze roadmap is openbaar. Zie wat gepland, in uitvoering en uitgebracht is — en laat ons weten wat voor jouw shop telt.",
    },
    intro: "Het board hieronder komt live van onze publieke roadmap. Stem op wat je nodig hebt, of plaats een idee.",
    fallback: {
      label: "Publieke roadmap",
      note: "Als het board hier niet laadt, opent het rechtstreeks op Canny.",
      cta: "Open de roadmap",
    },
    openLabel: "Open in Canny ↗",
  },
  de: {
    title: "Roadmap — Eryxon Flow",
    description: "Was geplant, in Arbeit und veröffentlicht ist für Eryxon Flow. Öffentliche Roadmap, offen für Feedback und Stimmen.",
    hero: {
      eyebrow: "Roadmap",
      h1: "Was als Nächstes für Eryxon Flow kommt.",
      lead: "Unsere Roadmap ist öffentlich. Sieh, was geplant, in Arbeit und veröffentlicht ist — und sag uns, was für deinen Betrieb zählt.",
    },
    intro: "Das Board unten kommt live von unserer öffentlichen Roadmap. Stimme über das ab, was du brauchst, oder poste eine Idee.",
    fallback: {
      label: "Öffentliche Roadmap",
      note: "Wenn das Board hier nicht lädt, öffnet es direkt auf Canny.",
      cta: "Roadmap öffnen",
    },
    openLabel: "In Canny öffnen ↗",
  },
};

export function landingCopy(locale: Locale): LandingCopy {
  return LANDING[locale];
}
export function pricingCopy(locale: Locale): PricingCopy {
  return PRICING[locale];
}
export function roadmapCopy(locale: Locale): RoadmapCopy {
  return ROADMAP[locale];
}
