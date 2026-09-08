---
title: "Snel Starten"
description: "Eryxon Flow in enkele minuten opstarten en gebruiken."
---

Eryxon Flow snel opstarten.

> **Gewoon verkennen?** Open de [hosted versie op app.eryxon.eu](https://app.eryxon.eu) - geen installatie nodig. Een gratis proefperiode van 30 dagen.

> Zelf hosten draait de gratis **Community**-editie, broncode-beschikbaar onder de Business Source License 1.1 — gratis zelf te hosten voor één werkplaats. Gebruik op meerdere locaties vereist een commerciële licentie; zie [Edities & Prijzen](/pricing/).

---

## Vereisten

- Node.js **22.12 of nieuwer**
- Toegang tot de private broncoderepository
- Een Supabase-backend die is ingericht voor de broncodeversie die je wilt draaien

Volg de [handleiding voor zelf hosten](/guides/self-hosting/) voor de backend,
migraties, secrets voor functies en productiehosting. Daar staat de actuele
installatievolgorde. De stappen hieronder starten een lokale frontend met die
voorbereide backend.

## Lokaal starten

```sh
git clone https://github.com/SheetMetalConnect/eryxon-flow.git
cd eryxon-flow
npm ci
cp .env.example .env
```

Vul in `.env` de publieke frontendinstellingen van je backend in:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-public-key
VITE_SUPABASE_PROJECT_ID=your-project
```

Waarden met het voorvoegsel `VITE_` zijn zichtbaar in de browser. Bewaar
service-role-sleutels en andere geheime gegevens op de backend.

```sh
npm run dev
```

Open [localhost:8080](http://localhost:8080) en log in. Als accountregistratie is
ingeschakeld, maak je eerst je organisatie aan via **Sign Up**.

## De app gebruiken

Beheerders beheren jobs, onderdelen, bewerkingen en werkcellen. Operators gebruiken
de [Werkwachtrij en Terminal](/nl/guides/operator-manual/) op telefoon, tablet en
desktop. Alle schermformaten gebruiken dezelfde responsieve interface.

Zie de [deploymenthandleiding](/guides/deployment/) voor ingebruikname in productie.
PWA-installatie is optioneel en moet tijdens het bouwen worden ingeschakeld; zie
[PWA-configuratie](/guides/self-hosting/#optional-pwa-verification).
