# ERY-59 v0.6 Native Apps Launch Messaging and Release Packaging Brief

Date: 2026-05-24
Owner: CMO
Issue: [ERY-59](/ERY/issues/ERY-59)
Parent: [ERY-55](/ERY/issues/ERY-55)
Related: [ERY-54](/ERY/issues/ERY-54), [ERY-9](/ERY/issues/ERY-9), [ERY-6](/ERY/issues/ERY-6)

## Objective

Define the public release posture, launch narrative, and packaging checklist for the v0.6 native-app push so Eryxon can talk about the release truthfully and route follow-up execution to the right owners.

This brief is not production copy. It is the message and release-packaging source of truth for the next implementation wave.

## Executive Recommendation

### Recommended release posture

Ship v0.6 as a **customer-guided rollout release** for native iPhone/iPad, Android, and installable PWA usage.

This is stronger than an internal-only pilot, but narrower than a broad self-serve public launch.

### Public framing

Use this release story:

- Eryxon Flow now supports native iPhone/iPad and Android install paths alongside the installable PWA.
- These paths are available for **managed rollouts, guided customer deployments, and technical evaluation**.
- Hosted trial and self-hosted evaluation remain valid entry points.
- Broad app-store style availability is **not** the lead message for this release.

### Why this is the right posture

1. The repo already documents real native/PWA capability, install paths, and device behavior.
2. The public website is stale and internally inconsistent about native status.
3. Some public claims are currently stronger than the technical docs support, especially around offline behavior and Android implementation wording.
4. Eryxon's commercial truth is guided deployment, hosted evaluation, self-hosted deployment, and support, not a consumer-style mobile app launch.

## Inputs Reviewed

### Repo-level product and release sources

- `README.md`
- `CHANGELOG.md`
- `docs/DEPLOY_AND_TEST.md`
- `docs/IOS.md`
- `docs/ANDROID.md`

### Website sources

- `website/src/content/docs/index.mdx`
- `website/src/content/docs/de/index.mdx`
- `website/src/content/docs/nl/index.mdx`
- `website/src/content/docs/introduction.md`
- `website/src/content/docs/de/introduction.md`
- `website/src/content/docs/nl/introduction.md`
- `website/src/content/docs/guides/changelog.md`
- `website/src/content/docs/guides/quick-start.md`
- `website/src/content/docs/guides/deployment.md`
- `website/src/content/docs/roadmap.md`
- `website/src/content/docs/managed-rollout.mdx`
- `website/src/config/menu.en.json`

### Existing strategy context

- `website/strategy/2026-05-24-ery-54-website-messaging-and-ia-brief.md`
- `website/strategy/2026-05-24-ery-9-cta-instrumentation-and-inquiry-routing.md`
- `website/strategy/2026-05-24-ery-6-marketing-hiring-and-execution-brief.md`

## Audit Summary

### What is already true and useful

- The repo-level docs describe real native iOS, native Android, and installable PWA setup and deployment paths.
- The native story already has credible proof points: shared touch-first `/m/*` shell, scanner support, biometric unlock, haptics, safe-area handling, tablet layouts, and documented install/testing workflows.
- The managed-rollout page gives Eryxon a commercially appropriate destination for rollout-oriented interest.

### What is unsafe or confusing today

1. The public website still says native apps are "coming soon" across the homepage and docs entry surfaces.
2. The website changelog still positions `v0.5.1` as current and says native development is still upcoming, while the repo changelog already documents native app work.
3. The roadmap and homepage overstate Android implementation details with "built natively (not a wrapped web view)" language, while `docs/IOS.md` and `docs/ANDROID.md` describe Capacitor-packaged shells around the shared React app.
4. The homepage's native section promises offline-capable workflows more strongly than the technical docs support. The current repo docs support installability, network awareness, and device integration; they do not provide public proof for a released offline write queue.
5. The public framing still pushes visitors toward product-status reading before it explains the deployment path that fits them.
6. The English footer still uses an `Open Source` label even though BSL 1.1 must be framed as source-available, never open source.

## Claim-Level Risk Register

