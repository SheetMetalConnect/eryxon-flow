---
title: Kernconcepten
description: Jobs, onderdelen, bewerkingen, batches — wat ze zijn en hoe ze samenhangen.
---

Eryxon Flow volgt werk via een eenvoudige hierarchie: **Job > Onderdelen > Bewerkingen**. Alles in het systeem hangt aan deze structuur.

## Job

Een job is de container op het hoogste niveau. Elk onderdeel moet tot een job behoren — dit is een harde eis in het datamodel.

Een job hoeft geen klantenorder te zijn. Het kan alles zijn dat onderdelen groepeert:

- Een klantenorder (meest voorkomend bij jobshops)
- Een interne productierun
- Een voorraadaanvullingsbatch
- Een prototype of R&D-project
- Een onderhouds- of herwerkopdracht

Het veld `customer` is optioneel. Het enige verplichte veld is `job_number`.

| Veld | Verplicht | Voorbeeld |
|------|-----------|-----------|
| Jobnummer | ja | WO-2026-0142 |
| Klant | nee | Hygienisch Staal BV |
| Leverdatum | nee | 2026-05-15 |
| Status | auto | not_started, in_progress, completed |

Een job heeft een of meer onderdelen. Spoedprioriteit wordt op onderdeelniveau ingesteld, niet op jobniveau.

## Onderdeel

Een onderdeel is een fysiek item dat geproduceerd moet worden. Elk onderdeel behoort tot een job.

| Veld | Voorbeeld |
|------|-----------|
| Onderdeelnummer | FRAME-RVS-316L |
| Materiaal | RVS 316L 3mm |
| Hoeveelheid | 4 |
| Spoed (bullet card) | ja/nee |
| Bovenliggend onderdeel | (voor assemblages) |

Onderdelen kunnen het volgende hebben:

- **Bestanden** — STEP-modellen (getoond in 3D-viewer), PDF-tekeningen, andere bijlagen. Bestanden worden aan onderdelen gekoppeld, niet aan bewerkingen.
- **Onderliggende onderdelen** — voor assemblages verwijzen onderdelen naar een bovenliggend onderdeel. Het systeem toont assemblage-afhankelijkheden en waarschuwt operators wanneer onderliggende onderdelen nog niet klaar zijn.
- **Tekeningnummer** en **CNC-programmanaam** — snelle referentievelden voor de werkvloer.
- **Afmetingen** — lengte, breedte, hoogte in mm, gewicht in kg.

## Bewerking

Een bewerking is een enkele productiestap op een onderdeel. Hier vindt het daadwerkelijke werk plaats.

| Veld | Voorbeeld |
|------|-----------|
| Naam | Lasersnijden |
| Cel | Laser 1 |
| Volgorde | 1 (eerste stap) |
| Geschatte tijd | 120 minuten |
| Werkelijke tijd | 95 minuten (bijgehouden via start/stop) |
| Resterend | 25 minuten (geschat minus werkelijk) |
| Status | not_started, in_progress, on_hold, completed |

Bewerkingen kunnen het volgende hebben:

- **Metadata** — laservermogen, snelheid, gastype, CNC-programmanaam, buighoeken
- **Substappen** — opsplitsing van de bewerking in kleinere taken (bijv. "plaat laden", "programma draaien", "randen ontbramen")
- **Tijdregistratie** — operators starten/stoppen een timer, werkelijke tijd wordt vastgelegd
- **Issues** — operators melden problemen met ernst, beschrijving en foto's
- **Middelen** — gekoppeld gereedschap, opspanningen, mallen die nodig zijn voor deze stap
- **In wacht** — gepauzeerd zonder wachtrijpositie te verliezen

Wanneer alle bewerkingen op een onderdeel zijn voltooid, is het onderdeel klaar. Wanneer alle onderdelen in een job klaar zijn, is de job klaar.

## Batch

