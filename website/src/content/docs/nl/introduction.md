---
title: Welkom bij Eryxon Flow
description: Het eenvoudige, elegante en krachtige manufacturing execution system waar uw mensen graag mee zullen werken. Gemaakt voor metaalbewerking op maat—plaatwerk, staalconstructie, precisie-verspaning.
---

**Het eenvoudige, elegante en krachtige manufacturing execution system waar uw mensen graag mee zullen werken. Gemaakt voor metaalbewerking op maat.**

### Voor Wie Het Is

**Primair:** Metaalbewerkingsbedrijven op maat—plaatwerk, staalconstructie, precisie-verspaning—voor hoog, midden of laag volume productie.

**Ook geschikt voor:** Andere job shops en maatwerkproductiebedrijven in de bouw, meubelindustrie, houtbewerking en vergelijkbare sectoren.

---

## Wat is MES?

Een **Manufacturing Execution System (MES)** overbrugt de kloof tussen uw ERP (bedrijfssysteem) en de werkvloer. Terwijl uw ERP orders, klanten en facturen beheert, houdt MES bij *hoe het werk daadwerkelijk wordt uitgevoerd*—wie waaraan werkt, waar onderdelen zich in de productie bevinden en of u op schema ligt.

### Onze Filosofie

**Ga papierloos.** Laat papieren werkbonnen achter. In plaats van werkpakketten te printen die zoekraken, beschadigd raken of verouderd zijn zodra er iets verandert, geef operators een tablet met actuele informatie—tekeningen, 3D-modellen, instructies en status—alles op één plek.

**Verzamel data.** Elke start, stop en voltooiing wordt geregistreerd. Weet hoe lang bewerkingen werkelijk duren. Identificeer knelpunten. Bouw een fundament voor continue verbetering.

**Verbeter communicatie.** Wanneer een operator een probleem meldt, ziet iedereen het direct. Wanneer een prioriteit wijzigt, weet iedereen het. Niet meer de werkvloer op om te ontdekken wat er gebeurt—real-time zichtbaarheid op alle schermen.

**Integreer met uw systemen.** Eryxon verbindt met uw ERP via REST API en publiceert events naar een unified namespace (MQTT/ISA-95). Uw data stroomt waar nodig—geen eilandjes, geen dubbele invoer.

---

## Wat Het Doet

Eryxon volgt orders, onderdelen en taken door de productie met een mobiele en tablet-vriendelijke interface. Integreer met uw ERP en publiceer events naar een unified namespace (MQTT/ISA-95).

### Voor Operators
De interface toont waaraan gewerkt moet worden, gegroepeerd op materialen en productiestadia—georganiseerd zoals uw werkplaats draait, niet zoals accountants denken. 
- **Visuele indicatoren** (kleuren, afbeeldingen) maken taken direct herkenbaar. 
- **STEP-file viewer** toont de geometrie. 
- **PDF-viewer** toont de tekeningen. 
- Start- en stoptijd op taken registreren. 
- Issues melden als er iets mis is. 

Alles wat nodig is, niets extra's.

### Voor Admins
Zie in realtime wie waaraan werkt. 
- Drag-and-drop om specifiek werk aan specifieke mensen toe te wijzen. 
- Issues beoordelen en goedkeuren. 
- Datums overschrijven indien nodig. 
- Stadia, materialen en sjablonen configureren. 

Echt inzicht in de activiteiten op de werkvloer zonder de vloer op te hoeven gaan.

### Werkorganisatie
Werk wordt **kanban-stijl** weergegeven met visuele kolommen per stadium. Operators zien wat beschikbaar is en "pullen" werk wanneer ze klaar zijn—niet "gepushed" door een planning. Stadia vertegenwoordigen productie-zones (snijden, buigen, lassen, assemblage).

**Quick Response Manufacturing (QRM)** principes zijn ingebouwd: 
- Visuele indicatoren tonen wanneer te veel orders of onderdelen in hetzelfde stadium zijn. 
- Beperk onderhanden werk (WIP) per stadium om de doorloop te behouden. 
- Volg de voortgang per stadium-voltooiing, niet alleen individuele bewerkingstijden. 
- Handmatige tijdregistratie toont wat er nog rest, niet alleen wat er gedaan is. 
- **Real-time updates**—wijzigingen verschijnen onmiddellijk op alle schermen.

