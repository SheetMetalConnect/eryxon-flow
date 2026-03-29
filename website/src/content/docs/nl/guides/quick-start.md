---
title: "Snel Starten"
description: "Eryxon Flow in enkele minuten opstarten en gebruiken."
---

Eryxon Flow snel opstarten.

> **Gewoon verkennen?** Probeer de [live demo op app.eryxon.eu](https://app.eryxon.eu) — geen installatie nodig. Registreer en begin direct met verkennen.

---

## Vereisten

- Node.js 20+ ([download](https://nodejs.org))
- Een Supabase-account (gratis tier werkt) - [aanmelden](https://supabase.com)

---

## Stap 1: Supabase Instellen

### 1.1 Project Aanmaken

1. Ga naar [supabase.com](https://supabase.com) → **New Project**
2. Noem het `eryxon-flow`
3. Sla je databasewachtwoord op
4. Klik op **Create**

### 1.2 Je Sleutels Ophalen

Ga naar **Settings** → **API** en kopieer:
- **Project URL** (bijv. `https://abc123.supabase.co`)
- **anon public key** (begint met `eyJ...`)

### 1.3 Databaseschema Toepassen

Gebruik de Supabase CLI tegen je doelproject:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### 1.4 Seeddata Toepassen

Het seedbestand stelt opslagbeleid, RLS-standaarden en cron-jobs in:

```bash
supabase db execute --file supabase/seed.sql
```

### 1.5 Opslagbuckets Aanmaken

```bash
supabase storage create parts-images
supabase storage create issues
supabase storage create parts-cad
supabase storage create batch-images
```

### 1.6 Edge Functions Deployen

```bash
supabase functions deploy
```

### 1.7 Edge Function Secrets Instellen

Ga naar **Settings** → **API** en kopieer de **service_role** sleutel, dan:

```bash
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Configureer de `notify-new-signup` Database Webhook nadat migraties zijn toegepast (zie [Handleiding Zelf Hosten](/guides/self-hosting/)).

> **Liever automatisering?** Voer `bash scripts/setup.sh` uit — dat leidt je interactief door alles hierboven.

---

## Stap 2: De Applicatie Starten

```bash
git clone https://github.com/SheetMetalConnect/eryxon-flow.git
cd eryxon-flow

npm install

cp .env.example .env
```

Bewerk `.env`:
```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```

Start de app:
```bash
npm run dev
```

Open **http://localhost:8080**

---

## Stap 3: Je Account Aanmaken

1. Klik op **Sign Up**
2. Voer e-mail en wachtwoord in
3. Bevestig je e-mail (controleer je inbox)
4. Je bent nu admin van je organisatie!

---

## Stap 4: Verkennen (Optioneel)

### Demodata Laden

Wil je de app met voorbeelddata zien?

1. Ga naar **Settings** in de admin-zijbalk
2. Klik op **Create Demo Data**
3. Verken voorbeeldjobs, onderdelen en bewerkingen

### Snelle Rondleiding

| Pagina | Wat het doet |
|--------|-------------|
| `/admin/dashboard` | Productieoverzicht |
| `/admin/jobs` | Productiejobs beheren |
| `/admin/jobs/new` | Nieuwe job aanmaken |
| `/operator/work-queue` | Takenlijst operator |
| `/operator/login` | Terminal-inlog werkvloer |
| `/admin/config/stages` | Werkstadia configureren |

---

## Wat Nu?

**Installatie & Deployment:**
- [Deployment Gids](/guides/deployment/) - Productie-deploymentopties
- [Zelf Hosten Gids](/guides/self-hosting/) - Omgeving en uitroldetails
- [MCP Server Setup](/guides/mcp-setup/) - AI-assistent integratie instellen

**API & Integratie:**
- [REST API Overzicht](/architecture/connectivity-rest-api/) - Integratiearchitectuur
- [REST API Referentie](/api/rest-api-reference/) - Volledige endpoint-referentie
- [API Payload Referentie](/api/payload-reference/) - Kopieer-en-plak payload-voorbeelden
- [MCP Demo Gids](/api/mcp-demo-guide/) - Voorbeelden AI-assistentgebruik
- [Webhooks & MQTT](/architecture/connectivity-mqtt/) - Event-gedreven integratie
- **Swagger/OpenAPI** - Beschikbaar in de app op `/admin/api-docs` (inlog vereist)

**Architectuur & Hulp:**
- [App-architectuur](/architecture/app-architecture/) - Systeemontwerp-overzicht
- [FAQ](/nl/guides/faq) - Veelgestelde vragen

---

## Veelvoorkomende Problemen

**Kan niet registreren?**
- Controleer of je Supabase URL correct is in `.env`
- Verifieer e-mailinstellingen in het Supabase Auth-dashboard

**Databasefouten?**
- Zorg dat je het schema-SQL hebt uitgevoerd
- Controleer de SQL Editor op fouten

**Pagina laadt niet?**
- Controleer of beide omgevingsvariabelen zijn ingesteld
- Controleer de browserconsole op fouten

---

## Hulp Nodig?

- Begin bij de [documentatie-homepagina](/)
- Open een issue op GitHub
- Doe mee aan onze communitydiscussies

---

*Veel productiesucces!*
