---
title: Adminhandbuch
description: Wie Sie die Produktion in Eryxon Flow verwalten — Aufträge, Zellen, Planung, Qualität.
---

Diese Anleitung behandelt alles, was ein Produktionsleiter oder Planer für den täglichen Betrieb in Eryxon Flow benötigt. Sie setzt voraus, dass Ihr Konto Admin-Zugriff hat.

## Dashboard

Das Dashboard ist Ihr Startbildschirm. Es zeigt:

- **Aktive Werker** — wer ist eingeloggt und arbeitet gerade.
- **Offene Problemmeldungen** — Qualitätsprobleme von der Werkstatt gemeldet, warten auf Ihre Prüfung.
- **UB pro Zelle** — wie viele Arbeitsgänge in jeder Produktionszelle aktiv sind, gegen das UB-Limit der Zelle.
- **Lieferdaten** — anstehende Fristen über alle aktiven Aufträge, nach Dringlichkeit sortiert.

Alle Daten werden in Echtzeit aktualisiert. Wenn ein Werker einen Start oder Abschluss am Terminal scannt, spiegelt das Dashboard dies innerhalb von Sekunden wider.

## Aufträge Verwalten

### Auftragshierarchie

Jeder Auftrag folgt derselben Struktur: **Auftrag > Teile > Arbeitsgänge**.

- Ein **Auftrag** repräsentiert einen Kundenauftrag oder ein internes Projekt. Er enthält den Kundennamen, die Auftragsnummer und das Lieferdatum.
- Ein **Teil** ist ein physischer Gegenstand, der produziert werden muss. Jedes Teil hat ein Material, eine Menge und eine Zeichnungsreferenz.
- Ein **Arbeitsgang** ist ein einzelner Produktionsschritt an einem Teil — Schneiden, Biegen, Schweißen, Lackieren usw. Arbeitsgänge sind mit einer Produktionszelle verknüpft und haben eine geschätzte Zeit.

### Einen Auftrag erstellen

1. Gehen Sie zu **Aufträge** und klicken Sie auf **Neuen Auftrag Erstellen**.
2. Füllen Sie Auftragsnummer, Kunde und Lieferdatum aus.
3. Fügen Sie ein oder mehrere Teile hinzu. Setzen Sie für jedes Teil die Teilenummer, das Material und die Menge.
4. Fügen Sie Arbeitsgänge zu jedem Teil hinzu. Wählen Sie für jeden Arbeitsgang die Zelle, setzen Sie die geschätzte Zeit und definieren Sie die Reihenfolge.

Sie können auch `Cmd/Ctrl + N` von überall verwenden, um das Schnellerstellungsmenü zu öffnen.

### Eilaufträge (Bullet Card)

Wenn ein Teil die Warteschlange überspringen muss, markieren Sie es als **Bullet Card** (Eil). Dies bewirkt global drei Dinge:

- Das Teil rückt an die Spitze jeder Tabelle und Arbeitswarteschlange, über alle Zellen hinweg.
- Werker sehen einen deutlichen Eilindikator auf ihrem Terminal.
- Das Teil bleibt priorisiert, bis Sie die Eilmarkierung entfernen.

Verwenden Sie dies sparsam. Wenn alles Eil ist, ist nichts Eil.

### Arbeitsgänge anhalten

Sie können jeden Arbeitsgang aus dem Arbeitsgangdetailpanel anhalten. Ein angehaltener Arbeitsgang bleibt in der Arbeitswarteschlange sichtbar, ist aber mit einem Halt-Badge markiert, damit Werker wissen, nicht damit zu beginnen. Setzen Sie ihn fort, wenn die Blockade beseitigt ist.

## Produktionszellen (Stufen)

Zellen repräsentieren Ihre physischen Arbeitsplätze oder Abteilungen — Laserschneiden, Abkantpresse, Schweißen, Montage, Versand.

### Eine Zelle konfigurieren

Gehen Sie zu **Stufen & Zellen** in der Admin-Seitenleiste. Für jede Zelle können Sie einstellen:

- **Name** — was Werker auf dem Terminal sehen (z.B. "Laser 1", "Abkantpresse").
- **Farbe** — wird in der gesamten Oberfläche zur visuellen Identifikation verwendet.
- **Symbol** — erscheint auf dem Terminal und in der Kapazitätsmatrix.
- **Reihenfolge** — die Standardreihenfolge, in der Zellen in Ansichten und Planung erscheinen.

### UB-Grenzen

Jede Zelle hat eine UB-Grenze (Umlaufbestand / Work In Progress). Dies steuert, wie viele Arbeitsgänge gleichzeitig aktiv sein können.

- **Warnschwelle** — die Oberfläche hebt die Zelle hervor, wenn sie sich dem Limit nähert.
- **Limit durchsetzen** — wenn aktiviert, blockiert das System den vorherigen Arbeitsgang vom Abschluss, wenn die nächste Zelle ausgelastet ist. Dies verhindert, dass sich Arbeit an einem Engpass aufstaut.

Setzen Sie UB-Grenzen basierend auf Ihrer tatsächlichen Arbeitsplatzkapazität. Beginnen Sie konservativ und passen Sie an, basierend auf Ihren Beobachtungen.

### Kapazitätsstunden

Definieren Sie, wie viele Produktionsstunden jede Zelle pro Tag hat. Der Planer verwendet dies, um die Auslastung zu berechnen und überlastete Tage zu markieren.

## Planung und Kapazität

### Auto-Planer

Der Auto-Planer weist Arbeitsgänge Zeitfenstern zu basierend auf:

- Arbeitsgangfolge innerhalb jedes Teils.
- Geschätzte Stunden pro Arbeitsgang.
- Zellenkapazität pro Tag.
- Lieferdaten der Aufträge.

