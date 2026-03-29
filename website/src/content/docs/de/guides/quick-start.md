---
title: "Schnellstart"
description: "Eryxon Flow in wenigen Minuten einrichten und verwenden."
---

Eryxon Flow schnell einrichten.

> **Einfach ausprobieren?** Testen Sie die [Live-Demo auf app.eryxon.eu](https://app.eryxon.eu) — keine Einrichtung nötig. Registrieren und sofort loslegen.

---

## Voraussetzungen

- Node.js 20+ ([Download](https://nodejs.org))
- Ein Supabase-Konto (kostenloser Tarif reicht) - [Anmelden](https://supabase.com)

---

## Schritt 1: Supabase Einrichten

### 1.1 Projekt Erstellen

1. Gehen Sie zu [supabase.com](https://supabase.com) → **New Project**
2. Benennen Sie es `eryxon-flow`
3. Speichern Sie Ihr Datenbank-Passwort
4. Klicken Sie auf **Create**

### 1.2 Ihre Schlüssel Abrufen

Gehen Sie zu **Settings** → **API** und kopieren Sie:
- **Project URL** (z.B. `https://abc123.supabase.co`)
- **anon public key** (beginnt mit `eyJ...`)

### 1.3 Datenbankschema Anwenden

Verwenden Sie die Supabase CLI für Ihr Zielprojekt:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### 1.4 Seed-Daten Anwenden

Die Seed-Datei richtet Speicherrichtlinien, RLS-Standardwerte und Cron-Jobs ein:

```bash
supabase db execute --file supabase/seed.sql
```

### 1.5 Speicher-Buckets Erstellen

```bash
supabase storage create parts-images
supabase storage create issues
supabase storage create parts-cad
supabase storage create batch-images
```

### 1.6 Edge Functions Bereitstellen

```bash
supabase functions deploy
```

### 1.7 Edge Function Secrets Setzen

Gehen Sie zu **Settings** → **API** und kopieren Sie den **service_role** Schlüssel, dann:

```bash
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Konfigurieren Sie den `notify-new-signup` Database Webhook nachdem die Migrationen angewendet wurden (siehe [Self-Hosting-Anleitung](/guides/self-hosting/)).

> **Automatisierung bevorzugt?** Führen Sie `bash scripts/setup.sh` aus — es führt Sie interaktiv durch alles oben Genannte.

---

## Schritt 2: Die Anwendung Starten

```bash
git clone https://github.com/SheetMetalConnect/eryxon-flow.git
cd eryxon-flow

npm install

cp .env.example .env
```

Bearbeiten Sie `.env`:
```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```

Starten Sie die App:
```bash
npm run dev
```

Öffnen Sie **http://localhost:8080**

---

## Schritt 3: Ihr Konto Erstellen

1. Klicken Sie auf **Sign Up**
2. Geben Sie E-Mail und Passwort ein
3. Bestätigen Sie Ihre E-Mail (Posteingang prüfen)
4. Sie sind jetzt Admin Ihrer Organisation!

---

## Schritt 4: Erkunden (Optional)

### Demo-Daten Laden

Möchten Sie die App mit Beispieldaten sehen?

1. Gehen Sie zu **Settings** in der Admin-Seitenleiste
2. Klicken Sie auf **Create Demo Data**
3. Erkunden Sie Beispiel-Aufträge, Teile und Arbeitsgänge

### Schnelle Rundführung

| Seite | Was sie tut |
|-------|------------|
| `/admin/dashboard` | Produktionsübersicht |
| `/admin/jobs` | Fertigungsaufträge verwalten |
| `/admin/jobs/new` | Neuen Auftrag erstellen |
| `/operator/work-queue` | Aufgabenliste Werker |
| `/operator/login` | Terminal-Anmeldung Werkstatt |
| `/admin/config/stages` | Arbeitsstufen konfigurieren |

---

## Was Nun?

**Einrichtung & Deployment:**
- [Deployment-Anleitung](/guides/deployment/) - Optionen für Produktions-Deployment
- [Self-Hosting-Anleitung](/guides/self-hosting/) - Umgebungs- und Ausrolldetails
- [MCP Server Setup](/guides/mcp-setup/) - KI-Assistenten-Integration einrichten

**API & Integration:**
- [REST API Übersicht](/architecture/connectivity-rest-api/) - Integrationsarchitektur
- [REST API Referenz](/api/rest-api-reference/) - Vollständige Endpoint-Referenz
- [API Payload Referenz](/api/payload-reference/) - Kopier-und-Einfüge-Payload-Beispiele
- [MCP Demo-Anleitung](/api/mcp-demo-guide/) - Beispiele für KI-Assistenten-Nutzung
- [Webhooks & MQTT](/architecture/connectivity-mqtt/) - Event-gesteuerte Integration
- **Swagger/OpenAPI** - In der App verfügbar unter `/admin/api-docs` (Anmeldung erforderlich)

**Architektur & Hilfe:**
- [App-Architektur](/architecture/app-architecture/) - Systemdesign-Übersicht
- [FAQ](/de/guides/faq) - Häufig gestellte Fragen

---

## Häufige Probleme

**Kann mich nicht registrieren?**
- Prüfen Sie, ob Ihre Supabase URL in `.env` korrekt ist
- Überprüfen Sie die E-Mail-Einstellungen im Supabase Auth-Dashboard

**Datenbankfehler?**
- Stellen Sie sicher, dass Sie das Schema-SQL ausgeführt haben
- Prüfen Sie den SQL Editor auf Fehler

**Seite lädt nicht?**
- Vergewissern Sie sich, dass beide Umgebungsvariablen gesetzt sind
- Prüfen Sie die Browser-Konsole auf Fehler

---

## Hilfe Benötigt?

- Beginnen Sie bei der [Dokumentations-Startseite](/)
- Erstellen Sie ein Issue auf GitHub
- Beteiligen Sie sich an unseren Community-Diskussionen

---

*Viel Erfolg in der Fertigung!*
