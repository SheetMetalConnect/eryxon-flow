/*
 * Marketing copy for the English, Dutch, and German landing pages.
 *
 * This is the single source of truth for the localized landing and pricing sections.
 *
 * Voice: calm, practical, short, and direct. Do not add testimonials, performance claims,
 * customer names, or pricing figures. The operating model is:
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
    /** Hosted demo of the Community edition, free for 30 days with usage limits. */
    demo: { head: string; name: string; price: string; period: string; sub: string; features: PlanFeature[]; cta: string };
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
    title: "Eryxon Flow — shop-floor control for high-mix metal fabrication",
    description:
      "Turn ERP work orders into clear queues for cutting, bending, welding and assembly. Track routing, time, output, scrap, issues and locations from the shop floor, with REST API, signed webhooks and optional MCP access.",
    hero: {
      h1: "Turn ERP orders into clear work at every cell.",
      lead: "Eryxon Flow is a shop-floor execution layer for high-mix metal fabricators. Planners see which operations are ready and where load is building. Operators work from a tablet at the cell. ERP, automation and approved agents connect through documented interfaces, while production rules stay in the database.",
      ctaPrimary: "Try it hosted",
      ctaSecondary: "Self-host it free",
      ctaTertiary: "Read the docs →",
    },
    product: { url: "app.eryxon.eu/operator/work-queue", cell: "● Laser cutting", queueTitle: "Work queue", cards: productCards.en },
    features: {
      eyebrow: "For metal fabrication teams",
      h2: "Know what is ready, what is running, and what is blocked.",
      lead: "The planner, operator and connected systems work from the same production state, from the first routing step to reported output.",
      items: [
        { title: "Plan from actual status", body: "See load per cell, active work, overdue operations, standstills and issues in one current overview." },
        { title: "Keep routing in sequence", body: "The buffer follows completed upstream steps. Optional sequential release and WIP limits make the agreed flow visible and enforceable." },
        { title: "Connect the ERP cleanly", body: "Create and update production work through the REST API or CSV. Signed webhooks send committed changes back to connected systems." },
        { title: "Give operators a focused queue", body: "Each cell gets a touch-friendly work queue with status, due date, running time and the part's current and next location." },
        { title: "Trace output and issues", body: "Record time, good quantity, scrap, standstills and quality issues against the operation that produced them." },
        { title: "Source-available", body: "The source is on GitHub under the Business Source License. Read it, change it, self-host one workshop free. Multi-site and offering it as a service take a commercial licence." },
      ],
    },
    how: {
      eyebrow: "How it works",
      h2: "From ERP order to reported production.",
      steps: [
        { n: "01", h: "Bring in the order and routing", b: "Create jobs, parts and operations through the REST API, CSV import or the admin interface." },
        { n: "02", h: "Execute at the cell", b: "Operators start and stop work, report quantities, locate parts and flag problems from the terminal." },
        { n: "03", h: "Use the result everywhere", b: "Planners see the updated load and signed webhooks notify the ERP, data platform or other subscribed systems." },
      ],
    },
    api: {
      eyebrow: "Built for integration",
      h2: "One production state for the app and connected systems.",
      lead: "Use the REST API for inbound work and signed webhooks for committed changes. The optional MCP server exposes the same tenant boundary and production lifecycle rules to approved agents.",
      bullets: [
        "MCP server on the 2026-07-28 specification: stateless Streamable HTTP or stdio",
        "113 tools with annotations and output schemas; a test proves parity with the REST API",
        "Destructive tools ask for confirmation in a second round trip",
        "REST API with bearer keys, 409 with the rule text when a rule blocks a change",
        "Signed webhooks: 36 events, HMAC signature, retries, delivery log, redeliver",
      ],
    },
    pricing: {
      eyebrow: "Pricing",
      h2: "Two ways to run it.",
      lead: "Try the hosted instance, or self-host the Community edition free for one workshop.",
      allLink: "See full pricing →",
    },
    rollout: {
      eyebrow: "Rollout and licensing",
      h2: "Several sites, or hosting it for others?",
      lead: "Multi-site use and offering Eryxon Flow as a service take a commercial licence. Rollout help and ERP integration are scoped per shop. Get in touch.",
      cta: "Contact us",
    },
    cta: {
      h2: "Evaluate it against your own production flow.",
      lead: "Use the hosted trial or self-host the Community edition. Start with one routing, one cell and the systems that need the result.",
      ctaPrimary: "Try it hosted",
      ctaSecondary: "Read the self-host guide",
    },
  },

  nl: {
    title: "Eryxon Flow — werkvloerbesturing voor high-mix metaalbewerking",
    description:
      "Maak van ERP-orders duidelijke werkrijen voor snijden, kanten, lassen en assemblage. Registreer routing, tijd, output, afkeur, problemen en locaties op de werkvloer, met REST-API, ondertekende webhooks en optionele MCP-toegang.",
    hero: {
      h1: "Maak van ERP-orders duidelijk werk voor elke cel.",
      lead: "Eryxon Flow is de uitvoeringslaag tussen ERP en werkvloer voor high-mix metaalbedrijven. Planners zien welke bewerkingen klaarstaan en waar de belasting oploopt. Operators werken op een tablet bij de cel. ERP, automatisering en toegelaten agents koppelen via gedocumenteerde interfaces, terwijl productieregels in de database blijven.",
      ctaPrimary: "Probeer de gehoste versie",
      ctaSecondary: "Gratis zelf hosten",
      ctaTertiary: "Lees de docs →",
    },
    product: { url: "app.eryxon.eu/operator/work-queue", cell: "● Lasersnijden", queueTitle: "Werkrij", cards: productCards.nl },
    features: {
      eyebrow: "Voor metaalbedrijven",
      h2: "Weet wat klaarstaat, wat draait en wat blokkeert.",
      lead: "Planner, operator en gekoppelde systemen werken met dezelfde productiestatus, van de eerste routingstap tot de gemelde output.",
      items: [
        { title: "Plan met de actuele status", body: "Zie belasting per cel, lopend werk, te late bewerkingen, stilstanden en problemen in één actueel overzicht." },
        { title: "Bewaak de routing", body: "De buffer volgt afgeronde voorgaande stappen. Optionele volgordedwang en WIP-limieten maken de afgesproken flow zichtbaar en afdwingbaar." },
        { title: "Koppel het ERP gericht", body: "Maak en wijzig productiewerk via de REST-API of CSV. Ondertekende webhooks sturen vastgelegde wijzigingen terug naar gekoppelde systemen." },
        { title: "Geef operators een gerichte werkrij", body: "Elke cel krijgt een aanraakvriendelijke werkrij met status, leverdatum, looptijd en de huidige en volgende locatie van het onderdeel." },
        { title: "Herleid output en problemen", body: "Registreer tijd, goede aantallen, afkeur, stilstanden en kwaliteitsproblemen bij de bewerking waar ze ontstonden." },
        { title: "Source-available", body: "De broncode staat op GitHub onder de Business Source License. Lees hem, pas hem aan, host één werkplaats gratis zelf. Meerdere locaties of aanbieden als dienst vraagt een commerciële licentie." },
      ],
    },
    how: {
      eyebrow: "Zo werkt het",
      h2: "Van ERP-order naar gemelde productie.",
      steps: [
        { n: "01", h: "Haal order en routing binnen", b: "Maak orders, onderdelen en bewerkingen aan via de REST-API, CSV-import of het beheerscherm." },
        { n: "02", h: "Voer het werk uit bij de cel", b: "Operators starten en stoppen werk, melden aantallen, leggen locaties vast en markeren problemen op de terminal." },
        { n: "03", h: "Gebruik het resultaat in elk systeem", b: "Planners zien de bijgewerkte belasting en ondertekende webhooks informeren ERP, dataplatform of andere abonnees." },
      ],
    },
    api: {
      eyebrow: "Gebouwd voor integratie",
      h2: "Eén productiestatus voor de app en gekoppelde systemen.",
      lead: "Gebruik de REST-API voor inkomend werk en ondertekende webhooks voor vastgelegde wijzigingen. De optionele MCP-server stelt dezelfde tenantgrens en productieregels beschikbaar aan toegelaten agents.",
      bullets: [
        "MCP-server op de specificatie van 28 juli 2026: stateless Streamable HTTP of stdio",
        "113 tools met annotaties en output-schema's; een test bewijst pariteit met de REST-API",
        "Destructieve tools vragen om bevestiging in een tweede ronde",
        "REST-API met bearer-keys, 409 met de regeltekst als een regel een wijziging blokkeert",
        "Ondertekende webhooks: 36 events, HMAC-handtekening, herhaling, afleverlog, opnieuw versturen",
      ],
    },
    pricing: {
      eyebrow: "Prijzen",
      h2: "Twee manieren om het te draaien.",
      lead: "Probeer de gehoste versie, of host de Community-editie gratis zelf voor één werkplaats.",
      allLink: "Alle prijzen →",
    },
    rollout: {
      eyebrow: "Uitrol en licentie",
      h2: "Meerdere locaties, of hosten voor anderen?",
      lead: "Gebruik op meerdere locaties en aanbieden als dienst vragen een commerciële licentie. Hulp bij uitrol en ERP-koppeling wordt per bedrijf afgebakend. Neem contact op.",
      cta: "Neem contact op",
    },
    cta: {
      h2: "Toets het aan je eigen productiestroom.",
      lead: "Gebruik de gehoste proefomgeving of host de Community-editie zelf. Begin met één routing, één cel en de systemen die het resultaat nodig hebben.",
      ctaPrimary: "Probeer de gehoste versie",
      ctaSecondary: "Lees de zelfhost-handleiding",
    },
  },

  de: {
    title: "Eryxon Flow — Fertigungssteuerung für High-Mix-Metallbetriebe",
    description:
      "ERP-Aufträge werden zu klaren Arbeitsvorräten für Schneiden, Biegen, Schweißen und Montage. Routing, Zeit, Mengen, Ausschuss, Probleme und Standorte werden in der Fertigung erfasst, mit REST-API, signierten Webhooks und optionalem MCP-Zugang.",
    hero: {
      h1: "Aus ERP-Aufträgen wird klare Arbeit für jede Zelle.",
      lead: "Eryxon Flow verbindet ERP und Fertigung in High-Mix-Metallbetrieben. Planer sehen, welche Arbeitsgänge bereitstehen und wo sich Last aufbaut. Bediener arbeiten am Tablet in der Zelle. ERP, Automatisierung und freigegebene Agenten nutzen dokumentierte Schnittstellen, während die Produktionsregeln in der Datenbank bleiben.",
      ctaPrimary: "Gehostet ausprobieren",
      ctaSecondary: "Kostenlos selbst hosten",
      ctaTertiary: "Dokumentation lesen →",
    },
    product: { url: "app.eryxon.eu/operator/work-queue", cell: "● Laserschneiden", queueTitle: "Arbeitsvorrat", cards: productCards.de },
    features: {
      eyebrow: "Für Metallbetriebe",
      h2: "Wissen, was bereitsteht, was läuft und was blockiert.",
      lead: "Planung, Bediener und angebundene Systeme arbeiten mit demselben Produktionsstand, vom ersten Routingschritt bis zur gemeldeten Menge.",
      items: [
        { title: "Mit aktuellem Stand planen", body: "Auslastung je Zelle, laufende Arbeit, überfällige Arbeitsgänge, Stillstände und Probleme stehen in einer aktuellen Übersicht." },
        { title: "Das Routing einhalten", body: "Der Puffer folgt abgeschlossenen Vorgängern. Optionale Reihenfolgeprüfung und WIP-Grenzen machen den vereinbarten Fluss sichtbar und durchsetzbar." },
        { title: "Das ERP gezielt anbinden", body: "Produktionsarbeit kommt über REST-API oder CSV. Signierte Webhooks geben gespeicherte Änderungen an angebundene Systeme zurück." },
        { title: "Bedienern einen klaren Vorrat geben", body: "Jede Zelle erhält einen touchfreundlichen Arbeitsvorrat mit Status, Liefertermin, Laufzeit sowie aktuellem und nächstem Standort des Teils." },
        { title: "Mengen und Probleme zuordnen", body: "Zeit, Gutmenge, Ausschuss, Stillstände und Qualitätsprobleme werden am verursachenden Arbeitsgang erfasst." },
        { title: "Quelloffen einsehbar", body: "Der Quellcode liegt auf GitHub unter der Business Source License. Lesen, anpassen, eine Werkstatt kostenlos selbst hosten. Mehrere Standorte oder Betrieb als Dienst brauchen eine kommerzielle Lizenz." },
      ],
    },
    how: {
      eyebrow: "So funktioniert es",
      h2: "Vom ERP-Auftrag zur gemeldeten Produktion.",
      steps: [
        { n: "01", h: "Auftrag und Routing übernehmen", b: "Aufträge, Teile und Arbeitsgänge werden über REST-API, CSV-Import oder die Verwaltung angelegt." },
        { n: "02", h: "In der Zelle ausführen", b: "Bediener starten und stoppen Arbeit, melden Mengen, erfassen Standorte und markieren Probleme am Terminal." },
        { n: "03", h: "Das Ergebnis weiterverwenden", b: "Die Planung sieht die aktualisierte Last, und signierte Webhooks informieren ERP, Datenplattform oder andere Abonnenten." },
      ],
    },
    api: {
      eyebrow: "Für Integration gebaut",
      h2: "Ein Produktionsstand für App und angebundene Systeme.",
      lead: "Die REST-API nimmt Arbeit entgegen, signierte Webhooks melden gespeicherte Änderungen. Der optionale MCP-Server stellt dieselbe Mandantengrenze und dieselben Produktionsregeln für freigegebene Agenten bereit.",
      bullets: [
        "MCP-Server nach der Spezifikation vom 28. Juli 2026: zustandsloses Streamable HTTP oder stdio",
        "113 Tools mit Annotationen und Output-Schemas; ein Test belegt die Parität mit der REST-API",
        "Destruktive Tools fragen in einer zweiten Runde nach Bestätigung",
        "REST-API mit Bearer-Keys, 409 mit dem Regeltext, wenn eine Regel eine Änderung blockiert",
        "Signierte Webhooks: 36 Ereignisse, HMAC-Signatur, Wiederholungen, Zustellprotokoll, erneut senden",
      ],
    },
    pricing: {
      eyebrow: "Preise",
      h2: "Zwei Wege, es zu betreiben.",
      lead: "Gehostet ausprobieren oder die Community-Edition für eine Werkstatt kostenlos selbst hosten.",
      allLink: "Alle Preise →",
    },
    rollout: {
      eyebrow: "Rollout und Lizenz",
      h2: "Mehrere Standorte, oder Hosting für andere?",
      lead: "Betrieb an mehreren Standorten und das Anbieten als Dienst brauchen eine kommerzielle Lizenz. Rollout-Hilfe und ERP-Anbindung werden je Betrieb abgegrenzt. Sprechen Sie uns an.",
      cta: "Kontakt aufnehmen",
    },
    cta: {
      h2: "Am eigenen Produktionsfluss prüfen.",
      lead: "Nutzen Sie die gehostete Testumgebung oder hosten Sie die Community-Edition selbst. Beginnen Sie mit einem Routing, einer Zelle und den Systemen, die das Ergebnis benötigen.",
      ctaPrimary: "Gehostet ausprobieren",
      ctaSecondary: "Selbsthosting-Anleitung lesen",
    },
  },
};

