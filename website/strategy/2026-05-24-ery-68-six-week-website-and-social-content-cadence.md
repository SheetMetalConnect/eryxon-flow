# ERY-68 Six-Week Website and Social Content Cadence

Date: 2026-05-24
Owner: Content Lead
Issue: [ERY-68](/ERY/issues/ERY-68)
Parent: [ERY-67](/ERY/issues/ERY-67)
Related: [ERY-62](/ERY/issues/ERY-62), [ERY-53](/ERY/issues/ERY-53), [ERY-54](/ERY/issues/ERY-54), [ERY-59](/ERY/issues/ERY-59), [ERY-9](/ERY/issues/ERY-9)

## Objective

Build the first six-week biweekly content cadence for Eryxon across website, changelog, and social derivatives using proof that already exists in the repo.

This document is an internal working package for CMO review. It is not publishing approval and it is not a claim license to ship externally.

## Inputs Reviewed

### Website and content surfaces

- `website/README.md`
- `website/src/content/docs/index.mdx`
- `website/src/content/docs/introduction.md`
- `website/src/content/docs/guides/changelog.md`
- `website/src/content/docs/managed-rollout.mdx`
- `website/src/content/docs/features/operator-terminal.md`
- `website/src/content/docs/features/qrm-flow.md`
- `website/src/content/docs/features/erp-integration.md`
- `website/src/content/sections/call-to-action.md`
- `website/src/config/menu.en.json`
- `website/src/config/social.json`
- `website/src/content.config.ts`
- `website/astro.config.mjs`

### Strategy and release context

- `website/strategy/2026-05-24-ery-53-astro-redesign-technical-execution-path.md`
- `website/strategy/2026-05-24-ery-54-website-messaging-and-ia-brief.md`
- `website/strategy/2026-05-24-ery-59-v0-6-native-app-launch-brief.md`
- `website/strategy/2026-05-24-ery-6-marketing-hiring-and-execution-brief.md`
- `CHANGELOG.md`
- `docs/IOS.md`
- `docs/ANDROID.md`

## Executive Recommendation

Run three biweekly content pulses between 2026-05-25 and 2026-07-03.

1. Lead with the most time-sensitive product proof: the native-device guided-rollout release story.
2. Follow with one operator-and-owner education asset grounded in QRM and shop-floor flow control.
3. Close the first six weeks with a technical-evaluator asset on ERP-connected MES rollout fit.

Each pulse should have one home-base website asset and derivative social variants. The website asset is the source of truth. Social should never exist without a linked website or docs destination.

## Asset Audit

### Repo-backed website surfaces

| Asset | Current location | Editorial use case | Readiness | Notes |
| --- | --- | --- | --- | --- |
| Homepage / index pattern | `website/src/content/docs/index.mdx` | Big narrative update, campaign teaser, proof strip, route chooser | Partial | Live today, but still product-status-first and contains stale mobile claims. Best used as a campaign amplifier after message cleanup, not as the primary release-note surface. |
| Docs introduction pattern | `website/src/content/docs/introduction.md` | Evaluation gateway for buyers choosing hosted, managed, or self-hosted paths | Partial | Live today, but still assumes docs-first readers and keeps stale mobile posture. Useful as a support surface for content CTAs. |
| Release-note / changelog pattern | `website/src/content/docs/guides/changelog.md` | Shipped-product update, credibility check, release archive | Ready after copy refresh | This is the only repo-backed release-note surface today and should anchor time-sensitive product updates. |
| Managed rollout page | `website/src/content/docs/managed-rollout.mdx` | Commercial decision page for guided deployment and ERP help | Ready | Strong CTA destination for rollout-intent content and social follow-up. |
| Feature proof pages | `website/src/content/docs/features/*.md` | Deep proof for capability-led articles and CTA support | Ready | Current strongest proof pages for operator terminal, QRM flow, ERP integration, scheduling, and 3D workflows. |
| CTA section content | `website/src/content/sections/call-to-action.md` | Shared CTA text and offer framing | Partial | Works for docs-site CTAs, but not yet tuned for content-specific article endings. |

### Planned editorial surfaces already named in repo strategy

| Asset | Planned location | Editorial use case | Readiness | Gap owner |
| --- | --- | --- | --- | --- |
| Landing-page pattern | `website/src/pages/` or equivalent future Astro route | One problem, one CTA, one proof block | Not implemented | Website Engineer after UXDesigner package handoff in [ERY-52](/ERY/issues/ERY-52) |
| Blog article pattern | future Astro marketing article template | Search-first educational content with a compact CTA near the end | Not implemented | Website Engineer after template rules are confirmed in [ERY-52](/ERY/issues/ERY-52) |
| Refined homepage index pattern | existing homepage after redesign foundation | Campaign hub and narrative front door | In progress elsewhere | Website Engineer and CTO via [ERY-53](/ERY/issues/ERY-53) and [ERY-54](/ERY/issues/ERY-54) |

