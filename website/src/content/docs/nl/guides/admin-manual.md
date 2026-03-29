---
title: Handleiding Admin
description: Hoe productie te beheren in Eryxon Flow — jobs, cellen, planning, kwaliteit.
---

Deze handleiding behandelt alles wat een productiemanager of planner nodig heeft om de dagelijkse operaties in Eryxon Flow te draaien. Het gaat ervan uit dat je account admin-toegang heeft.

## Dashboard

Het dashboard is je startscherm. Het toont:

- **Actieve operators** — wie is ingelogd en werkt er op dit moment.
- **Openstaande issues** — kwaliteitsproblemen gemeld vanaf de werkvloer, wachtend op je beoordeling.
- **OHW per cel** — hoeveel bewerkingen actief zijn in elke productiecel, afgezet tegen de OHW-limiet van de cel.
- **Leverdata** — aankomende deadlines over alle actieve jobs, gesorteerd op urgentie.

Alle data wordt in realtime bijgewerkt. Wanneer een operator een start of einde scant op de terminal, wordt het dashboard binnen seconden bijgewerkt.

## Jobs Beheren

### Jobhierarchie

Elke job volgt dezelfde structuur: **Job > Onderdelen > Bewerkingen**.

- Een **job** vertegenwoordigt een klantenorder of intern project. Het bevat de klantnaam, jobnummer en leverdatum.
- Een **onderdeel** is een fysiek item dat geproduceerd moet worden. Elk onderdeel heeft een materiaal, hoeveelheid en tekeningreferentie.
- Een **bewerking** is een enkele productiestap op een onderdeel — snijden, kanten, lassen, lakken, enz. Bewerkingen zijn gekoppeld aan een productiecel en hebben een geschatte tijd.

### Een job aanmaken

1. Ga naar **Jobs** en klik op **Nieuwe Job Aanmaken**.
2. Vul het jobnummer, de klant en de leverdatum in.
3. Voeg een of meer onderdelen toe. Stel voor elk onderdeel het onderdeelnummer, materiaal en hoeveelheid in.
4. Voeg bewerkingen toe aan elk onderdeel. Selecteer voor elke bewerking de cel, stel de geschatte tijd in en definieer de volgorde.

Je kunt ook `Cmd/Ctrl + N` gebruiken vanuit elke plek om het snelcreatiemenu te openen.

### Spoedorders (bullet card)

Wanneer een onderdeel de wachtrij moet passeren, markeer het als **bullet card** (spoed). Dit doet globaal drie dingen:

- Het onderdeel gaat naar de top van elke tabel en werkwachtrij, over alle cellen.
- Operators zien een duidelijke spoedindicator op hun terminal.
- Het onderdeel blijft geprioriteerd totdat je de spoedvlag verwijdert.

Gebruik dit spaarzaam. Als alles spoed is, is niets spoed.

### Bewerkingen in wacht zetten

Je kunt elke bewerking in wacht zetten vanuit het bewerkingsdetailpaneel. Een bewerking in wacht blijft zichtbaar in de werkwachtrij maar is gemarkeerd met een wachtbadge zodat operators weten dat ze er niet aan moeten beginnen. Hervat het wanneer de blokkade is opgeheven.

## Productiecellen (Stadia)

Cellen vertegenwoordigen je fysieke werkstations of afdelingen — lasersnijden, kantbank, lassen, assemblage, verzending.

### Een cel configureren

Ga naar **Stadia & Cellen** in de admin-zijbalk. Voor elke cel kun je instellen:

- **Naam** — wat operators op de terminal zien (bijv. "Laser 1", "Kantbank").
- **Kleur** — gebruikt door de hele interface voor visuele herkenning.
- **Icoon** — verschijnt op de terminal en in de capaciteitsmatrix.
- **Volgorde** — de standaardvolgorde waarin cellen in weergaven en planning verschijnen.

### OHW-limieten

Elke cel heeft een OHW-limiet (Onderhanden Werk). Dit bepaalt hoeveel bewerkingen tegelijkertijd actief kunnen zijn.

- **Waarschuwingsdrempel** — de interface markeert de cel wanneer deze de limiet nadert.
- **Limiet afdwingen** — indien ingeschakeld, blokkeert het systeem de vorige bewerking van voltooiing als de volgende cel op capaciteit zit. Dit voorkomt dat werk zich ophoopt bij een knelpunt.

Stel OHW-limieten in op basis van je daadwerkelijke stationcapaciteit. Begin conservatief en pas aan op basis van wat je observeert.

### Capaciteitsuren

Definieer hoeveel productieuren elke cel per dag heeft. De planner gebruikt dit om de belasting te berekenen en te markeren wanneer dagen overbelast zijn.

## Planning en Capaciteit

### Auto-planner

De auto-planner wijst bewerkingen toe aan tijdslots op basis van:

