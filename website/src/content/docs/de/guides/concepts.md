---
title: Kernkonzepte
description: Aufträge, Teile, Arbeitsgänge, Chargen — was sie sind und wie sie zusammenhängen.
---

Eryxon Flow verfolgt Arbeit über eine einfache Hierarchie: **Auftrag > Teile > Arbeitsgänge**. Alles im System hängt an dieser Struktur.

## Auftrag (Job)

Ein Auftrag ist der Container auf der obersten Ebene. Jedes Teil muss zu einem Auftrag gehören — das ist eine feste Anforderung im Datenmodell.

Ein Auftrag muss kein Kundenauftrag sein. Es kann alles sein, was Teile zusammenfasst:

- Ein Kundenauftrag (am häufigsten in Lohnfertigern)
- Ein interner Produktionslauf
- Eine Lagerauffüllungscharge
- Ein Prototyp oder F&E-Projekt
- Ein Wartungs- oder Nacharbeitsauftrag

Das Feld `customer` ist optional. Das einzige Pflichtfeld ist `job_number`.

| Feld | Pflicht | Beispiel |
|------|---------|----------|
| Auftragsnummer | ja | WO-2026-0142 |
| Kunde | nein | Hygienisch Staal BV |
| Lieferdatum | nein | 2026-05-15 |
| Status | auto | not_started, in_progress, completed |

Ein Auftrag hat ein oder mehrere Teile. Die Eilpriorität wird auf Teileebene festgelegt, nicht auf Auftragsebene.

## Teil (Part)

Ein Teil ist ein physischer Gegenstand, der produziert werden muss. Jedes Teil gehört zu einem Auftrag.

| Feld | Beispiel |
|------|----------|
| Teilenummer | FRAME-RVS-316L |
| Material | V4A 316L 3mm |
| Menge | 4 |
| Eilauftrag (Bullet Card) | ja/nein |
| Übergeordnetes Teil | (für Baugruppen) |

Teile können Folgendes haben:

- **Dateien** — STEP-Modelle (im 3D-Viewer angezeigt), PDF-Zeichnungen, andere Anhänge. Dateien werden an Teile angehängt, nicht an Arbeitsgänge.
- **Unterteile** — für Baugruppen verweisen Teile auf ein übergeordnetes Teil. Das System zeigt Baugruppen-Abhängigkeiten und warnt Werker, wenn Unterteile noch nicht fertig sind.
- **Zeichnungsnummer** und **CNC-Programmname** — Schnellreferenzfelder für die Werkstatt.
- **Abmessungen** — Länge, Breite, Höhe in mm, Gewicht in kg.

## Arbeitsgang (Operation)

Ein Arbeitsgang ist ein einzelner Produktionsschritt an einem Teil. Hier findet die eigentliche Arbeit statt.

| Feld | Beispiel |
|------|----------|
| Name | Laserschneiden |
| Zelle | Laser 1 |
| Reihenfolge | 1 (erster Schritt) |
| Geschätzte Zeit | 120 Minuten |
| Tatsächliche Zeit | 95 Minuten (über Start/Stopp erfasst) |
| Verbleibend | 25 Minuten (geschätzt minus tatsächlich) |
| Status | not_started, in_progress, on_hold, completed |

Arbeitsgänge können Folgendes haben:

- **Metadaten** — Laserleistung, Geschwindigkeit, Gastyp, CNC-Programmname, Biegewinkel
- **Unterschritte** — Aufteilung des Arbeitsgangs in kleinere Aufgaben (z.B. "Blech laden", "Programm fahren", "Kanten entgraten")
- **Zeiterfassung** — Werker starten/stoppen einen Timer, die tatsächliche Zeit wird erfasst
- **Problemmeldungen** — Werker melden Probleme mit Schweregrad, Beschreibung und Fotos
- **Ressourcen** — verknüpfte Werkzeuge, Vorrichtungen, Formen die für diesen Schritt benötigt werden
- **Angehalten** — pausiert ohne die Warteschlangenposition zu verlieren

Wenn alle Arbeitsgänge an einem Teil abgeschlossen sind, ist das Teil fertig. Wenn alle Teile in einem Auftrag fertig sind, ist der Auftrag erledigt.

## Charge (Batch)