### Flexibele Data
Orders, onderdelen en taken ondersteunen **aangepaste JSON-metadata**—machine-instellingen, buigsequenties, lasparameters. Definieer herbruikbare middelen zoals mallen, gereedschappen, opspanningen of materialen en koppel ze aan het werk. Operators zien wat er nodig is en eventuele aangepaste instructies in de taakweergave.

---

## Gebruikers & Rollen

### Operators
Zien hun werkwachtrij, registreren start/stop tijden, markeren taken als voltooid, bekijken bestanden en melden kwaliteitsproblemen.

### Admins
Kunnen alles wat operators kunnen, plus: specifiek werk toewijzen aan specifieke mensen, issues beheren, datums overschrijven en stadia/materialen/sjablonen configureren. Dagelijkse drag-and-drop toewijzing zet het juiste werk bij de juiste mensen. Omdat mensen ertoe doen.

> **Let op:** Operator-accounts kunnen worden gemarkeerd als machines voor autonome processen.

---

## Real-Time Inzicht

Volg in realtime wie er aanwezig is en waaraan zij werken. Geen gegis, geen vertragingen. Wijzigingen verschijnen onmiddellijk op alle schermen via **WebSocket-updates**.

---

## Integratie-Eerste Architectuur

**100% API-gedreven.** Uw ERP stuurt orders, onderdelen en taken via de REST API. Eryxon stuurt voltooiingsgebeurtenissen terug via webhooks en MQTT (ISA-95 unified namespace). MCP-server maakt AI/automatisering-integratie mogelijk.

### Bestandsafhandeling
Vraag een ondertekende upload-URL aan via de API, upload STEP- en PDF-bestanden rechtstreeks naar Supabase Storage en verwijs vervolgens naar het bestandspad bij het maken van orders of onderdelen. Grote bestanden (typisch 5-50MB) worden rechtstreeks naar de storage geüpload—geen timeouts, geen API-knelpunten.

### Aangepaste metadata
Voeg JSON-payloads toe aan orders, onderdelen en taken voor uw specifieke behoeften—gereedschapsvereisten, malnummers, machine-instellingen, materiaalspecificaties, alles wat uw werkplaats moet bijhouden.

### ERP-Integraties
Partners zoals **Sheet Metal Connect e.U.** bouwen integraties voor gangbare ERP-systemen. Of bouw uw eigen integratie met onze GitHub starter kits met voorbeeldcode en documentatie.

### Assemblage Volgen
Onderdelen kunnen ouder-kind relaties hebben. Visuele groepering toont assemblages met geneste componenten. Niet-blokkerende afhankelijkheidswaarschuwingen herinneren operators eraan wanneer onderdelen voltooid moeten zijn voordat assemblage-taken worden gestart—maar ze kunnen dit overschrijven indien nodig.

### Issue Rapportage
Operators maken issues (NCR's) aan vanuit actieve taken met een beschrijving, ernst en optionele foto's. Eenvoudige goedkeuringsworkflow: in behandeling → goedgekeurd/afgewezen → gesloten. Issues zijn informatief—ze blokkeren de voortgang van het werk niet.

---

## Wat We Niet Doen (Bewust)

*   **Geen financiële tracking.** We volgen de tijd besteed aan werk, niet de kosten, prijzen of marges.
*   **Geen inkoop.** Taken kunnen als extern worden gemarkeerd (uitbesteed werk) en de status kan via de API worden gevolgd, maar er is geen inkoopbeheer of leveranciers-transacties.
*   **Geen BOM-beheer.** We volgen wat er geproduceerd moet worden, niet de itemdetails of voorraad. Onderdelen kunnen ouder-kind links hebben voor assemblage-visualisatie, maar geen multi-level BOM's die niet in de productie leven.
*   **Geen planning.** Datums komen meestal uit uw ERP, maar admins kunnen deze handmatig overschrijven. We berekenen of optimaliseren geen planningen—u houdt de controle.
*   **Geen rapportages.** Alleen real-time statistiekenpanelen. Geen ingebouwde historische analyses—maar alle data is toegankelijk via API/MCP voor uw eigen rapportages.

---

## Technische Stack

*   **Frontend:** React + TypeScript
*   **Backend:** Supabase (PostgreSQL, Edge Functions, Realtime, Storage)
*   **Auth:** Op JWT gebaseerd met rolgebaseerde toegangscontrole
*   **Bestanden:** Supabase Storage met ondertekende URL's
*   **STEP Viewer:** occt-import-js voor client-side STEP parsing + Three.js rendering
*   **Integratie:** REST API, webhooks, MCP-server
