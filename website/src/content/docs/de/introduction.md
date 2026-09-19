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
    <span style="color:var(--ery-text-muted);font-size:var(--ery-text-sm);">Der Quelltext liegt auf GitHub — lesen, ändern und selbst hosten. Kostenlos selbst hostbar für einen einzelnen Betrieb unter der Business Source License 1.1.</span>
  </a>
</div>

![Eryxon Flow admin dashboard](../../../assets/step-1.png)

## Passt es zu Ihrer Werkstatt?

- **Werker** erhalten eine touchfreundliche Arbeitswarteschlange: Arbeit nach Zelle ziehen, Zeit erfassen, STEP/PDF ansehen und Probleme direkt auf dem Shopfloor melden.
- **Admins** erhalten Echtzeit-Transparenz: wer woran arbeitet, Issue-Freigaben, Termin-Overrides sowie Zellen- und Ressourcenkonfiguration.
- **Technische Evaluatoren** erhalten ein API- und MCP-natives System. UI, REST-API und MCP-Server rufen dieselben Postgres-Funktionen und Zeilenschutzregeln auf, und jede Änderung löst dieselben signierten Webhooks aus. Ein MCP-Client wie Claude kann Produktion planen, freigeben, starten, melden und abfragen, mit denselben Schranken wie ein Werker.

## Was Es Macht

Eryxon verfolgt Aufträge, Teile und Arbeitsgänge durch die Produktion mit einer mobil- und tabletfreundlichen Oberfläche. Daten können über die API aus Ihrem ERP kommen.

### Für Werker
Die Oberfläche zeigt, woran gearbeitet werden muss, gruppiert nach Materialien und Fertigungszellen — organisiert so, wie Ihre Werkstatt läuft, nicht wie Buchhalter denken.
- **Visuelle Indikatoren** (Farben, Bilder) machen Arbeitsgänge sofort erkennbar.
- **STEP-Datei-Viewer** zeigt die Geometrie.
- **PDF-Viewer** zeigt die Zeichnungen.
- Start- und Stoppzeit bei Arbeitsgängen erfassen.
- Probleme melden, wenn etwas nicht stimmt.

Alles was nötig ist, nichts Überflüssiges.

### Für Administratoren
Sehen Sie in Echtzeit, wer woran arbeitet.
- Bestimmte Arbeit bestimmten Personen zuweisen.
- Problemmeldungen prüfen und genehmigen.
- Termine bei Bedarf überschreiben.
- Zellen, Ressourcen und Vorlagen konfigurieren.

Echte Einblicke in die Werkstattaktivitäten, ohne die Halle betreten zu müssen.

### Arbeitsorganisation
Arbeit wird **Kanban-artig** mit visuellen Spalten pro Zelle dargestellt. Werker sehen, was verfügbar ist, und ziehen Arbeit, wenn sie bereit sind. Zellen repräsentieren Fertigungszonen wie Schneiden, Biegen, Schweißen und Montage.

**Quick Response Manufacturing (QRM)** Prinzipien sind eingebaut:
- Visuelle Indikatoren zeigen, wenn zu viele Aufträge oder Teile in derselben Zelle sind.
- Umlaufbestand (WIP) pro Zelle begrenzen, um den Durchfluss aufrechtzuerhalten.
- Fortschritt entlang des Routings verfolgen, nicht nur einzelne Bearbeitungszeiten.
- Zeiterfassung zeigt, was noch übrig ist, nicht nur was erledigt wurde.
- **Echtzeit-Updates** — Änderungen erscheinen sofort auf allen Bildschirmen.

### Flexible Daten
Aufträge, Teile und Arbeitsgänge unterstützen **benutzerdefinierte JSON-Metadaten** — Maschineneinstellungen, Biegefolgen und Schweißparameter. Definieren Sie wiederverwendbare Ressourcen wie Formen, Werkzeuge oder Vorrichtungen und verknüpfen Sie diese mit der Arbeit. Werker sehen, was benötigt wird, und etwaige Anweisungen in der Arbeitsgangsansicht.

---

## Benutzer & Rollen

### Werker
Sehen ihre Arbeitswarteschlange, erfassen Start-/Stoppzeiten, schließen Arbeitsgänge ab, betrachten Dateien und melden Qualitätsprobleme.

