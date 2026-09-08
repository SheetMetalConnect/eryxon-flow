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
 * (Luke's hard rule), and no pricing figures (kept out of the repo). COSS model:
 *   Hosted demo   — the Community edition, hosted by us, free, 30 days, usage limits.
 *   Community     — self-hosted, source-available (BSL 1.1), single site, free, as-is.
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
}
export interface PlanFeature {
  text: string;
  muted?: boolean;
}

export interface LandingCopy {
  title: string;
  description: string;
  hero: {
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
  pricing: { eyebrow: string; h2: string; lead: string; allLink: string };
  rollout: { eyebrow: string; h2: string; lead: string; cta: string };
  cta: { h2: string; lead: string; ctaPrimary: string; ctaSecondary: string };
}

export interface PricingCopy {
  title: string;
  description: string;
  hero: { eyebrow: string; h1: string; lead: string };
  plans: {
    /** Tier 1 — hosted demo of the Community edition, free, 30 days, usage limits. CTA links to the app. */
    demo: { head: string; name: string; price: string; period: string; sub: string; features: PlanFeature[]; cta: string };
    /** Tier 3 — Community, self-hosted, source-available (BSL 1.1), single site. CTA = guide + consulting. */
    community: { head: string; name: string; price: string; period: string; sub: string; features: PlanFeature[]; ctaGuide: string; ctaConsulting: string };
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
    title: "Eryxon Flow — source-available MES for job shops",
    description:
      "Eryxon Flow tracks jobs through cutting, bending, welding, and assembly, from the tablet on the floor to the planner's desk. Self-host the Community edition free, or try the hosted demo.",
    hero: {
      h1: "Keep a grip on every job, floor to planning.",
      lead: "Track every job through cutting, bending, welding, and assembly. Operators work a tablet at the machine; planners see it the moment it changes. No more spreadsheets and whiteboards.",
      ctaPrimary: "Try it free",
      ctaSecondary: "Self-host it free",
      ctaTertiary: "Read the docs →",
    },
    product: { url: "app.eryxon.eu/operator/work-queue", cell: "● Laser cutting", queueTitle: "Work queue", cards: productCards },
    features: {
      eyebrow: "What you get",
      h2: "Everything a high-mix, low-volume shop needs.",
      lead: "One system, from the tablet at the machine to the planner's dashboard. The full shop-floor core is there from day one.",
      items: [
        { title: "Tablets at the machine", body: "A work queue per cell on a tablet at the machine. Big buttons for gloved hands, with status, due date, and running time you can read from a metre away." },
        { title: "Job & part tracking", body: "Follow every job through cutting, bending, welding, assembly, and finishing — its route across cells, the load on each one, and what's still on the bench." },
        { title: "3D part viewer", body: "Open the part in 3D right in the browser — measure it, pull it apart, nothing to install." },
        { title: "An API your ERP can drive", body: "Push jobs in, get results back, no double entry. Webhooks fire the moment anything changes on the floor." },
        { title: "Source-available", body: "The source is on GitHub — read it, modify it, self-host the Community edition free for a single workshop. Business Source License; each release turns GPL after four years." },
        { title: "One site or many", body: "One workshop per installation, with each tenant's data kept apart. English, Dutch, and German built in." },
      ],
    },
    how: {
      eyebrow: "How it works",
      h2: "From ERP push to planner dashboard in three steps.",
      steps: [
        { n: "01", h: "Bring your jobs in", b: "Push jobs straight from your ERP, drop in a CSV, or connect your planning tool. Eryxon Flow lines up the parts, steps, and routing so the floor always sees the same thing." },
        { n: "02", h: "The floor works the queue", b: "Each cell has its own tablet. Tap a job to start the clock, log good and scrap, flag a problem. The planner sees it straight away." },
        { n: "03", h: "Planners watch the load", b: "One dashboard shows the load on every cell, which jobs are running tight, and what's been flagged. When a cell is over capacity, you see it — not at five to five on Friday." },
      ],
    },
    api: {
      eyebrow: "REST + Webhooks",
      h2: "An API your ERP can actually talk to.",
      lead: "Push jobs in, pull results out, and let webhooks tell your other systems the moment work changes. Built for real ERP integration.",
      bullets: ["Scoped API keys with bearer-token auth", "Safe to retry — the same write only lands once", "A webhook for every change on the floor", "MCP server for AI assistants"],
    },
    pricing: {
      eyebrow: "Pricing",
      h2: "Three ways to run it.",
      lead: "Self-host the Community edition free, or try the hosted 30-day demo.",
      allLink: "See full pricing →",
    },
    rollout: {
      eyebrow: "Hosted & support",
      h2: "Rather not run it yourself?",
      lead: "Need help with rollout, an ERP integration or a multi-site licence? Get in touch and we scope it for your shop.",
      cta: "Contact sales",
    },
    cta: {
      h2: "Try it on your own shop floor.",
      lead: "Spin up the hosted demo in minutes, or pull the Docker image and self-host the Community edition free.",
      ctaPrimary: "Try the demo",
      ctaSecondary: "Read the self-host guide",
    },
  },

