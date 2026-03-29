# Glossar — MES-Fachbegriffe

> Fertigungsvokabular, das in Eryxon Flow verwendet wird. Hilft KI-Agenten und Benutzern, die Domäne zu verstehen.

## Kernentitäten

| Begriff | Definition |
|---------|-----------|
| **Auftrag (Job)** | Ein Kundenauftrag mit einem oder mehreren Teilen. Hat eine Auftragsnummer, einen Kundennamen und einen Gesamtstatus. |
| **Teil (Part)** | Ein physischer Gegenstand, der gefertigt werden muss. Gehört zu einem Auftrag. Hat Teilenummer, Material, Menge und Zeichnung. |
| **Arbeitsgang (Operation)** | Ein einzelner Fertigungsschritt an einem Teil (z.B. Laserschneiden, Biegen, Schweißen). Hat eine Reihenfolgenummer, geschätzte Zeit und Status. |
| **Unterschritt (Substep)** | Ein Checklisten-Element innerhalb eines Arbeitsgangs (z.B. "Maße prüfen", "Kanten entgraten"). |
| **Charge (Batch)** | Eine Gruppe von Arbeitsgängen, die zur effizienten Verarbeitung auf einer einzelnen Maschine/Zelle zusammengefasst werden. |

## Produktionskonzepte

| Begriff | Definition |
|---------|-----------|
| **Zelle / Stufe (Cell / Stage)** | Ein Produktionsbereich oder eine Maschinengruppe (z.B. "Laser 1", "Abkantpresse", "Lackierstraße"). Arbeitsgänge werden Zellen zugewiesen. |
| **Ressource (Resource)** | Eine Maschine, ein Werkzeug oder eine Vorrichtung, die in der Produktion verwendet wird. Zellen zugewiesen. |
| **Zuweisung (Assignment)** | Verknüpft einen Werker mit bestimmten Aufträgen/Teilen/Arbeitsgängen, an denen er arbeiten soll. |
| **Arbeitswarteschlange (Work Queue)** | Die Ansicht des Werkers seiner zugewiesenen Arbeitsgänge, nach Priorität geordnet. |
| **Zeiteintrag (Time Entry)** | Ein Ein-/Ausstempel-Datensatz eines Werkers, der an einem Arbeitsgang arbeitet. |
| **Kapazitätsmatrix (Capacity Matrix)** | Visuelles Raster, das Zellenverfügbarkeit gegenüber geplanter Arbeit über die Zeit zeigt. |
| **Bullet Card (Eilauftrag)** | Eilmarkierung auf einem Teil. Das Teil springt an die Spitze jeder Warteschlange. |
| **UB (Umlaufbestand / WIP)** | Die Anzahl der Arbeitsgänge, die gleichzeitig in einer Zelle aktiv sind. Begrenzt durch UB-Grenzen. |
| **POLCA** | Paired-cell Overlapping Loops of Cards with Authorization — Arbeitslastverwaltungssystem mit GO/PAUSE-Signalen. |
| **QRM** | Quick Response Manufacturing — Methodik zur Verkürzung von Durchlaufzeiten. |

## Qualität & Problemmeldungen

| Begriff | Definition |
|---------|-----------|
| **NCR** | Non-Conformance Report. Ein formeller Bericht, dass etwas nicht den Spezifikationen entspricht. |
| **Problemmeldung (Issue)** | Ein während der Produktion gemeldetes Problem. Typen: NCR, Beobachtung, Verbesserung, Sicherheit. |
| **Ausschuss (Scrap)** | Material, das nicht nachgearbeitet werden kann und entsorgt werden muss. Verfolgt mit Ausschussgrund-Codes. |
| **Nacharbeit (Rework)** | Material, das die Prüfung nicht bestanden hat, aber korrigiert und erneut verarbeitet werden kann. |
| **Disposition** | Die Entscheidung über den Umgang mit nicht-konformem Material (Ausschuss, Nacharbeit, Verwenden-wie-es-ist, Rücksendung). |
| **PMI** | Product Manufacturing Information — Maßdaten aus 3D-Modellen/Zeichnungen. |

## Kennzahlen

| Begriff | Definition |
|---------|-----------|
| **OEE** | Overall Equipment Effectiveness. Verfügbarkeit x Leistung x Qualität. Industriestandard-Kennzahl. |
| **Verfügbarkeit (Availability)** | % der geplanten Zeit, in der die Ausrüstung tatsächlich läuft. |
| **Leistung (Performance)** | Tatsächliche Ausstoßrate im Vergleich zum theoretischen Maximum. |
| **Qualität (Quality)** | % der produzierten Teile, die die Erstprüfung bestehen (keine Nacharbeit/kein Ausschuss). |

## ERP-Integration

| Begriff | Definition |
|---------|-----------|
| **ERP** | Enterprise Resource Planning — das Geschäftssystem (z.B. SAP, Exact, AFAS), das Aufträge, Bestand und Rechnungsstellung verwaltet. |
| **Externe ID (External ID)** | Die ID einer Entität im ERP-System. Verwendet für Synchronisationsabgleich. |
| **Externe Quelle (External Source)** | Welches ERP-System die Daten geliefert hat (z.B. "exact", "sap"). |
| **Sync-Hash** | SHA-256-Hash synchronisierter Daten zur Änderungserkennung — Updates überspringen, wenn sich Daten nicht geändert haben. |
| **Massensynchronisation (Bulk Sync)** | Mehrere Datensätze gleichzeitig vom ERP an Eryxon Flow senden in einem API-Aufruf (max. 1000 Einträge). |

## Systemkonzepte

| Begriff | Definition |
|---------|-----------|
| **Mandant (Tenant)** | Eine Organisation, die Eryxon Flow nutzt. Alle Daten sind pro Mandant über RLS isoliert. |
| **RLS** | Row-Level Security — PostgreSQL-Funktion, die den Zeilenzugriff basierend auf dem Sitzungskontext einschränkt. |
| **API-Schlüssel (API Key)** | Bearer-Token für REST-API-Zugriff. Format: `ery_live_*` (Produktion) oder `ery_test_*` (Sandbox). |
| **Tarif (Plan)** | Abonnementstufe: free, pro, premium, enterprise. Bestimmt Ratenlimits und Kontingente. |
| **MCP** | Model Context Protocol — ermöglicht KI-Agenten, mit Eryxon Flow als Werkzeug zu interagieren. |
| **STEP / STP** | ISO 10303-Dateiformat für 3D-CAD-Modelle. Das vorherrschende Austauschformat in der Fertigungsindustrie. |
| **Soft Delete** | Datensätze werden mit einem `deleted_at`-Zeitstempel markiert, anstatt physisch gelöscht zu werden. |
| **Webhook** | HTTP-Callback, der ausgelöst wird, wenn Ereignisse auftreten (Auftrag erstellt, Status geändert usw.). |