- Bewerkingsvolgorde binnen elk onderdeel.
- Geschatte uren per bewerking.
- Celcapaciteit per dag.
- Leverdata van jobs.

Draai de planner na het toevoegen van nieuwe jobs of wanneer prioriteiten veranderen. Het herberekent het volledige schema en werkt de capaciteitsmatrix bij.

### Capaciteitsmatrix

De capaciteitsmatrix geeft je een vogelvluchtperspectief van de belasting per cel per dag. Elke cel verschijnt als een rij, elke dag als een kolom. Kleurcodering geeft beschikbare, belaste en overbelaste statussen aan.

Gebruik dit om knelpunten te herkennen voordat ze de werkvloer bereiken. Als een cel over drie dagen rood toont, weet je dat je nu moet handelen — werk verplaatsen, een dienst toevoegen of leverdata aanpassen.

### Leverdatum-overschrijvingen

Wanneer een klant de deadline wijzigt, werk de leverdatum bij op de job. De planner pakt de wijziging op bij de volgende run.

### Fabriekskalender

De fabriekskalender definieert werkdagen en feestdagen. De planner slaat niet-werkdagen automatisch over. Configureer dit in **Instellingen** voordat je je eerste planning draait.

## Batchbeheer

Batches groeperen bewerkingen voor nesting of gecombineerde verwerking — gebruikelijk bij lasersnijden waar meerdere onderdelen dezelfde plaat delen.

### Werken met batches

1. Maak een batch aan en geef deze een naam of nummer.
2. Wijs bewerkingen van verschillende onderdelen toe aan de batch.
3. Volg de materiaaltoewijzing voor de batch.

Wanneer een operator een batch verwerkt, vorderen alle opgenomen bewerkingen samen.

## Toewijzingen en Gebruikers

### Werk toewijzen

Ga naar de **Toewijzingen**-pagina om specifieke bewerkingen aan operators toe te wijzen. Selecteer het onderdeel, kies de operator en bevestig. De toewijzing verschijnt onmiddellijk in de werkwachtrij van de operator.

Je kunt operators ook zelf laten toewijzen uit beschikbaar werk in hun cel.

### Rollen

- **Admin** — volledige toegang tot alle instellingen, jobs, planning, data en gebruikersbeheer.
- **Operator** — toegang tot hun werkwachtrij, de terminal en issuerapportage. Operators kunnen geen jobs wijzigen, planningen veranderen of instellingen openen.

Beheer gebruikers in **Instellingen > Gebruikers**.

## Kwaliteit en Issues

Operators melden issues direct vanuit de terminal — verkeerd materiaal, beschadigde onderdelen, ontbrekende tekeningen, machineproblemen.

### Issues beoordelen

1. Ga naar de **Issues**-pagina.
2. Elke issue toont het onderdeel, de bewerking, de operator en de beschrijving.
3. Kies een actie:
   - **Goedkeuren** — bevestigt dat het een geldig issue is. Logt het voor kwaliteitsregistratie.
   - **Afwijzen** — het is geen daadwerkelijk issue. Voeg een notitie toe die uitlegt waarom.
   - **Sluiten** — het issue is opgelost. Voeg oplossingsnotities toe.

Reageer snel op issues. Onopgeloste issues blokkeren operators en vertragen de productie.

### Uitvalredenen

Configureer uitvalredencodes in **Uitvalredenen** instellingen. Elke reden heeft een code, beschrijving en categorie (Materiaal, Proces, Apparatuur, Operator, Ontwerp). De pagina toont gebruiksstatistieken zodat je kunt zien welke problemen het vaakst voorkomen.

## Data en Integratie

### CSV-import

Importeer jobs, onderdelen en bewerkingen uit CSV-bestanden. Dit is handig voor migratie vanuit spreadsheets of het ontvangen van gestructureerde data uit je ERP. Het importscherm valideert data voordat het wordt doorgevoerd.

### API-sleutels

Genereer API-sleutels in **Instellingen > API-sleutels** voor integratie met externe systemen. Elke sleutel is gekoppeld aan je tenant en kan op elk moment worden ingetrokken.

### Webhooks

Configureer webhooks in **Instellingen > Webhooks** om events naar externe systemen te pushen. Beschikbare events zijn:

- `operation.started` — een operator is met werk begonnen.
- `operation.completed` — een operator heeft werk afgerond.
- `issue.created` — een kwaliteitsissue is gemeld.

### Data-export

Ga naar **Data Export** in de admin-zijbalk. Je kunt alle records exporteren als JSON of CSV. CSV is doorgaans sneller voor grote datasets. Exports bevatten alle databaserecords en metadata maar sluiten bestandsbijlagen (alleen paden) en API-geheimen (alleen prefixen) uit.

Grote exports kunnen 30-60 seconden duren. Voer ze uit tijdens rustige uren indien mogelijk.