const PRICING: Record<Locale, PricingCopy> = {
  en: {
    title: "Pricing — Eryxon Flow",
    description: "Self-host the Community edition free, or try the hosted 30-day demo.",
    hero: { eyebrow: "Pricing", h1: "Community is free.", lead: "Self-host the Community edition free for a single workshop, or try the hosted 30-day demo. Running several sites, or offering it as a service, needs a commercial licence; get in touch." },
    plans: {
      demo: { head: "Hosted", name: "Hosted", price: "Free", period: "· 30 days", sub: "A hosted instance to try on your own shop floor. No install, no card. Usage limits apply during the trial.", cta: "Start the 30-day trial",
        features: [{ text: "Hosted by us, runs in minutes" }, { text: "The full shop-floor core" }, { text: "REST API, webhooks and MCP server" }, { text: "Usage limits during the trial" }] },
      community: { head: "Community · self-hosted", name: "Community", price: "Free", period: "· single site", sub: "Run it yourself on your own infrastructure, for a single workshop. Source-available under the BSL.", ctaGuide: "Read the self-hosting guide", ctaConsulting: "Get help with setup",
        features: [{ text: "Source on GitHub — read, modify, self-host" }, { text: "One production site, no seat limits" }, { text: "The full shop-floor core" }, { text: "REST API, webhooks and MCP server" }, { text: "Provided as-is, community support" }] },
    },
  },
  nl: {
    title: "Prijzen — Eryxon Flow",
    description: "Host de Community-editie gratis zelf, of probeer de gehoste demo van 30 dagen.",
    hero: { eyebrow: "Prijzen", h1: "Community is gratis.", lead: "Host de Community-editie gratis voor één werkplaats, of probeer de gehoste demo van 30 dagen. Meerdere locaties of aanbieden als dienst vraagt een commerciële licentie; neem contact op." },
    plans: {
      demo: { head: "Gehost", name: "Gehost", price: "Gratis", period: "· 30 dagen", sub: "Een gehoste instance om op je eigen werkvloer uit te proberen. Niets installeren, geen creditcard. Tijdens de proefperiode gelden gebruikslimieten.", cta: "Start de proefperiode van 30 dagen",
        features: [{ text: "Door ons gehost, draait in minuten" }, { text: "De volledige werkvloerkern" }, { text: "REST-API, webhooks en MCP-server" }, { text: "Gebruikslimieten tijdens de proefperiode" }] },
      community: { head: "Community · zelf gehost", name: "Community", price: "Gratis", period: "· één locatie", sub: "Draai het zelf op je eigen infrastructuur, voor één werkplaats. Source-available onder de BSL.", ctaGuide: "Lees de zelf-hosten-gids", ctaConsulting: "Hulp bij de installatie",
        features: [{ text: "Broncode op GitHub — inzien, aanpassen, zelf hosten" }, { text: "Eén productielocatie, geen limiet op gebruikers" }, { text: "De volledige werkvloer-kern" }, { text: "REST-API, webhooks en MCP-server" }, { text: "Geleverd as-is, community-support" }] },
    },
  },
  de: {
    title: "Preise — Eryxon Flow",
    description: "Hoste die Community-Edition kostenlos selbst oder teste die gehostete 30-Tage-Demo.",
    hero: { eyebrow: "Preise", h1: "Community ist kostenlos.", lead: "Hoste die Community-Edition kostenlos für eine Werkstatt oder teste die gehostete 30-Tage-Demo. Mehrere Standorte oder das Anbieten als Dienst brauchen eine kommerzielle Lizenz; melde dich." },
    plans: {
      demo: { head: "Gehostet", name: "Gehostet", price: "Kostenlos", period: "· 30 Tage", sub: "Eine gehostete Instanz zum Testen in Ihrer eigenen Werkstatt. Keine Installation, keine Karte. Während des Tests gelten Nutzungslimits.", cta: "30-Tage-Test starten",
        features: [{ text: "Von uns gehostet, läuft in Minuten" }, { text: "Der volle Werkstattkern" }, { text: "REST-API, Webhooks und MCP-Server" }, { text: "Nutzungslimits während des Tests" }] },
      community: { head: "Community · selbst gehostet", name: "Community", price: "Kostenlos", period: "· ein Standort", sub: "Betreibe es selbst auf deiner eigenen Infrastruktur, für eine Werkstatt. Source-available unter der BSL.", ctaGuide: "Self-Hosting-Anleitung lesen", ctaConsulting: "Hilfe bei der Einrichtung",
        features: [{ text: "Quellcode auf GitHub — einsehen, anpassen, selbst hosten" }, { text: "Ein Produktionsstandort, kein Nutzerlimit" }, { text: "Der volle Werkstatt-Kern" }, { text: "REST-API, Webhooks und MCP-Server" }, { text: "Bereitgestellt wie besehen, Community-Support" }] },
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