Eine Charge gruppiert Arbeitsgänge von verschiedenen Teilen, die zusammen verarbeitet werden. Der häufigste Anwendungsfall: **Laser-Schachtelung** — mehrere Teile aus demselben Blech geschnitten.

| Feld | Beispiel |
|------|----------|
| Chargennummer | NEST-2026-0301 |
| Typ | laser_nesting |
| Material | S235 6mm |
| Blechanzahl | 2 |
| Zelle | Laserschneiden |

Chargen können Folgendes haben:

- **Schachtelungs-Metadaten** — Blechgröße (1500x3000), Ausnutzungsgrad, CAM-Programmreferenz
- **Schachtelungsbild** — Upload des Schachtelungslayouts aus der CAM-Software
- **Lebenszyklus** — Entwurf > in_progress > completed. Start und Stopp können durch einen Werker oder eine Maschine ausgelöst werden (CAD/CAM-Integration über API).
- **Zeitverteilung** — wenn eine Charge abgeschlossen ist, wird die gesamte Produktionszeit auf alle enthaltenen Arbeitsgänge proportional zu ihrer geschätzten Zeit verteilt.

## Was kann was enthalten

| Fähigkeit | Auftrag | Teil | Arbeitsgang | Charge |
|-----------|---------|------|-------------|--------|
| Statusverfolgung | ja | ja | ja | ja |
| Lieferdatum | ja | — | geplanter Start/Ende | — |
| Dateien (STEP, PDF) | — | ja | — | Schachtelungsbild |
| Benutzerdefinierte Metadaten (JSON) | ja | — | ja | Schachtelungs-Metadaten |
| Notizen | ja | — | ja | ja |
| Zeiterfassung (geschätzt/tatsächlich) | — | — | ja | ja (verteilt) |
| Eilpriorität | — | ja | — | — |
| Angehalten | — | — | ja | — |
| Unterschritte | — | — | ja | — |
| Problemmeldungen / NCR | — | — | ja | — |
| Verknüpfte Ressourcen | — | — | ja | — |
| Eltern-Kind (Baugruppe) | — | ja | — | übergeordnete Charge |
| ERP-Sync (external_id) | ja | ja | ja | — |
| Zugewiesener Werker | — | — | ja | — |
| Abmessungen / Gewicht | — | ja | — | — |
| Material / Dicke | — | ja | — | ja |
| Zeichnungsnummer | — | ja | — | — |
| CNC-Programmname | — | ja | — | — |

Dateien (STEP-Modelle, PDF-Zeichnungen) werden an **Teile** angehängt, nicht an Aufträge oder Arbeitsgänge. Ein Arbeitsgang erbt seine Dateien vom übergeordneten Teil. Der 3D-Viewer und PDF-Viewer im Terminal zeigen die Dateien des Teils, zu dem der Arbeitsgang gehört.

## Eilauftrag und Angehalten

Dies sind die zwei Prioritätssteuerungen, die Meistern und Planern zur Verfügung stehen.

### Eilauftrag (Bullet Card)

Der Eilstatus wird auf einem **Teil** gesetzt. Er wirkt nach oben und außen:

- Das Teil sortiert als erstes in jeder Tabelle und Warteschlange
- Alle Arbeitsgänge an diesem Teil erben den Eilindikator
- Wenn ein Teil in einem Auftrag als Eil markiert ist, zeigt der gesamte Auftrag in der Auftragstabelle als Eil an
- Das Werker-Terminal hebt Eilzeilen mit einem roten Rand hervor
- Die Statusleiste des Werkers wechselt zu einem Rot-zu-Grün-Streifenmuster, wenn ein Werker auf einem Eilarbeitsgang eingestempelt ist
- Arbeitswarteschlange-Kanbanspalten zeigen ein Eilanzahl-Badge

Schalten Sie den Eilstatus im Arbeitsgangdetailpanel um (die Schaltfläche setzt ihn am übergeordneten Teil) oder in der Teile-Verwaltungstabelle.

Eil ist ein visuelles und Sortiersignal. Es blockiert oder ändert keine Planungslogik — es sagt Menschen "mach das zuerst."

### Angehalten (On Hold)

Angehalten wird auf einem **Arbeitsgang** gesetzt. Es betrifft nur diesen spezifischen Arbeitsgang:

