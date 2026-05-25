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
    title: "Eryxon Flow — open-source MES for job shops",
    description:
      "Eryxon Flow tracks jobs through cutting, bending, welding, and assembly, from the tablet on the floor to the planner's desk. Free and open source. Self-host it, let us host it, or have it run on-prem for you.",
    hero: {
      tag: "Open source · Apache 2.0 · self-hostable",
      h1: "Keep a grip on every job, floor to planning.",
      lead: "Eryxon Flow tracks each job through cutting, bending, welding, and assembly. Operators work a tablet at the machine; the planner sees it the moment it changes. Free and open source. No spreadsheets, no whiteboard.",
      ctaPrimary: "Try it free",
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
      lead: "It runs in minutes. Or pull the Docker image and self-host it free. Open source, no strings.",
      ctaPrimary: "Try it free",
      ctaSecondary: "Read the self-host guide",
    },
  },

  nl: {
    title: "Eryxon Flow — open-source MES voor de metaalbewerking",
    description:
      "Eryxon Flow houdt je orders bij door snijden, kanten, lassen en assemblage — van de tablet op de vloer tot het bureau van de planner. Gratis en open source. Host het zelf, laat het ons hosten, of laat het bij je op locatie draaien.",
    hero: {
      tag: "Open source · Apache 2.0 · zelf te hosten",
      h1: "Grip op je orders, van de vloer tot de planning.",
      lead: "Eryxon Flow volgt elke order door snijden, kanten, lassen en assemblage. De operator werkt op een tablet aan de machine, de planner ziet het meteen op zijn scherm. Gratis en open source. Geen Excel, geen whiteboard.",
      ctaPrimary: "Gratis uitproberen",
      ctaSecondary: "Zelf hosten, gratis",
      ctaTertiary: "Naar de docs →",
    },
    product: { url: "app.eryxon.eu/operator/work-queue", cell: "● Lasersnijden", queueTitle: "Werkwachtrij", cards: productCards },
    features: {
      eyebrow: "Wat je krijgt",
      h2: "Alles wat een enkelstuks- en kleinserieshop nodig heeft.",
      lead: "Geen losse modules om bij te kopen, geen prijs per gebruiker, geen verrassingen. Het hele systeem vanaf dag één — van de tablet aan de machine tot de planner en de API.",
      items: [
        { title: "Tablets aan de machine", body: "Een wachtrij per cel, zoals een kanbanbord. Knoppen van 56 pixels, dus je raakt ze met werkhandschoenen. Status, deadline en doorlooptijd lees je van een meter afstand af." },
        { title: "Order- en onderdeelvolging", body: "Je ziet elke order door snijden, kanten, lassen, assemblage en afwerking heen. De route per cel, WIP-limieten en hoeveel werk er nog op de plank ligt." },
        { title: "3D STEP-viewer", body: "CAD in de browser, niks te installeren. Meten en exploded views, direct in het orderscherm van de operator." },
        { title: "REST API en webhooks", body: "Filteren, pagineren, zoeken en een webhook bij elke stap. Gebouwd om je ERP en de werkvloer aan elkaar te knopen, niet om alles met de hand in te kloppen." },
        { title: "Gratis en open source", body: "Apache 2.0, gratis voor elk gebruik, ook commercieel. Zelf hosten met Docker Compose, niks afgeschermd. Of laat ons hosten. Forken en aanpassen mag." },
        { title: "Meerdere locaties, meerdere talen", body: "Row-level security op PostgreSQL. NL, DE en EN zitten er standaard in. Werkt voor één werkplaats en voor een groep met meerdere vestigingen." },
      ],
    },
    how: {
      eyebrow: "Hoe het werkt",
      h2: "Van order in het ERP naar de planning, in drie stappen.",
      steps: [
        { n: "01", h: "Zet je orders erin", b: "Via de REST API vanuit je ERP, met een CSV, of via een planningskoppeling. Eryxon Flow trekt onderdelen, bewerkingen en routes recht, zodat de vloer altijd dezelfde opbouw ziet, wat er bovenstrooms ook staat.", tag: "REST · CSV · webhooks" },
        { n: "02", h: "De vloer werkt de wachtrij af", b: "Elke cel heeft zijn eigen tablet. Tik op een bewerking, start de timer, vul goed- en afkeuraantallen in, meld een probleem. De planner ziet het meteen, zonder de pagina te verversen.", tag: "Tablet · knoppen van 56px · live" },
        { n: "03", h: "De planner houdt de capaciteit in de gaten", b: "Eén scherm met de WIP-limiet per cel, welke orders krap zitten en een lijst met meldingen. Zit een cel boven de 100 procent, dan zie je dat. Geen verrassing meer op vrijdag om vijf voor vijf.", tag: "Capaciteit · WIP-limieten · meldingen" },
      ],
    },
    api: {
      eyebrow: "REST + Webhooks",
      h2: "Een API waar je ERP echt mee uit de voeten kan.",
      lead: "Endpoints met filteren, pagineren, zoeken en een webhook per stap. Bedoeld om je ERP en de werkvloer te koppelen.",
      bullets: ["Bearer-token met afgebakende API-keys", "Schrijfacties zijn idempotent, met je eigen sleutel", "Een webhook bij elke stap in de order", "MCP-server voor AI-assistenten"],
    },
    integrations: {
      eyebrow: "Koppelingen",
      h2: "Past tussen de systemen die je al draait.",
      lead: "Eryxon Flow pakt de order uit je ERP, geeft die als bewerkingen door aan de vloer en stuurt de resultaten weer terug.",
      items: [
        { name: "REST API", kind: "Koppeling" },
        { name: "Webhooks", kind: "Events" },
        { name: "CSV-import", kind: "Opstarten" },
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
      lead: "Host het zelf, gratis en open source. Laat het ons hosten voor een vast bedrag, onbeperkt gebruikers. Of laat het op je eigen locatie draaien, met updates, monitoring en back-ups erbij.",
      allLink: "Bekijk alle prijzen →",
    },
    rollout: {
      eyebrow: "Gehost en beheerd",
      h2: "Liever niet zelf draaien?",
      lead: "De software is gratis en open source, dus zelf hosten kan altijd. Geen zin in? Dan hosten wij het, of we zetten het neer op je eigen servers en houden het draaiend.",
      points: [
        { h: "Gehost", b: "Wij draaien het voor je, vast bedrag. Onbeperkt gebruikers, elke dag een back-up, updates doen wij." },
        { h: "Beheerd op locatie", b: "Op je eigen servers gezet, met updates, monitoring en back-ups erbij." },
        { h: "Gekoppeld aan je ERP", b: "Orders komen binnen via REST en webhooks, resultaten gaan terug. Niks dubbel invoeren." },
      ],
      cta: "Neem contact op",
    },
    cta: {
      h2: "Probeer het op je eigen werkvloer.",
      lead: "Binnen een paar minuten draait er een proefversie. Of pak de Docker-image en host het zelf, gratis. Open source, geen addertjes.",
      ctaPrimary: "Gratis uitproberen",
      ctaSecondary: "Lees de zelf-hosten-gids",
    },
  },

  de: {
    title: "Eryxon Flow — quelloffenes MES für die Metallbearbeitung",
    description:
      "Eryxon Flow verfolgt Aufträge durch Schneiden, Kanten, Schweißen und Montage, vom Tablet in der Werkstatt bis zum Schreibtisch des Planers. Kostenlos und quelloffen. Selbst hosten, von uns hosten lassen oder vor Ort betreiben lassen.",
    hero: {
      tag: "Open Source · Apache 2.0 · selbst hostbar",
      h1: "Jeden Auftrag im Griff, von der Werkstatt bis zur Planung.",
      lead: "Eryxon Flow verfolgt jeden Auftrag durch Schneiden, Kanten, Schweißen und Montage. Der Werker arbeitet am Tablet an der Maschine, der Planer sieht es sofort auf seinem Bildschirm. Kostenlos und quelloffen. Kein Excel, kein Whiteboard.",
      ctaPrimary: "Kostenlos testen",
      ctaSecondary: "Selbst hosten, kostenlos",
      ctaTertiary: "Zur Doku →",
    },
    product: { url: "app.eryxon.eu/operator/work-queue", cell: "● Laserschneiden", queueTitle: "Arbeitsliste", cards: productCards },
    features: {
      eyebrow: "Was du bekommst",
      h2: "Alles, was ein Einzel- und Kleinserienbetrieb braucht.",
      lead: "Keine Module zum Nachkaufen, kein Preis pro Nutzer, keine Überraschungen. Das ganze System ab Tag eins — vom Tablet an der Maschine bis zum Planer und zur API.",
      items: [
        { title: "Tablets an der Maschine", body: "Eine Arbeitsliste je Zelle, wie ein Kanban-Board. Schaltflächen mit 56 Pixeln, also auch mit Arbeitshandschuhen bedienbar. Status, Termin und Laufzeit liest du aus einem Meter Entfernung ab." },
        { title: "Auftrags- und Teileverfolgung", body: "Du siehst jeden Auftrag durch Schneiden, Kanten, Schweißen, Montage und Finish. Die Route je Zelle, WIP-Limits und wie viel Arbeit noch ansteht." },
        { title: "3D-STEP-Viewer", body: "CAD im Browser, nichts zu installieren. Messen und Explosionsansichten, direkt im Auftragsfenster des Werkers." },
        { title: "REST-API und Webhooks", body: "Filtern, Paginieren, Suchen und ein Webhook bei jedem Schritt. Gebaut, um dein ERP und die Werkstatt zu verbinden, nicht um alles von Hand einzutippen." },
        { title: "Kostenlos und quelloffen", body: "Apache 2.0, kostenlos für jeden Einsatz, auch kommerziell. Selbst hosten per Docker Compose, nichts gesperrt. Oder von uns hosten lassen. Forken und anpassen erlaubt." },
        { title: "Mehrere Standorte, mehrere Sprachen", body: "Row-Level-Security auf PostgreSQL. NL, DE und EN ab Werk. Für Betriebe mit einem Standort und für Gruppen mit mehreren." },
      ],
    },
    how: {
      eyebrow: "So funktioniert es",
      h2: "Vom Auftrag im ERP bis zur Planung, in drei Schritten.",
      steps: [
        { n: "01", h: "Aufträge einspielen", b: "Über die REST-API aus deinem ERP, per CSV oder über eine Planungsanbindung. Eryxon Flow zieht Teile, Arbeitsgänge und Routen gerade, sodass die Werkstatt immer denselben Aufbau sieht, egal was vorgelagert steht.", tag: "REST · CSV · Webhooks" },
        { n: "02", h: "Die Werkstatt arbeitet die Liste ab", b: "Jede Zelle hat ihr eigenes Tablet. Arbeitsgang antippen, Timer starten, Gut- und Ausschussmengen erfassen, Probleme melden. Der Planer sieht es sofort, ohne die Seite neu zu laden.", tag: "Tablet · 56px-Schaltflächen · live" },
        { n: "03", h: "Der Planer behält die Kapazität im Blick", b: "Ein Bildschirm mit dem WIP-Limit je Zelle, welche Aufträge knapp sind und einer Meldungsliste. Liegt eine Zelle über 100 Prozent, siehst du das. Keine Überraschung mehr am Freitag um kurz vor Feierabend.", tag: "Kapazität · WIP-Limits · Meldungen" },
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

/* ---------- Roadmap ----------
 *
 * The roadmap is our own content first: three status columns (Shipped / In progress / Planned)
 * with real items, rendered in the marketing design system. The public Canny board is paired in
 * as a "vote on it" call to action, not as a bare iframe. Items are deliberately conservative and
 * truthful — native iOS/Android sit under "In progress" (work in flight, not yet shipped); nothing
 * here states a version number (versions live in the release notes, not on marketing pages).
 */
export type RoadmapStatus = "shipped" | "progress" | "planned";

export interface RoadmapItem {
  /** Which status column this item belongs to. */
  status: RoadmapStatus;
  title: string;
  /** One short line. */
  note: string;
}

export interface RoadmapColumn {
  status: RoadmapStatus;
  label: string;
}

export interface RoadmapCopy {
  title: string;
  description: string;
  hero: { eyebrow: string; h1: string; lead: string };
  /** Column headers, in render order. */
  columns: RoadmapColumn[];
  /** All items; the component groups them by status. */
  items: RoadmapItem[];
  /** The "vote on the public board" call-to-action card. */
  vote: { eyebrow: string; h: string; b: string; cta: string };
}

/** Public Canny roadmap board. Single source of truth for the vote-CTA link-out. */
export const CANNY_ROADMAP_URL = "https://eryxon.canny.io/";

const ROADMAP: Record<Locale, RoadmapCopy> = {
  en: {
    title: "Roadmap — Eryxon Flow",
    description: "What's shipped, what we're building, and what's planned for Eryxon Flow. Public roadmap, open to your votes.",
    hero: {
      eyebrow: "Roadmap",
      h1: "What's next for Eryxon Flow.",
      lead: "Here's what's already in, what we're building now, and what's coming. The roadmap is public, so tell us what matters to your shop.",
    },
    columns: [
      { status: "shipped", label: "Shipped" },
      { status: "progress", label: "In progress" },
      { status: "planned", label: "Planned" },
    ],
    items: [
      { status: "shipped", title: "Operator terminals", note: "Touch work queues per cell, built for tablets at the machine." },
      { status: "shipped", title: "Job & part tracking", note: "Cutting, bending, welding, assembly, finishing — across cells." },
      { status: "shipped", title: "3D STEP viewer", note: "CAD in the browser, inside the operator detail view." },
      { status: "shipped", title: "REST API & webhooks", note: "Filtering, pagination, search, and an event for every step." },
      { status: "shipped", title: "MCP server", note: "Let an AI assistant read and act on shop-floor data." },
      { status: "shipped", title: "Multi-tenant, multi-language", note: "Row-level security on PostgreSQL. EN / NL / DE." },
      { status: "progress", title: "Native iOS app", note: "A real app for the App Store, on top of the operator UI. In build." },
      { status: "progress", title: "Native Android app", note: "Same operator experience, packaged for Android. In build." },
      { status: "progress", title: "Capacity & WIP dashboard", note: "Sharper planner view: WIP limits per cell and due-date heat." },
      { status: "planned", title: "Planning adapters", note: "Ready-made connectors for common ERP and planning systems." },
      { status: "planned", title: "Shift & label printing", note: "Print work tickets and labels straight from the queue." },
      { status: "planned", title: "Reporting export", note: "Throughput and scrap numbers out to CSV and BI tools." },
    ],
    vote: {
      eyebrow: "Have your say",
      h: "Vote on what we build next.",
      b: "The order isn't fixed. If something here would help your shop, vote for it on the public board, or post what's missing.",
      cta: "Vote on the public board ↗",
    },
  },
  nl: {
    title: "Roadmap — Eryxon Flow",
    description: "Wat er al in zit, waar we aan bouwen en wat er nog komt voor Eryxon Flow. Publieke roadmap, open om op te stemmen.",
    hero: {
      eyebrow: "Roadmap",
      h1: "Wat er aankomt voor Eryxon Flow.",
      lead: "Dit zit er al in, hier bouwen we nu aan en dit staat op de planning. De roadmap is openbaar, dus laat weten wat voor jouw shop telt.",
    },
    columns: [
      { status: "shipped", label: "Klaar" },
      { status: "progress", label: "In ontwikkeling" },
      { status: "planned", label: "Op de planning" },
    ],
    items: [
      { status: "shipped", title: "Tablets aan de machine", note: "Werkwachtrij per cel, gemaakt voor tablets bij de machine." },
      { status: "shipped", title: "Order- en onderdeelvolging", note: "Snijden, kanten, lassen, assemblage, afwerking, over de cellen heen." },
      { status: "shipped", title: "3D STEP-viewer", note: "CAD in de browser, in het orderscherm van de operator." },
      { status: "shipped", title: "REST API en webhooks", note: "Filteren, pagineren, zoeken en een event bij elke stap." },
      { status: "shipped", title: "MCP-server", note: "Laat een AI-assistent meelezen en meewerken op je werkvloerdata." },
      { status: "shipped", title: "Meerdere locaties en talen", note: "Row-level security op PostgreSQL. NL, DE en EN." },
      { status: "progress", title: "Native iOS-app", note: "Een echte app voor de App Store, bovenop het operatorscherm. In de maak." },
      { status: "progress", title: "Native Android-app", note: "Hetzelfde operatorscherm, verpakt voor Android. In de maak." },
      { status: "progress", title: "Capaciteits- en WIP-scherm", note: "Scherper plannerszicht: WIP-limieten per cel en deadlinedruk." },
      { status: "planned", title: "Planningskoppelingen", note: "Kant-en-klare koppelingen voor gangbare ERP- en planningssystemen." },
      { status: "planned", title: "Werkbon en etiket printen", note: "Werkbonnen en etiketten direct uit de wachtrij printen." },
      { status: "planned", title: "Rapportage-export", note: "Doorlooptijd- en afkeurcijfers naar CSV en BI-tools." },
    ],
    vote: {
      eyebrow: "Praat mee",
      h: "Stem op wat we hierna bouwen.",
      b: "De volgorde ligt niet vast. Helpt iets hier jouw shop, stem erop op het publieke board, of zet erbij wat er mist.",
      cta: "Stem op het publieke board ↗",
    },
  },
  de: {
    title: "Roadmap — Eryxon Flow",
    description: "Was schon drin ist, woran wir bauen und was noch kommt für Eryxon Flow. Öffentliche Roadmap, offen für deine Stimmen.",
    hero: {
      eyebrow: "Roadmap",
      h1: "Was als Nächstes für Eryxon Flow kommt.",
      lead: "Das ist schon drin, daran bauen wir gerade und das ist geplant. Die Roadmap ist öffentlich, also sag uns, was für deinen Betrieb zählt.",
    },
    columns: [
      { status: "shipped", label: "Fertig" },
      { status: "progress", label: "In Arbeit" },
      { status: "planned", label: "Geplant" },
    ],
    items: [
      { status: "shipped", title: "Tablets an der Maschine", note: "Arbeitsliste je Zelle, gemacht für Tablets an der Maschine." },
      { status: "shipped", title: "Auftrags- und Teileverfolgung", note: "Schneiden, Kanten, Schweißen, Montage, Finish, über die Zellen hinweg." },
      { status: "shipped", title: "3D-STEP-Viewer", note: "CAD im Browser, im Auftragsfenster des Werkers." },
      { status: "shipped", title: "REST-API und Webhooks", note: "Filtern, Paginieren, Suchen und ein Event bei jedem Schritt." },
      { status: "shipped", title: "MCP-Server", note: "Lass einen KI-Assistenten auf den Werkstattdaten mitlesen und handeln." },
      { status: "shipped", title: "Mehrere Standorte und Sprachen", note: "Row-Level-Security auf PostgreSQL. NL, DE und EN." },
      { status: "progress", title: "Native iOS-App", note: "Eine echte App für den App Store, auf dem Werker-UI. Im Bau." },
      { status: "progress", title: "Native Android-App", note: "Dasselbe Werker-Erlebnis, verpackt für Android. Im Bau." },
      { status: "progress", title: "Kapazitäts- und WIP-Ansicht", note: "Schärfere Planeransicht: WIP-Limits je Zelle und Termindruck." },
      { status: "planned", title: "Planungsanbindungen", note: "Fertige Konnektoren für gängige ERP- und Planungssysteme." },
      { status: "planned", title: "Laufzettel- und Etikettendruck", note: "Laufzettel und Etiketten direkt aus der Liste drucken." },
      { status: "planned", title: "Reporting-Export", note: "Durchsatz- und Ausschusszahlen nach CSV und in BI-Tools." },
    ],
    vote: {
      eyebrow: "Misch dich ein",
      h: "Stimm darüber ab, was wir als Nächstes bauen.",
      b: "Die Reihenfolge steht nicht fest. Hilft dir etwas davon, stimm auf dem öffentlichen Board dafür, oder schreib, was fehlt.",
      cta: "Auf dem öffentlichen Board abstimmen ↗",
    },
  },
};

/* ---------- Legal pages (imprint + privacy) ----------
 *
 * EN / NL / DE copy for the imprint (Impressum) and privacy policy. The publisher of Eryxon Flow
 * is Sheet Metal Connect e.U. (Vienna, AT) — entity data is sourced 1:1 from the live imprint on
 * vanenkhuizen.com (the same legal entity). Nothing is invented; fields absent from the source are
 * not fabricated.
 *
 * IMPORTANT scope note. These pages cover the MARKETING WEBSITE only. The marketing site sets no
 * tracking cookies and runs no third-party analytics (the CTA adapter is a no-op with no provider;
 * see `components/Analytics.astro`). The hosted application (app.eryxon.eu) is a separate surface
 * with its own data processing; we say so rather than describing flows that don't exist here.
 *
 * Voice: kit voice — calm, factual, short. The Apache 2.0 "AS IS" / no-warranty / use-at-your-own-
 * risk disclaimer is surfaced prominently on BOTH pages via a dedicated block, matching the licence
 * that actually ships (LICENSE, Apache 2.0).
 */

/** A labelled key/value row (used for entity + registration blocks). */
export interface LegalRow {
  label: string;
  /** Plain value, or */
  value?: string;
  /** a link value. */
  href?: string;
  /** mailto: link value. */
  email?: string;
  /** open in new tab. */
  external?: boolean;
}

export interface LegalSection {
  heading: string;
  /** Free-text paragraphs (each rendered as its own <p>). */
  paragraphs?: string[];
  /** Definition-style rows. */
  rows?: LegalRow[];
  /** Bulleted list items. */
  bullets?: string[];
}

/** The shared "as is / open source / use at your own risk" disclaimer block. */
export interface LegalDisclaimer {
  heading: string;
  paragraphs: string[];
  licenseLabel: string;
  licenseHref: string;
}

export interface LegalCopy {
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  /** Small line under the H1 (e.g. statutory basis, or last-updated date). */
  meta: string;
  /** Lead paragraph (privacy only; empty string to skip). */
  lead: string;
  sections: LegalSection[];
  /** Surfaced on both pages; null to skip. */
  disclaimer: LegalDisclaimer | null;
}

/* Entity data — single source of truth, identical across locales. Sourced from vanenkhuizen.com. */
const ENTITY = {
  name: "Sheet Metal Connect e.U.",
  owner: "Luke van Enkhuizen",
  street: "Dr.-Karl-Lueger-Platz 4B / 16",
  city: "1010 Wien, Österreich",
  email: "office@vanenkhuizen.com",
  uid: "ATU74556919",
  fnNumber: "FN 547850m",
  fnCourt: "Handelsgericht Wien, 1030 Wien, Marxergasse 1a",
  linkedin: "https://www.linkedin.com/in/lvanenkhuizen/",
} as const;

const APACHE_LICENSE_HREF = "https://github.com/SheetMetalConnect/eryxon-flow/blob/main/LICENSE";

const IMPRINT: Record<Locale, LegalCopy> = {
  en: {
    title: "Imprint — Eryxon Flow",
    description: "Legal information and company details for Eryxon Flow, published by Sheet Metal Connect e.U. (Vienna, Austria).",
    eyebrow: "Legal",
    h1: "Imprint",
    meta: "Information pursuant to §5 ECG and §14 UGB",
    lead: "",
    sections: [
      {
        heading: "Publisher",
        rows: [
          { label: "Company", value: ENTITY.name },
          { label: "Owner", value: ENTITY.owner },
          { label: "Address", value: `${ENTITY.street}, ${ENTITY.city}` },
          { label: "Email", email: ENTITY.email },
          { label: "LinkedIn", value: "linkedin.com/in/lvanenkhuizen", href: ENTITY.linkedin, external: true },
        ],
      },
      {
        heading: "Business activity",
        paragraphs: ["IT consulting and services for the metalworking industry. Eryxon Flow is an open-source manufacturing execution system published by Sheet Metal Connect e.U."],
      },
      {
        heading: "Registration",
        rows: [
          { label: "VAT ID (UID)", value: ENTITY.uid },
          { label: "Company register no.", value: ENTITY.fnNumber },
          { label: "Register court", value: ENTITY.fnCourt },
        ],
      },
      {
        heading: "Chamber & professional law",
        rows: [
          { label: "Chamber membership", value: "Member of the WKÖ, Fachgruppe Unternehmensberatung, Buchhaltung und Informationstechnologie (UBIT), WK Wien" },
          { label: "Professional regulations", value: "www.ris.bka.gv.at", href: "https://www.ris.bka.gv.at", external: true },
          { label: "Supervisory authority", value: "Magistratisches Bezirksamt für den 1. Bezirk" },
        ],
      },
      {
        heading: "Online dispute resolution",
        paragraphs: [
          "EU ODR platform: ec.europa.eu/consumers/odr",
          "Sheet Metal Connect e.U. is neither obliged nor willing to take part in dispute-resolution proceedings before a consumer arbitration board.",
        ],
      },
      {
        heading: "Liability for links",
        paragraphs: ["Despite careful review, we accept no liability for the content of external links. The operators of the linked pages are solely responsible for their content (§17 para. 2 ECG)."],
      },
    ],
    disclaimer: null,
  },
  nl: {
    title: "Impressum — Eryxon Flow",
    description: "Juridische informatie en bedrijfsgegevens van Eryxon Flow, uitgegeven door Sheet Metal Connect e.U. (Wenen, Oostenrijk).",
    eyebrow: "Juridisch",
    h1: "Impressum",
    meta: "Informatie conform §5 ECG en §14 UGB",
    lead: "",
    sections: [
      {
        heading: "Uitgever",
        rows: [
          { label: "Bedrijf", value: ENTITY.name },
          { label: "Eigenaar", value: ENTITY.owner },
          { label: "Adres", value: `${ENTITY.street}, ${ENTITY.city}` },
          { label: "E-mail", email: ENTITY.email },
          { label: "LinkedIn", value: "linkedin.com/in/lvanenkhuizen", href: ENTITY.linkedin, external: true },
        ],
      },
      {
        heading: "Bedrijfsactiviteit",
        paragraphs: ["IT-advies en dienstverlening voor de metaalverwerkende industrie. Eryxon Flow is een open-source manufacturing execution system, uitgegeven door Sheet Metal Connect e.U."],
      },
      {
        heading: "Registratie",
        rows: [
          { label: "UID (btw-nummer)", value: ENTITY.uid },
          { label: "Firmenbuchnummer", value: ENTITY.fnNumber },
          { label: "Firmenbuchgericht", value: ENTITY.fnCourt },
        ],
      },
      {
        heading: "Kamer & beroepsrecht",
        rows: [
          { label: "Kamerlidmaatschap", value: "Lid van de WKÖ, Fachgruppe Unternehmensberatung, Buchhaltung und Informationstechnologie (UBIT), WK Wien" },
          { label: "Beroepsvoorschriften", value: "www.ris.bka.gv.at", href: "https://www.ris.bka.gv.at", external: true },
          { label: "Toezichthoudende autoriteit", value: "Magistratisches Bezirksamt für den 1. Bezirk" },
        ],
      },
      {
        heading: "Online geschillenbeslechting",
        paragraphs: [
          "EU ODR-platform: ec.europa.eu/consumers/odr",
          "Sheet Metal Connect e.U. is niet verplicht en niet bereid om deel te nemen aan een geschillenbeslechtingsprocedure voor een consumentenarbitragecommissie.",
        ],
      },
      {
        heading: "Aansprakelijkheid voor links",
        paragraphs: ["Ondanks zorgvuldige controle aanvaarden wij geen aansprakelijkheid voor de inhoud van externe links. Voor de inhoud van gelinkte pagina's zijn uitsluitend de betreffende beheerders verantwoordelijk (§17 lid 2 ECG)."],
      },
    ],
    disclaimer: null,
  },
  de: {
    title: "Impressum — Eryxon Flow",
    description: "Rechtliche Informationen und Unternehmensangaben zu Eryxon Flow, herausgegeben von Sheet Metal Connect e.U. (Wien, Österreich).",
    eyebrow: "Rechtliches",
    h1: "Impressum",
    meta: "Angaben gemäß §5 ECG und §14 UGB",
    lead: "",
    sections: [
      {
        heading: "Herausgeber",
        rows: [
          { label: "Unternehmen", value: ENTITY.name },
          { label: "Inhaber", value: ENTITY.owner },
          { label: "Anschrift", value: `${ENTITY.street}, ${ENTITY.city}` },
          { label: "E-Mail", email: ENTITY.email },
          { label: "LinkedIn", value: "linkedin.com/in/lvanenkhuizen", href: ENTITY.linkedin, external: true },
        ],
      },
      {
        heading: "Unternehmensgegenstand",
        paragraphs: ["IT-Beratung und Dienstleistungen für die metallverarbeitende Industrie. Eryxon Flow ist ein quelloffenes Manufacturing-Execution-System, herausgegeben von Sheet Metal Connect e.U."],
      },
      {
        heading: "Registrierung",
        rows: [
          { label: "UID (USt-IdNr.)", value: ENTITY.uid },
          { label: "Firmenbuchnummer", value: ENTITY.fnNumber },
          { label: "Firmenbuchgericht", value: ENTITY.fnCourt },
        ],
      },
      {
        heading: "Kammer & Berufsrecht",
        rows: [
          { label: "Kammermitgliedschaft", value: "Mitglied der WKÖ, Fachgruppe Unternehmensberatung, Buchhaltung und Informationstechnologie (UBIT), WK Wien" },
          { label: "Berufsrechtliche Vorschriften", value: "www.ris.bka.gv.at", href: "https://www.ris.bka.gv.at", external: true },
          { label: "Aufsichtsbehörde", value: "Magistratisches Bezirksamt für den 1. Bezirk" },
        ],
      },
      {
        heading: "Online-Streitbeilegung",
        paragraphs: [
          "EU-OS-Plattform: ec.europa.eu/consumers/odr",
          "Sheet Metal Connect e.U. ist nicht verpflichtet und nicht bereit, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.",
        ],
      },
      {
        heading: "Haftung für Links",
        paragraphs: ["Trotz sorgfältiger Prüfung übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich (§17 Abs. 2 ECG)."],
      },
    ],
    disclaimer: null,
  },
};

const DISCLAIMER: Record<Locale, LegalDisclaimer> = {
  en: {
    heading: "Software disclaimer — provided “as is”",
    paragraphs: [
      "Eryxon Flow is free and open-source software, licensed under the Apache License 2.0. It is provided on an “AS IS” BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. You use it at your own risk.",
      "You are responsible for evaluating whether the software is fit for your shop floor, for backing up your data, and for running it safely in production. To the extent permitted by law, Sheet Metal Connect e.U. accepts no liability for any damages arising from the use of, or inability to use, the software. The full terms are set out in the Apache 2.0 licence.",
    ],
    licenseLabel: "Read the Apache 2.0 licence",
    licenseHref: APACHE_LICENSE_HREF,
  },
  nl: {
    heading: "Software-disclaimer — geleverd “as is”",
    paragraphs: [
      "Eryxon Flow is gratis open-source software onder de Apache License 2.0. Het wordt geleverd “AS IS” — zonder enige garantie of voorwaarde, expliciet noch impliciet. Je gebruikt het op eigen risico.",
      "Je bent zelf verantwoordelijk voor het beoordelen of de software geschikt is voor je werkvloer, voor het maken van back-ups en voor veilig gebruik in productie. Voor zover wettelijk toegestaan aanvaardt Sheet Metal Connect e.U. geen aansprakelijkheid voor schade die voortvloeit uit het gebruik of het niet kunnen gebruiken van de software. De volledige voorwaarden staan in de Apache 2.0-licentie.",
    ],
    licenseLabel: "Lees de Apache 2.0-licentie",
    licenseHref: APACHE_LICENSE_HREF,
  },
  de: {
    heading: "Software-Haftungsausschluss — bereitgestellt “wie besehen”",
    paragraphs: [
      "Eryxon Flow ist kostenlose, quelloffene Software unter der Apache License 2.0. Sie wird “WIE BESEHEN” (“AS IS”) bereitgestellt — ohne jegliche Garantie oder Gewährleistung, weder ausdrücklich noch stillschweigend. Die Nutzung erfolgt auf eigenes Risiko.",
      "Du bist selbst dafür verantwortlich zu prüfen, ob die Software für deinen Betrieb geeignet ist, deine Daten zu sichern und sie sicher im Produktivbetrieb einzusetzen. Soweit gesetzlich zulässig übernimmt Sheet Metal Connect e.U. keine Haftung für Schäden, die aus der Nutzung oder Nichtnutzbarkeit der Software entstehen. Die vollständigen Bedingungen ergeben sich aus der Apache-2.0-Lizenz.",
    ],
    licenseLabel: "Apache-2.0-Lizenz lesen",
    licenseHref: APACHE_LICENSE_HREF,
  },
};

const PRIVACY: Record<Locale, LegalCopy> = {
  en: {
    title: "Privacy Policy — Eryxon Flow",
    description: "How the Eryxon Flow website handles your data. No tracking cookies, no third-party analytics. Published by Sheet Metal Connect e.U.",
    eyebrow: "Legal",
    h1: "Privacy Policy",
    meta: "Last updated: May 2026",
    lead: "Sheet Metal Connect e.U. publishes the Eryxon Flow website. This policy covers the marketing website you are reading now. We collect as little as possible and never sell your data.",
    sections: [
      {
        heading: "Controller",
        rows: [
          { label: "Company", value: ENTITY.name },
          { label: "Owner", value: ENTITY.owner },
          { label: "Address", value: `${ENTITY.street}, ${ENTITY.city}` },
          { label: "Email", email: ENTITY.email },
        ],
      },
      {
        heading: "Website: no tracking",
        paragraphs: ["This website sets no tracking cookies and runs no third-party analytics, advertising, or fingerprinting scripts. We do not build a profile of you. A language preference may be stored in your browser's local storage; it never leaves your device."],
      },
      {
        heading: "Server logs",
        paragraphs: ["The website is served as static files through our hosting and CDN provider, Cloudflare Inc. (EU-US Data Privacy Framework). Like any web server, Cloudflare processes technical request data (e.g. IP address, user agent) to deliver pages and protect against abuse. This is necessary for operating the site (Art. 6(1)(f) GDPR — legitimate interest in a secure, functioning website)."],
      },
      {
        heading: "Links to GitHub and the hosted app",
        paragraphs: ["Buttons and links lead to external services: our source code and discussions on GitHub, and the hosted application at app.eryxon.eu. When you follow those links you leave this website and the privacy policy of the destination applies. The hosted application is a separate product with its own data processing; this policy does not cover it."],
      },
      {
        heading: "Contact",
        paragraphs: ["If you email us, we process your message and contact details only to respond, and keep them no longer than needed to handle your request (Art. 6(1)(b)/(f) GDPR)."],
      },
      {
        heading: "Your rights (GDPR)",
        paragraphs: [
          "You have the right to access, rectification, erasure, restriction, data portability, and to object to processing. You can withdraw consent at any time.",
          "Contact: office@vanenkhuizen.com",
          "Supervisory authority: Österreichische Datenschutzbehörde, dsb.gv.at",
        ],
      },
      {
        heading: "Changes",
        paragraphs: ["This policy may be updated. Changes are published here."],
      },
    ],
    disclaimer: null,
  },
  nl: {
    title: "Privacybeleid — Eryxon Flow",
    description: "Hoe de Eryxon Flow-website met je gegevens omgaat. Geen tracking-cookies, geen analytics van derden. Uitgegeven door Sheet Metal Connect e.U.",
    eyebrow: "Juridisch",
    h1: "Privacybeleid",
    meta: "Laatst bijgewerkt: mei 2026",
    lead: "Sheet Metal Connect e.U. geeft de Eryxon Flow-website uit. Dit beleid gaat over de marketingwebsite die je nu leest. We verzamelen zo min mogelijk en verkopen je gegevens nooit.",
    sections: [
      {
        heading: "Verwerkingsverantwoordelijke",
        rows: [
          { label: "Bedrijf", value: ENTITY.name },
          { label: "Eigenaar", value: ENTITY.owner },
          { label: "Adres", value: `${ENTITY.street}, ${ENTITY.city}` },
          { label: "E-mail", email: ENTITY.email },
        ],
      },
      {
        heading: "Website: geen tracking",
        paragraphs: ["Deze website plaatst geen tracking-cookies en draait geen analytics, advertenties of fingerprinting van derden. We bouwen geen profiel van je op. Een taalvoorkeur kan worden opgeslagen in de local storage van je browser; die verlaat je apparaat nooit."],
      },
      {
        heading: "Serverlogs",
        paragraphs: ["De website wordt als statische bestanden geserveerd via onze hosting- en CDN-provider Cloudflare Inc. (EU-VS Data Privacy Framework). Zoals elke webserver verwerkt Cloudflare technische verzoekgegevens (bijv. IP-adres, user agent) om pagina's te leveren en misbruik tegen te gaan. Dit is noodzakelijk om de site te laten werken (art. 6(1)(f) AVG — gerechtvaardigd belang bij een veilige, werkende website)."],
      },
      {
        heading: "Links naar GitHub en de gehoste app",
        paragraphs: ["Knoppen en links leiden naar externe diensten: onze broncode en discussies op GitHub, en de gehoste applicatie op app.eryxon.eu. Volg je die links, dan verlaat je deze website en geldt het privacybeleid van de bestemming. De gehoste applicatie is een apart product met eigen gegevensverwerking; dit beleid dekt die niet."],
      },
      {
        heading: "Contact",
        paragraphs: ["Mail je ons, dan verwerken we je bericht en contactgegevens alleen om te reageren, en bewaren we ze niet langer dan nodig om je aanvraag af te handelen (art. 6(1)(b)/(f) AVG)."],
      },
      {
        heading: "Je rechten (AVG)",
        paragraphs: [
          "Je hebt recht op inzage, rectificatie, verwijdering, beperking, gegevensoverdraagbaarheid en bezwaar tegen verwerking. Je kunt je toestemming op elk moment intrekken.",
          "Contact: office@vanenkhuizen.com",
          "Toezichthoudende autoriteit: Österreichische Datenschutzbehörde, dsb.gv.at",
        ],
      },
      {
        heading: "Wijzigingen",
        paragraphs: ["Dit beleid kan worden bijgewerkt. Wijzigingen worden hier gepubliceerd."],
      },
    ],
    disclaimer: null,
  },
  de: {
    title: "Datenschutz — Eryxon Flow",
    description: "Wie die Eryxon-Flow-Website mit deinen Daten umgeht. Keine Tracking-Cookies, keine Analytics von Drittanbietern. Herausgegeben von Sheet Metal Connect e.U.",
    eyebrow: "Rechtliches",
    h1: "Datenschutzerklärung",
    meta: "Zuletzt aktualisiert: Mai 2026",
    lead: "Sheet Metal Connect e.U. gibt die Eryxon-Flow-Website heraus. Diese Erklärung betrifft die Marketing-Website, die du gerade liest. Wir erheben so wenig wie möglich und verkaufen deine Daten nie.",
    sections: [
      {
        heading: "Verantwortlicher",
        rows: [
          { label: "Unternehmen", value: ENTITY.name },
          { label: "Inhaber", value: ENTITY.owner },
          { label: "Anschrift", value: `${ENTITY.street}, ${ENTITY.city}` },
          { label: "E-Mail", email: ENTITY.email },
        ],
      },
      {
        heading: "Website: kein Tracking",
        paragraphs: ["Diese Website setzt keine Tracking-Cookies und betreibt keine Analytics, Werbung oder Fingerprinting von Drittanbietern. Wir erstellen kein Profil von dir. Eine Sprachpräferenz kann im Local Storage deines Browsers gespeichert werden; sie verlässt dein Gerät nie."],
      },
      {
        heading: "Server-Logs",
        paragraphs: ["Die Website wird als statische Dateien über unseren Hosting- und CDN-Anbieter Cloudflare Inc. (EU-US Data Privacy Framework) ausgeliefert. Wie jeder Webserver verarbeitet Cloudflare technische Anfragedaten (z. B. IP-Adresse, User-Agent), um Seiten auszuliefern und Missbrauch abzuwehren. Das ist für den Betrieb der Website erforderlich (Art. 6 Abs. 1 lit. f DSGVO — berechtigtes Interesse an einer sicheren, funktionierenden Website)."],
      },
      {
        heading: "Links zu GitHub und zur gehosteten App",
        paragraphs: ["Buttons und Links führen zu externen Diensten: unserem Quellcode und den Diskussionen auf GitHub sowie zur gehosteten Anwendung unter app.eryxon.eu. Folgst du diesen Links, verlässt du diese Website und es gilt die Datenschutzerklärung des Ziels. Die gehostete Anwendung ist ein eigenes Produkt mit eigener Datenverarbeitung; diese Erklärung deckt sie nicht ab."],
      },
      {
        heading: "Kontakt",
        paragraphs: ["Schreibst du uns eine E-Mail, verarbeiten wir deine Nachricht und Kontaktdaten nur zur Beantwortung und bewahren sie nicht länger auf als nötig, um deine Anfrage zu bearbeiten (Art. 6 Abs. 1 lit. b/f DSGVO)."],
      },
      {
        heading: "Deine Rechte (DSGVO)",
        paragraphs: [
          "Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch gegen die Verarbeitung. Du kannst eine Einwilligung jederzeit widerrufen.",
          "Kontakt: office@vanenkhuizen.com",
          "Aufsichtsbehörde: Österreichische Datenschutzbehörde, dsb.gv.at",
        ],
      },
      {
        heading: "Änderungen",
        paragraphs: ["Diese Erklärung kann aktualisiert werden. Änderungen werden hier veröffentlicht."],
      },
    ],
    disclaimer: null,
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

/** Imprint copy with the shared "as is" disclaimer attached. */
export function imprintCopy(locale: Locale): LegalCopy {
  return { ...IMPRINT[locale], disclaimer: DISCLAIMER[locale] };
}
/** Privacy-policy copy with the shared "as is" disclaimer attached. */
export function privacyCopy(locale: Locale): LegalCopy {
  return { ...PRIVACY[locale], disclaimer: DISCLAIMER[locale] };
}