### Board-called social derivatives

| Asset | Use case | Parent website asset | Readiness | Gap owner |
| --- | --- | --- | --- | --- |
| LinkedIn announcement variant | Shipping milestone, release, launch posture | Release note or launch landing page | Copy-ready, design asset needed | CMO + UXDesigner |
| LinkedIn feature variant | One concrete capability with screenshot/proof | Feature page or article | Copy-ready, screenshot pack needed | CMO + Website Engineer |
| LinkedIn quote variant | Sharp operational insight with article link | Educational blog article | Copy-ready, design asset needed | CMO + UXDesigner |
| X changelog variant | Short shipping update with proof link | Changelog entry | Copy-ready | CMO |
| Square social-card variants | Reusable visual support for LinkedIn and X | Any approved website asset | Design support needed | UXDesigner |

## Six-Week Calendar

| Window | Content pulse | Home-base surface | Audience | Search / evaluation intent | Primary CTA | Proof source | Social reuse path |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-05-25 to 2026-06-05 | Native-device guided-rollout release | Website changelog / release summary | Current evaluators, owners, technical buyers | `shop floor tablet mes`, `manufacturing execution mobile app`, release credibility | Review native install and rollout docs | `CHANGELOG.md`, `docs/IOS.md`, `docs/ANDROID.md`, `managed-rollout.mdx` | LinkedIn announcement, LinkedIn feature, X changelog, square release card |
| 2026-06-08 to 2026-06-19 | QRM / flow-control education | Blog article template or temporary landing article once available | Owners, foremen, cell leads, ops managers | `qrm manufacturing`, `job shop flow control`, `wip limits job shop` | Review operator-terminal proof or open hosted trial | `features/qrm-flow.md`, `features/operator-terminal.md`, `step-2.png`, `overview.png` | LinkedIn quote, LinkedIn feature, square insight card |
| 2026-06-22 to 2026-07-03 | ERP-connected rollout evaluation | Blog article or landing page | Technical evaluators, ERP-minded buyers, implementation leads | `erp mes integration`, `self hosted mes`, `mes rollout checklist` | Review ERP integration docs or plan a managed rollout | `features/erp-integration.md`, REST/API docs, `managed-rollout.mdx` | LinkedIn feature, LinkedIn announcement, square technical card |

## Package 1

### Working title

`Native iPhone/iPad, Android, and installable PWA paths for guided Eryxon rollouts`

### Target surface

- Website changelog / release summary
- Supporting links from homepage and docs intro after message cleanup

### Target audience

- Current evaluators checking whether Eryxon is progressing
- Owners and operations leads who need proof the product can run on shop-floor devices
- Technical buyers validating deployment options before a conversation

### Search and distribution angle

This is less about broad search volume and more about release credibility, buyer confidence, and social distribution around fresh proof.

### Primary CTA

`Review native install and deployment docs`

### Secondary CTA

`Plan a managed rollout`

### Proof sources

- `CHANGELOG.md` release entry for `0.5.2` dated 2026-05-09
- `docs/IOS.md`
- `docs/ANDROID.md`
- `website/src/content/docs/managed-rollout.mdx`
- `website/strategy/2026-05-24-ery-59-v0-6-native-app-launch-brief.md`

### Website angle

Lead with the operational truth:

1. Eryxon now supports native iPhone/iPad, native Android, and installable PWA paths.
2. This is a guided-rollout release, not a consumer app-store launch.
3. The value is shop-floor usability and deployment flexibility, not hype about "native" for its own sake.
4. Proof comes from the shared `/m/*` shell, scanner support, biometric unlock, haptics, safe-area handling, and tablet-optimized layouts already documented in the repo.

### Draft-ready outline

1. What shipped on 2026-05-09 and where it runs now.
2. What operators get on the floor:
   - touch-first queue
   - scan route
   - biometric re-unlock
   - tablet layouts
3. What evaluators should understand:
   - hosted trial remains the fastest path
   - managed rollout is the right path for deployment help
   - self-hosted evaluation remains valid
4. Links to iOS, Android, deployment, and managed rollout docs.

### Social derivatives

#### LinkedIn announcement variant

Angle:
Eryxon can now be evaluated on the same shop-floor surfaces people already carry: iPhone, iPad, Android tablets, and installable PWAs.

Draft:
`Eryxon Flow now supports native iPhone/iPad, native Android, and installable PWA paths for guided rollouts and technical evaluation. The goal is simple: give operators a touch-first MES surface that still connects cleanly back to ERP and deployment reality. If you want the release details, start with the changelog and native install docs.`

#### LinkedIn feature variant

Angle:
Focus on one concrete proof point instead of the whole release.

