# ERY-148 Canny Changelog and Roadmap Content Packet

Date: 2026-05-25
Owner: CMO
Issue: [ERY-148](/ERY/issues/ERY-148)
Parent: [ERY-146](/ERY/issues/ERY-146)
Related: [ERY-147](/ERY/issues/ERY-147), [ERY-59](/ERY/issues/ERY-59), [ERY-58](/ERY/issues/ERY-58), [ERY-71](/ERY/issues/ERY-71), [ERY-80](/ERY/issues/ERY-80), [ERY-88](/ERY/issues/ERY-88), [ERY-94](/ERY/issues/ERY-94)

## Objective

Prepare a CTO-ready source packet for Canny so the changelog and roadmap boards can be populated without another discovery pass.

This packet does not make any Canny API calls. It only packages the public-safe content, ordering, and claim boundaries for [ERY-147](/ERY/issues/ERY-147) to import.

## Audit Window

- Reviewed period: 2026-02-25 through 2026-05-25
- Primary source surfaces:
  - `CHANGELOG.md`
  - `website/src/content/release-notes/v0-6.md`
  - `website/src/content/docs/roadmap.md`
  - `website/src/content/docs/guides/release-proof-v0-5-1.md`
  - `docs/2026-05-24-ery-58-v0.6-native-uat-gate.md`
  - `docs/2026-05-24-ery-71-native-packaging-validation.md`
  - `docs/2026-05-24-ery-88-release-cadence-repo-hygiene-and-trial-telemetry.md`
  - last-3-month git history across `docs`, `website`, `src`, and `supabase`

## Import Rules For CTO

- Use the changelog entries below as the first import set.
- Preserve the status language exactly as written: `Live`, `Beta`, `In progress`, or `Under consideration`.
- Keep the roadmap items below in two buckets:
  - `In progress` for active roadmap items
  - `Under consideration` for vote-oriented discovery items
- Do not turn internal operations, telemetry, or repo-governance work into public Canny posts.
- If Canny requires one body field only, use the `Paste-ready body` block and keep the `Why it matters` line as the first sentence.

## Keep Out Of Public Canny

These items matter internally but should not become public-facing changelog or roadmap posts:

- hosted-trial reporting implementation and root-admin reporting internals from [ERY-94](/ERY/issues/ERY-94)
- release-train governance, repo hygiene, and branch-policy work from [ERY-88](/ERY/issues/ERY-88) and [ERY-92](/ERY/issues/ERY-92)
- website redesign plumbing, content cadence operations, or screenshot-production process work unless they produce a customer-visible outcome
- any claim about App Store or Play Store availability
- any claim about offline production writes or "fully native" implementation details

## Recommended Changelog Imports

Import newest to oldest.

### 1. 2026-05-24

- Suggested status: `Beta`
- Canny title: `Beta: mobile scanning and operator preview for guided rollouts`
- Why it matters: the current `v0.6` cycle makes the first-run mobile experience clearer for guided customer rollouts and technical evaluation.
- Paste-ready body:

  `The current v0.6 Beta cycle is tightening the first-run mobile experience for guided rollouts. Evaluators now land on a clearer pilot activation path, operator preview surfaces use the larger touch-target system, and scanner behavior is being aligned across native iOS, native Android, and browser fallback paths. This remains a guided rollout/Beta motion, not a broad public launch.`

- Source references:
  - `website/src/content/release-notes/v0-6.md`
  - `docs/2026-05-24-ery-58-v0.6-native-uat-gate.md`
  - `docs/2026-05-24-ery-71-native-packaging-validation.md`
  - commit `96d08d9` (`feat(scanner): truthful hosted/PWA fallback, native iOS+Android parity`)
  - commit `1d753b0` (`fix(onboarding): hydrate onboarding state and stamp tenant completion`)

### 2. 2026-05-09

- Suggested status: `Live`
- Canny title: `v0.5.2: native iPhone/iPad, Android, and installable PWA paths`
- Why it matters: buyers can now evaluate the operator workflow across phone, tablet, and browser install paths without changing backend integrations or deployment model.
- Paste-ready body:

  `v0.5.2 expands where Eryxon Flow can run. Native iPhone/iPad and Android packaging now sit alongside an installable PWA, all sharing the same touch-first operator shell. That gives evaluators and rollout teams a clearer path to test shop-floor usage on the devices they already use.`

- Source references:
  - `CHANGELOG.md` (`0.5.2`, dated 2026-05-09)
  - `docs/IOS.md`
  - `docs/ANDROID.md`
  - `docs/DEPLOY_AND_TEST.md`
  - `website/strategy/2026-05-24-ery-59-v0-6-native-app-launch-brief.md`

### 3. 2026-05-06

