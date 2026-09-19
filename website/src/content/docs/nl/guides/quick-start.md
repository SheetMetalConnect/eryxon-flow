---
title: "Snel Starten"
description: "Eryxon Flow in enkele minuten opstarten en gebruiken."
---

Eryxon Flow snel opstarten.

> **Gewoon verkennen?** Open de [hosted versie op app.eryxon.eu](https://app.eryxon.eu) - geen installatie nodig. Een gratis proefperiode van 30 dagen.

> Zelf hosten draait de gratis **Community**-editie, broncode-beschikbaar onder de Business Source License 1.1 — gratis zelf te hosten voor één werkplaats. Gebruik op meerdere locaties vereist een commerciële licentie; zie [Edities & Prijzen](/nl/pricing/).

---

## Vereisten

- Node.js **22.12 of nieuwer**
- Docker, voor de lokale Supabase-stack (of een gehost Supabase-project)

## Lokaal starten

```sh
git clone https://github.com/SheetMetalConnect/eryxon-flow.git
cd eryxon-flow
npm ci
npx supabase start      # lokale Postgres, Auth, Storage en Edge Functions; toont de API-URL en anon key
cp .env.example .env    # zet die URL en anon key in VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev             # http://localhost:8080
```

De eerste registratie maakt de werkplaats en de beheerder aan. `npx supabase stop`
zet de lokale stack uit. Wil je tegen een gehost Supabase-project ontwikkelen, zet
dan die URL en anon key in `.env` en sla `supabase start` over; de
[handleiding voor zelf hosten](/guides/self-hosting/) behandelt migraties, secrets
voor functies en productiehosting. Waarden met het voorvoegsel `VITE_` zijn zichtbaar
in de browser; bewaar service-role-sleutels op de backend.

## De app gebruiken

Beheerders beheren jobs, onderdelen, bewerkingen en werkcellen. Operators gebruiken
de [Werkwachtrij en Terminal](/nl/guides/operator-manual/) op telefoon, tablet en
desktop. Alle schermformaten gebruiken dezelfde responsieve interface.

Zie de [handleiding voor zelf hosten](/guides/self-hosting/) voor ingebruikname in productie.
PWA-installatie is optioneel en moet tijdens het bouwen worden ingeschakeld; zie
[PWA-configuratie](/guides/self-hosting/#optional-pwa-verification).