Draft:
`One detail that matters on the shop floor: the same `/m/*` mobile shell now supports queue, scan, biometric re-unlock, and tablet layouts across native iOS, native Android, and PWA installs. That is a better rollout story than another "mobile app coming soon" banner.`

#### X changelog variant

Draft:
`Native-device rollout update: iPhone/iPad, Android, and installable PWA paths are now part of the Eryxon evaluation story. Guided rollout, not app-store hype. Proof: changelog + install docs.`

#### Square social-card headline

`Native device support for guided shop-floor rollouts`

### Risks and missing assets

- Do not publish until CMO confirms the guided-rollout posture from [ERY-59](/ERY/issues/ERY-59).
- Align the public version label before publishing. The current repo proof is in `0.5.2`, while [ERY-59](/ERY/issues/ERY-59) frames the public launch as a `v0.6` release package.
- Do not claim offline write-queue behavior publicly unless CTO explicitly validates it for public copy.
- A native screenshot pack is still needed so the release proves the device story visually instead of only describing it.

## Package 2

### Working title

`How metalworking job shops keep work moving between cells without burying the next station`

### Target surface

- Blog article template once the editorial route exists
- If the article template is still unavailable, convert it to a single-problem landing page with one CTA and one proof block

### Target audience

- Owners and operations leaders trying to reduce WIP pileups
- Foremen and cell leads who feel downstream bottlenecks every day
- Evaluators who need proof Eryxon understands job-shop flow, not just generic scheduling

### Search and distribution angle

This is the first manufacturing-insight asset in the cadence. It should rank against practical job-shop flow-control questions and give sales/outbound a shareable proof page that feels grounded in the floor, not in software copy.

### Primary CTA

`See the operator-terminal proof`

### Secondary CTA

`Open the hosted trial`

### Proof sources

- `website/src/content/docs/features/qrm-flow.md`
- `website/src/content/docs/features/operator-terminal.md`
- `website/src/assets/step-2.png`
- `website/src/assets/overview.png`

### Website angle

Lead with the real problem:

1. Job shops lose time between stations, not only at the machines.
2. Operators need immediate signal about what is ready, what is blocked, and what the next cell can actually absorb.
3. Eryxon already exposes this through GO/PAUSE signals, queue sections, rush-order visibility, and capacity context.
4. The article should teach QRM and flow-control thinking first, then show how the product operationalizes it.

### Draft-ready outline

1. Opening pain:
   parts pile up between cutting, bending, welding, and assembly because nobody can see downstream capacity in time.
2. Explain the job-shop version of POLCA in plain language.
3. Show how Eryxon translates that into operator behavior:
   - In Process / Buffer / Expected
   - GO / PAUSE signals
   - rush-order exceptions
   - capacity view for planners
4. Close with a low-friction CTA:
   see the operator terminal or try the hosted version.

### Social derivatives

#### LinkedIn quote variant

Draft:
`The biggest time loss in a job shop is often not the work itself. It is the waiting between stations when the next cell is already buried.`

Link destination:
the QRM article

#### LinkedIn feature variant

Draft:
`A useful operator screen does more than show the next task. It shows whether the next cell can actually take the work. Eryxon’s GO/PAUSE queue signals are a better proof point than another abstract promise about "optimization".`

#### Square social-card headline

`Keep work moving. Stop burying the next cell.`

### Risks and missing assets

- The repo does not yet have a dedicated blog article template, so this package depends on Website Engineer follow-through from [ERY-53](/ERY/issues/ERY-53) and template rules from [ERY-52](/ERY/issues/ERY-52).
- One annotated screenshot of the operator queue with GO/PAUSE and queue sections would make this substantially stronger.

## Routed Gaps and Next Actions

| Gap | Why it matters | Owner | Next action |
| --- | --- | --- | --- |
| No explicit blog article template in the current Astro site | Packages 2 and 3 need a clean home-base surface distinct from docs reference pages | Website Engineer | Implement the editorial template path already called for in [ERY-53](/ERY/issues/ERY-53) after UX template rules land |
| Design-system template rules for landing, blog, and release-note assets are still missing in workspace-accessible form | Content packaging should not drift from the design system | UXDesigner | Mirror the package-derived template constraints into the repo per [ERY-52](/ERY/issues/ERY-52) |
| Native screenshot pack is not assembled | Package 1 is stronger with device-proof visuals | UXDesigner + Website Engineer | Capture or extract approved iPhone, iPad, Android, and PWA visuals tied to the documented flows |
| Managed-rollout scope still needs public-claim approval | CTA copy must not overstate support readiness | CMO | Confirm the public support envelope before publishing rollout-heavy copy |
| CTA measurement depends on [ERY-9](/ERY/issues/ERY-9) | Content performance cannot be compared cleanly without instrumentation | CTO | Keep CTA IDs and routing consistent as editorial surfaces are implemented |

## Acceptance Check

- A concrete six-week cadence exists with exact windows and reuse paths.
- The first two content packages name the exact surface, audience, CTA, proof sources, and derivative social variants.
- The calendar mixes fresh product proof and manufacturing insight instead of generic awareness posting.
- Missing assets and implementation dependencies are named with owners and next actions.
