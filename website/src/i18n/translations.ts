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
      badge: 'By metalworkers, for metalworkers',
      title: 'The MES You Actually Want to Use',
      subtitle: 'Free to start. Loved by SMBs. No expensive licenses or per-seat fees.',
      eryxonFlow: 'Eryxon Flow',
      theOthers: 'The Others',
      othersExamples: 'PROPOS, 24Flow, Ridder iQ, MKG, Bemet...',
      rows: {
        pricing: {
          label: 'Pricing',
          eryxon: 'Free to start',
          eryxonNote: 'Pay for data usage, not per user',
          others: 'Per-user licenses + setup fees',
        },
        realtime: {
          label: 'Real-time Updates',
          eryxon: 'Instant updates everywhere',
          others: 'Refresh to see changes',
        },
        api: {
          label: 'API Access',
          eryxon: 'Open REST API + Webhooks',
          others: 'Proprietary / extra cost',
        },
        sourceCode: {
          label: 'Source Code',
          eryxon: 'Open Source (BSL 1.1)',
          others: 'Closed / vendor lock-in',
        },
        cadViewer: {
          label: '3D CAD Viewer',
          eryxon: 'Built-in STEP viewer',
          others: 'Separate software needed',
        },
        pdfViewer: {
          label: 'PDF Drawing Viewer',
          eryxon: 'Inline PDF viewer',
          others: 'External app',
        },
        substeps: {
          label: 'Substeps & Templates',
          eryxon: 'Checklist-driven workflow',
          others: 'Basic or missing',
        },
        assemblies: {
          label: 'Assembly Support',
          eryxon: 'Multi-level assemblies',
          others: 'Flat structure only',
        },
        capacity: {
          label: 'Capacity Planning',
          eryxon: 'QRM: less work-in-progress',
          others: 'Push everything at once',
        },
        ui: {
          label: 'User Interface',
          eryxon: 'Modern, mobile-first',
          others: 'Desktop-era design',
        },
        deployment: {
          label: 'Deployment',
          eryxon: 'Cloud or self-hosted',
          others: 'On-premise only',
        },
      },
      teamSection: {
        title: 'Built for Your Team, Not IT Departments',
        description: 'Shop floor tested. Zero training needed. Your operators will thank you.',
        features: {
          simple: {
            title: 'Simple & Fast',
            description: 'One-tap time tracking',
          },
          models: {
            title: '3D Models',
            description: 'View STEP files inline',
          },
          checklists: {
            title: 'Substep Checklists',
            description: 'Guided procedures',
          },
          photos: {
            title: 'Photo Issues',
            description: 'Report with camera',
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
      badge: 'Door metaalbewerkers, voor metaalbewerkers',
      title: 'Het MES dat je \u00e9cht wilt gebruiken',
      subtitle: 'Gratis starten. Geliefd bij MKB. Geen dure licenties of per-gebruiker kosten.',
      eryxonFlow: 'Eryxon Flow',
      theOthers: 'De anderen',
      othersExamples: 'PROPOS, 24Flow, Ridder iQ, MKG, Bemet...',
      rows: {
        pricing: {
          label: 'Prijzen',
          eryxon: 'Gratis starten',
          eryxonNote: 'Betaal voor dataverbruik, niet per gebruiker',
          others: 'Per-gebruiker licenties + opstartkosten',
        },
        realtime: {
          label: 'Realtime Updates',
          eryxon: 'Directe updates overal',
          others: 'Verversen om wijzigingen te zien',
        },
        api: {
          label: 'API Toegang',
          eryxon: 'Open REST API + Webhooks',
          others: 'Proprietary / extra kosten',
        },
        sourceCode: {
          label: 'Broncode',
          eryxon: 'Open Source (BSL 1.1)',
          others: 'Gesloten / vendor lock-in',
        },
        cadViewer: {
          label: '3D CAD Viewer',
          eryxon: 'Ingebouwde STEP viewer',
          others: 'Aparte software nodig',
        },
        pdfViewer: {
          label: 'PDF Tekening Viewer',
          eryxon: 'Inline PDF viewer',
          others: 'Externe app',
        },
        substeps: {
          label: 'Substappen & Templates',
          eryxon: 'Checklist-gedreven workflow',
          others: 'Basis of ontbrekend',
        },
        assemblies: {
          label: 'Assemblage Support',
          eryxon: 'Multi-level assemblages',
          others: 'Alleen platte structuur',
        },
        capacity: {
          label: 'Capaciteitsplanning',
          eryxon: 'QRM: minder onderhanden werk',
          others: 'Alles tegelijk pushen',
        },
        ui: {
          label: 'Gebruikersinterface',
          eryxon: 'Modern, mobile-first',
          others: 'Desktop-era design',
        },
        deployment: {
          label: 'Deployment',
          eryxon: 'Cloud of zelf gehost',
          others: 'Alleen on-premise',
        },
      },
      teamSection: {
        title: 'Gebouwd voor je team, niet IT-afdelingen',
        description: 'Werkvloer getest. Geen training nodig. Je operators zullen je dankbaar zijn.',
        features: {
          simple: {
            title: 'Simpel & Snel',
            description: 'Tijdregistratie met \u00e9\u00e9n tik',
          },
          models: {
            title: '3D Modellen',
            description: 'Bekijk STEP bestanden inline',
          },
          checklists: {
            title: 'Substap Checklists',
            description: 'Begeleide procedures',
          },
          photos: {
            title: 'Foto Problemen',
            description: 'Meld met camera',
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
      badge: 'Von Metallbearbeitern, f\u00fcr Metallbearbeiter',
      title: 'Das MES das Sie wirklich nutzen wollen',
      subtitle: 'Kostenlos starten. Von KMUs geliebt. Keine teuren Lizenzen oder Pro-Benutzer-Geb\u00fchren.',
      eryxonFlow: 'Eryxon Flow',
      theOthers: 'Die anderen',
      othersExamples: 'PROPOS, 24Flow, Ridder iQ, MKG, Bemet...',
      rows: {
        pricing: {
          label: 'Preise',
          eryxon: 'Kostenlos starten',
          eryxonNote: 'Zahlen Sie f\u00fcr Datenverbrauch, nicht pro Benutzer',
          others: 'Pro-Benutzer-Lizenzen + Einrichtungsgeb\u00fchren',
        },
        realtime: {
          label: 'Echtzeit-Updates',
          eryxon: 'Sofortige Updates \u00fcberall',
          others: 'Aktualisieren um \u00c4nderungen zu sehen',
        },
        api: {
          label: 'API-Zugang',
          eryxon: 'Offene REST API + Webhooks',
          others: 'Propriet\u00e4r / Zusatzkosten',
        },
        sourceCode: {
          label: 'Quellcode',
          eryxon: 'Open Source (BSL 1.1)',
          others: 'Geschlossen / Vendor Lock-in',
        },
        cadViewer: {
          label: '3D CAD Viewer',
          eryxon: 'Integrierter STEP Viewer',
          others: 'Separate Software erforderlich',
        },
        pdfViewer: {
          label: 'PDF Zeichnungs-Viewer',
          eryxon: 'Inline PDF Viewer',
          others: 'Externe App',
        },
        substeps: {
          label: 'Unterschritte & Vorlagen',
          eryxon: 'Checklisten-gesteuerter Workflow',
          others: 'Basis oder fehlend',
        },
        assemblies: {
          label: 'Baugruppen-Support',
          eryxon: 'Mehrstufige Baugruppen',
          others: 'Nur flache Struktur',
        },
        capacity: {
          label: 'Kapazit\u00e4tsplanung',
          eryxon: 'QRM: weniger Umlaufbest\u00e4nde',
          others: 'Alles auf einmal durchdr\u00fccken',
        },
        ui: {
          label: 'Benutzeroberfl\u00e4che',
          eryxon: 'Modern, Mobile-first',
          others: 'Desktop-\u00c4ra Design',
        },
        deployment: {
          label: 'Bereitstellung',
          eryxon: 'Cloud oder selbst gehostet',
          others: 'Nur On-Premise',
        },
      },
      teamSection: {
        title: 'F\u00fcr Ihr Team gebaut, nicht f\u00fcr IT-Abteilungen',
        description: 'Werkstatt-getestet. Keine Schulung erforderlich. Ihre Bediener werden es Ihnen danken.',
        features: {
          simple: {
            title: 'Einfach & Schnell',
            description: 'Ein-Tipp Zeiterfassung',
          },
          models: {
            title: '3D Modelle',
            description: 'STEP Dateien inline ansehen',
          },
          checklists: {
            title: 'Unterschritt-Checklisten',
            description: 'Gef\u00fchrte Abl\u00e4ufe',
          },
          photos: {
            title: 'Foto-Probleme',
            description: 'Mit Kamera melden',
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