- Suggested status: `Live`
- Canny title: `v0.5.0-v0.5.1: planning adapters, MQTT resilience, and self-hosted MCP deployment`
- Why it matters: the May release line made Eryxon easier to connect into existing manufacturing systems and easier to deploy in self-hosted or integration-heavy environments.
- Paste-ready body:

  `The May release line improved Eryxon's integration posture for manufacturing teams that need more than a standalone web app. FrePPLe and Odoo planning adapters landed, MQTT gained retry and dead-letter protection, and the MCP server added HTTP/SSE plus Docker deployment paths for self-hosted rollouts. v0.5.1 then tightened the release posture and supporting documentation around that foundation.`

- Source references:
  - `CHANGELOG.md` (`0.5.0` and `0.5.1`, both dated 2026-05-06)
  - `website/src/content/docs/guides/release-proof-v0-5-1.md`
  - commit `0e93498` (`feat(planning): add adapter interface, FrePPLe + Odoo adapters`)
  - commit `bf664f1` (`feat(mqtt): add retry, circuit breaker, and dead letter logging`)
  - commit `620f6f9` (`feat(mcp): add HTTP/SSE transport + Dockerfile for self-hosted and cloud`)

### 4. 2026-03-29

- Suggested status: `Live`
- Canny title: `v0.4.1: batch execution got stronger across APIs and operator flow`
- Why it matters: March closed the loop on batch execution so teams could track work more reliably from the floor through the API layer.
- Paste-ready body:

  `v0.4.1 strengthened batch execution from both the operator and integration side. Batch lifecycle APIs, weighted time distribution, and webhook events made batch tracking more usable in real workflows, while the surrounding operator and routing cleanup reduced friction for day-to-day execution.`

- Source references:
  - `CHANGELOG.md` (`0.4.1`, dated 2026-03-29)
  - commit `eb97bff` (`fix: batch lifecycle works E2E — RLS fix + machine-reported support`)
  - `website/src/content/docs/guides/changelog.md`

### 5. 2026-03-09 to 2026-04-15

- Suggested status: `Live`
- Canny title: `Spring rollout hardening: safer docs, better self-hosting, fewer evaluator blockers`
- Why it matters: technical evaluators hit fewer trust and deployment problems during spring cleanup work.
- Paste-ready body:

  `Across March and April, Eryxon tightened several rollout blockers that matter during evaluation: self-hosted Supabase support improved, false or unbuilt claims were removed from docs, login blockers were fixed, and the docs footprint became easier to trust in English, German, and Dutch. This work is less flashy than a feature launch, but it directly reduces rollout friction.`

- Source references:
  - commits `5657c0b`, `689bfee`, `7aae40e`, `66ffbe3`, `87fdbc1`, `4ad75d0`
  - `CHANGELOG.md` (`0.3.2`, `0.3.3`, `0.4.1`)
  - `website/src/content/docs/introduction.md`

## Recommended Roadmap / Voting Imports

If Canny supports one board with statuses, create all items below and use the suggested status values.

### In Progress

#### 1. Guided native device rollout for operators

- Suggested status: `In progress`
- Canny title: `Guided native device rollout for iPhone, iPad, Android, and PWA`
- Customer problem: shops want operator-friendly device paths that behave predictably on the floor, not a browser-only compromise that varies by device.
- Why this belongs on the board now: the core runtime work is real and already visible in the release line, but the release posture is still guided rollout rather than broad public launch. This is the highest-signal product direction customers can react to right now.
- Paste-ready body:

  `We're expanding Eryxon Flow beyond the browser with guided native iPhone/iPad and Android paths plus an installable PWA. The goal is a predictable touch-first operator experience across the devices metalworking teams already use, without changing the core backend or rollout model.`

- Source references:
  - `CHANGELOG.md` (`0.5.2`)
  - `website/src/content/release-notes/v0-6.md`
  - `docs/2026-05-24-ery-58-v0.6-native-uat-gate.md`
  - `docs/2026-05-24-ery-71-native-packaging-validation.md`

#### 2. Reliable scanning and launch behavior on weak shop-floor networks

- Suggested status: `In progress`
- Canny title: `Reliable scanning and launch behavior on weak shop-floor networks`
- Customer problem: operators lose trust quickly when login, scan, or launch behavior differs between native, PWA, and browser paths or when plant connectivity is inconsistent.
- Why this belongs on the board now: recent work already tightened scanner parity and launch routing, but this is still an active adoption problem and worth making visible as a product direction rather than an internal fix list.
- Paste-ready body:

  `We're improving how scan, login, and operator entry points behave across native apps, the installable PWA, and browser fallback paths. The goal is simple: no guesswork for operators, and fewer rollout surprises in real plants with inconsistent connectivity.`

- Source references:
  - commit `96d08d9`
  - `docs/2026-05-24-ery-58-v0.6-native-uat-gate.md`
  - `docs/ANDROID.md`

### Under Consideration

#### 3. Production-ready ERP and planning connectors