  nl: {
    title: "Eryxon Flow — source-available MES voor de metaalbewerking",
    description:
      "Eryxon Flow houdt je orders bij door snijden, kanten, lassen en assemblage — van de tablet op de vloer tot het bureau van de planner. Host de Community-editie gratis zelf, of probeer de gehoste demo.",
    hero: {
      h1: "Grip op je orders, van de vloer tot de planning.",
      lead: "Eryxon Flow volgt elke order door snijden, kanten, lassen en assemblage. De operator werkt op een tablet aan de machine, de planner ziet het meteen op zijn scherm. De broncode staat op GitHub. Geen Excel, geen whiteboard.",
      ctaPrimary: "Gratis uitproberen",
      ctaSecondary: "Zelf hosten, gratis",
      ctaTertiary: "Naar de docs →",
    },
    product: { url: "app.eryxon.eu/operator/work-queue", cell: "● Lasersnijden", queueTitle: "Werkwachtrij", cards: productCards },
    features: {
      eyebrow: "Wat je krijgt",
      h2: "Alles wat een maakbedrijf met enkelstuks en kleine series nodig heeft.",
      lead: "Geen prijs per gebruiker in de Community-editie. De volledige werkvloer-kern vanaf dag één.",
      items: [
        { title: "Tablets aan de machine", body: "Een wachtrij per cel, zoals een kanbanbord. Knoppen van 56 pixels, dus je raakt ze met werkhandschoenen. Status, deadline en doorlooptijd lees je van een meter afstand af." },
        { title: "Order- en onderdeelvolging", body: "Je ziet elke order door snijden, kanten, lassen, assemblage en afwerking heen. De route per cel, WIP-limieten en hoeveel werk er nog op de plank ligt." },
        { title: "3D STEP-viewer", body: "CAD in de browser, niks te installeren. Meten en exploded views, direct in het orderscherm van de operator." },
        { title: "REST API en webhooks", body: "Filteren, pagineren, zoeken en een webhook bij elke stap. Gebouwd om je ERP en de werkvloer aan elkaar te knopen, niet om alles met de hand in te kloppen." },
        { title: "Source-available", body: "De broncode staat op GitHub — inzien, aanpassen en de Community-editie gratis zelf hosten voor één werkplaats. Business Source License; elke release wordt na vier jaar GPL." },
        { title: "Eén locatie of meer", body: "Eén werkplaats per installatie, met de data van elke tenant apart. NL, DE en EN zitten er standaard in." },
      ],
    },
    how: {
      eyebrow: "Hoe het werkt",
      h2: "Van order in het ERP naar de planning, in drie stappen.",
      steps: [
        { n: "01", h: "Zet je orders erin", b: "Via de REST API vanuit je ERP, met een CSV, of via een planningskoppeling. Eryxon Flow trekt onderdelen, bewerkingen en routes recht, zodat de vloer altijd dezelfde opbouw ziet, wat er bovenstrooms ook staat." },
        { n: "02", h: "De vloer werkt de wachtrij af", b: "Elke cel heeft zijn eigen tablet. Tik op een bewerking, start de timer, vul goed- en afkeuraantallen in, meld een probleem. De planner ziet het meteen, zonder de pagina te verversen." },
        { n: "03", h: "De planner houdt de capaciteit in de gaten", b: "Eén scherm met de WIP-limiet per cel, welke orders krap zitten en een lijst met meldingen. Zit een cel boven de 100 procent, dan zie je dat. Geen verrassing meer op vrijdag om vijf voor vijf." },
      ],
    },
    api: {
      eyebrow: "REST + Webhooks",
      h2: "Een API waar je ERP echt mee uit de voeten kan.",
      lead: "Endpoints met filteren, pagineren, zoeken en een webhook per stap. Bedoeld om je ERP en de werkvloer te koppelen.",
      bullets: ["Bearer-token met afgebakende API-keys", "Schrijfacties zijn idempotent, met je eigen sleutel", "Een webhook bij elke stap in de order", "MCP-server voor AI-assistenten"],
    },
    pricing: {
      eyebrow: "Prijzen",
      h2: "Drie manieren om het te draaien.",
      lead: "Host de Community-editie gratis zelf, of probeer de gehoste demo.",
      allLink: "Bekijk alle prijzen →",
    },
    rollout: {
      eyebrow: "Hosting & support",
      h2: "Liever niet zelf draaien?",
      lead: "Hulp nodig bij de uitrol, een ERP-koppeling of een licentie voor meerdere locaties? Neem contact op, dan maken we het voor jouw bedrijf op maat.",
      cta: "Neem contact op",
    },
    cta: {
      h2: "Probeer het op je eigen werkvloer.",
      lead: "Start binnen enkele minuten met de gehoste demo, of pak de Docker-image en host de Community-editie gratis zelf.",
      ctaPrimary: "Gratis uitproberen",
      ctaSecondary: "Lees de zelf-hosten-gids",
    },
  },

