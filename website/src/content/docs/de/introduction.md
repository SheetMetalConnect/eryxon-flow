---
title: Willkommen bei Eryxon Flow
description: Das einfache, elegante und leistungsstarke Manufacturing Execution System, mit dem Ihre Mitarbeiter gerne arbeiten. Entwickelt für die Metallverarbeitung.
---

**Das einfache, elegante und leistungsstarke Manufacturing Execution System, mit dem Ihre Mitarbeiter gerne arbeiten. Entwickelt für die Metallverarbeitung.**

> **Jetzt ausprobieren:** Erkunden Sie die [Live-Demo auf app.eryxon.eu](https://app.eryxon.eu) — keine Installation erforderlich.

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

**100% API-gesteuert.** Ihr ERP sendet Aufträge, Teile und Aufgaben über die REST-API. Eryxon sendet Abschlussereignisse zurück über Webhooks. Der MCP-Server ermöglicht KI/Automatisierungs-Integration.

### Dateihandhabung
Fordern Sie eine signierte Upload-URL über die API an, laden Sie STEP- und PDF-Dateien direkt in den Supabase Storage hoch und referenzieren Sie dann den Dateipfad beim Erstellen von Aufträgen oder Teilen. Große Dateien (typisch 5-50 MB) werden direkt in den Speicher hochgeladen — keine Timeouts, keine API-Engpässe.

### Benutzerdefinierte Metadaten
Fügen Sie JSON-Payloads zu Aufträgen, Teilen und Aufgaben hinzu für Ihre spezifischen Anforderungen — Werkzeuganforderungen, Formnummern, Maschineneinstellungen, Materialspezifikationen, alles was Ihre Werkstatt nachverfolgen muss.

### ERP-Integrationen
Partner wie **Sheet Metal Connect e.U.** bauen Integrationen für gängige ERP-Systeme. Oder bauen Sie Ihre eigene mit unseren GitHub-Starter-Kits mit Beispielcode und Dokumentation.

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
