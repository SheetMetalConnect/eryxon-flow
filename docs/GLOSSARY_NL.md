# Woordenlijst — MES Domaintermen

> Productieterminologie gebruikt in Eryxon Flow. Helpt AI-agents en gebruikers het domein te begrijpen.

## Kernentiteiten

| Term | Definitie |
|------|-----------|
| **Job** | Een klantenorder met een of meer onderdelen. Heeft een jobnummer, klantnaam en algemene status. |
| **Onderdeel (Part)** | Een fysiek item dat geproduceerd moet worden. Behoort tot een job. Heeft onderdeelnummer, materiaal, hoeveelheid en tekening. |
| **Bewerking (Operation)** | Een enkele productiestap op een onderdeel (bijv. lasersnijden, kanten, lassen). Heeft een volgordenummer, geschatte tijd en status. |
| **Substap (Substep)** | Een checklist-item binnen een bewerking (bijv. "afmetingen controleren", "randen ontbramen"). |
| **Batch** | Een groep bewerkingen die samen worden verwerkt voor efficiënte productie op een enkele machine/cel. |

## Productieconcepten

| Term | Definitie |
|------|-----------|
| **Cel / Stadium (Cell / Stage)** | Een productiegebied of machinegroep (bijv. "Laser 1", "Kantbank", "Verfstraat"). Bewerkingen worden aan cellen toegewezen. |
| **Middel (Resource)** | Een machine, gereedschap of opspanning die in de productie wordt gebruikt. Toegewezen aan cellen. |
| **Toewijzing (Assignment)** | Koppelt een operator aan specifieke jobs/onderdelen/bewerkingen waaraan zij moeten werken. |
| **Werkwachtrij (Work Queue)** | De weergave van de operator van toegewezen bewerkingen, geordend op prioriteit. |
| **Tijdregistratie (Time Entry)** | Een inklok/uitklok-record van een operator die aan een bewerking werkt. |
| **Capaciteitsmatrix (Capacity Matrix)** | Visueel raster dat celbeschikbaarheid versus ingepland werk over tijd toont. |
| **Bullet Card** | Een voorrangskaart die je op een part zet (geïnspireerd door QRM, geen POLCA-kaart — Eryxon Flow heeft geen kaartlussen of autorisatie). Het part met de kaart sorteert bovenaan de partlijst en wordt overal waar het werk verschijnt gemarkeerd, zodat het opvalt. Gebruik er één, hooguit twee; dat is richtlijn voor de planner, geen grens die de app afdwingt. Teamleiders (admins) plaatsen en verwijderen de kaart. Geen algemene spoedmarkering. Opgeslagen als `parts.is_bullet_card`. (Sommige operatorschermen tonen dit nog als "Rush", een bekende fout.) |
| **Yellow Card** | Een wachtkaart op een bewerking (geïnspireerd door QRM, geen POLCA-kaart). Een bewerking met een Yellow Card verdwijnt uit de capaciteitsweergaven en telt niet mee in de max-per-cel telling, zodat parkeren een OHW-plek vrijmaakt zolang de bewerking wacht. Haal je de kaart eraf, dan keert de bewerking terug naar haar normale plek in de wachtrij en sorteert ze weer op haar sequence — ze springt niet vooraan en gaat niet naar achteren. Geen algemene pauzemarkering — de uitsluiting van capaciteit en de telling is het doel. Teamleiders (admins) plaatsen en verwijderen de kaart. Opgeslagen als `operations.status = 'on_hold'`. |
| **OHW (Onderhanden Werk / WIP)** | Het aantal bewerkingen dat tegelijkertijd actief is in een cel. Beperkt door OHW-limieten. |
| **POLCA** | Paired-cell Overlapping Loops of Cards with Authorization, de kaartmethode van QRM voor de werkvloer. Werk start pas als de vrijgavedatum is bereikt en de volgende gekoppelde cel ruimte heeft. |
| **QRM** | Quick Response Manufacturing — methodiek gericht op het verkorten van doorlooptijden. Kortere tijd door de werkplaats is het enige doel. |

## Kwaliteit & Issues

| Term | Definitie |
|------|-----------|
| **NCR** | Non-Conformance Report. Een formeel rapport dat iets niet aan specificaties voldoet. |
| **Issue** | Een probleem gemeld tijdens productie. Types: NCR, observatie, verbetering, veiligheid. |
| **Uitval (Scrap)** | Materiaal dat niet kan worden herwerkt en moet worden afgekeurd. Bijgehouden met uitvalredencodes. |
| **Herwerk (Rework)** | Materiaal dat de inspectie niet heeft doorstaan maar kan worden gecorrigeerd en opnieuw verwerkt. |
| **Dispositie (Disposition)** | De beslissing over wat te doen met niet-conform materiaal (afkeuren, herwerken, gebruiken-als-is, retourneren). |
| **PMI** | Product Manufacturing Information — dimensionele data uit 3D-modellen/tekeningen. |

## ERP-integratie

| Term | Definitie |
|------|-----------|
| **ERP** | Enterprise Resource Planning — het bedrijfssysteem (bijv. SAP, Exact, AFAS) dat orders, voorraad en facturatie beheert. |
| **Extern ID (External ID)** | Het ID van een entiteit in het ERP-systeem. Gebruikt voor synchronisatiekoppeling. |
| **Externe Bron (External Source)** | Welk ERP-systeem de data heeft aangeleverd (bijv. "exact", "sap"). |
| **Sync Hash** | SHA-256-hash van gesynchroniseerde data voor wijzigingsdetectie — updates overslaan wanneer data niet is veranderd. |
| **Bulksynchronisatie (Bulk Sync)** | Meerdere records tegelijk vanuit ERP naar Eryxon Flow pushen in een API-aanroep (max 1000 items). |

## Systeemconcepten

| Term | Definitie |
|------|-----------|
| **Tenant** | Een organisatie die Eryxon Flow gebruikt. Alle data is per tenant geïsoleerd via RLS. |
| **RLS** | Row-Level Security — PostgreSQL-functie die rijtoegang beperkt op basis van sessiecontext. |
| **API-sleutel (API Key)** | Bearer-token voor REST API-toegang. Formaat: `ery_live_*` (productie) of `ery_test_*` (sandbox). |
| **Plan** | Abonnementsniveau: free, pro, premium, enterprise. Bepaalt snelheidslimieten en quota's. |
| **MCP** | Model Context Protocol — stelt AI-agents in staat om met Eryxon Flow te communiceren als tool. |
| **STEP / STP** | ISO 10303-bestandsformaat voor 3D CAD-modellen. Het dominante uitwisselingsformaat in de maakindustrie. |
| **Soft Delete** | Records worden gemarkeerd met een `deleted_at`-tijdstempel in plaats van fysiek verwijderd. |
| **Webhook** | HTTP-callback die wordt afgevuurd wanneer events plaatsvinden (job aangemaakt, status gewijzigd, enz.). |
