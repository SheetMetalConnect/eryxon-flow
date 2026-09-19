/*
 * Marketing copy for the English, Dutch, and German landing pages.
 *
 * This is the single source of truth for the localized landing and pricing sections.
 *
 * Voice: calm, practical, short, and direct. Do not add testimonials, performance claims,
 * customer names, or unapproved pricing. The operating model is:
 *   Hosted trial — free for 30 days, usage limits.
 *   Premium      — hosted production, from EUR 300 per site/month, support included.
 *   Community    — self-hosted, source-available (BSL 1.1), single site, free, as-is.
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
  api: { eyebrow: string; h2: string; lead: string; bullets: string[]; cta: string };
  pricing: { eyebrow: string; h2: string; lead: string; allLink: string };
  cta: { h2: string; lead: string; ctaPrimary: string; ctaSecondary: string };
}

export interface PricingCopy {
  title: string;
  description: string;
  hero: { eyebrow: string; h1: string; lead: string };
  plans: {
    /** Hosted demo of the Community edition, free for 30 days with usage limits. */
    demo: { head: string; name: string; price: string; period: string; sub: string; features: PlanFeature[]; cta: string };
    /** Hosted production plan, priced per site with support included. */
    premium: { head: string; name: string; price: string; period: string; sub: string; features: PlanFeature[]; cta: string };
    /** Community, self-hosted, source-available (BSL 1.1), single site. */
    community: { head: string; name: string; price: string; period: string; sub: string; features: PlanFeature[]; ctaGuide: string; ctaConsulting: string };
  };
}

const productCards: Record<Locale, LandingCopy["product"]["cards"]> = {
  en: [
    { wo: "WO-4218", op: "Laser cut", meta: "PN-902-A · Stainless 304", tag: "TODAY", tagCls: "today", stripe: "active" },
    { wo: "WO-4225", op: "TIG weld assembly", meta: "PN-1021 · Stainless 304", tag: "SOON", tagCls: "soon", stripe: "pending" },
    { wo: "WO-4221", op: "Press brake bend", meta: "PN-887 · Mild steel", tag: "OVERDUE", tagCls: "overdue", stripe: "on-hold" },
  ],
  nl: [
    { wo: "WO-4218", op: "Lasersnijden", meta: "PN-902-A · RVS 304", tag: "VANDAAG", tagCls: "today", stripe: "active" },
    { wo: "WO-4225", op: "TIG-lassen", meta: "PN-1021 · RVS 304", tag: "BINNENKORT", tagCls: "soon", stripe: "pending" },
    { wo: "WO-4221", op: "Kanten", meta: "PN-887 · Constructiestaal", tag: "TE LAAT", tagCls: "overdue", stripe: "on-hold" },
  ],
  de: [
    { wo: "WO-4218", op: "Laserschneiden", meta: "PN-902-A · Edelstahl 304", tag: "HEUTE", tagCls: "today", stripe: "active" },
    { wo: "WO-4225", op: "WIG-Schweißen", meta: "PN-1021 · Edelstahl 304", tag: "BALD", tagCls: "soon", stripe: "pending" },
    { wo: "WO-4221", op: "Abkanten", meta: "PN-887 · Baustahl", tag: "ÜBERFÄLLIG", tagCls: "overdue", stripe: "on-hold" },
  ],
};

