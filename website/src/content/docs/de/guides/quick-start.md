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
- Docker für den lokalen Supabase-Stack (oder ein gehostetes Supabase-Projekt)

## Lokal starten

```sh
git clone https://github.com/SheetMetalConnect/eryxon-flow.git
cd eryxon-flow
npm ci
npx supabase start      # lokales Postgres, Auth, Storage und Edge Functions; zeigt API-URL und anon key
cp .env.example .env    # URL und anon key in VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY eintragen
npm run dev             # http://localhost:8080
```

Die erste Registrierung legt die Werkstatt und ihren Administrator an. `npx supabase stop`
fährt den lokalen Stack herunter. Für die Entwicklung gegen ein gehostetes
Supabase-Projekt tragen Sie dessen URL und anon key in `.env` ein und überspringen
`supabase start`; die [Self-Hosting-Anleitung](/guides/self-hosting/) beschreibt
Migrationen, Funktions-Secrets und den Produktionsbetrieb. Werte mit dem Präfix `VITE_`
sind im Browser sichtbar; Service-Role-Schlüssel gehören auf das Backend.

## Die Anwendung nutzen

Administratoren verwalten Aufträge, Teile, Arbeitsgänge und Arbeitszellen.
Bediener nutzen [Arbeitswarteschlange und Terminal](/guides/operator-manual/) auf
Smartphone, Tablet und Desktop. Alle Bildschirmgrößen verwenden dieselbe responsive
Oberfläche.

Für den Produktionsbetrieb siehe [Self-Hosting-Anleitung](/guides/self-hosting/).
Die PWA-Installation ist optional und muss beim Build aktiviert werden; siehe
[PWA-Konfiguration](/guides/self-hosting/#optional-pwa-verification).
