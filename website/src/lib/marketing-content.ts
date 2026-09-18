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
    title: "Eryxon Flow — MES for job shops, ready for agents",
    description:
      "Eryxon Flow tracks every job through cutting, bending, welding and assembly. Operators work a tablet at the machine. Your ERP and your AI agent work the same rules through the REST API and an MCP server. Source-available; self-host one workshop free.",
    hero: {
      h1: "Run the shop floor. Let agents and ERP run it with you.",
      lead: "Eryxon Flow is the MES for job shops of 10 to 150 people. Operators work a tablet at the machine, planners see the load per cell as it changes. The REST API and the MCP server go through the same database rules as the screen, so an ERP or an AI agent can plan, start, report and query production without a project.",
      ctaPrimary: "Try it hosted",
      ctaSecondary: "Self-host it free",
      ctaTertiary: "Read the docs →",
    },
    product: { url: "app.eryxon.eu/operator/work-queue", cell: "● Laser cutting", queueTitle: "Work queue", cards: productCards },
    features: {
      eyebrow: "For the people who run the shop",
      h2: "Three things an owner wants to know before lunch.",
      lead: "Where every job is, whether the flow is under control, and how much integration work it takes. Eryxon Flow answers all three from one database.",
      items: [
        { title: "See the shop", body: "Load per cell, who is clocked on what, what is overdue, what is blocked by a standstill. One dashboard, live, on any screen." },
        { title: "Control the flow", body: "In Buffer means the earlier steps are done. A switch enforces the sequence for the whole shop. WIP limits per cell signal when the next cell is full. One running timer per operator, enforced by the database." },
        { title: "Integrate without a project", body: "Push jobs from your ERP over the REST API or a CSV. Signed webhooks tell your other systems the moment work changes. No middleware, no consultant on retainer." },
        { title: "Tablets at the machine", body: "A work queue per cell. Big buttons for gloved hands, status, due date and running time readable from a metre away. Drop-off slots show where a part is and where it goes next." },
        { title: "3D in the browser", body: "Open the part model next to the job. Measure it, rotate it, nothing to install on the terminal." },
        { title: "Source-available", body: "The source is on GitHub under the Business Source License. Read it, change it, self-host one workshop free. Multi-site and offering it as a service take a commercial licence." },
      ],
    },
    how: {
      eyebrow: "How it works",
      h2: "From ERP push to planner dashboard in three steps.",
      steps: [
        { n: "01", h: "Bring your jobs in", b: "Push jobs from your ERP over the API, drop in a CSV, or let an agent create them. Parts, steps and routing line up the same way every time." },
        { n: "02", h: "The floor works the queue", b: "Each cell has its tablet. Tap a job to start the clock, log good and scrap, flag a problem. The planner sees it the same second." },
        { n: "03", h: "Planners and agents watch the load", b: "One dashboard shows the load per cell, what runs tight and what was flagged. An agent reads the same numbers through MCP and can act on them under the same rules." },
      ],
    },
    api: {
      eyebrow: "Agent-ready",
      h2: "An agent works your MES the way an operator does.",
      lead: "The screen, the REST API and the MCP server all call the same database functions. Whatever starts an operation, the timer rule, the sequence rule and the tenant boundary apply, and the same webhook fires. Claude, Claude Code or any MCP client connects with one command.",
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
      h2: "Put it on your own shop floor this week.",
      lead: "Start the hosted instance, or pull the Docker image and self-host. Connect your ERP or your agent the same afternoon.",
      ctaPrimary: "Try it hosted",
      ctaSecondary: "Read the self-host guide",
    },
  },

  nl: {
    title: "Eryxon Flow — MES voor de metaalbewerking, klaar voor agents",
    description:
      "Eryxon Flow volgt elke order door snijden, kanten, lassen en assemblage. Operators werken op een tablet bij de machine. Je ERP en je AI-agent werken met dezelfde regels via de REST-API en een MCP-server. Source-available; host één werkplaats gratis zelf.",
    hero: {
      h1: "Stuur de werkvloer. Laat agents en ERP meesturen.",
      lead: "Eryxon Flow is het MES voor metaalbedrijven van 10 tot 150 man. Operators werken op een tablet bij de machine, planners zien de belasting per cel zodra die verandert. De REST-API en de MCP-server lopen door dezelfde databaseregels als het scherm. Een ERP of een AI-agent plant, start, meldt en bevraagt de productie zonder project.",
      ctaPrimary: "Probeer de gehoste versie",
      ctaSecondary: "Gratis zelf hosten",
      ctaTertiary: "Lees de docs →",
    },
    product: { url: "app.eryxon.eu/operator/work-queue", cell: "● Lasersnijden", queueTitle: "Werkrij", cards: productCards },
    features: {
      eyebrow: "Voor wie het bedrijf runt",
      h2: "Drie dingen die een eigenaar vóór de lunch wil weten.",
      lead: "Waar elke order is, of de flow onder controle is, en hoeveel integratiewerk het kost. Eryxon Flow beantwoordt alle drie vanuit één database.",
      items: [
        { title: "Zie de werkplaats", body: "Belasting per cel, wie op wat is ingeklokt, wat te laat is, wat vastzit door een stilstand. Eén dashboard, live, op elk scherm." },
        { title: "Houd de flow in de hand", body: "In Buffer betekent dat de eerdere stappen klaar zijn. Eén schakelaar dwingt de volgorde af voor de hele werkplaats. WIP-limieten per cel geven aan wanneer de volgende cel vol is. Eén lopende timer per operator, afgedwongen door de database." },
        { title: "Integreren zonder project", body: "Zet orders vanuit je ERP over de REST-API of via een CSV. Ondertekende webhooks melden je andere systemen direct wanneer werk verandert. Geen middleware, geen consultant op afroep." },
        { title: "Tablets bij de machine", body: "Een werkrij per cel. Grote knoppen voor handschoenen, status, leverdatum en looptijd leesbaar vanaf een meter. Afleverplekken tonen waar een onderdeel ligt en waar het heen moet." },
        { title: "3D in de browser", body: "Open het model naast de order. Meten, draaien, niets installeren op de terminal." },
        { title: "Source-available", body: "De broncode staat op GitHub onder de Business Source License. Lees hem, pas hem aan, host één werkplaats gratis zelf. Meerdere locaties of aanbieden als dienst vraagt een commerciële licentie." },
      ],
    },
    how: {
      eyebrow: "Zo werkt het",
      h2: "Van ERP-push naar plannersdashboard in drie stappen.",
      steps: [
        { n: "01", h: "Haal je orders binnen", b: "Zet orders vanuit je ERP over de API, laad een CSV, of laat een agent ze aanmaken. Onderdelen, stappen en routing staan elke keer op dezelfde manier klaar." },
        { n: "02", h: "De vloer werkt de rij af", b: "Elke cel heeft zijn tablet. Tik een order aan om de klok te starten, meld goed en afkeur, markeer een probleem. De planner ziet het dezelfde seconde." },
        { n: "03", h: "Planners en agents bewaken de belasting", b: "Eén dashboard toont de belasting per cel, wat krap loopt en wat gemarkeerd is. Een agent leest dezelfde cijfers via MCP en handelt onder dezelfde regels." },
      ],
    },
    api: {
      eyebrow: "Klaar voor agents",
      h2: "Een agent bedient je MES zoals een operator dat doet.",
      lead: "Het scherm, de REST-API en de MCP-server roepen dezelfde databasefuncties aan. Wie of wat een bewerking ook start: de timerregel, de volgorderegel en de tenantgrens gelden, en dezelfde webhook vuurt. Claude, Claude Code of elke MCP-client koppelt met één commando.",
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
      h2: "Zet het deze week op je eigen werkvloer.",
      lead: "Start de gehoste versie, of trek het Docker-image binnen en host zelf. Koppel je ERP of je agent dezelfde middag.",
      ctaPrimary: "Probeer de gehoste versie",
      ctaSecondary: "Lees de zelfhost-handleiding",
    },
  },

  de: {
    title: "Eryxon Flow — MES für Lohnfertiger, bereit für Agenten",
    description:
      "Eryxon Flow verfolgt jeden Auftrag durch Schneiden, Biegen, Schweißen und Montage. Bediener arbeiten am Tablet an der Maschine. ERP und KI-Agent arbeiten über REST-API und MCP-Server nach denselben Regeln. Quelloffen einsehbar; eine Werkstatt kostenlos selbst hosten.",
    hero: {
      h1: "Führen Sie die Fertigung. Lassen Sie Agenten und ERP mitführen.",
      lead: "Eryxon Flow ist das MES für Lohnfertiger mit 10 bis 150 Mitarbeitern. Bediener arbeiten am Tablet an der Maschine, Planer sehen die Auslastung je Zelle, sobald sie sich ändert. REST-API und MCP-Server laufen durch dieselben Datenbankregeln wie der Bildschirm. Ein ERP oder ein KI-Agent plant, startet, meldet und fragt die Produktion ab, ohne Projekt.",
      ctaPrimary: "Gehostet ausprobieren",
      ctaSecondary: "Kostenlos selbst hosten",
      ctaTertiary: "Dokumentation lesen →",
    },
    product: { url: "app.eryxon.eu/operator/work-queue", cell: "● Laserschneiden", queueTitle: "Arbeitsvorrat", cards: productCards },
    features: {
      eyebrow: "Für die, die den Betrieb führen",
      h2: "Drei Dinge, die ein Inhaber vor dem Mittag wissen will.",
      lead: "Wo jeder Auftrag steht, ob der Fluss unter Kontrolle ist und wie viel Integrationsarbeit es kostet. Eryxon Flow beantwortet alle drei aus einer Datenbank.",
      items: [
        { title: "Die Werkstatt sehen", body: "Auslastung je Zelle, wer an was eingestempelt ist, was überfällig ist, was durch einen Stillstand blockiert ist. Ein Dashboard, live, auf jedem Bildschirm." },
        { title: "Den Fluss steuern", body: "Im Puffer heißt: die früheren Schritte sind fertig. Ein Schalter erzwingt die Reihenfolge für die ganze Werkstatt. WIP-Grenzen je Zelle zeigen, wenn die nächste Zelle voll ist. Ein laufender Timer je Bediener, von der Datenbank erzwungen." },
        { title: "Integrieren ohne Projekt", body: "Aufträge aus dem ERP über die REST-API oder als CSV übergeben. Signierte Webhooks melden anderen Systemen sofort, wenn sich Arbeit ändert. Keine Middleware, kein Berater auf Abruf." },
        { title: "Tablets an der Maschine", body: "Ein Arbeitsvorrat je Zelle. Große Tasten für Handschuhe, Status, Liefertermin und Laufzeit aus einem Meter lesbar. Ablageplätze zeigen, wo ein Teil liegt und wohin es geht." },
        { title: "3D im Browser", body: "Das Modell neben dem Auftrag öffnen. Messen, drehen, nichts auf dem Terminal installieren." },
        { title: "Quelloffen einsehbar", body: "Der Quellcode liegt auf GitHub unter der Business Source License. Lesen, anpassen, eine Werkstatt kostenlos selbst hosten. Mehrere Standorte oder Betrieb als Dienst brauchen eine kommerzielle Lizenz." },
      ],
    },
    how: {
      eyebrow: "So funktioniert es",
      h2: "Vom ERP-Push zum Planer-Dashboard in drei Schritten.",
      steps: [
        { n: "01", h: "Aufträge hereinholen", b: "Aufträge aus dem ERP über die API übergeben, eine CSV laden oder einen Agenten anlegen lassen. Teile, Schritte und Routing stehen jedes Mal gleich bereit." },
        { n: "02", h: "Die Halle arbeitet den Vorrat ab", b: "Jede Zelle hat ihr Tablet. Auftrag antippen, Uhr starten, Gut- und Ausschussmenge melden, Problem markieren. Der Planer sieht es in derselben Sekunde." },
        { n: "03", h: "Planer und Agenten überwachen die Auslastung", b: "Ein Dashboard zeigt die Auslastung je Zelle, was knapp läuft und was markiert wurde. Ein Agent liest dieselben Zahlen über MCP und handelt nach denselben Regeln." },
      ],
    },
    api: {
      eyebrow: "Bereit für Agenten",
      h2: "Ein Agent bedient Ihr MES wie ein Bediener.",
      lead: "Bildschirm, REST-API und MCP-Server rufen dieselben Datenbankfunktionen auf. Egal, wer einen Arbeitsgang startet: Timer-Regel, Reihenfolge-Regel und Mandantengrenze gelten, und derselbe Webhook feuert. Claude, Claude Code oder jeder MCP-Client verbindet sich mit einem Befehl.",
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
      h2: "Diese Woche in Ihrer eigenen Halle.",
      lead: "Gehostete Instanz starten oder Docker-Image ziehen und selbst hosten. ERP oder Agent am selben Nachmittag anbinden.",
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