  de: {
    title: "Eryxon Flow — source-available MES für die Metallbearbeitung",
    description:
      "Eryxon Flow verfolgt Aufträge durch Schneiden, Kanten, Schweißen und Montage, vom Tablet in der Werkstatt bis zum Schreibtisch des Planers. Hoste die Community-Edition kostenlos selbst oder teste die gehostete Demo.",
    hero: {
      h1: "Jeden Auftrag im Griff, von der Werkstatt bis zur Planung.",
      lead: "Eryxon Flow verfolgt jeden Auftrag durch Schneiden, Kanten, Schweißen und Montage. Der Werker arbeitet am Tablet an der Maschine, der Planer sieht es sofort auf seinem Bildschirm. Der Quellcode liegt auf GitHub. Kein Excel, kein Whiteboard.",
      ctaPrimary: "Kostenlos testen",
      ctaSecondary: "Selbst hosten, kostenlos",
      ctaTertiary: "Zur Doku →",
    },
    product: { url: "app.eryxon.eu/operator/work-queue", cell: "● Laserschneiden", queueTitle: "Arbeitsliste", cards: productCards },
    features: {
      eyebrow: "Was du bekommst",
      h2: "Alles, was ein Einzel- und Kleinserienbetrieb braucht.",
      lead: "Kein Preis pro Nutzer in der Community-Edition. Der volle Werkstatt-Kern ab Tag eins.",
      items: [
        { title: "Tablets an der Maschine", body: "Eine Arbeitsliste je Zelle, wie ein Kanban-Board. Schaltflächen mit 56 Pixeln, also auch mit Arbeitshandschuhen bedienbar. Status, Termin und Laufzeit liest du aus einem Meter Entfernung ab." },
        { title: "Auftrags- und Teileverfolgung", body: "Du siehst jeden Auftrag durch Schneiden, Kanten, Schweißen, Montage und Finish. Die Route je Zelle, WIP-Limits und wie viel Arbeit noch ansteht." },
        { title: "3D-STEP-Viewer", body: "CAD im Browser, nichts zu installieren. Messen und Explosionsansichten, direkt im Auftragsfenster des Werkers." },
        { title: "REST-API und Webhooks", body: "Filtern, Paginieren, Suchen und ein Webhook bei jedem Schritt. Gebaut, um dein ERP und die Werkstatt zu verbinden, nicht um alles von Hand einzutippen." },
        { title: "Source-available", body: "Der Quellcode liegt auf GitHub — einsehen, anpassen und die Community-Edition kostenlos selbst hosten, für eine Werkstatt. Business Source License; jede Version wird nach vier Jahren GPL." },
        { title: "Ein Standort oder viele", body: "Eine Werkstatt pro Installation, die Daten jedes Mandanten getrennt. NL, DE und EN ab Werk." },
      ],
    },
    how: {
      eyebrow: "So funktioniert es",
      h2: "Vom Auftrag im ERP bis zur Planung, in drei Schritten.",
      steps: [
        { n: "01", h: "Aufträge einspielen", b: "Über die REST-API aus deinem ERP, per CSV oder über eine Planungsanbindung. Eryxon Flow zieht Teile, Arbeitsgänge und Routen gerade, sodass die Werkstatt immer denselben Aufbau sieht, egal was vorgelagert steht." },
        { n: "02", h: "Die Werkstatt arbeitet die Liste ab", b: "Jede Zelle hat ihr eigenes Tablet. Arbeitsgang antippen, Timer starten, Gut- und Ausschussmengen erfassen, Probleme melden. Der Planer sieht es sofort, ohne die Seite neu zu laden." },
        { n: "03", h: "Der Planer behält die Kapazität im Blick", b: "Ein Bildschirm mit dem WIP-Limit je Zelle, welche Aufträge knapp sind und einer Meldungsliste. Liegt eine Zelle über 100 Prozent, siehst du das. Keine Überraschung mehr am Freitag um kurz vor Feierabend." },
      ],
    },
    api: {
      eyebrow: "REST + Webhooks",
      h2: "Eine API, mit der dein ERP wirklich sprechen kann.",
      lead: "Endpunkte mit Filterung, Paginierung, Suche und Webhook-Versand. Gebaut für ERP-zu-MES-Synchronisierung.",
      bullets: ["Bearer-Token-Auth mit scoped API-Keys", "Idempotente Writes mit eigenen Schlüsseln", "Webhooks für jedes Ereignis", "MCP-Server für KI-Assistenten"],
    },
    pricing: {
      eyebrow: "Preise",
      h2: "Drei Wege, es zu betreiben.",
      lead: "Hoste die Community-Edition kostenlos selbst oder teste die gehostete Demo.",
      allLink: "Alle Preise ansehen →",
    },
    rollout: {
      eyebrow: "Hosting & Support",
      h2: "Lieber nicht selbst betreiben?",
      lead: "Hilfe bei der Einführung, einer ERP-Anbindung oder einer Lizenz für mehrere Standorte? Melde dich, dann schneiden wir es auf deinen Betrieb zu.",
      cta: "Kontakt aufnehmen",
    },
    cta: {
      h2: "Teste es auf deiner eigenen Werkstatt.",
      lead: "Starte in wenigen Minuten mit der gehosteten Demo, oder zieh das Docker-Image und hoste die Community-Edition kostenlos selbst.",
      ctaPrimary: "Kostenlos testen",
      ctaSecondary: "Self-Hosting-Anleitung lesen",
    },
  },
};

const PRICING: Record<Locale, PricingCopy> = {
  en: {
    title: "Pricing — Eryxon Flow",
    description: "Self-host the Community edition free, or try the hosted 30-day demo.",
    hero: { eyebrow: "Pricing", h1: "Community is free.", lead: "Self-host the Community edition free for a single workshop, or try the hosted 30-day demo. Running several sites, or offering it as a service, needs a commercial licence; get in touch." },
    plans: {
      demo: { head: "Hosted demo", name: "Hosted demo", price: "Free", period: "· 30 days", sub: "A hosted Community instance to try on your own shop floor. No install, no card. Usage limits apply during the demo.", cta: "Start free demo",
        features: [{ text: "Hosted by us, runs in minutes" }, { text: "The Community edition, 30-day demo" }, { text: "Up to 100 jobs and 500 parts per month" }, { text: "2 GB storage, 100 API requests per day" }, { text: "The full shop-floor core" }] },
      community: { head: "Community · self-hosted", name: "Community", price: "Free", period: "· single site", sub: "Run it yourself on your own infrastructure, for a single workshop. Source-available under the BSL.", ctaGuide: "Read the self-hosting guide", ctaConsulting: "Get help with setup",
        features: [{ text: "Source on GitHub — read, modify, self-host" }, { text: "One production site, no seat limits" }, { text: "The full shop-floor core" }, { text: "REST API and webhooks" }, { text: "Provided as-is, community support" }] },
    },
  },
  nl: {
    title: "Prijzen — Eryxon Flow",
    description: "Host de Community-editie gratis zelf, of probeer de gehoste demo van 30 dagen.",
    hero: { eyebrow: "Prijzen", h1: "Community is gratis.", lead: "Host de Community-editie gratis voor één werkplaats, of probeer de gehoste demo van 30 dagen. Meerdere locaties of aanbieden als dienst vraagt een commerciële licentie; neem contact op." },
    plans: {
      demo: { head: "Gehoste demo", name: "Gehoste demo", price: "Gratis", period: "· 30 dagen", sub: "Een gehoste Community-instance om op je eigen werkvloer uit te proberen. Niks installeren, geen creditcard. Tijdens de demo gelden gebruikslimieten.", cta: "Gratis uitproberen",
        features: [{ text: "Door ons gehost, binnen enkele minuten klaar" }, { text: "De Community-editie, demo van 30 dagen" }, { text: "Tot 100 orders en 500 onderdelen per maand" }, { text: "2 GB opslag, 100 API-verzoeken per dag" }, { text: "De volledige werkvloer-kern" }] },
      community: { head: "Community · zelf gehost", name: "Community", price: "Gratis", period: "· één locatie", sub: "Draai het zelf op je eigen infrastructuur, voor één werkplaats. Source-available onder de BSL.", ctaGuide: "Lees de zelf-hosten-gids", ctaConsulting: "Hulp bij de installatie",
        features: [{ text: "Broncode op GitHub — inzien, aanpassen, zelf hosten" }, { text: "Eén productielocatie, geen limiet op gebruikers" }, { text: "De volledige werkvloer-kern" }, { text: "REST API en webhooks" }, { text: "Geleverd as-is, community-support" }] },
    },
  },
  de: {
    title: "Preise — Eryxon Flow",
    description: "Hoste die Community-Edition kostenlos selbst oder teste die gehostete 30-Tage-Demo.",
    hero: { eyebrow: "Preise", h1: "Community ist kostenlos.", lead: "Hoste die Community-Edition kostenlos für eine Werkstatt oder teste die gehostete 30-Tage-Demo. Mehrere Standorte oder das Anbieten als Dienst brauchen eine kommerzielle Lizenz; melde dich." },
    plans: {
      demo: { head: "Gehostete Demo", name: "Gehostete Demo", price: "Kostenlos", period: "· 30 Tage", sub: "Eine gehostete Community-Instanz zum Testen auf deiner eigenen Werkstatt. Keine Installation, keine Karte. Während der Demo gelten Nutzungslimits.", cta: "Kostenlos testen",
        features: [{ text: "Von uns gehostet, in wenigen Minuten startklar" }, { text: "Die Community-Edition, 30-Tage-Demo" }, { text: "Bis zu 100 Aufträge und 500 Teile pro Monat" }, { text: "2 GB Speicher, 100 API-Anfragen pro Tag" }, { text: "Der volle Werkstatt-Kern" }] },
      community: { head: "Community · selbst gehostet", name: "Community", price: "Kostenlos", period: "· ein Standort", sub: "Betreibe es selbst auf deiner eigenen Infrastruktur, für eine Werkstatt. Source-available unter der BSL.", ctaGuide: "Self-Hosting-Anleitung lesen", ctaConsulting: "Hilfe bei der Einrichtung",
        features: [{ text: "Quellcode auf GitHub — einsehen, anpassen, selbst hosten" }, { text: "Ein Produktionsstandort, kein Nutzerlimit" }, { text: "Der volle Werkstatt-Kern" }, { text: "REST-API und Webhooks" }, { text: "Bereitgestellt wie besehen, Community-Support" }] },
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
 * Voice: kit voice — calm, factual, short. The "AS IS" / no-warranty / use-at-your-own-
 * risk disclaimer is surfaced prominently on BOTH pages via a dedicated block, matching the licence
 * that actually ships (LICENSE, Business Source License 1.1).
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

/** The shared "as is / source-available / use at your own risk" disclaimer block. */
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

const LICENSE_HREF = "https://github.com/SheetMetalConnect/eryxon-flow/blob/main/LICENSE";

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
        paragraphs: ["IT consulting and services for the metalworking industry. Eryxon Flow is a source-available manufacturing execution system published by Sheet Metal Connect e.U."],
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
        paragraphs: ["IT-advies en dienstverlening voor de metaalverwerkende industrie. Eryxon Flow is een source-available manufacturing execution system, uitgegeven door Sheet Metal Connect e.U."],
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
        paragraphs: ["IT-Beratung und Dienstleistungen für die metallverarbeitende Industrie. Eryxon Flow ist ein source-available Manufacturing-Execution-System, herausgegeben von Sheet Metal Connect e.U."],
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
      "Eryxon Flow is source-available software, licensed under the Business Source License 1.1. It is provided on an “AS IS” BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. You use it at your own risk.",
      "You are responsible for evaluating whether the software is fit for your shop floor, for backing up your data, and for running it safely in production. To the extent permitted by law, Sheet Metal Connect e.U. accepts no liability for any damages arising from the use of, or inability to use, the software. The full terms are set out in the Business Source License 1.1.",
    ],
    licenseLabel: "Read the Business Source License",
    licenseHref: LICENSE_HREF,
  },
  nl: {
    heading: "Software-disclaimer — geleverd “as is”",
    paragraphs: [
      "Eryxon Flow is source-available software onder de Business Source License 1.1. Het wordt geleverd “AS IS” — zonder enige garantie of voorwaarde, expliciet noch impliciet. Je gebruikt het op eigen risico.",
      "Je bent zelf verantwoordelijk voor het beoordelen of de software geschikt is voor je werkvloer, voor het maken van back-ups en voor veilig gebruik in productie. Voor zover wettelijk toegestaan aanvaardt Sheet Metal Connect e.U. geen aansprakelijkheid voor schade die voortvloeit uit het gebruik of het niet kunnen gebruiken van de software. De volledige voorwaarden staan in de Business Source License 1.1.",
    ],
    licenseLabel: "Lees de Business Source License",
    licenseHref: LICENSE_HREF,
  },
  de: {
    heading: "Software-Haftungsausschluss — bereitgestellt “wie besehen”",
    paragraphs: [
      "Eryxon Flow ist source-available Software unter der Business Source License 1.1. Sie wird “WIE BESEHEN” (“AS IS”) bereitgestellt — ohne jegliche Garantie oder Gewährleistung, weder ausdrücklich noch stillschweigend. Die Nutzung erfolgt auf eigenes Risiko.",
      "Du bist selbst dafür verantwortlich zu prüfen, ob die Software für deinen Betrieb geeignet ist, deine Daten zu sichern und sie sicher im Produktivbetrieb einzusetzen. Soweit gesetzlich zulässig übernimmt Sheet Metal Connect e.U. keine Haftung für Schäden, die aus der Nutzung oder Nichtnutzbarkeit der Software entstehen. Die vollständigen Bedingungen ergeben sich aus der Business Source License 1.1.",
    ],
    licenseLabel: "Business Source License lesen",
    licenseHref: LICENSE_HREF,
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

/** Imprint copy with the shared "as is" disclaimer attached. */
export function imprintCopy(locale: Locale): LegalCopy {
  return { ...IMPRINT[locale], disclaimer: DISCLAIMER[locale] };
}
/** Privacy-policy copy with the shared "as is" disclaimer attached. */
export function privacyCopy(locale: Locale): LegalCopy {
  return { ...PRIVACY[locale], disclaimer: DISCLAIMER[locale] };
}