const LANDING: Record<Locale, LandingCopy> = {
  en: {
    title: "Eryxon Flow — shop-floor control for metal fabrication",
    description:
      "Track high-mix jobs through cutting, bending, welding and assembly. Operators work from clear cell queues while planners see progress, load and problems as they happen.",
    hero: {
      h1: "Keep a grip on every job, from shop floor to planning.",
      lead: "Track high-mix jobs through cutting, bending, welding and assembly. Operators see what is ready at their cell; planners see what is moving and where work is waiting.",
      ctaPrimary: "Try it hosted",
      ctaSecondary: "Self-host it free",
      ctaTertiary: "Read the docs →",
    },
    product: { url: "app.eryxon.eu/operator/work-queue", cell: "● Laser cutting", queueTitle: "Work queue", cards: productCards.en },
    features: {
      eyebrow: "Built for the shop floor",
      h2: "Operators know what is next. Planners see where work is stuck.",
      lead: "Every cell works from a clear queue while planning keeps sight of progress and load.",
      items: [
        { title: "Queue by cell", body: "Ready, running and overdue work stays visible on the tablet at each cell." },
        { title: "Routing and WIP", body: "Completed steps release the next operation; WIP limits show where work is building up." },
        { title: "Production reporting", body: "Record time, good quantity, scrap, standstills and issues against the operation." },
        { title: "Files and locations", body: "Open drawings and STEP models, and see where each part is now and where it goes next." },
        { title: "Planning overview", body: "See load, due dates, active work and problems across the shop." },
        { title: "Source-available", body: "Run one workshop yourself under BSL 1.1, or choose a hosted plan." },
      ],
    },
    how: {
      eyebrow: "How it works",
      h2: "From planned work to a completed operation.",
      steps: [
        { n: "01", h: "Set up the work", b: "Create jobs, parts and routings in the app, from a CSV import or through the API." },
        { n: "02", h: "Run it at the cell", b: "Operators start work, report output and scrap, flag issues and mark operations complete." },
        { n: "03", h: "Plan from the current status", b: "Progress, load and problems update as the work moves through the shop." },
      ],
    },
    api: {
      eyebrow: "Integrations",
      h2: "Connect what already runs your shop.",
      lead: "Bring work in through REST or CSV. Send production changes back with signed webhooks. MCP access is optional.",
      bullets: [
        "REST API for jobs, parts and routings",
        "Signed webhooks for production changes",
        "Optional MCP access under the same production rules",
      ],
      cta: "Read the integration docs →",
    },
    pricing: {
      eyebrow: "Pricing",
      h2: "Three ways to run it.",
      lead: "Start with the free hosted trial, choose Premium for production, or self-host the Community edition.",
      allLink: "See full pricing →",
    },
    cta: {
      h2: "Try it with your own production flow.",
      lead: "Start with one routing and one cell in the hosted trial.",
      ctaPrimary: "Try it hosted",
      ctaSecondary: "Read the self-host guide",
    },
  },

  nl: {
    title: "Eryxon Flow — werkvloerbesturing voor de metaalbewerking",
    description:
      "Volg orders door snijden, kanten, lassen en assemblage. Operators werken vanuit een duidelijke wachtrij per cel; planners zien voortgang, belasting en problemen zodra ze ontstaan.",
    hero: {
      h1: "Grip op je orders, van werkvloer tot planning.",
      lead: "Volg orders door snijden, kanten, lassen en assemblage. Operators zien wat er klaarstaat; planners zien meteen wat loopt en waar werk wacht.",
      ctaPrimary: "Probeer de gehoste versie",
      ctaSecondary: "Gratis zelf hosten",
      ctaTertiary: "Lees de docs →",
    },
    product: { url: "app.eryxon.eu/operator/work-queue", cell: "● Lasersnijden", queueTitle: "Werkrij", cards: productCards.nl },
    features: {
      eyebrow: "Gemaakt voor de werkvloer",
      h2: "Operators weten wat volgt. Planners zien waar werk vastloopt.",
      lead: "Elke cel werkt vanuit een duidelijke wachtrij, terwijl de planning zicht houdt op voortgang en belasting.",
      items: [
        { title: "Werkwachtrij per cel", body: "Klaarstaand, lopend en te laat werk blijft zichtbaar op de tablet bij de cel." },
        { title: "Routing en WIP", body: "Afgeronde stappen geven de volgende bewerking vrij; WIP-limieten tonen waar werk zich opstapelt." },
        { title: "Productie melden", body: "Registreer tijd, goede aantallen, afkeur, stilstand en problemen bij de bewerking." },
        { title: "Bestanden en locaties", body: "Open tekeningen en STEP-modellen en zie waar onderdelen liggen en waar ze hierna heen gaan." },
        { title: "Overzicht voor planning", body: "Zie belasting, leverdata, lopend werk en problemen voor de hele werkplaats." },
        { title: "Source-available", body: "Host één werkplaats zelf onder BSL 1.1, of kies een gehost abonnement." },
      ],
    },
    how: {
      eyebrow: "Zo werkt het",
      h2: "Van ingepland werk naar een gereedgemelde bewerking.",
      steps: [
        { n: "01", h: "Zet het werk klaar", b: "Maak orders, onderdelen en routings aan in de app, via CSV of via de API." },
        { n: "02", h: "Werk het uit bij de cel", b: "Operators starten werk, melden output en afkeur, markeren problemen en melden bewerkingen gereed." },
        { n: "03", h: "Plan met de actuele status", b: "Voortgang, belasting en problemen worden bijgewerkt terwijl het werk door de werkplaats gaat." },
      ],
    },
    api: {
      eyebrow: "Koppelingen",
      h2: "Koppel aan wat al in je bedrijf draait.",
      lead: "Zet werk klaar via REST of CSV. Stuur productiewijzigingen terug met ondertekende webhooks. MCP-toegang is optioneel.",
      bullets: [
        "REST-API voor orders, onderdelen en routings",
        "Ondertekende webhooks voor productiewijzigingen",
        "Optionele MCP-toegang onder dezelfde productieregels",
      ],
      cta: "Lees de integratiedocumentatie →",
    },
    pricing: {
      eyebrow: "Prijzen",
      h2: "Drie manieren om Eryxon Flow te draaien.",
      lead: "Start met de gratis gehoste proefomgeving, kies Premium voor productie of host de Community-editie zelf.",
      allLink: "Alle prijzen →",
    },
    cta: {
      h2: "Probeer het met je eigen productiestroom.",
      lead: "Begin in de gehoste proefomgeving met één routing en één cel.",
      ctaPrimary: "Probeer de gehoste versie",
      ctaSecondary: "Lees de zelfhost-handleiding",
    },
  },

  de: {
    title: "Eryxon Flow — Fertigungssteuerung für Metallbetriebe",
    description:
      "Aufträge durch Schneiden, Abkanten, Schweißen und Montage verfolgen. Bediener arbeiten mit klaren Arbeitsvorräten; die Planung sieht Fortschritt, Auslastung und Probleme sofort.",
    hero: {
      h1: "Jeden Auftrag im Griff, von der Werkstatt bis zur Planung.",
      lead: "Verfolgen Sie Aufträge durch Schneiden, Abkanten, Schweißen und Montage. Bediener sehen, was bereitsteht; die Planung sieht sofort, was läuft und wo Arbeit wartet.",
      ctaPrimary: "Gehostet ausprobieren",
      ctaSecondary: "Kostenlos selbst hosten",
      ctaTertiary: "Dokumentation lesen →",
    },
    product: { url: "app.eryxon.eu/operator/work-queue", cell: "● Laserschneiden", queueTitle: "Arbeitsvorrat", cards: productCards.de },
    features: {
      eyebrow: "Für die Werkstatt gemacht",
      h2: "Bediener wissen, was als Nächstes kommt. Die Planung sieht, wo es stockt.",
      lead: "Jede Zelle arbeitet mit einem klaren Arbeitsvorrat; die Planung behält Fortschritt und Auslastung im Blick.",
      items: [
        { title: "Arbeitsvorrat je Zelle", body: "Bereitstehende, laufende und überfällige Arbeit bleibt am Tablet der Zelle sichtbar." },
        { title: "Routing und WIP", body: "Abgeschlossene Schritte geben den nächsten Arbeitsgang frei; WIP-Grenzen zeigen, wo sich Arbeit staut." },
        { title: "Produktion melden", body: "Zeit, Gutmenge, Ausschuss, Stillstände und Probleme werden am Arbeitsgang erfasst." },
        { title: "Dateien und Standorte", body: "Zeichnungen und STEP-Modelle öffnen und sehen, wo Teile liegen und wohin sie als Nächstes gehen." },
        { title: "Übersicht für die Planung", body: "Auslastung, Termine, laufende Arbeit und Probleme in der gesamten Werkstatt sehen." },
        { title: "Source-available", body: "Eine Werkstatt selbst unter BSL 1.1 betreiben oder einen gehosteten Tarif wählen." },
      ],
    },
    how: {
      eyebrow: "So funktioniert es",
      h2: "Von geplanter Arbeit zum abgeschlossenen Arbeitsgang.",
      steps: [
        { n: "01", h: "Arbeit vorbereiten", b: "Aufträge, Teile und Routings in der App, per CSV oder über die API anlegen." },
        { n: "02", h: "In der Zelle ausführen", b: "Arbeit starten, Mengen und Ausschuss melden, Probleme markieren und Arbeitsgänge abschließen." },
        { n: "03", h: "Mit aktuellem Stand planen", b: "Fortschritt, Auslastung und Probleme werden aktualisiert, während die Arbeit durch die Werkstatt läuft." },
      ],
    },
    api: {
      eyebrow: "Anbindungen",
      h2: "An das anbinden, was im Betrieb bereits läuft.",
      lead: "Arbeit per REST oder CSV übernehmen. Produktionsänderungen mit signierten Webhooks zurückmelden. MCP-Zugang ist optional.",
      bullets: [
        "REST-API für Aufträge, Teile und Routings",
        "Signierte Webhooks für Produktionsänderungen",
        "Optionaler MCP-Zugang unter denselben Produktionsregeln",
      ],
      cta: "Integrationsdokumentation lesen →",
    },
    pricing: {
      eyebrow: "Preise",
      h2: "Drei Wege, Eryxon Flow zu betreiben.",
      lead: "Kostenlos gehostet testen, Premium für den Produktivbetrieb wählen oder die Community-Edition selbst betreiben.",
      allLink: "Alle Preise →",
    },
    cta: {
      h2: "Mit dem eigenen Produktionsfluss testen.",
      lead: "Starten Sie in der gehosteten Testumgebung mit einem Routing und einer Zelle.",
      ctaPrimary: "Gehostet ausprobieren",
      ctaSecondary: "Selbsthosting-Anleitung lesen",
    },
  },
};