| Surface | Current claim | Evidence reviewed | Risk | Required correction |
| --- | --- | --- | --- | --- |
| `website/src/content/docs/index.mdx` + localized homepage variants | Native Android and iOS are "coming soon"; Android is "built natively"; native section promises offline-capable work continuation | `CHANGELOG.md`, `docs/IOS.md`, `docs/ANDROID.md`, `README.md` | Stale status + technical overclaim | Replace with v0.6 guided-rollout framing. Remove "coming soon", "built natively", and offline-write claims unless CTO explicitly signs them off. |
| `website/src/content/docs/introduction.md` + `de` / `nl` variants | Native apps are still coming soon | `README.md`, `docs/DEPLOY_AND_TEST.md`, native platform docs | Stale evaluator entry copy | Turn intro into a route chooser: hosted trial, managed rollout, self-hosted/native evaluation. |
| `website/src/content/docs/guides/changelog.md` | `v0.5.1` is the current status and native apps are still upcoming | `CHANGELOG.md` | Release-note mismatch | Publish a v0.6-facing summary aligned to the repo changelog and approved posture. |
| `website/src/content/docs/roadmap.md` | Android app is still in development and "built natively" with offline queue claims | `docs/ANDROID.md`, `CHANGELOG.md` | Roadmap overclaim | Move native positioning out of speculative roadmap language and into approved release language; remove unsupported offline queue promises. |
| `website/src/content/docs/guides/quick-start.md` and `deployment.md` | Immediate hosted/self-host setup path, but no native rollout or guided deployment context | `docs/DEPLOY_AND_TEST.md`, `managed-rollout.mdx` | Funnel friction | Add concise routing callouts so evaluators can choose hosted, managed rollout, or self-hosted/native evaluation intentionally. |
| `website/src/config/menu.en.json` | Footer group titled `Open Source` | `LICENSE`, repo framing rules | License framing risk | Rename to `Repository` or `Code & Community`. |

## Message Guardrails for v0.6

### Always say

- Eryxon Flow supports native iPhone/iPad, native Android, and installable PWA usage for guided rollouts and evaluation.
- Hosted trial is the fastest way to explore.
- Managed rollout is the right path for shops that want deployment, ERP, and rollout help.
- Self-hosted deployment remains a first-class path for technical evaluators.
- The apps share the same core product and backend.

### Never say

- "Open source" for BSL 1.1
- "Built natively (not a wrapped web view)"
- "Available on the App Store / Play Store" unless CTO and CEO explicitly approve that claim
- "Offline-capable" in the sense of operators continuing production writes without network, unless CTO validates the exact behavior publicly
- "General availability" or "broad release" as the default posture

### Safer proof points to lead with

- Touch-first operator workflow
- iPhone/iPad and Android install paths
- Scanner, biometric unlock, haptics, and tablet layouts
- Shared backend and deployment flexibility
- Guided rollout and ERP-connected deployment support

## Recommended Narrative Spine

1. Eryxon is built for metalworking job shops that need better shop-floor execution and operator adoption.
2. v0.6 expands where the product can run: browser, installable PWA, and guided native device deployments.
3. Buyers can start in one of three ways:
   - open the hosted trial,
   - plan a managed rollout,
   - evaluate self-hosted deployment and native install paths.
4. Native-app credibility comes from documented device workflows and deployment guidance, not hype.

## Surface Briefs

### 1. Homepage and localized homepage variants

Target surfaces:

- `website/src/content/docs/index.mdx`
- `website/src/content/docs/de/index.mdx`
- `website/src/content/docs/nl/index.mdx`

Target audience:

- first-time buyers
- operations leaders
- implementation evaluators

Primary CTA:

- `Open hosted trial`

Secondary CTA:

- `Plan a managed rollout`

Acceptance criteria:

- Hero copy says what Eryxon is for and who it is for in under 10 seconds.
- Native messaging reflects v0.6 availability without implying broad app-store launch.
- Native benefit copy uses validated device and rollout proof, not unsupported offline claims.
- EN, DE, and NL surfaces stay in status parity.

### 2. Docs introduction and localized intro variants

Target surfaces:

- `website/src/content/docs/introduction.md`
- `website/src/content/docs/de/introduction.md`
- `website/src/content/docs/nl/introduction.md`

Target audience:

- evaluators entering through docs

Primary CTA:

- route chooser: hosted trial, managed rollout, self-hosted/native evaluation

Acceptance criteria:

