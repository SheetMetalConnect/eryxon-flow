---
title: Willkommen bei Eryxon Flow
description: Das einfache, elegante und leistungsstarke Manufacturing Execution System, mit dem Ihre Mitarbeiter gerne arbeiten. Entwickelt für die Metallverarbeitung.
---

Eryxon Flow ist ein tabletfreundliches Manufacturing Execution System für metallverarbeitende Lohnfertiger - verfolgen Sie Aufträge vom ERP bis auf den Shopfloor, ohne die Werkerakzeptanz zu verlieren.

## Wählen Sie Ihren Pfad

Wählen Sie den Einstieg, der zu Ihrer Evaluierung passt.

<div style="display:grid;gap:var(--ery-space-4);grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin:var(--ery-space-6) 0;">
  <a href="https://app.eryxon.eu" data-cta-id="docs_intro_hosted_path_de" data-cta-surface="docs_intro_path_chooser" data-cta-kind="hosted_app" data-cta-locale="de" style="display:block;padding:var(--ery-space-5);border:1px solid var(--ery-border);border-radius:var(--ery-radius);background:var(--ery-surface-subtle);text-decoration:none;min-height:var(--ery-touch-min);">
    <strong style="display:block;color:var(--ery-text);margin-bottom:var(--ery-space-2);">Hosted-Test starten</strong>
    <span style="color:var(--ery-text-muted);font-size:var(--ery-text-sm);">Testen Sie die Live-App auf app.eryxon.eu ohne Installation. Ideal für den ersten Eindruck.</span>
  </a>
  <a href="/de/managed-rollout/" data-cta-id="docs_intro_rollout_path_de" data-cta-surface="docs_intro_path_chooser" data-cta-kind="rollout_page" data-cta-locale="de" style="display:block;padding:var(--ery-space-5);border:1px solid var(--ery-border);border-radius:var(--ery-radius);background:var(--ery-surface-subtle);text-decoration:none;min-height:var(--ery-touch-min);">
    <strong style="display:block;color:var(--ery-text);margin-bottom:var(--ery-space-2);">Begleiteten Rollout planen</strong>
    <span style="color:var(--ery-text-muted);font-size:var(--ery-text-sm);">Erhalten Sie Unterstützung für Deployment, ERP-Integration und Einführungsplanung.</span>
  </a>
  <a href="/de/guides/self-hosting/" data-cta-id="docs_intro_selfhost_path_de" data-cta-surface="docs_intro_path_chooser" data-cta-kind="self_host" data-cta-locale="de" style="display:block;padding:var(--ery-space-5);border:1px solid var(--ery-border);border-radius:var(--ery-radius);background:var(--ery-surface-subtle);text-decoration:none;min-height:var(--ery-touch-min);">
    <strong style="display:block;color:var(--ery-text);margin-bottom:var(--ery-space-2);">Self-Hosting evaluieren</strong>
    <span style="color:var(--ery-text-muted);font-size:var(--ery-text-sm);">Betreiben Sie Eryxon auf Ihrer eigenen Infrastruktur. Kostenlos und quelloffen unter Apache 2.0.</span>
  </a>
</div>

![Eryxon Flow admin dashboard](../../../assets/step-1.png)

## Passt es zu Ihrer Werkstatt?

- **Werker** erhalten eine touchfreundliche Arbeitswarteschlange: Arbeit nach Stufe ziehen, Zeit erfassen, STEP/PDF ansehen und Probleme direkt auf dem Shopfloor melden.
- **Admins** erhalten Echtzeit-Transparenz: wer woran arbeitet, Issue-Freigaben, Termin-Overrides sowie Stufen- und Materialkonfiguration.
- **Technische Evaluatoren** erhalten ein API-first System: 24 REST-Endpunkte, Webhooks, MQTT, MCP-Server und planungsseitige Adapter für FrePPLe und Odoo.

## Was Es Macht

Eryxon verfolgt Aufträge, Teile und Aufgaben durch die Produktion mit einer mobil- und tabletfreundlichen Oberfläche. Daten kommen über eine API aus Ihrem ERP.

### Für Werker
Die Oberfläche zeigt, woran gearbeitet werden muss, gruppiert nach Materialien und Fertigungsstufen — organisiert so, wie Ihre Werkstatt läuft, nicht wie Buchhalter denken.
- **Visuelle Indikatoren** (Farben, Bilder) machen Aufgaben sofort erkennbar.
- **STEP-Datei-Viewer** zeigt die Geometrie.
- **PDF-Viewer** zeigt die Zeichnungen.
- Start- und Stoppzeit bei Aufgaben erfassen.
- Probleme melden, wenn etwas nicht stimmt.

Alles was nötig ist, nichts Überflüssiges.

### Für Administratoren
Sehen Sie in Echtzeit, wer woran arbeitet.
- Bestimmte Arbeit bestimmten Personen zuweisen.
- Problemmeldungen prüfen und genehmigen.
- Termine bei Bedarf überschreiben.
- Stufen, Materialien und Vorlagen konfigurieren.

Echte Einblicke in die Werkstattaktivitäten, ohne die Halle betreten zu müssen.

### Arbeitsorganisation
Arbeit wird **Kanban-artig** mit visuellen Spalten pro Stufe dargestellt. Werker sehen, was verfügbar ist, und ziehen Arbeit, wenn sie bereit sind — nicht durch einen Zeitplan geschoben. Stufen repräsentieren Fertigungszonen (Schneiden, Biegen, Schweißen, Montage).

