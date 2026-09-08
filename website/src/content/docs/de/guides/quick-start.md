---
title: "Schnellstart"
description: "Eryxon Flow in wenigen Minuten einrichten und verwenden."
---

Eryxon Flow schnell einrichten.

> **Einfach ausprobieren?** Öffnen Sie die [gehostete Version auf app.eryxon.eu](https://app.eryxon.eu) - keine Einrichtung nötig. Eine kostenlose 30-Tage-Testversion.

> Selbst-Hosting betreibt die kostenlose **Community**-Edition, Quelltext verfügbar unter der Business Source License 1.1 — kostenlos selbst hostbar für einen einzelnen Betrieb. Der Betrieb an mehreren Standorten erfordert eine kommerzielle Lizenz; siehe [Editionen & Preise](/pricing/).

---

## Voraussetzungen

- Node.js **22.12 oder neuer**
- Zugriff auf das private Quellcode-Repository
- Ein Supabase-Backend, das zur verwendeten Quellcodeversion passt

Die [Self-Hosting-Anleitung](/guides/self-hosting/) beschreibt die Einrichtung des
Backends, Migrationen, Funktions-Secrets und den Produktionsbetrieb. Dort steht die
aktuelle Bereitstellungsfolge. Die folgenden Schritte starten ein lokales Frontend
mit diesem vorbereiteten Backend.

## Lokal starten

```sh
git clone https://github.com/SheetMetalConnect/eryxon-flow.git
cd eryxon-flow
npm ci
cp .env.example .env
```

Tragen Sie die öffentlichen Frontend-Einstellungen Ihres Backends in `.env` ein:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-public-key
VITE_SUPABASE_PROJECT_ID=your-project
```

Werte mit dem Präfix `VITE_` sind im Browser sichtbar. Service-Role-Schlüssel und
andere geheime Zugangsdaten gehören ausschließlich auf das Backend.

```sh
npm run dev
```

Öffnen Sie [localhost:8080](http://localhost:8080) und melden Sie sich an. Wenn die
Registrierung aktiviert ist, erstellen Sie Ihre Organisation zuerst über **Sign Up**.

## Die Anwendung nutzen

Administratoren verwalten Aufträge, Teile, Arbeitsgänge und Arbeitszellen.
Bediener nutzen [Arbeitswarteschlange und Terminal](/guides/operator-manual/) auf
Smartphone, Tablet und Desktop. Alle Bildschirmgrößen verwenden dieselbe responsive
Oberfläche.

Für den Produktionsbetrieb siehe [Deployment-Anleitung](/guides/deployment/).
Die PWA-Installation ist optional und muss beim Build aktiviert werden; siehe
[PWA-Konfiguration](/guides/self-hosting/#optional-pwa-verification).
