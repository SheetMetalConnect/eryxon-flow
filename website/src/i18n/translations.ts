// Simple i18n system for the website
// Add more languages by creating additional locale objects

export const defaultLocale = 'en' as const;
export const supportedLocales = ['en', 'nl', 'de'] as const;
export type Locale = typeof supportedLocales[number];

export const translations = {
  en: {
    // Navigation
    nav: {
      features: 'Features',
      howItWorks: 'How It Works',
      getStarted: 'Get Started',
      github: 'GitHub',
    },

    // Hero section
    hero: {
      badge: {
        openSource: 'Open Source',
        license: 'BSL 1.1',
        selfHostable: 'Self-Hostable',
      },
      title: 'Manufacturing Made Modern',
      tagline: 'Open Source Manufacturing Execution System',
      description: 'Real-time production tracking, QRM capacity management, and operator terminals. Built from hands-on experience with SMB metal shops. A starting point for your unique shop.',
      cta: {
        getStarted: 'Get Started',
        viewGithub: 'View on GitHub',
      },
      stats: {
        uiComponents: 'UI Components',
        edgeFunctions: 'Edge Functions',
        languages: 'Languages',
        apiReady: 'API Ready',
      },
    },

    // Features section
    features: {
      title: 'Built for Production',
      description: 'Everything you need to manage manufacturing operations. From job creation to completion, with real-time visibility and complete data control.',
      cards: {
        jobLifecycle: {
          title: 'Complete Job Lifecycle',
          description: 'Track jobs from creation through completion. Parts, operations, assemblies - all in one place with real-time status updates.',
        },
        qrmCapacity: {
          title: 'QRM Capacity Management',
          description: 'WIP limits, capacity warnings, and bottleneck prevention. Keep production flowing smoothly with Quick Response Manufacturing principles.',
        },
        operatorTerminal: {
          title: 'Operator Terminal',
          description: 'Touch-optimized interface for shop floor tablets. Time tracking, issue reporting, and 3D CAD viewing - everything operators need.',
        },
        timeTracking: {
          title: 'Time Tracking',
          description: 'Start, pause, resume, and stop timing with one click. Compare actual vs estimated times for accurate costing and planning.',
        },
        cadViewer: {
          title: '3D CAD Viewer',
          description: 'View STEP files directly in the browser with Three.js. Orbit, zoom, and inspect parts without leaving the app.',
        },
        issueManagement: {
          title: 'Issue Management',
          description: 'Report quality issues with photos. Admin review and resolution workflow keeps production on track.',
        },
        multiLanguage: {
          title: 'Multi-Language',
          description: 'English, Dutch, German out of the box. Add more languages with i18next.',
        },
        darkMode: {
          title: 'Dark Mode',
          description: 'Easy on the eyes in any lighting condition. Perfect for shop floor environments.',
        },
        restApi: {
          title: 'REST API & Webhooks',
          description: 'Complete API for ERP integration. Webhooks notify external systems of production events in real-time.',
        },
        multiTenant: {
          title: 'Multi-Tenant Ready',
          description: 'Row-level security keeps tenant data completely isolated. Self-host for your team or run multiple instances.',
        },
      },
      callToAction: 'Ready to modernize your manufacturing?',
    },

    // Comparison section
    comparison: {
      badge: 'Built for metalworking SMBs',
      title: 'A Fresh Take on Production Management',
      subtitle: 'Open source, unlimited users, no per-seat fees. Start free and scale as you grow.',
      eryxonFlow: 'Eryxon Flow',
      theOthers: 'Traditional MES',
      othersExamples: 'PROPOS, 24Flow, Ridder iQ, MKG...',
      rows: {
        pricing: {
          label: 'Pricing Model',
          eryxon: 'Free to start',
          eryxonNote: 'Unlimited users included',
          others: 'Per-user licenses + setup fees',
        },
        realtime: {
          label: 'Real-time Updates',
          eryxon: 'Live sync across all devices',
          others: 'Manual refresh required',
        },
        api: {
          label: 'API & Integrations',
          eryxon: 'REST API + Webhooks included',
          others: 'Often extra cost',
        },
        sourceCode: {
          label: 'Source Access',
          eryxon: 'Open Source (BSL 1.1)',
          others: 'Closed source',
        },
        cadViewer: {
          label: 'CAD Viewing',
          eryxon: 'Built-in 3D STEP viewer',
          others: 'External CAD software',
        },
        pdfViewer: {
          label: 'PDF Drawings',
          eryxon: 'Inline PDF viewer',
          others: 'External app',
        },
        substeps: {
          label: 'Work Instructions',
          eryxon: 'Checklist-driven workflow',
          others: 'Basic or missing',
        },
        assemblies: {
          label: 'Assembly Support',
          eryxon: 'Multi-level BOMs',
          others: 'Flat structure only',
        },
        capacity: {
          label: 'Capacity Planning',
          eryxon: 'QRM with WIP limits',
          others: 'Traditional scheduling',
        },
        ui: {
          label: 'User Experience',
          eryxon: 'Modern, mobile-ready',
          others: 'Desktop-focused',
        },
        deployment: {
          label: 'Deployment',
          eryxon: 'Cloud or self-hosted',
          others: 'Vendor-managed only',
        },
      },
      teamSection: {
        title: 'Built for Your Team, Not IT Departments',
        description: 'Shop floor tested. Intuitive design. Get your team onboard in minutes.',
        features: {
          simple: {
            title: 'One-Tap Tracking',
            description: 'Start/stop with a single tap',
          },
          models: {
            title: '3D Part Viewer',
            description: 'View STEP files in-browser',
          },
          checklists: {
            title: 'Step Checklists',
            description: 'Guided work instructions',
          },
          photos: {
            title: 'Photo Issues',
            description: 'Report problems with photos',
          },
        },
      },
    },

    // How It Works section
    howItWorks: {
      title: 'How Eryxon Flow Works',
      description: 'A modern approach to manufacturing execution. Track every job, part, and operation through your production workflow.',
      steps: {
        create: {
          number: '1',
          title: 'Create Jobs',
          description: 'Admin creates jobs with parts and operations. Define materials, estimated times, and workflow stages.',
          code: 'Job \u2192 Parts \u2192 Operations',
        },
        assign: {
          number: '2',
          title: 'Assign & Track',
          description: 'Assign parts to operators. They see their work queue, start timing, and track progress in real-time.',
          code: 'Start \u2192 Pause \u2192 Complete',
        },
        analyze: {
          number: '3',
          title: 'Analyze & Improve',
          description: 'Export data, review metrics, and continuously improve. REST API integrates with your existing systems.',
          code: 'Data \u2192 Insights \u2192 Action',
        },
      },
      architecture: {
        title: 'Architecture',
        frontend: {
          title: 'React Frontend',
          description: 'Modern UI with TypeScript',
        },
        backend: {
          title: 'Supabase Backend',
          description: 'PostgreSQL + Edge Functions',
        },
        deployment: {
          title: 'Docker Deployment',
          description: 'Self-host anywhere',
        },
        realtime: {
          title: 'Real-Time Updates',
          description: 'Live production status',
        },
      },
      callToAction: {
        title: 'Ready to modernize your shop floor?',
        description: 'Deploy Eryxon Flow today and start tracking production in real-time. Open source, fully customizable, and ready for production.',
        button: 'Get Started Now',
      },
    },

    // Get Started section
    getStarted: {
      title: 'Get Started in Minutes',
      description: 'Deploy Eryxon Flow with Docker or run locally. Full documentation available.',
      terminal: {
        title: 'Quick Start',
        comments: {
          clone: '# Clone the repository',
          install: '# Install dependencies',
          configure: '# Configure environment',
          start: '# Start development server',
        },
      },
      buttons: {
        github: 'View on GitHub',
        docs: 'Documentation',
      },
    },

    // Footer
    footer: {
      description: 'Open source Manufacturing Execution System for sheet metal fabrication. Built from hands-on experience with SMB metal shops. A starting point you can make your own.',
      githubRepo: 'GitHub Repository',
      quickLinks: {
        title: 'Quick Links',
        features: 'Features',
        howItWorks: 'How It Works',
        getStarted: 'Get Started',
        docs: 'Documentation',
      },
      community: {
        title: 'Community',
        issues: 'Issues & Support',
        discussions: 'Discussions',
        contributing: 'Contributing',
        company: 'Sheet Metal Connect e.U.',
      },
      bottomBar: {
        copyright: '2025 Sheet Metal Connect e.U. Released under the BSL 1.1.',
        madeBy: 'Made by Luke van Enkhuizen from Europe',
      },
    },

    // Common
    common: {
      learnMore: 'Learn more',
      viewAll: 'View all',
    },
  },

  nl: {
    // Navigation
    nav: {
      features: 'Functies',
      howItWorks: 'Hoe het werkt',
      getStarted: 'Aan de slag',
      github: 'GitHub',
    },

    // Hero section
    hero: {
      badge: {
        openSource: 'Open Source',
        license: 'BSL 1.1',
        selfHostable: 'Zelf te hosten',
      },
      title: 'Productie Gemoderniseerd',
      tagline: 'Open Source Manufacturing Execution System',
      description: 'Realtime productietracking, QRM capaciteitsmanagement en operator terminals. Gebouwd met praktijkervaring uit MKB metaalbedrijven. Een startpunt voor jouw unieke werkplaats.',
      cta: {
        getStarted: 'Aan de slag',
        viewGithub: 'Bekijk op GitHub',
      },
      stats: {
        uiComponents: 'UI Componenten',
        edgeFunctions: 'Edge Functions',
        languages: 'Talen',
        apiReady: 'API Gereed',
      },
    },

    // Features section
    features: {
      title: 'Gebouwd voor Productie',
      description: 'Alles wat je nodig hebt om productieoperaties te beheren. Van opdrachtcreatie tot afronding, met realtime inzicht en volledige datacontrole.',
      cards: {
        jobLifecycle: {
          title: 'Complete Opdracht Levenscyclus',
          description: 'Volg opdrachten van creatie tot voltooiing. Onderdelen, bewerkingen, assemblages - alles op \u00e9\u00e9n plek met realtime statusupdates.',
        },
        qrmCapacity: {
          title: 'QRM Capaciteitsbeheer',
          description: 'WIP-limieten, capaciteitswaarschuwingen en bottleneck-preventie. Houd productie soepel met Quick Response Manufacturing principes.',
        },
        operatorTerminal: {
          title: 'Operator Terminal',
          description: 'Touch-geoptimaliseerde interface voor tablets. Tijdregistratie, probleemmelding en 3D CAD-weergave - alles wat operators nodig hebben.',
        },
        timeTracking: {
          title: 'Tijdregistratie',
          description: 'Start, pauzeer, hervat en stop timing met \u00e9\u00e9n klik. Vergelijk werkelijke vs geschatte tijden voor accurate kostencalculatie.',
        },
        cadViewer: {
          title: '3D CAD Viewer',
          description: 'Bekijk STEP bestanden direct in de browser met Three.js. Draai, zoom en inspecteer onderdelen zonder de app te verlaten.',
        },
        issueManagement: {
          title: 'Probleembeheer',
          description: "Meld kwaliteitsproblemen met foto's. Admin review en oplossingsworkflow houdt productie op koers.",
        },
        multiLanguage: {
          title: 'Meertalig',
          description: 'Engels, Nederlands, Duits standaard. Voeg meer talen toe met i18next.',
        },
        darkMode: {
          title: 'Donkere Modus',
          description: 'Prettig voor de ogen in alle lichtomstandigheden. Perfect voor werkvloeromgevingen.',
        },
        restApi: {
          title: 'REST API & Webhooks',
          description: 'Complete API voor ERP-integratie. Webhooks informeren externe systemen over productie-events in realtime.',
        },
        multiTenant: {
          title: 'Multi-Tenant Gereed',
          description: 'Row-level security houdt tenant data volledig ge\u00efsoleerd. Zelf hosten voor je team of meerdere instances draaien.',
        },
      },
      callToAction: 'Klaar om je productie te moderniseren?',
    },

    // Comparison section
    comparison: {
      badge: 'Gemaakt voor MKB-metaalbewerking',
      title: 'Een frisse kijk op productiebeheer',
      subtitle: 'Open source, onbeperkt gebruikers, geen licentiekosten per zetel. Start gratis en groei mee.',
      eryxonFlow: 'Eryxon Flow',
      theOthers: 'Traditioneel MES',
      othersExamples: 'PROPOS, 24Flow, Ridder iQ, MKG...',
      rows: {
        pricing: {
          label: 'Prijsmodel',
          eryxon: 'Gratis starten',
          eryxonNote: 'Onbeperkt aantal gebruikers',
          others: 'Licenties per gebruiker + opstartkosten',
        },
        realtime: {
          label: 'Realtime updates',
          eryxon: 'Live synchronisatie op alle apparaten',
          others: 'Handmatig verversen vereist',
        },
        api: {
          label: 'API & Integraties',
          eryxon: 'REST API + Webhooks inbegrepen',
          others: 'Vaak extra kosten',
        },
        sourceCode: {
          label: 'Broncode toegang',
          eryxon: 'Open Source (BSL 1.1)',
          others: 'Gesloten broncode',
        },
        cadViewer: {
          label: 'CAD weergave',
          eryxon: 'Ingebouwde 3D STEP viewer',
          others: 'Externe CAD software',
        },
        pdfViewer: {
          label: 'PDF tekeningen',
          eryxon: 'Inline PDF viewer',
          others: 'Externe app',
        },
        substeps: {
          label: 'Werkinstructies',
          eryxon: 'Checklist-gedreven workflow',
          others: 'Basis of ontbrekend',
        },
        assemblies: {
          label: 'Assemblage ondersteuning',
          eryxon: 'Multi-level stuklijsten',
          others: 'Alleen platte structuur',
        },
        capacity: {
          label: 'Capaciteitsplanning',
          eryxon: 'QRM met OHW-limieten',
          others: 'Traditionele planning',
        },
        ui: {
          label: 'Gebruikerservaring',
          eryxon: 'Modern, mobiel-klaar',
          others: 'Desktop-gericht',
        },
        deployment: {
          label: 'Deployment',
          eryxon: 'Cloud of zelf gehost',
          others: 'Alleen leverancier-beheerd',
        },
      },
      teamSection: {
        title: 'Gebouwd voor je team, niet voor IT-afdelingen',
        description: 'Getest op de werkvloer. Intuïtief ontwerp. Je team is binnen minuten aan de slag.',
        features: {
          simple: {
            title: 'Eén-tik registratie',
            description: 'Start/stop met één tik',
          },
          models: {
            title: '3D Onderdeel viewer',
            description: 'Bekijk STEP bestanden in de browser',
          },
          checklists: {
            title: 'Stap checklists',
            description: 'Begeleide werkinstructies',
          },
          photos: {
            title: 'Foto meldingen',
            description: 'Meld problemen met foto\'s',
          },
        },
      },
    },

    // How It Works section
    howItWorks: {
      title: 'Hoe Eryxon Flow werkt',
      description: 'Een moderne aanpak voor productie-uitvoering. Volg elke opdracht, elk onderdeel en elke bewerking door je productieproces.',
      steps: {
        create: {
          number: '1',
          title: 'Opdrachten aanmaken',
          description: 'Admin maakt opdrachten met onderdelen en bewerkingen. Definieer materialen, geschatte tijden en workflow-fases.',
          code: 'Opdracht \u2192 Onderdelen \u2192 Bewerkingen',
        },
        assign: {
          number: '2',
          title: 'Toewijzen & Volgen',
          description: 'Wijs onderdelen toe aan operators. Ze zien hun werkqueue, starten timing en volgen voortgang in realtime.',
          code: 'Start \u2192 Pauze \u2192 Gereed',
        },
        analyze: {
          number: '3',
          title: 'Analyseren & Verbeteren',
          description: 'Exporteer data, bekijk metrics en verbeter continu. REST API integreert met je bestaande systemen.',
          code: 'Data \u2192 Inzichten \u2192 Actie',
        },
      },
      architecture: {
        title: 'Architectuur',
        frontend: {
          title: 'React Frontend',
          description: 'Moderne UI met TypeScript',
        },
        backend: {
          title: 'Supabase Backend',
          description: 'PostgreSQL + Edge Functions',
        },
        deployment: {
          title: 'Docker Deployment',
          description: 'Zelf hosten waar je wilt',
        },
        realtime: {
          title: 'Realtime Updates',
          description: 'Live productiestatus',
        },
      },
      callToAction: {
        title: 'Klaar om je werkvloer te moderniseren?',
        description: 'Deploy Eryxon Flow vandaag en begin met realtime productietracking. Open source, volledig aanpasbaar en productieklaar.',
        button: 'Nu aan de slag',
      },
    },

    // Get Started section
    getStarted: {
      title: 'Start binnen minuten',
      description: 'Deploy Eryxon Flow met Docker of draai lokaal. Volledige documentatie beschikbaar.',
      terminal: {
        title: 'Snelstart',
        comments: {
          clone: '# Clone de repository',
          install: '# Installeer dependencies',
          configure: '# Configureer environment',
          start: '# Start development server',
        },
      },
      buttons: {
        github: 'Bekijk op GitHub',
        docs: 'Documentatie',
      },
    },

    // Footer
    footer: {
      description: 'Open source Manufacturing Execution System voor plaatwerk fabricage. Gebouwd met praktijkervaring uit MKB metaalbedrijven. Een startpunt dat je eigen kunt maken.',
      githubRepo: 'GitHub Repository',
      quickLinks: {
        title: 'Snelle Links',
        features: 'Functies',
        howItWorks: 'Hoe het werkt',
        getStarted: 'Aan de slag',
        docs: 'Documentatie',
      },
      community: {
        title: 'Community',
        issues: 'Issues & Support',
        discussions: 'Discussies',
        contributing: 'Bijdragen',
        company: 'Sheet Metal Connect e.U.',
      },
      bottomBar: {
        copyright: '2025 Sheet Metal Connect e.U. Uitgebracht onder de BSL 1.1.',
        madeBy: 'Gemaakt door Luke van Enkhuizen vanuit Europa',
      },
    },

    // Common
    common: {
      learnMore: 'Meer leren',
      viewAll: 'Alles bekijken',
    },
  },

  de: {
    // Navigation
    nav: {
      features: 'Funktionen',
      howItWorks: 'So funktioniert es',
      getStarted: 'Loslegen',
      github: 'GitHub',
    },

    // Hero section
    hero: {
      badge: {
        openSource: 'Open Source',
        license: 'BSL 1.1',
        selfHostable: 'Selbst hostbar',
      },
      title: 'Fertigung modernisiert',
      tagline: 'Open Source Manufacturing Execution System',
      description: 'Echtzeit-Produktionsverfolgung, QRM-Kapazit\u00e4tsmanagement und Operator-Terminals. Aus praktischer Erfahrung mit KMU-Metallbetrieben entwickelt. Ein Ausgangspunkt f\u00fcr Ihre einzigartige Werkstatt.',
      cta: {
        getStarted: 'Loslegen',
        viewGithub: 'Auf GitHub ansehen',
      },
      stats: {
        uiComponents: 'UI-Komponenten',
        edgeFunctions: 'Edge Functions',
        languages: 'Sprachen',
        apiReady: 'API bereit',
      },
    },

    // Features section
    features: {
      title: 'F\u00fcr die Produktion gebaut',
      description: 'Alles was Sie brauchen, um Fertigungsabl\u00e4ufe zu verwalten. Von der Auftragserstellung bis zum Abschluss, mit Echtzeit-Transparenz und vollst\u00e4ndiger Datenkontrolle.',
      cards: {
        jobLifecycle: {
          title: 'Kompletter Auftrags-Lebenszyklus',
          description: 'Verfolgen Sie Auftr\u00e4ge von der Erstellung bis zum Abschluss. Teile, Operationen, Baugruppen - alles an einem Ort mit Echtzeit-Statusupdates.',
        },
        qrmCapacity: {
          title: 'QRM Kapazit\u00e4tsmanagement',
          description: 'WIP-Limits, Kapazit\u00e4tswarnungen und Engpass-Pr\u00e4vention. Halten Sie die Produktion mit Quick Response Manufacturing Prinzipien fl\u00fcssig.',
        },
        operatorTerminal: {
          title: 'Operator Terminal',
          description: 'Touch-optimierte Oberfl\u00e4che f\u00fcr Werkstatt-Tablets. Zeiterfassung, Problemerfassung und 3D-CAD-Anzeige - alles was Bediener brauchen.',
        },
        timeTracking: {
          title: 'Zeiterfassung',
          description: 'Starten, pausieren, fortsetzen und stoppen Sie die Zeitmessung mit einem Klick. Vergleichen Sie Ist- vs. Sollzeiten f\u00fcr genaue Kalkulation.',
        },
        cadViewer: {
          title: '3D CAD Viewer',
          description: 'Betrachten Sie STEP-Dateien direkt im Browser mit Three.js. Drehen, zoomen und inspizieren Sie Teile ohne die App zu verlassen.',
        },
        issueManagement: {
          title: 'Problemmanagement',
          description: 'Melden Sie Qualit\u00e4tsprobleme mit Fotos. Admin-\u00dcberpr\u00fcfung und L\u00f6sungs-Workflow h\u00e4lt die Produktion auf Kurs.',
        },
        multiLanguage: {
          title: 'Mehrsprachig',
          description: 'Englisch, Niederl\u00e4ndisch, Deutsch von Haus aus. F\u00fcgen Sie weitere Sprachen mit i18next hinzu.',
        },
        darkMode: {
          title: 'Dunkelmodus',
          description: 'Angenehm f\u00fcr die Augen bei allen Lichtverh\u00e4ltnissen. Perfekt f\u00fcr Werkstattumgebungen.',
        },
        restApi: {
          title: 'REST API & Webhooks',
          description: 'Vollst\u00e4ndige API f\u00fcr ERP-Integration. Webhooks benachrichtigen externe Systeme \u00fcber Produktionsereignisse in Echtzeit.',
        },
        multiTenant: {
          title: 'Multi-Tenant bereit',
          description: 'Row-Level Security h\u00e4lt Mandantendaten vollst\u00e4ndig isoliert. Selbst hosten f\u00fcr Ihr Team oder mehrere Instanzen betreiben.',
        },
      },
      callToAction: 'Bereit Ihre Fertigung zu modernisieren?',
    },

    // Comparison section
    comparison: {
      badge: 'Entwickelt für KMU-Metallbearbeitung',
      title: 'Ein frischer Blick auf Produktionsmanagement',
      subtitle: 'Open Source, unbegrenzte Benutzer, keine Pro-Benutzer-Gebühren. Kostenlos starten und mitwachsen.',
      eryxonFlow: 'Eryxon Flow',
      theOthers: 'Traditionelles MES',
      othersExamples: 'PROPOS, 24Flow, Ridder iQ, MKG...',
      rows: {
        pricing: {
          label: 'Preismodell',
          eryxon: 'Kostenlos starten',
          eryxonNote: 'Unbegrenzte Benutzer inklusive',
          others: 'Pro-Benutzer-Lizenzen + Einrichtungsgebühren',
        },
        realtime: {
          label: 'Echtzeit-Updates',
          eryxon: 'Live-Sync auf allen Geräten',
          others: 'Manuelles Aktualisieren erforderlich',
        },
        api: {
          label: 'API & Integrationen',
          eryxon: 'REST API + Webhooks inklusive',
          others: 'Oft Zusatzkosten',
        },
        sourceCode: {
          label: 'Quellcode-Zugang',
          eryxon: 'Open Source (BSL 1.1)',
          others: 'Geschlossener Quellcode',
        },
        cadViewer: {
          label: 'CAD-Anzeige',
          eryxon: 'Integrierter 3D STEP Viewer',
          others: 'Externe CAD-Software',
        },
        pdfViewer: {
          label: 'PDF-Zeichnungen',
          eryxon: 'Inline PDF Viewer',
          others: 'Externe App',
        },
        substeps: {
          label: 'Arbeitsanweisungen',
          eryxon: 'Checklisten-gesteuerter Workflow',
          others: 'Basis oder fehlend',
        },
        assemblies: {
          label: 'Baugruppen-Support',
          eryxon: 'Mehrstufige Stücklisten',
          others: 'Nur flache Struktur',
        },
        capacity: {
          label: 'Kapazitätsplanung',
          eryxon: 'QRM mit WIP-Limits',
          others: 'Traditionelle Planung',
        },
        ui: {
          label: 'Benutzererfahrung',
          eryxon: 'Modern, mobilfähig',
          others: 'Desktop-orientiert',
        },
        deployment: {
          label: 'Bereitstellung',
          eryxon: 'Cloud oder selbst gehostet',
          others: 'Nur Anbieter-verwaltet',
        },
      },
      teamSection: {
        title: 'Für Ihr Team gebaut, nicht für IT-Abteilungen',
        description: 'Werkstatt-getestet. Intuitives Design. Ihr Team ist in Minuten startklar.',
        features: {
          simple: {
            title: 'Ein-Tipp Erfassung',
            description: 'Start/Stop mit einem Tipp',
          },
          models: {
            title: '3D Teil-Viewer',
            description: 'STEP Dateien im Browser ansehen',
          },
          checklists: {
            title: 'Schritt-Checklisten',
            description: 'Geführte Arbeitsanweisungen',
          },
          photos: {
            title: 'Foto-Meldungen',
            description: 'Probleme mit Fotos melden',
          },
        },
      },
    },

    // How It Works section
    howItWorks: {
      title: 'So funktioniert Eryxon Flow',
      description: 'Ein moderner Ansatz f\u00fcr die Fertigungsausf\u00fchrung. Verfolgen Sie jeden Auftrag, jedes Teil und jede Operation durch Ihren Produktionsworkflow.',
      steps: {
        create: {
          number: '1',
          title: 'Auftr\u00e4ge erstellen',
          description: 'Admin erstellt Auftr\u00e4ge mit Teilen und Operationen. Definieren Sie Materialien, gesch\u00e4tzte Zeiten und Workflow-Phasen.',
          code: 'Auftrag \u2192 Teile \u2192 Operationen',
        },
        assign: {
          number: '2',
          title: 'Zuweisen & Verfolgen',
          description: 'Weisen Sie Teile Bedienern zu. Sie sehen ihre Arbeitsliste, starten die Zeitmessung und verfolgen den Fortschritt in Echtzeit.',
          code: 'Start \u2192 Pause \u2192 Fertig',
        },
        analyze: {
          number: '3',
          title: 'Analysieren & Verbessern',
          description: 'Exportieren Sie Daten, \u00fcberpr\u00fcfen Sie Metriken und verbessern Sie kontinuierlich. REST API integriert mit Ihren bestehenden Systemen.',
          code: 'Daten \u2192 Erkenntnisse \u2192 Aktion',
        },
      },
      architecture: {
        title: 'Architektur',
        frontend: {
          title: 'React Frontend',
          description: 'Moderne UI mit TypeScript',
        },
        backend: {
          title: 'Supabase Backend',
          description: 'PostgreSQL + Edge Functions',
        },
        deployment: {
          title: 'Docker Bereitstellung',
          description: '\u00dcberall selbst hosten',
        },
        realtime: {
          title: 'Echtzeit-Updates',
          description: 'Live Produktionsstatus',
        },
      },
      callToAction: {
        title: 'Bereit Ihre Werkstatt zu modernisieren?',
        description: 'Stellen Sie Eryxon Flow heute bereit und beginnen Sie mit Echtzeit-Produktionsverfolgung. Open Source, vollst\u00e4ndig anpassbar und produktionsbereit.',
        button: 'Jetzt loslegen',
      },
    },

    // Get Started section
    getStarted: {
      title: 'In Minuten starten',
      description: 'Stellen Sie Eryxon Flow mit Docker bereit oder f\u00fchren Sie es lokal aus. Vollst\u00e4ndige Dokumentation verf\u00fcgbar.',
      terminal: {
        title: 'Schnellstart',
        comments: {
          clone: '# Repository klonen',
          install: '# Abh\u00e4ngigkeiten installieren',
          configure: '# Umgebung konfigurieren',
          start: '# Entwicklungsserver starten',
        },
      },
      buttons: {
        github: 'Auf GitHub ansehen',
        docs: 'Dokumentation',
      },
    },

    // Footer
    footer: {
      description: 'Open Source Manufacturing Execution System f\u00fcr Blechfertigung. Aus praktischer Erfahrung mit KMU-Metallbetrieben entwickelt. Ein Ausgangspunkt den Sie zu Ihrem eigenen machen k\u00f6nnen.',
      githubRepo: 'GitHub Repository',
      quickLinks: {
        title: 'Schnelle Links',
        features: 'Funktionen',
        howItWorks: 'So funktioniert es',
        getStarted: 'Loslegen',
        docs: 'Dokumentation',
      },
      community: {
        title: 'Community',
        issues: 'Issues & Support',
        discussions: 'Diskussionen',
        contributing: 'Beitragen',
        company: 'Sheet Metal Connect e.U.',
      },
      bottomBar: {
        copyright: '2025 Sheet Metal Connect e.U. Ver\u00f6ffentlicht unter der BSL 1.1.',
        madeBy: 'Erstellt von Luke van Enkhuizen aus Europa',
      },
    },

    // Common
    common: {
      learnMore: 'Mehr erfahren',
      viewAll: 'Alle anzeigen',
    },
  },
} as const;

// Helper function to get translations for a specific locale
export function getTranslations(locale: Locale = defaultLocale) {
  return translations[locale] || translations[defaultLocale];
}

// Type for translation keys (for TypeScript autocomplete)
export type TranslationKeys = typeof translations.en;
