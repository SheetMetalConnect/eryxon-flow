---
title: Werkerhandbuch
description: Wie Sie Eryxon Flow als Werker verwenden — Arbeitswarteschlange, Terminal, Zeiterfassung.
---

Dieses Handbuch behandelt alles, was Sie brauchen, um mit Eryxon Flow in der Werkstatt zu arbeiten. Es gibt zwei Hauptoberflächen: die **Arbeitswarteschlange** für den Desktop und das **Terminal** für fest installierte Werkstationsbildschirme. Beide zeigen dieselbe Arbeit — nur anders dargestellt.

## Arbeitswarteschlange (Kanban)

Die Arbeitswarteschlange ist Ihre Standardansicht nach dem Einloggen. Sie zeigt Arbeitsgänge als Karten auf einem Kanban-Board.

### Aufbau

Jede **Spalte** repräsentiert eine Zelle (Arbeitsplatz) in der Werkstatt. Karten innerhalb einer Spalte sind die Arbeitsgänge, die an dieser Zelle warten oder in Bearbeitung sind. Spaltenköpfe zeigen Summen: Arbeitsstunden in der Warteschlange, Stückzahl und wie viele Eilaufträge in der Spalte sind.

### Eine Karte lesen

Jede Karte zeigt:

- **Auftragsnummer** und Teilename
- **Arbeitsgang** Name (z.B. "Biegen", "Schweißen")
- **Material** Typ und Dicke
- **Geschätzte Stunden** verbleibend
- **Lieferdatum** mit Dringlichkeitsfärbung — Überfälliges fällt sofort auf

### Ihre Arbeit finden

- **Suchen** nach Auftragsnummer, Teilename, Arbeitsgangname oder Kunde
- **Filtern** nach Status (aktiv, alle, nicht gestartet, in Bearbeitung) und Lieferdatum (überfällig, heute, diese Woche)
- **Sortieren** nach Reihenfolge, Lieferdatum oder geschätzter Zeit

Wenn Sie nichts sehen: Prüfen Sie, ob Ihre Filter zurückgesetzt sind. Wenn es immer noch leer ist, wurde noch keine Arbeit Ihrer Zelle zugewiesen.

### Karten-Badges

- **Eil** (rot) — dieser Auftrag hat Vorrang vor allem anderen. Eilaufträge sortieren automatisch nach oben.
- **Angehalten** (gelb) — dieser Arbeitsgang ist pausiert. Beginnen Sie nicht damit, bis der Halt aufgehoben ist.

### Detailpanel

Klicken Sie auf eine Karte, um das Detailpanel auf der rechten Seite zu öffnen. Hier sehen Sie:

- Vollständige Teileinformationen (Kunde, Menge, Material)
- Komplette Arbeitsfolge — jeder Arbeitsgang in Reihenfolge, als visueller Fluss durch die Zellen dargestellt
- Angehängte Dateien: 3D-Modell-Viewer für STEP-Dateien, PDF-Viewer für Zeichnungen
- Eil- und Halt-Schalter — markieren Sie einen Arbeitsgang als Eil oder setzen Sie ihn auf Halt
- Zeiterfassungssteuerung (Start, Stopp, Fertig)

## Terminal-Ansicht

Das Terminal ist für fest installierte Bildschirme an einem Arbeitsplatz gebaut. Es funktioniert gut auf Touch-Geräten und Tablets. Verwenden Sie es, wenn Sie für Ihre Schicht an einer Zelle stationiert sind.

### Erste Schritte

Wählen Sie Ihre Zelle aus dem **Zellenselektor** in der Kopfzeile. Das Terminal zeigt dann nur Arbeit für diese Zelle, aufgeteilt in drei Warteschlangen:

- **In Bearbeitung** (grün) — Arbeitsgänge, an denen Sie gerade aktiv arbeiten
- **Im Puffer** (blau) — die nächsten Arbeitsgänge, bereit zum Starten, bereits an Ihrer Zelle
- **Erwartet** (gelb) — anstehende Arbeit, die an Ihrer Zelle eintreffen wird

### Statusleiste

Die Leiste unter der Kopfzeile zeigt:

