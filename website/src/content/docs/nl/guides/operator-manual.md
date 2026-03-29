---
title: Handleiding Operator
description: Hoe Eryxon Flow te gebruiken als operator — werkwachtrij, terminal, tijdregistratie.
---

Deze handleiding behandelt alles wat je nodig hebt om met Eryxon Flow op de werkvloer te werken. Er zijn twee hoofdinterfaces: de **Werkwachtrij** voor desktopgebruik en de **Terminal** voor vaste werkstationschermen. Beide tonen hetzelfde werk — alleen anders gepresenteerd.

## Werkwachtrij (Kanban)

De Werkwachtrij is je standaardweergave na het inloggen. Het toont bewerkingen als kaarten op een kanbanbord.

### Indeling

Elke **kolom** vertegenwoordigt een cel (werkplek) in de werkplaats. Kaarten in een kolom zijn de bewerkingen die wachten of in uitvoering zijn bij die cel. Kolomkoppen tonen totalen: uren werk in de wachtrij, aantal stuks en hoeveel spoedjobs in de kolom staan.

### Een kaart lezen

Elke kaart toont:

- **Jobnummer** en onderdeel naam
- **Bewerking** naam (bijv. "Kanten", "Lassen")
- **Materiaal** type en dikte
- **Geschatte uren** resterend
- **Leverdatum** met urgentiekleuring — te laat springt er direct uit

### Je werk vinden

- **Zoeken** op jobnummer, onderdeelnaam, bewerkingsnaam of klant
- **Filteren** op status (actief, alles, niet gestart, in uitvoering) en leverdatum (te laat, vandaag, deze week)
- **Sorteren** op volgorde, leverdatum of geschatte tijd

Als je niets ziet: controleer of je filters leeg zijn. Als het nog steeds leeg is, is er nog geen werk aan je cel toegewezen.

### Kaartbadges

- **Spoed** (rood) — deze job heeft prioriteit boven alles. Spoedjobs sorteren automatisch bovenaan.
- **In wacht** (oranje) — deze bewerking is gepauzeerd. Begin er niet aan tot de wachtstatus is opgeheven.

### Detailpaneel

Klik op een kaart om het detailpaneel aan de rechterkant te openen. Hier zie je:

- Volledige onderdeelinformatie (klant, hoeveelheid, materiaal)
- Complete routing — elke bewerking in volgorde, getoond als een visuele stroom door cellen
- Bijgevoegde bestanden: 3D-modelviewer voor STEP-bestanden, PDF-viewer voor tekeningen
- Spoed- en wachtschakelaars — markeer een bewerking als spoed of zet in wacht
- Tijdregistratiebesturing (start, stop, voltooid)

## Terminal-weergave

De Terminal is gebouwd voor vaste schermen bij een werkstation. Het werkt goed op touchapparaten en tablets. Gebruik het wanneer je voor je dienst bij een cel staat.

### Aan de slag

Kies je cel uit de **celselector** in de koptekst. De terminal toont dan alleen werk voor die cel, opgesplitst in drie wachtrijen:

- **In Bewerking** (groen) — bewerkingen waar je op dit moment actief aan werkt
- **In Buffer** (blauw) — de volgende bewerkingen die klaar zijn om te starten, al bij je cel
- **Verwacht** (oranje) — aankomend werk dat bij je cel zal aankomen

### Statusbalk

De balk onder de koptekst toont:

- Je operatornaam
- De bewerking waaraan je momenteel werkt en bij welke job deze hoort
- Een lopende timer sinds je bent gestart
- Diagonale streeppatronen die veranderen op basis van je status: groen tijdens actief werken, oranje strepen wanneer je niet bent ingeklokt, rood-naar-groen kleurverloop wanneer je aan een spoedorder werkt

### POLCA-celsignalen

De Cel-kolom toont een signaal voor elke bewerking: de **huidige cel** en de **volgende cel** in de routing, met een capaciteitsindicator:

- **GO** (play-icoon) — de volgende cel heeft capaciteit. Je kunt je bewerking voltooien en het onderdeel stroomt soepel door.
- **PAUZE** (pauze-icoon) — de volgende cel zit op capaciteit. Je bewerking nu afronden zou een ophoping veroorzaken.

Dit voorkomt knelpunten. Het systeem beheert onderhanden-werklimieten per cel.

### Achterstandstatus

Bewerkingen tonen een achterstandslabel wanneer deadlines naderen:

- **Te laat** — over de datum, had al klaar moeten zijn
- **Vandaag** — vandaag op te leveren
- **Binnenkort** — op te leveren binnen enkele dagen

### Detailzijbalk

Tik op een bewerking om de zijbalk aan de rechterkant te openen:

- **3D-viewer** — roteer en zoom het onderdeelmodel (als er een STEP-bestand is bijgevoegd)
- **PDF-viewer** — bekijk de technische tekening
- **Routing** — bekijk de volledige volgorde van bewerkingen en waar het onderdeel hierna naartoe gaat

## Tijdregistratie

Tijdregistratie koppelt je werk aan elke bewerking.

### Hoe het werkt

1. **Start** — tik op "Start" bij de bewerking waaraan je gaat werken. De timer begint en de bewerking gaat naar "In Bewerking."
2. **Stop** — tik op "Stop" wanneer het fysieke werk is gedaan.
3. **Voltooid** — markeer de bewerking als voltooid om deze naar de volgende cel te verplaatsen.

Er kan slechts **een bewerking** tegelijk getimed worden. Het starten van een nieuwe bewerking stopt de vorige.

De lopende timer is altijd zichtbaar in de statusbalk zodat je nooit vergeet te stoppen.

## Issues Melden

Wanneer er iets misgaat — verkeerd materiaal, beschadigd onderdeel, machineprobleem, tekeningfout — meld het direct.

### Stappen

1. Open het bewerkingsdetail (vanuit de Werkwachtrij of Terminal)
2. Tik op **Issue Melden**
3. Kies een ernst:
   - **Laag** — klein, blokkeert het werk niet
   - **Gemiddeld** — heeft aandacht nodig maar je kunt doorgaan
   - **Hoog** — blokkeert deze bewerking
   - **Kritiek** — veiligheidsrisico of grote productiestop
4. Beschrijf het probleem
5. **Voeg foto's toe** — maak een foto met je telefoon of tabletcamera
6. Verstuur

De issue gaat onmiddellijk naar de admin Issue-wachtrij.

## Tips

- Start altijd je timer voordat je aan het fysieke werk begint.
- Controleer de POLCA-signalen voordat je een bewerking voltooit. Als de volgende cel PAUZE toont, vraag je leidinggevende.
- Meld issues op het moment dat je ze ziet. Een foto zegt meer dan duizend woorden.
- Als je scherm leeg lijkt, wis dan eerst alle filters.