- Removes "coming soon" posture.
- Sends rollout-oriented readers to the managed-rollout page.
- Makes native evaluation path explicit without forcing repo-level technical depth into the first screen.

### 3. Website changelog / release summary

Target surface:

- `website/src/content/docs/guides/changelog.md`

Target audience:

- existing evaluators
- technical reviewers
- anyone checking release credibility

Primary CTA:

- `Review native install and deployment docs`

Acceptance criteria:

- Release summary is aligned with the approved v0.6 posture.
- Website changelog and repo changelog do not contradict each other on release status.
- Release text clearly separates validated capabilities from future roadmap work.

### 4. Roadmap

Target surface:

- `website/src/content/docs/roadmap.md`

Target audience:

- technical evaluators looking for direction-of-travel

Primary CTA:

- `See current deployment paths`

Acceptance criteria:

- Native apps are no longer described in ways that contradict the release posture.
- Any remaining roadmap language is future-looking, specific, and free of overclaims.

### 5. Managed rollout page

Target surface:

- `website/src/content/docs/managed-rollout.mdx`

Target audience:

- buyers who want deployment, integration, or rollout help

Primary CTA:

- `Start a managed rollout conversation`

Acceptance criteria:

- Page explicitly includes native-device rollout as part of the guided conversation.
- Copy distinguishes hosted exploration from rollout help and self-hosted evaluation.
- Inquiry framing stays commercial and truthful, not pricing-heavy or generic.

### 6. Navigation and footer

Target surfaces:

- `website/src/config/menu.en.json`
- localized menu parity as needed during implementation

Target audience:

- repeat visitors and evaluators looking for the right next step

Primary CTA:

- `Managed rollout`

Acceptance criteria:

- Footer no longer uses `Open Source`.
- Managed rollout remains easy to find from any page.

## Release Packaging Checklist

| Asset | Why it matters | Owner |
| --- | --- | --- |
| Approved release posture statement | Keeps all public copy aligned to one launch level | CEO |
| Homepage refresh across EN / DE / NL | Fixes the highest-traffic stale status copy | Website Engineer |
| Docs intro routing refresh across EN / DE / NL | Reduces evaluator confusion and routes demand correctly | Website Engineer |
| Website changelog release summary | Gives the public site a current, credible release note | Website Engineer |
| Roadmap cleanup | Removes overclaiming and stale roadmap framing | Website Engineer + CTO |
| Managed rollout page native rollout framing | Gives native-app demand a correct commercial destination | Website Engineer |
| Native proof asset list | Ensures screenshots and visuals match the actual release | UXDesigner |
| Public claim validation checklist | Prevents unsupported native/offline/store claims from shipping | CTO |
| Repo + website release-note alignment | Prevents README / changelog / docs contradictions | CTO |

## Recommended Follow-Up Work

### Website implementation work

Owner:
- Website Engineer

Scope:
- implement the approved copy and IA changes across homepage, intro, changelog, roadmap, managed-rollout, and footer surfaces

Follow-up issue:
- [ERY-64](/ERY/issues/ERY-64)

### Technical claim validation

Owner:
- CTO

Scope:
- approve the public wording for:
  - native shell / Capacitor description,
  - offline behavior,
  - install paths and device expectations,
  - App Store / Play Store references,
  - remaining caveats before broader rollout language

Follow-up issue:
- [ERY-65](/ERY/issues/ERY-65)

### Visual proof package

Owner:
- UXDesigner

Scope:
- define which screenshots or device visuals should support the release so the site proves the native story instead of only stating it

Follow-up issue:
- [ERY-66](/ERY/issues/ERY-66)

## Decision Needed from CEO

Approve one of these release postures for v0.6:

1. **Recommended:** customer-guided rollout release
   Public message: native iPhone/iPad, Android, and installable PWA paths are available for managed rollouts and technical evaluation.
2. narrower internal/customer pilot framing
   Use if leadership wants to avoid broader public visibility until more rollout proof exists.
3. broader public launch
   Not recommended until CTO validates every public claim and the website is fully realigned.

## Definition of Done for ERY-59

- This brief is approved or revised by the CEO.
- The implementation, validation, and visual-proof work is captured in owned follow-up issues.
- Public launch wording for v0.6 is explicit and no longer implicit across stale pages.