Een batch groepeert bewerkingen van verschillende onderdelen die samen worden verwerkt. Het meest voorkomende gebruik: **laser nesting** — meerdere onderdelen gesneden uit dezelfde plaat.

| Veld | Voorbeeld |
|------|-----------|
| Batchnummer | NEST-2026-0301 |
| Type | laser_nesting |
| Materiaal | S235 6mm |
| Aantal platen | 2 |
| Cel | Lasersnijden |

Batches kunnen het volgende hebben:

- **Nesting-metadata** — plaatgrootte (1500x3000), benuttingspercentage, CAM-programmareferentie
- **Nesting-afbeelding** — upload van de nesting-layout uit de CAM-software
- **Levenscyclus** — concept > in_progress > completed. Start en stop kunnen worden geactiveerd door een operator of door een machine (CAD/CAM-integratie via API).
- **Tijdsverdeling** — wanneer een batch is voltooid, wordt de totale productietijd verdeeld over alle opgenomen bewerkingen, evenredig aan hun geschatte tijd.

## Wat kan wat bevatten

| Mogelijkheid | Job | Onderdeel | Bewerking | Batch |
|-------------|-----|-----------|-----------|-------|
| Statusregistratie | ja | ja | ja | ja |
| Leverdatum | ja | — | geplande start/eind | — |
| Bestanden (STEP, PDF) | — | ja | — | nesting-afbeelding |
| Aangepaste metadata (JSON) | ja | — | ja | nesting-metadata |
| Notities | ja | — | ja | ja |
| Tijdregistratie (geschat/werkelijk) | — | — | ja | ja (verdeeld) |
| Spoedprioriteit | — | ja | — | — |
| In wacht | — | — | ja | — |
| Substappen | — | — | ja | — |
| Issues / NCR | — | — | ja | — |
| Gekoppelde middelen | — | — | ja | — |
| Ouder-kind (assemblage) | — | ja | — | bovenliggende batch |
| ERP-sync (external_id) | ja | ja | ja | — |
| Toegewezen operator | — | — | ja | — |
| Afmetingen / gewicht | — | ja | — | — |
| Materiaal / dikte | — | ja | — | ja |
| Tekeningnummer | — | ja | — | — |
| CNC-programmanaam | — | ja | — | — |

Bestanden (STEP-modellen, PDF-tekeningen) worden aan **onderdelen** gekoppeld, niet aan jobs of bewerkingen. Een bewerking erft de bestanden van het bovenliggende onderdeel. De 3D-viewer en PDF-viewer in de terminal tonen de bestanden van het onderdeel waartoe de bewerking behoort.

## Spoed en In Wacht

Dit zijn de twee prioriteitsopties die beschikbaar zijn voor voormannen en planners.

### Spoed (bullet card)

Spoed wordt ingesteld op een **onderdeel**. Het werkt omhoog en naar buiten door:

- Het onderdeel sorteert als eerste in elke tabel en wachtrij
- Alle bewerkingen op dat onderdeel erven de spoedindicator
- Als een onderdeel in een job spoed is, toont de gehele job als spoed in de Jobs-tabel
- De operator-terminal markeert spoedrijen met een rode rand
- De statusbalk van de operator schakelt naar een rood-naar-groen streeppatroon wanneer een operator is ingeklokt op een spoedbewerking
- Werkwachtrij kanban-kolommen tonen een spoedtelbadge

Schakel spoed in vanuit het bewerkingsdetailpaneel (de knop stelt het in op het bovenliggende onderdeel) of vanuit de Onderdelen-beheertabel.

Spoed is een visueel en sorteersignaal. Het blokkeert of wijzigt geen planningslogica — het vertelt mensen "doe dit eerst."

### In Wacht

In wacht wordt ingesteld op een **bewerking**. Het heeft alleen invloed op die specifieke bewerking:

- De bewerking blijft zichtbaar in wachtrijen maar toont een wachtbadge
- Operators weten dat ze er niet aan moeten beginnen
- De bewerking kan nog steeds worden bewerkt en bijgewerkt terwijl deze in wacht staat
- Hervat de bewerking om terug te keren naar de status `not_started`