### Administratoren
Können alles, was Werker können, plus: Arbeit zuweisen, Probleme verwalten, Termine überschreiben und Zellen, Ressourcen und Vorlagen konfigurieren.

> **Hinweis:** Werker-Konten können als Maschinen markiert werden für autonome Prozesse.

---

## Echtzeit-Einblick

Verfolgen Sie in Echtzeit, wer anwesend ist und woran gearbeitet wird. Kein Raten, keine Verzögerungen. Änderungen erscheinen sofort auf allen Bildschirmen über **WebSocket-Updates**.

---

## Integration-First-Architektur

Ihr ERP kann Aufträge, Teile und Arbeitsgänge über die [REST-API](/api/rest-api-reference/) anlegen. Eryxon sendet festgeschriebene Produktionsänderungen über [signierte Webhooks](/architecture/connectivity-webhooks) zurück. Der optionale [MCP-Server](/guides/mcp-setup/) stellt dieselben Produktionsregeln für freigegebene Automatisierung über stdio oder authentifiziertes Streamable HTTP bereit.

### Dateihandhabung
Fordern Sie eine signierte Upload-URL über die API an, laden Sie STEP- und PDF-Dateien direkt in den Supabase Storage hoch und referenzieren Sie dann den Dateipfad beim Erstellen von Aufträgen oder Teilen. Große Dateien (typisch 5-50 MB) werden direkt in den Speicher hochgeladen — keine Timeouts, keine API-Engpässe.

### Benutzerdefinierte Metadaten
Fügen Sie Aufträgen, Teilen und Arbeitsgängen JSON-Metadaten für Werkzeuganforderungen, Formnummern, Maschineneinstellungen und Materialspezifikationen hinzu.

### ERP- & Planungs-Integrationen
Partner wie **Sheet Metal Connect e.U.** bauen Integrationen für gängige ERP-Systeme. Sie können auch selbst über die [REST-API](/api/rest-api-reference/) und die [Payload-Referenz](/api/payload-reference/) integrieren.

### Montage-Verfolgung
Teile können Eltern-Kind-Beziehungen haben. Visuelle Gruppierung zeigt Baugruppen mit verschachtelten Komponenten. Nicht-blockierende Abhängigkeitswarnungen erinnern Werker daran, wann Unterteile fertig sein sollten, bevor Montagearbeitsgänge beginnen.

### Problemmeldung
Werker erstellen Problemmeldungen (NCRs) aus aktiven Arbeitsgängen mit Beschreibung, Schweregrad und optionalen Fotos. Der Ablauf ist ausstehend → genehmigt/abgelehnt → geschlossen. Eine Meldung blockiert Arbeit nur, wenn sie als Stillstand markiert ist.

---

## Was Wir Nicht Tun (Bewusst)

*   **Keine Finanzverfolgung.** Wir erfassen die Arbeitszeit, nicht Kosten, Preise oder Margen.
*   **Kein Einkauf.** Arbeitsgänge können Fremdvergabe darstellen und über die API verfolgt werden, aber es gibt keine Bestellverwaltung oder Lieferantenabwicklung.
*   **Keine Stücklistenverwaltung.** Wir verfolgen, was produziert werden muss, nicht Artikeldetails oder Bestände. Teile können Eltern-Kind-Verknüpfungen für Montagevisualisierung haben, aber keine mehrstufigen Stücklisten, die nicht in der Produktion leben.
*   **Einfache Planung.** Der kapazitätsbasierte Planer kann Arbeitsgänge unter Berücksichtigung des Werkskalenders auf Zellen verteilen. Er ist kein APS-Optimierer; Termine können auch aus dem ERP kommen und Administratoren können Fälligkeiten überschreiben.
*   **Keine Berichte.** Nur Echtzeit-Statistikpanels. Keine eingebauten historischen Analysen — aber alle Daten sind über API/MCP für Ihre eigenen Berichte zugänglich.

---

## Technischer Stack

*   **Frontend:** React + TypeScript
*   **Backend:** Supabase (PostgreSQL, Edge Functions, Realtime, Storage)
*   **Auth:** JWT-basiert mit rollenbasierter Zugriffskontrolle
*   **Dateien:** Supabase Storage mit signierten URLs
*   **STEP-Viewer:** occt-import-js für clientseitiges STEP-Parsing + Three.js-Rendering
*   **Integration:** REST-API, Webhooks, MCP-Server
