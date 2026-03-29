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
| **Bullet Card (Spoed)** | Spoedmarkering op een onderdeel. Het onderdeel springt naar de top van elke wachtrij. |
| **OHW (Onderhanden Werk / WIP)** | Het aantal bewerkingen dat tegelijkertijd actief is in een cel. Beperkt door OHW-limieten. |
| **POLCA** | Paired-cell Overlapping Loops of Cards with Authorization — werklastbeheersysteem met GO/PAUZE-signalen. |
| **QRM** | Quick Response Manufacturing — methodologie gericht op het verkorten van doorlooptijden. |

## Kwaliteit & Issues

| Term | Definitie |
|------|-----------|
| **NCR** | Non-Conformance Report. Een formeel rapport dat iets niet aan specificaties voldoet. |
| **Issue** | Een probleem gemeld tijdens productie. Types: NCR, observatie, verbetering, veiligheid. |
| **Uitval (Scrap)** | Materiaal dat niet kan worden herwerkt en moet worden afgekeurd. Bijgehouden met uitvalredencodes. |
| **Herwerk (Rework)** | Materiaal dat de inspectie niet heeft doorstaan maar kan worden gecorrigeerd en opnieuw verwerkt. |
| **Dispositie (Disposition)** | De beslissing over wat te doen met niet-conform materiaal (afkeuren, herwerken, gebruiken-als-is, retourneren). |
| **PMI** | Product Manufacturing Information — dimensionele data uit 3D-modellen/tekeningen. |

## Meetwaarden

| Term | Definitie |
|------|-----------|
| **OEE** | Overall Equipment Effectiveness. Beschikbaarheid x Prestatie x Kwaliteit. Industriestandaard meetwaarde. |
| **Beschikbaarheid (Availability)** | % van de geplande tijd dat apparatuur daadwerkelijk draait. |
| **Prestatie (Performance)** | Werkelijke productiesnelheid versus theoretisch maximum. |
| **Kwaliteit (Quality)** | % geproduceerde items die de eerste inspectie doorstaan (geen herwerk/uitval). |

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