**Quick Response Manufacturing (QRM)** Prinzipien sind eingebaut:
- Visuelle Indikatoren zeigen, wenn zu viele Aufträge oder Teile in derselben Stufe sind.
- Umlaufbestand (WIP) pro Stufe begrenzen, um den Durchfluss aufrechtzuerhalten.
- Fortschritt nach Stufenabschluss verfolgen, nicht nur einzelne Bearbeitungszeiten.
- Zeiterfassung zeigt, was noch übrig ist, nicht nur was erledigt wurde.
- **Echtzeit-Updates** — Änderungen erscheinen sofort auf allen Bildschirmen.

### Flexible Daten
Aufträge, Teile und Aufgaben unterstützen **benutzerdefinierte JSON-Metadaten** — Maschineneinstellungen, Biegefolgen, Schweißparameter. Definieren Sie wiederverwendbare Ressourcen wie Formen, Werkzeuge, Vorrichtungen oder Materialien und verknüpfen Sie diese mit der Arbeit. Werker sehen, was benötigt wird, und etwaige benutzerdefinierte Anweisungen in der Aufgabenansicht.

---

## Benutzer & Rollen

### Werker
Sehen ihre Arbeitswarteschlange, erfassen Start-/Stoppzeiten, markieren Aufgaben als erledigt, betrachten Dateien und melden Qualitätsprobleme.

### Administratoren
Können alles, was Werker können, plus: bestimmte Arbeit bestimmten Personen zuweisen, Probleme verwalten, Termine überschreiben und Stufen/Materialien/Vorlagen konfigurieren.

> **Hinweis:** Werker-Konten können als Maschinen markiert werden für autonome Prozesse.

---

## Echtzeit-Einblick

Verfolgen Sie in Echtzeit, wer anwesend ist und woran gearbeitet wird. Kein Raten, keine Verzögerungen. Änderungen erscheinen sofort auf allen Bildschirmen über **WebSocket-Updates**.

---

## Integration-First-Architektur

**100% API-gesteuert.** Ihr ERP sendet Aufträge, Teile und Aufgaben über 24 REST-API-Endpunkte (Beta). Eryxon sendet Abschlussereignisse zurück über Webhooks (Beta) oder MQTT (Beta) — der MQTT-Client bringt in v0.5 Retry, Circuit Breaker und Dead-Letter-Logging mit. Der MCP-Server (Live) ermöglicht KI/Automatisierungs-Integration mit stdio für lokale Clients und Streamable HTTP für vertrauenswürdige selbstgehostete Deployments.

### Dateihandhabung
Fordern Sie eine signierte Upload-URL über die API an, laden Sie STEP- und PDF-Dateien direkt in den Supabase Storage hoch und referenzieren Sie dann den Dateipfad beim Erstellen von Aufträgen oder Teilen. Große Dateien (typisch 5-50 MB) werden direkt in den Speicher hochgeladen — keine Timeouts, keine API-Engpässe.

### Benutzerdefinierte Metadaten
Fügen Sie JSON-Payloads zu Aufträgen, Teilen und Aufgaben hinzu für Ihre spezifischen Anforderungen — Werkzeuganforderungen, Formnummern, Maschineneinstellungen, Materialspezifikationen, alles was Ihre Werkstatt nachverfolgen muss.

### ERP- & Planungs-Integrationen
Partner wie **Sheet Metal Connect e.U.** bauen Integrationen für gängige ERP-Systeme. Oder bauen Sie Ihre eigene mit unseren GitHub-Starter-Kits mit Beispielcode und Dokumentation. v0.5 liefert außerdem steckbare Planungs-Adapter im **Beta**-Status für **FrePPLe** und **Odoo MRP**.

### Montage-Verfolgung
Teile können Eltern-Kind-Beziehungen haben. Visuelle Gruppierung zeigt Baugruppen mit verschachtelten Komponenten. Nicht-blockierende Abhängigkeitswarnungen erinnern Werker daran, wann Unterteile fertig sein sollten, bevor Montageaufgaben beginnen — sie können dies aber bei Bedarf überschreiben.

### Problemmeldung
Werker erstellen Problemmeldungen (NCRs) aus aktiven Aufgaben mit Beschreibung, Schweregrad und optionalen Fotos. Einfacher Genehmigungsworkflow: ausstehend → genehmigt/abgelehnt → geschlossen. Problemmeldungen sind informativ — sie blockieren nicht den Arbeitsfortschritt.

---

## Was Wir Nicht Tun (Bewusst)

*   **Keine Finanzverfolgung.** Wir erfassen die Arbeitszeit, nicht Kosten, Preise oder Margen.
*   **Kein Einkauf.** Aufgaben können als extern markiert werden (Fremdvergabe) und der Status kann über die API verfolgt werden, aber es gibt keine Bestellverwaltung oder Lieferantentransaktionen.
*   **Keine Stücklistenverwaltung.** Wir verfolgen, was produziert werden muss, nicht Artikeldetails oder Bestände. Teile können Eltern-Kind-Verknüpfungen für Montagevisualisierung haben, aber keine mehrstufigen Stücklisten, die nicht in der Produktion leben.
*   **Keine Planung.** Termine kommen meist aus Ihrem ERP, aber Administratoren können diese jederzeit manuell überschreiben. Wir berechnen oder optimieren keine Zeitpläne — Sie behalten die Kontrolle.
*   **Keine Berichte.** Nur Echtzeit-Statistikpanels. Keine eingebauten historischen Analysen — aber alle Daten sind über API/MCP für Ihre eigenen Berichte zugänglich.

---

## Technischer Stack

*   **Frontend:** React + TypeScript
*   **Backend:** Supabase (PostgreSQL, Edge Functions, Realtime, Storage)
*   **Auth:** JWT-basiert mit rollenbasierter Zugriffskontrolle
*   **Dateien:** Supabase Storage mit signierten URLs
*   **STEP-Viewer:** occt-import-js für clientseitiges STEP-Parsing + Three.js-Rendering
*   **Integration:** REST-API, Webhooks, MCP-Server