- Ihren Werkernamen
- Den Arbeitsgang, an dem Sie gerade arbeiten, und zu welchem Auftrag er gehört
- Einen laufenden Timer seit dem Start
- Diagonale Streifenmuster, die sich je nach Status ändern: grün bei aktiver Arbeit, gelbe Streifen wenn nicht eingestempelt, Rot-zu-Grün-Verlauf bei einem Eilauftrag

### POLCA-Zellensignale

Die Zellenspalte zeigt ein Signal für jeden Arbeitsgang: die **aktuelle Zelle** und die **nächste Zelle** in der Arbeitsfolge, mit einem Kapazitätsindikator:

- **GO** (Play-Symbol) — die nächste Zelle hat Kapazität. Sie können Ihren Arbeitsgang abschließen und das Teil fließt reibungslos weiter.
- **PAUSE** (Pause-Symbol) — die nächste Zelle ist ausgelastet. Ihren Arbeitsgang jetzt abzuschließen würde einen Stau verursachen.

Dies verhindert Engpässe. Das System verwaltet Umlaufbestandsgrenzen pro Zelle.

### Rückstandsstatus

Arbeitsgänge zeigen ein Rückstandslabel, wenn Fristen nahen:

- **Überfällig** — über dem Termin, sollte bereits erledigt sein
- **Heute** — heute fällig
- **Demnächst** — fällig innerhalb weniger Tage

### Detail-Seitenleiste

Tippen Sie auf einen Arbeitsgang, um die Seitenleiste rechts zu öffnen:

- **3D-Viewer** — drehen und zoomen Sie das Teilemodell (wenn eine STEP-Datei angehängt ist)
- **PDF-Viewer** — betrachten Sie die technische Zeichnung
- **Arbeitsfolge** — sehen Sie die vollständige Reihenfolge der Arbeitsgänge und wohin das Teil als nächstes geht

## Zeiterfassung

Die Zeiterfassung verknüpft Ihre Arbeit mit jedem Arbeitsgang.

### So funktioniert es

1. **Start** — tippen Sie auf "Start" beim Arbeitsgang, an dem Sie arbeiten werden. Der Timer beginnt und der Arbeitsgang wechselt zu "In Bearbeitung."
2. **Stopp** — tippen Sie auf "Stopp", wenn die physische Arbeit erledigt ist.
3. **Fertig** — markieren Sie den Arbeitsgang als fertig, um ihn zur nächsten Zelle zu verschieben.

Es kann nur **ein Arbeitsgang** gleichzeitig gemessen werden. Das Starten eines neuen Arbeitsgangs stoppt den vorherigen.

Der laufende Timer ist immer in der Statusleiste sichtbar, damit Sie nie vergessen zu stoppen.

## Probleme Melden

Wenn etwas schiefgeht — falsches Material, beschädigtes Teil, Maschinenproblem, Zeichnungsfehler — melden Sie es sofort.

### Schritte

1. Öffnen Sie das Arbeitsgangdetail (aus der Arbeitswarteschlange oder dem Terminal)
2. Tippen Sie auf **Problem Melden**
3. Wählen Sie einen Schweregrad:
   - **Niedrig** — gering, blockiert die Arbeit nicht
   - **Mittel** — braucht Aufmerksamkeit, aber Sie können weiterarbeiten
   - **Hoch** — blockiert diesen Arbeitsgang
   - **Kritisch** — Sicherheitsrisiko oder großer Produktionsstopp
4. Beschreiben Sie das Problem
5. **Fotos hinzufügen** — machen Sie ein Foto mit Ihrem Handy oder Tablet
6. Absenden

Die Problemmeldung geht sofort in die Admin-Problemwarteschlange.

## Tipps

- Starten Sie immer Ihren Timer, bevor Sie mit der physischen Arbeit beginnen.
- Prüfen Sie die POLCA-Signale, bevor Sie einen Arbeitsgang abschließen. Wenn die nächste Zelle PAUSE zeigt, fragen Sie Ihren Vorgesetzten.
- Melden Sie Probleme in dem Moment, in dem Sie sie entdecken. Ein Foto sagt mehr als tausend Worte.
- Wenn Ihr Bildschirm leer aussieht, setzen Sie zuerst alle Filter zurück.