In wacht werkt niet door. Het in wacht zetten van een bewerking heeft geen invloed op andere bewerkingen op hetzelfde onderdeel of dezelfde job. Andere bewerkingen gaan normaal door.

Schakel in wacht in vanuit het bewerkingsdetailpaneel.

## Voorbeeld: Gelaste Assemblage met Nesting

Een roestvrijstalen voedselveilige kast. Twee niveaus van subassemblages, met lasergesneden onderdelen genest over gedeelde platen.

**Job** — WO-2026-0142, klant: Precision Steel Ltd, leverdatum: 2026-05-15

**Onderdelen en routing:**

| Onderdeel | Materiaal | Hvh | Ouder | Bewerkingen |
|-----------|-----------|-----|-------|-------------|
| CABINET-ASSY | — | 1 | — | Assemblage (180 min), QC (30 min) |
| FRAME-ASSY | — | 1 | CABINET-ASSY | TIG Lassen (240 min), Beitsen (90 min) |
| UPRIGHT-L | SS 316L 3mm | 2 | FRAME-ASSY | Lasersnijden (30 min), Kanten (45 min) |
| UPRIGHT-R | SS 316L 3mm | 2 | FRAME-ASSY | Lasersnijden (30 min), Kanten (45 min) |
| CROSS-BEAM | SS 316L 3mm | 4 | FRAME-ASSY | Lasersnijden (20 min), Kanten (25 min) |
| LID | SS 304 2mm | 1 | CABINET-ASSY | Lasersnijden (15 min), Kanten (20 min), Slijpen (30 min) |
| BASE-PLATE | S235 6mm | 1 | CABINET-ASSY | Lasersnijden (10 min) |

**Nesting-batch** — NEST-0301: alle zeven lasersnijbewerkingen gegroepeerd op twee platen (1500x3000, 87% benutting). Een snijrun, tijd verdeeld terug naar elke bewerking.

**Assemblage-flow:**

1. Laser snijdt alle onderdelen in een batch. Onderdelen worden na het snijden gesorteerd.
2. Staanders en dwarsbalken gaan naar het kanten, daarna naar het lassen waar FRAME-ASSY wordt opgebouwd.
3. Operator start FRAME-ASSY las — systeem waarschuwt als onderliggende onderdelen niet volledig zijn. Operator kan dit overschrijven.
4. Nadat FRAME-ASSY, LID en BASE-PLATE klaar zijn, start de CABINET-ASSY assemblage. Dezelfde afhankelijkheidscontrole.
5. Kwaliteitsinspectie voltooit de job.

**Bestanden:** STEP-model en PDF-tekening op elk onderdeel. Assemblagetekeningen op CABINET-ASSY en FRAME-ASSY.

**Metadata op bewerkingen:**

| Bewerking | Metadata |
|-----------|----------|
| Lasersnijden | `{"power": 4000, "speed": 12000, "gas": "N2", "program": "NEST-0301"}` |
| Kanten | `{"bends": [90, 90, 135], "tool": "V16-88"}` |
| TIG Lassen | `{"process": "TIG", "wire": "316L 1.0mm", "gas": "Argon", "cert_required": true}` |
| Assemblage | `{"torque_specs": {"M8": 25, "M10": 45}}` |

## Volgende Stappen

- [API-voorbeelden](/guides/api-examples/) — curl-voorbeelden voor opvragen, aanmaken, synchroniseren en CAD/CAM-integratie
- [CSV Import](/features/csv-import/) — importeer data uit spreadsheets met downloadbare sjablonen
- [Batch & Nesting](/features/batch-management/) — hoe nesting-batches in detail werken
- [Handleiding Operator](/nl/guides/operator-manual/) — hoe operators de terminal en werkwachtrij gebruiken
- [Handleiding Admin](/nl/guides/admin-manual/) — hoe planners jobs, cellen en planning beheren
