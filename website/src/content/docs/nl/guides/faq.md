---
title: "Help & Veelgestelde Vragen"
description: "Veelgestelde vragen over Eryxon Flow."
---

## Algemene Vragen

### Wat is de hierarchie in Eryxon Flow?
1. **Job** = Klantenorder (bijv. "PO-12345")
2. **Onderdeel** = Component (bijv. "Beugel A")
3. **Bewerking** = Taak (bijv. "Lasersnijden", "Kanten")

### Hoe werken assemblages?
Assemblages zijn onderdelen die andere onderdelen bevatten.
```
Beugel Assemblage (Ouder)
├── Linkerplaat (Kind)
├── Rechterplaat (Kind)
```
Elk onderdeel wordt individueel gevolgd met eigen bewerkingen.

### Wat is QRM?
**Quick Response Manufacturing (QRM)** is een methodologie om doorlooptijden te verkorten. Eryxon Flow ondersteunt dat met OHW-limieten en signalen voor de capaciteit van de volgende cel. Een cel kan optioneel de voltooiing van de voorgaande bewerking blokkeren zodra de OHW-limiet is bereikt.

### Wat is een bullet card?
Een **bullet card** is de spoedmarkering op een onderdeel. Wanneer ingeschakeld, springt het onderdeel naar de top van elke wachtrij en tabel. Alle bewerkingen op dat onderdeel erven de spoedindicator. Gebruik spaarzaam — als alles spoed is, is niets spoed.

### Wat is POLCA?
**POLCA** (Paired-cell Overlapping Loops of Cards with Authorization) is een werklastbeheersysteem. Eryxon Flow implementeert geen volledig POLCA-systeem of gekoppelde kaartlussen. Het gebruikt wel het verwante idee van GO/PAUZE-signalen: **GO** betekent dat de volgende cel capaciteit heeft; **PAUZE** betekent dat de ingestelde OHW-limiet is bereikt.

### Wat zijn cellen en stadia?
**Cellen** (ook wel **stadia** genoemd) vertegenwoordigen fysieke werkstations of afdelingen in je werkplaats — zoals "Laser 1", "Kantbank", "Lassen" of "Assemblage". Bewerkingen worden aan cellen toegewezen. Elke cel heeft een OHW-limiet en capaciteitsuren.

### Wat is de capaciteitsmatrix?
Een visueel overzicht van de belasting per cel per dag. Elke cel is een rij, elke dag een kolom. Kleurcodering toont beschikbaar (groen), belast (oranje) en overbelast (rood). Gebruik het om knelpunten te herkennen voordat ze de werkvloer bereiken.

### Hoe werkt tijdregistratie?
Operators tikken **Start** om een timer te starten en **Stop** om deze te pauzeren. Er kan slechts een bewerking tegelijk getimed worden. Het starten van een nieuwe bewerking stopt automatisch de vorige. De lopende timer is altijd zichtbaar in de statusbalk.

### Wat zijn issues (NCR's)?
Issues zijn kwaliteitsproblemen die operators melden vanuit actieve bewerkingen — verkeerd materiaal, beschadigde onderdelen, machineproblemen, tekeningfouten. Ze hebben een ernst (laag/gemiddeld/hoog/kritiek) en kunnen foto's bevatten. Een issue blokkeert werk alleen wanneer het als stilstand is gemarkeerd.

### Wat is metadata?
Bewerkingen en jobs ondersteunen **aangepaste JSON-metadata** — machine-instellingen, buighoeken, lasparameters, gereedschapsvereisten. Dit zijn vrije velden die je kunt invullen naar behoefte van je werkplaats.

## Gespecialiseerde Handleidingen

Voor gedetailleerde instructies, zie:

- **[Handleiding Operator](/nl/guides/operator-manual/)** - Dagelijkse workflow, Terminal-info, Tijdregistratie.
- **[Handleiding Admin](/nl/guides/admin-manual/)** - Job-aanmaak, Gebruikers, Instellingen.
- **[Kwaliteitsbeheer](/nl/guides/quality-management/)** - Uitvalregistratie en Dashboards.
- **[Probleemoplossing](/nl/guides/troubleshooting/)** - Veelvoorkomende fouten en oplossingen.
- **[Zelf Hosten](/nl/guides/self-hosting/)** - Installatiehandleiding.