const PRICING: Record<Locale, PricingCopy> = {
  en: {
    title: "Pricing — Eryxon Flow",
    description: "Try Eryxon Flow free, choose Premium from €300 per site each month, or self-host Community.",
    hero: { eyebrow: "Pricing", h1: "Choose how you want to run Eryxon Flow.", lead: "Start in the free hosted trial, choose Premium for production, or self-host the Community edition." },
    plans: {
      demo: { head: "Hosted trial", name: "Hosted trial", price: "Free", period: "· 30 days", sub: "A ready-to-use test environment. No installation or payment card.", cta: "Start free trial",
        features: [{ text: "Full shop-floor workflow" }, { text: "Imports and integration access" }, { text: "Trial usage limits apply" }] },
      premium: { head: "Premium · hosted", name: "Premium", price: "From €300", period: "· site / month", sub: "A hosted production environment with support included.", cta: "Request a quote",
        features: [{ text: "Unlimited users" }, { text: "Support included" }, { text: "Imports and integration access" }] },
      community: { head: "Community · self-hosted", name: "Community", price: "Free", period: "· one site", sub: "Run Eryxon Flow on your own infrastructure under BSL 1.1.", ctaGuide: "Read the self-hosting guide", ctaConsulting: "Get help with setup",
        features: [{ text: "One production site, unlimited users" }, { text: "Run and maintain it yourself" }, { text: "Optional one-off setup packages" }] },
    },
  },
  nl: {
    title: "Prijzen — Eryxon Flow",
    description: "Probeer Eryxon Flow gratis, kies Premium vanaf € 300 per locatie per maand of host Community zelf.",
    hero: { eyebrow: "Prijzen", h1: "Kies hoe je Eryxon Flow wilt draaien.", lead: "Start in de gratis gehoste proefomgeving, kies Premium voor productie of host de Community-editie zelf." },
    plans: {
      demo: { head: "Gehoste proefomgeving", name: "Gehoste proefomgeving", price: "Gratis", period: "· 30 dagen", sub: "Een direct bruikbare testomgeving. Geen installatie of creditcard nodig.", cta: "Start gratis",
        features: [{ text: "Volledige werkvloerfuncties" }, { text: "Import en koppelingen" }, { text: "Gebruikslimieten tijdens de proefperiode" }] },
      premium: { head: "Premium · gehost", name: "Premium", price: "Vanaf € 300", period: "· locatie / maand", sub: "Een gehoste productieomgeving met ondersteuning inbegrepen.", cta: "Vraag een offerte aan",
        features: [{ text: "Onbeperkt aantal gebruikers" }, { text: "Ondersteuning inbegrepen" }, { text: "Import en koppelingen" }] },
      community: { head: "Community · zelf gehost", name: "Community", price: "Gratis", period: "· één locatie", sub: "Draai Eryxon Flow op je eigen infrastructuur onder BSL 1.1.", ctaGuide: "Lees de zelfhosthandleiding", ctaConsulting: "Hulp bij de installatie",
        features: [{ text: "Eén productielocatie, onbeperkt gebruikers" }, { text: "Zelf beheren en onderhouden" }, { text: "Optionele eenmalige installatiepakketten" }] },
    },
  },
  de: {
    title: "Preise — Eryxon Flow",
    description: "Eryxon Flow kostenlos testen, Premium ab 300 € pro Standort und Monat wählen oder Community selbst hosten.",
    hero: { eyebrow: "Preise", h1: "Wählen Sie, wie Sie Eryxon Flow betreiben.", lead: "Starten Sie in der kostenlosen Testumgebung, wählen Sie Premium für den Produktivbetrieb oder betreiben Sie die Community-Edition selbst." },
    plans: {
      demo: { head: "Gehostete Testumgebung", name: "Gehostete Testumgebung", price: "Kostenlos", period: "· 30 Tage", sub: "Eine sofort nutzbare Testumgebung. Keine Installation oder Kreditkarte nötig.", cta: "Kostenlos starten",
        features: [{ text: "Vollständiger Werkstattablauf" }, { text: "Importe und Anbindungen" }, { text: "Nutzungslimits während des Tests" }] },
      premium: { head: "Premium · gehostet", name: "Premium", price: "Ab 300 €", period: "· Standort / Monat", sub: "Eine gehostete Produktionsumgebung mit enthaltenem Support.", cta: "Angebot anfragen",
        features: [{ text: "Unbegrenzte Nutzerzahl" }, { text: "Support inklusive" }, { text: "Importe und Anbindungen" }] },
      community: { head: "Community · selbst gehostet", name: "Community", price: "Kostenlos", period: "· ein Standort", sub: "Betreiben Sie Eryxon Flow auf Ihrer eigenen Infrastruktur unter BSL 1.1.", ctaGuide: "Self-Hosting-Anleitung lesen", ctaConsulting: "Hilfe bei der Einrichtung",
        features: [{ text: "Ein Produktionsstandort, unbegrenzt viele Nutzer" }, { text: "Selbst betreiben und warten" }, { text: "Optionale einmalige Einrichtungspakete" }] },
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
