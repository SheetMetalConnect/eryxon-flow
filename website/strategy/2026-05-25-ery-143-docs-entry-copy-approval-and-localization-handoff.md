# ERY-143 Docs-Entry Copy Approval and Localization Handoff

Date: 2026-05-25
Owner: CMO
Issue: [ERY-143](/ERY/issues/ERY-143)
Related: [ERY-117](/ERY/issues/ERY-117), [ERY-141](/ERY/issues/ERY-141), [ERY-54](/ERY/issues/ERY-54), [ERY-116](/ERY/issues/ERY-116)

## Decision

- The current EN `/introduction/` path-chooser structure is approved.
- Keep the three-path model exactly: hosted trial, managed rollout, self-hosted evaluation.
- Use the exact locale copy below when bringing `de/introduction.md` and `nl/introduction.md` to parity.
- Keep the managed-rollout page language aligned with the same three decision paths so the buyer does not see different names for the same choice.

## Implementation steer after follow-up comment

- Do not invent a fourth buyer-entry pattern for docs. Reuse the existing landing-page treatment already implemented in the website.
- The approved multi-path source is `website/src/pages/index.astro`: hero, proof strip, and the three-card "Start where it makes sense for you" chooser. That is the right narrative pattern for docs entry because it already expresses the hosted trial / managed rollout / self-hosted evaluation decision.
- The approved single-intent source is `website/src/layouts/LandingPage.astro`, demonstrated by `website/src/pages/solutions/erp-connected-production.astro`. Use that template for future one-problem campaign pages rather than hand-rolling another layout.
- For [ERY-141](/ERY/issues/ERY-141), the practical implication is: if engineering keeps `/introduction/` in the docs shell for this slice, the top-of-page chooser should still reuse the existing landing-page card structure, CTA hierarchy, and token treatment instead of bespoke inline styling. If a full route-level swap to the landing surface is needed but exceeds slice scope, split that into follow-up work rather than shipping another custom variant.

## Approved EN source of truth

This is approved as the messaging source for the docs-entry chooser. Engineering does not need a new EN rewrite to close [ERY-117](/ERY/issues/ERY-117); the main requirement is parity in DE/NL and terminology alignment anywhere the chooser is echoed.

### Product summary

`Eryxon Flow is a tablet-friendly manufacturing execution system for metalworking job shops — track jobs from your ERP to the shop floor without losing operator adoption.`

### Section heading

`Choose your path`

### Section intro

`Pick the route that matches where you are in evaluating Eryxon Flow.`

### Card 1

- Label: `Open the hosted trial`
- Body: `Try the live app at app.eryxon.eu — no install. Best for a first look.`

### Card 2

- Label: `Plan a managed rollout`
- Body: `Get help with deployment, ERP integration, and rollout sequencing.`

### Card 3

- Label: `Evaluate it self-hosted`
- Body: `Run it on your own infrastructure. Source-available under BSL 1.1.`

## DE localization handoff

Apply this copy to the DE docs-entry chooser.

### Produktzusammenfassung

`Eryxon Flow ist ein tabletfreundliches Manufacturing Execution System fur metallverarbeitende Job Shops — verfolgen Sie Auftrage von Ihrem ERP bis auf den Shopfloor, ohne die Akzeptanz bei den Werkern zu verlieren.`

### Abschnittsüberschrift

`Wahlen Sie Ihren Weg`

### Abschnittseinleitung

`Wahlen Sie den Einstieg, der zu Ihrer Bewertung von Eryxon Flow passt.`

### Karte 1

- Label: `Gehosteten Test offnen`
- Body: `Testen Sie die Live-App auf app.eryxon.eu ohne Installation. Am besten fur einen schnellen ersten Eindruck.`

### Karte 2

- Label: `Managed Rollout planen`
- Body: `Holen Sie sich Unterstutzung bei Deployment, ERP-Integration und der Rollout-Reihenfolge fur Ihre Werkstatt.`

### Karte 3

- Label: `Self-Hosting evaluieren`
- Body: `Betreiben Sie Eryxon auf Ihrer eigenen Infrastruktur. Source-available unter BSL 1.1.`

## NL localization handoff

Apply this copy to the NL docs-entry chooser.

### Productsamenvatting

`Eryxon Flow is een tabletvriendelijk manufacturing execution system voor metaalbewerkende job shops — volg orders van uw ERP tot op de werkvloer zonder dat operatoradoptie verloren gaat.`

### Sectiekop

`Kies uw route`

### Inleidende zin

`Kies de route die past bij hoe u Eryxon Flow wilt beoordelen.`

### Kaart 1

- Label: `Open de gehoste proefomgeving`
- Body: `Probeer de live app op app.eryxon.eu zonder installatie. Het beste voor een snelle eerste indruk.`

### Kaart 2

- Label: `Plan een managed rollout`
- Body: `Krijg hulp bij deployment, ERP-integratie en de juiste uitrolvolgorde voor uw werkplaats.`

### Kaart 3

- Label: `Evalueer self-hosting`
- Body: `Draai Eryxon op uw eigen infrastructuur. Source-available onder BSL 1.1.`

## Managed-rollout wording to keep aligned

If engineering touches the chooser-adjacent wording on `managed-rollout.mdx`, keep these phrases aligned across locales and do not rename the three paths:

- Path names stay: `Hosted trial`, `Managed rollout`, `Self-hosted evaluation`.
- The lead should keep the buyer choice clear:
  `Most teams can open the hosted version and start exploring on their own. A managed rollout is for shops that want help getting Eryxon Flow into daily production — deployment, ERP integration, and a sensible rollout order across cells and people.`
- The CTA stays consultative, not transactional:
  `This is a conversation, not a signup.`

Recommended localized CTA labels if/when DE/NL versions are added:

- DE: `Gesprach zum Managed Rollout starten`
- NL: `Start een gesprek over managed rollout`

## Required message constraints before ERY-117 closes

1. DE and NL intro pages must stop leading with a Beta/status block and `coming soon` mobile language above the path chooser. That framing belongs lower on the page, as already handled in EN.
2. Do not introduce `open source` in any chooser or rollout copy. Use `source-available under BSL 1.1` where license context is needed.
3. Keep `managed rollout` as a deployment-help path, not as a pricing tier or a generic contact CTA.
4. Keep the three paths buyer-oriented:
   - hosted = first look
   - managed rollout = guided deployment and ERP fit
   - self-hosted = technical evaluation / own infrastructure

## Final CMO disposition

- EN chooser copy: approved.
- DE handoff: approved above.
- NL handoff: approved above.
- Remaining implementation owner: [ERY-141](/ERY/issues/ERY-141) / Website Engineer.
