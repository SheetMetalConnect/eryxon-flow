---
title: "Hilfe & Häufig Gestellte Fragen"
description: "Häufig gestellte Fragen zu Eryxon Flow."
---

## Allgemeine Fragen

### Was ist die Hierarchie in Eryxon Flow?
1. **Auftrag (Job)** = Kundenauftrag (z.B. "PO-12345")
2. **Teil (Part)** = Bauteil (z.B. "Halterung A")
3. **Arbeitsgang (Operation)** = Aufgabe (z.B. "Laserschneiden", "Biegen")

### Wie funktionieren Baugruppen?
Baugruppen sind Teile, die andere Teile enthalten.
```
Halterung Baugruppe (Übergeordnet)
├── Linke Platte (Unterteil)
├── Rechte Platte (Unterteil)
```
Jedes Teil wird einzeln mit eigenen Arbeitsgängen verfolgt.

### Was ist QRM?
**Quick Response Manufacturing (QRM)** ist eine Methodik zur Verkürzung von Durchlaufzeiten. Eryxon Flow unterstützt dieses Ziel mit WIP-Grenzen und Signalen für die Kapazität der nächsten Zelle. Eine Zelle kann optional den Abschluss des vorherigen Arbeitsgangs blockieren, sobald ihre WIP-Grenze erreicht ist.

### Was ist eine Bullet Card?
Eine **Bullet Card** ist die Eilmarkierung auf einem Teil. Wenn aktiviert, springt das Teil an die Spitze jeder Warteschlange und Tabelle. Alle Arbeitsgänge an diesem Teil erben den Eilindikator. Verwenden Sie es sparsam — wenn alles Eil ist, ist nichts Eil.

### Was ist POLCA?
**POLCA** (Paired-cell Overlapping Loops of Cards with Authorization) ist ein System zur Arbeitslastverwaltung. Eryxon Flow implementiert kein vollständiges POLCA-System und keine gekoppelten Kartenschleifen. Es nutzt die verwandte Idee von GO/PAUSE-Signalen: **GO** bedeutet, die nächste Zelle hat Kapazität; **PAUSE** bedeutet, ihre konfigurierte WIP-Grenze ist erreicht.

### Was sind Zellen und Stufen?
**Zellen** (auch **Stufen** genannt) repräsentieren physische Arbeitsplätze oder Abteilungen in Ihrer Werkstatt — wie "Laser 1", "Abkantpresse", "Schweißen" oder "Montage". Arbeitsgänge werden Zellen zugewiesen. Jede Zelle hat eine UB-Grenze und Kapazitätsstunden.

### Was ist die Kapazitätsmatrix?
Eine visuelle Übersicht der Auslastung pro Zelle pro Tag. Jede Zelle ist eine Zeile, jeder Tag eine Spalte. Farbcodierung zeigt verfügbar (grün), belastet (gelb) und überlastet (rot). Verwenden Sie sie, um Engpässe zu erkennen, bevor sie die Werkstatt erreichen.

### Wie funktioniert die Zeiterfassung?
Werker tippen auf **Start**, um einen Timer zu starten, und **Stopp**, um ihn zu pausieren. Es kann nur ein Arbeitsgang gleichzeitig gemessen werden. Das Starten eines neuen Arbeitsgangs stoppt automatisch den vorherigen. Der laufende Timer ist immer in der Statusleiste sichtbar.

### Was sind Problemmeldungen (NCRs)?
Problemmeldungen sind Qualitätsprobleme, die Werker aus aktiven Arbeitsgängen melden — falsches Material, beschädigte Teile, Maschinenprobleme, Zeichnungsfehler. Sie haben einen Schweregrad (niedrig/mittel/hoch/kritisch) und können Fotos enthalten. Eine Meldung blockiert Arbeit nur, wenn sie als Stillstand markiert ist.

### Was sind Metadaten?
Arbeitsgänge und Aufträge unterstützen **benutzerdefinierte JSON-Metadaten** — Maschineneinstellungen, Biegewinkel, Schweißparameter, Werkzeuganforderungen. Dies sind freie Felder, die Sie nach den Bedürfnissen Ihrer Werkstatt ausfüllen können.

### Was ist eine Charge (Batch)?
Eine **Charge** gruppiert Arbeitsgänge von verschiedenen Teilen, die zusammen verarbeitet werden. Am häufigsten bei der Laser-Schachtelung: mehrere Teile werden aus demselben Blech geschnitten. Die Produktionszeit wird proportional auf alle enthaltenen Arbeitsgänge verteilt.

### Was ist der Fabrikkalender?
Der **Fabrikkalender** definiert Arbeitstage und Feiertage. Der Auto-Planer überspringt arbeitsfreie Tage automatisch bei der Terminberechnung. Konfigurieren Sie ihn unter Einstellungen, bevor Sie die erste Planung ausführen.

## Spezialisierte Anleitungen

Für detaillierte Anweisungen siehe:

- **[Werkerhandbuch](/de/guides/operator-manual/)** - Täglicher Arbeitsablauf, Terminal-Info, Zeiterfassung.
- **[Adminhandbuch](/de/guides/admin-manual/)** - Auftragserstellung, Benutzer, Einstellungen.
- **[Qualitätsmanagement](/de/guides/quality-management/)** - Ausschussverfolgung und Dashboards.
- **[Fehlerbehebung](/de/guides/troubleshooting/)** - Häufige Fehler und Lösungen.
- **[Self-Hosting](/de/guides/self-hosting/)** - Installationsanleitung.