- Suggested status: `Under consideration`
- Canny title: `Production-ready ERP and planning connectors`
- Customer problem: shops want Eryxon to fit into existing ERP and planning workflows without custom integration work every time.
- Why this belongs on the board now: the groundwork already exists through FrePPLe and Odoo adapter work, so customer voting can help decide which connector and hardening path should lead next.
- Paste-ready body:

  `We already have early planning and ERP groundwork in place. The next question is which production-ready connector path matters most: deeper Odoo support, more planning coverage, or a broader standard connector package that reduces rollout friction for non-custom deployments.`

- Source references:
  - `CHANGELOG.md` (`0.5.0`)
  - `website/src/content/docs/roadmap.md`
  - commit `0e93498`

#### 4. Direct machine handoff (DNC connection)

- Suggested status: `Under consideration`
- Canny title: `Direct machine handoff (DNC connection)`
- Customer problem: operators still rely on USB sticks or shared folders to move NC programs to machines.
- Why this belongs on the board now: this is a concrete, easy-to-understand pain point with clear operational value and is already named publicly as a future direction.
- Paste-ready body:

  `We're considering a direct DNC handoff path so NC files can move from work orders to machines without USB sticks or ad hoc network-share workflows. This would target a common last-mile problem on the shop floor.`

- Source references:
  - `website/src/content/docs/roadmap.md`
  - public roadmap issue `#499` as cited from that page

#### 5. Job progress dashboard for production managers

- Suggested status: `Under consideration`
- Canny title: `Job progress dashboard for production managers`
- Customer problem: supervisors need a faster way to see progress, bottlenecks, and work-at-risk without chasing updates across the floor.
- Why this belongs on the board now: it is a buyer-facing visibility problem, not just a UI preference, and it fits the current push to make Eryxon easier to understand and use during rollout.
- Paste-ready body:

  `We're considering a rolled-up production view for managers who need job progress, bottleneck visibility, and exception awareness in one place. The aim is to reduce manual status chasing while keeping the floor and management views aligned.`

- Source references:
  - `website/src/content/docs/roadmap.md`
  - public roadmap issue `#500` as cited from that page

#### 6. Work-order remarks for shift handoff

- Suggested status: `Under consideration`
- Canny title: `Work-order remarks for shift handoff`
- Customer problem: operators need a quick way to leave context for the next shift without falling back to paper notes or side conversations.
- Why this belongs on the board now: this is small enough to understand immediately, but meaningful enough to improve real operator adoption and handoff quality.
- Paste-ready body:

  `We're considering a lightweight work-order remark field for shift handoff and operator notes. The goal is to make it easier to pass along context without creating a heavy messaging system inside the product.`

- Source references:
  - `website/src/content/docs/roadmap.md`
  - public roadmap issue `#498` as cited from that page

#### 7. More accurate cycle-time capture for quoting

- Suggested status: `Under consideration`
- Canny title: `More accurate cycle-time capture for quoting`
- Customer problem: simple averages hide setup time and produce weak quoting data.
- Why this belongs on the board now: it connects shop-floor execution data directly to commercial accuracy, which is strategically important even if the implementation detail is not yet fixed.
- Paste-ready body:

  `We're considering a better way to separate setup time from per-piece cycle time so quote feedback and production learning are more trustworthy. This is especially relevant for shops where setup-heavy work distorts simple averages.`

- Source references:
  - `website/src/content/docs/roadmap.md`
  - public roadmap issue `#497` as cited from that page

## CEO Decision Notes

These are the only meaningful content ambiguities that still need executive judgment:

### 1. Native rollout visibility level

- Decision needed: should the public roadmap explicitly show the native rollout as `In progress` now, or should it stay changelog-led until current validation gaps close?
- Recommendation: show it as `In progress`, but keep the wording at `guided rollout` and avoid any broad-launch or app-store framing.
- Why this matters: the work is real and strategically important, but [ERY-58](/ERY/issues/ERY-58) and [ERY-71](/ERY/issues/ERY-71) still define claim boundaries.

### 2. Connector cluster versus execution cluster

- Decision needed: after the native rollout items, should the board emphasize integration demand (`ERP/planning connectors`) or execution demand (`dashboard`, `remarks`, `cycle-time accuracy`, `DNC`)?
- Recommendation: lead with `Production-ready ERP and planning connectors` if near-term commercial conversations are integration-heavy; otherwise lead with `Job progress dashboard` as the clearest broad buyer problem.
- Why this matters: both directions are plausible, but Canny ordering signals company focus.

### 3. Internal rollout operations stay internal

- Decision needed: none unless the CEO wants a separate private board.
- Recommendation: keep hosted-trial reporting, pilot alert routing, release-train governance, and website process work off the public board.

## Delivery Check

This packet is complete when [ERY-147](/ERY/issues/ERY-147) can:

- create the changelog entries above in Canny without rewriting them
- create the roadmap items above with the suggested statuses
- avoid accidentally publishing internal-only work
- escalate only the CEO decision notes instead of reopening content discovery