Führen Sie den Planer nach dem Hinzufügen neuer Aufträge oder bei Prioritätsänderungen aus. Er berechnet den gesamten Zeitplan neu und aktualisiert die Kapazitätsmatrix.

### Kapazitätsmatrix

Die Kapazitätsmatrix gibt Ihnen eine Vogelperspektive auf die Auslastung pro Zelle pro Tag. Jede Zelle erscheint als eine Zeile, jeder Tag als eine Spalte. Farbcodierung zeigt verfügbare, belastete und überlastete Zustände an.

Verwenden Sie dies, um Engpässe zu erkennen, bevor sie die Werkstatt erreichen. Wenn eine Zelle in drei Tagen rot zeigt, wissen Sie, dass Sie jetzt handeln müssen — Arbeit verschieben, eine Schicht hinzufügen oder Lieferdaten anpassen.

### Lieferdatum-Überschreibungen

Wenn ein Kunde seine Frist ändert, aktualisieren Sie das Lieferdatum am Auftrag. Der Planer berücksichtigt die Änderung beim nächsten Lauf.

### Fabrikkalender

Der Fabrikkalender definiert Arbeitstage und Feiertage. Der Planer überspringt arbeitsfreie Tage automatisch. Konfigurieren Sie dies unter **Einstellungen**, bevor Sie Ihre erste Planung ausführen.

## Chargenverwaltung

Chargen gruppieren Arbeitsgänge für Schachtelung oder kombinierte Verarbeitung — üblich beim Laserschneiden, wo mehrere Teile dasselbe Blech teilen.

### Mit Chargen arbeiten

1. Erstellen Sie eine Charge und geben Sie ihr einen Namen oder eine Nummer.
2. Weisen Sie Arbeitsgänge von verschiedenen Teilen der Charge zu.
3. Verfolgen Sie die Materialzuweisung für die Charge.

Wenn ein Werker eine Charge verarbeitet, schreiten alle enthaltenen Arbeitsgänge gemeinsam voran.

## Zuweisungen und Benutzer

### Arbeit zuweisen

Gehen Sie zur **Zuweisungen**-Seite, um bestimmte Arbeitsgänge Werkern zuzuweisen. Wählen Sie das Teil, den Werker und bestätigen Sie. Die Zuweisung erscheint sofort in der Arbeitswarteschlange des Werkers.

Sie können Werkern auch erlauben, sich selbst aus verfügbarer Arbeit in ihrer Zelle zuzuweisen.

### Rollen

- **Admin** — voller Zugriff auf alle Einstellungen, Aufträge, Planung, Daten und Benutzerverwaltung.
- **Werker** — Zugriff auf ihre Arbeitswarteschlange, das Terminal und Problemmeldungen. Werker können keine Aufträge ändern, Zeitpläne modifizieren oder auf Einstellungen zugreifen.

Verwalten Sie Benutzer unter **Einstellungen > Benutzer**.

## Qualität und Problemmeldungen

Werker melden Probleme direkt vom Terminal — falsches Material, beschädigte Teile, fehlende Zeichnungen, Maschinenprobleme.

### Problemmeldungen prüfen

1. Gehen Sie zur **Problemmeldungen**-Seite.
2. Jede Meldung zeigt das Teil, den Arbeitsgang, den Werker und die Beschreibung.
3. Wählen Sie eine Aktion:
   - **Genehmigen** — bestätigt, dass es ein gültiges Problem ist. Wird für die Qualitätsverfolgung protokolliert.
   - **Ablehnen** — kein tatsächliches Problem. Fügen Sie eine Notiz hinzu, die erklärt, warum.
   - **Schließen** — das Problem wurde gelöst. Fügen Sie Lösungsnotizen hinzu.

Reagieren Sie schnell auf Problemmeldungen. Ungelöste Probleme blockieren Werker und verlangsamen die Produktion.

### Ausschussgründe

Konfigurieren Sie Ausschussgrund-Codes unter **Ausschussgründe** in den Einstellungen. Jeder Grund hat einen Code, eine Beschreibung und eine Kategorie (Material, Prozess, Ausrüstung, Werker, Design). Die Seite zeigt Nutzungsstatistiken, damit Sie sehen können, welche Probleme am häufigsten auftreten.

## Daten und Integration

### CSV-Import

Importieren Sie Aufträge, Teile und Arbeitsgänge aus CSV-Dateien. Dies ist nützlich für die Migration aus Tabellen oder den Empfang strukturierter Daten aus Ihrem ERP. Der Import-Bildschirm validiert Daten vor dem Übernehmen.

### API-Schlüssel

Generieren Sie API-Schlüssel unter **Einstellungen > API-Schlüssel** für die Integration mit externen Systemen. Jeder Schlüssel ist an Ihren Mandanten gebunden und kann jederzeit widerrufen werden.

### Webhooks

Konfigurieren Sie Webhooks unter **Einstellungen > Webhooks**, um Events an externe Systeme zu senden. Verfügbare Events umfassen:

- `operation.started` — ein Werker hat mit der Arbeit begonnen.
- `operation.completed` — ein Werker hat die Arbeit abgeschlossen.
- `issue.created` — ein Qualitätsproblem wurde gemeldet.

### Datenexport

Gehen Sie zu **Datenexport** in der Admin-Seitenleiste. Sie können alle Datensätze als JSON oder CSV exportieren. CSV ist typischerweise schneller für große Datenmengen. Exporte enthalten alle Datenbankdatensätze und Metadaten, schließen aber Dateianhänge (nur Pfade) und API-Geheimnisse (nur Präfixe) aus.

Große Exporte können 30-60 Sekunden dauern. Führen Sie sie wenn möglich in ruhigen Zeiten aus.
