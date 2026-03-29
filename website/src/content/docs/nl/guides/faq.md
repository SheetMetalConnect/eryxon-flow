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
**Quick Response Manufacturing (QRM)** is een methodologie om doorlooptijden te verkorten. Eryxon Flow gebruikt het om **OHW (Onderhanden Werk)** te beheren. Als een cel "Op Capaciteit" staat, voorkomt het systeem overproductie door stroomopwaartse voltooiingen te blokkeren.

### Wat is een bullet card?
Een **bullet card** is de spoedmarkering op een onderdeel. Wanneer ingeschakeld, springt het onderdeel naar de top van elke wachtrij en tabel. Alle bewerkingen op dat onderdeel erven de spoedindicator. Gebruik spaarzaam — als alles spoed is, is niets spoed.

### Wat is POLCA?
**POLCA** (Paired-cell Overlapping Loops of Cards with Authorization) is een werklastbeheersysteem. In Eryxon Flow verschijnt het als GO/PAUZE-signalen op de terminal. **GO** betekent dat de volgende cel capaciteit heeft. **PAUZE** betekent dat de volgende cel vol zit — wacht met voltooien om ophoping te voorkomen.

### Wat zijn cellen en stadia?
**Cellen** (ook wel **stadia** genoemd) vertegenwoordigen fysieke werkstations of afdelingen in je werkplaats — zoals "Laser 1", "Kantbank", "Lassen" of "Assemblage". Bewerkingen worden aan cellen toegewezen. Elke cel heeft een OHW-limiet en capaciteitsuren.

### Wat is de capaciteitsmatrix?
Een visueel overzicht van de belasting per cel per dag. Elke cel is een rij, elke dag een kolom. Kleurcodering toont beschikbaar (groen), belast (oranje) en overbelast (rood). Gebruik het om knelpunten te herkennen voordat ze de werkvloer bereiken.

### Hoe werkt tijdregistratie?
Operators tikken **Start** om een timer te starten en **Stop** om deze te pauzeren. Er kan slechts een bewerking tegelijk getimed worden. Het starten van een nieuwe bewerking stopt automatisch de vorige. De lopende timer is altijd zichtbaar in de statusbalk.

### Wat zijn issues (NCR's)?
Issues zijn kwaliteitsproblemen die operators melden vanuit actieve bewerkingen — verkeerd materiaal, beschadigde onderdelen, machineproblemen, tekeningfouten. Ze hebben een ernst (laag/gemiddeld/hoog/kritiek) en kunnen foto's bevatten. Issues zijn informatief — ze blokkeren het werk niet.

### Wat is metadata?
Bewerkingen en jobs ondersteunen **aangepaste JSON-metadata** — machine-instellingen, buighoeken, lasparameters, gereedschapsvereisten. Dit zijn vrije velden die je kunt invullen naar behoefte van je werkplaats.

## Gespecialiseerde Handleidingen

Voor gedetailleerde instructies, zie:

- **[Handleiding Operator](/nl/guides/operator-manual/)** - Dagelijkse workflow, Terminal-info, Tijdregistratie.
- **[Handleiding Admin](/nl/guides/admin-manual/)** - Job-aanmaak, Gebruikers, Instellingen.
- **[Kwaliteitsbeheer](/guides/quality-management/)** - Uitvalregistratie en Dashboards.
- **[Probleemoplossing](/guides/troubleshooting/)** - Veelvoorkomende fouten en oplossingen.
- **[Zelf Hosten](/guides/self-hosting/)** - Installatiehandleiding.