- Der Arbeitsgang bleibt in Warteschlangen sichtbar, zeigt aber ein Angehalten-Badge
- Werker wissen, dass sie damit nicht beginnen sollen
- Der Arbeitsgang kann weiterhin bearbeitet und aktualisiert werden, während er angehalten ist
- Setzen Sie den Arbeitsgang fort, um ihn zum Status `not_started` zurückzusetzen

Angehalten kaskadiert nicht. Das Anhalten eines Arbeitsgangs hat keinen Einfluss auf andere Arbeitsgänge am selben Teil oder Auftrag. Andere Arbeitsgänge laufen normal weiter.

Schalten Sie Angehalten im Arbeitsgangdetailpanel um.

## Beispiel: Geschweißte Baugruppe mit Schachtelung

Ein Edelstahl-Lebensmittelschrank. Zwei Ebenen von Unterbaugruppen, mit lasergeschnittenen Teilen über gemeinsame Bleche geschachtelt.

**Auftrag** — WO-2026-0142, Kunde: Precision Steel Ltd, Lieferdatum: 2026-05-15

**Teile und Arbeitsfolge:**

| Teil | Material | Mge | Übergeordnet | Arbeitsgänge |
|------|----------|-----|--------------|--------------|
| CABINET-ASSY | — | 1 | — | Montage (180 Min), QK (30 Min) |
| FRAME-ASSY | — | 1 | CABINET-ASSY | WIG-Schweißen (240 Min), Beizen (90 Min) |
| UPRIGHT-L | SS 316L 3mm | 2 | FRAME-ASSY | Laserschneiden (30 Min), Biegen (45 Min) |
| UPRIGHT-R | SS 316L 3mm | 2 | FRAME-ASSY | Laserschneiden (30 Min), Biegen (45 Min) |
| CROSS-BEAM | SS 316L 3mm | 4 | FRAME-ASSY | Laserschneiden (20 Min), Biegen (25 Min) |
| LID | SS 304 2mm | 1 | CABINET-ASSY | Laserschneiden (15 Min), Biegen (20 Min), Schleifen (30 Min) |
| BASE-PLATE | S235 6mm | 1 | CABINET-ASSY | Laserschneiden (10 Min) |

**Schachtelungscharge** — NEST-0301: alle sieben Laserschneidarbeitsgänge gruppiert auf zwei Blechen (1500x3000, 87% Ausnutzung). Ein Schnittlauf, Zeit wird zurück auf jeden Arbeitsgang verteilt.

**Montage-Ablauf:**

1. Laser schneidet alle Teile in einer Charge. Teile werden nach dem Schneiden sortiert.
2. Ständer und Querträger gehen zum Biegen, dann zum Schweißen, wo FRAME-ASSY aufgebaut wird.
3. Werker startet FRAME-ASSY Schweißen — System warnt, wenn Unterteile unvollständig sind. Werker kann überschreiben.
4. Nachdem FRAME-ASSY, LID und BASE-PLATE fertig sind, beginnt die CABINET-ASSY Montage. Gleiche Abhängigkeitsprüfung.
5. Qualitätskontrolle schließt den Auftrag ab.

**Dateien:** STEP-Modell und PDF-Zeichnung an jedem Teil. Baugruppenzeichnungen an CABINET-ASSY und FRAME-ASSY.

**Metadaten an Arbeitsgängen:**

| Arbeitsgang | Metadaten |
|-------------|-----------|
| Laserschneiden | `{"power": 4000, "speed": 12000, "gas": "N2", "program": "NEST-0301"}` |
| Biegen | `{"bends": [90, 90, 135], "tool": "V16-88"}` |
| WIG-Schweißen | `{"process": "TIG", "wire": "316L 1.0mm", "gas": "Argon", "cert_required": true}` |
| Montage | `{"torque_specs": {"M8": 25, "M10": 45}}` |

## Nächste Schritte

- [API-Beispiele](/guides/api-examples/) — curl-Beispiele für Abfragen, Erstellen, Synchronisieren und CAD/CAM-Integration
- [CSV-Import](/features/csv-import/) — Daten aus Tabellen importieren mit herunterladbaren Vorlagen
- [Chargen & Schachtelung](/features/batch-management/) — wie Schachtelungschargen im Detail funktionieren
- [Werkerhandbuch](/de/guides/operator-manual/) — wie Werker das Terminal und die Arbeitswarteschlange nutzen
- [Adminhandbuch](/de/guides/admin-manual/) — wie Planer Aufträge, Zellen und Planung verwalten
