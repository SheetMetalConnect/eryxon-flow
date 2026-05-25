# ERY-67 Biweekly Website and Social Content Operating Brief

Date: 2026-05-24
Owner: CMO
Issue: [ERY-67](/ERY/issues/ERY-67)
Parent: [ERY-62](/ERY/issues/ERY-62)
Related: [ERY-49](/ERY/issues/ERY-49), [ERY-54](/ERY/issues/ERY-54), [ERY-9](/ERY/issues/ERY-9)

## Objective

Stand up a repeatable biweekly publishing function for Eryxon's public website and social channels that:

- ships one proof-led website asset every two weeks
- turns that asset into changelog and social derivatives without rewriting the story from scratch
- keeps message ownership with marketing while routing technical or template gaps to the right specialist agent

This function starts now on the current docs site. It does not wait for the broader Astro redesign in [ERY-49](/ERY/issues/ERY-49).

## Decision

### Operating path

Until the redesign ships, the recurring content motion will use the surfaces that already exist:

- primary website asset:
  `website/src/content/docs/guides/` or `website/src/content/docs/features/`
- release-note surface:
  `website/src/content/docs/guides/changelog.md`
- supporting commercial path:
  `website/src/content/docs/managed-rollout.mdx`
- social derivatives:
  LinkedIn primary post, X short-form derivative, and one reusable proof snippet for outbound follow-up

### Publishing rule

Every two-week cycle must ship:

1. one primary website proof asset
2. one changelog update or release-note reference when the story is release-driven
3. two social derivatives linked back to the website asset

Do not block publishing on a future blog template. Use the docs guide pattern now and upgrade the surface later.

## Guardrails

- Lead with hosted, managed, and supported deployment plus consulting when buyer-facing context requires a commercial path.
- Keep self-hosted and source-available details available for evaluators, but do not let license language carry the narrative.
- Never describe BSL 1.1 as open source.
- Write for metalworking job-shop operators, operations leaders, and evaluators rather than generic SaaS readers.
- Anchor every public claim in an existing product capability, docs reference, screenshot, or shipped release note.
- Do not publish roadmap hype as proof content. "Coming soon" can support context, but not carry the article.

## Roles and Approval Path

### Content Lead

Owns day-to-day execution:

- keeps the six-week backlog current
- collects proof inputs and drafts the primary asset
- writes social derivatives from the same narrative spine
- prepares the final publication packet

### CMO

Owns message quality and publication control:

- approves the angle, audience, CTA, and final draft
- enforces commercial truth and voice consistency
- reprioritizes backlog based on product proof and market value

### CTO

Owns technical accuracy review when a piece makes claims about:

- rollout mechanics
- integrations
- APIs, MCP, MQTT, self-hosting, or deployment behavior
- feature status that could be misunderstood externally

### Website Engineer

Owns implementation support when a content cycle needs:

- a new content template
- route or navigation changes
- CTA wiring or instrumentation
- publishing mechanics beyond markdown-only updates

### UXDesigner

Owns visual support when a cycle needs:

- new social card composition
- page-structure guidance
- template hierarchy adjustments
- screenshot framing or visual proof packaging

### CEO

Review only when a piece introduces:

- a new strategic promise
- hiring or partnership claims
- board-sensitive external commitments

## Biweekly Cadence

### Day 1: Intake and story selection

- Content Lead gathers shipped capabilities, doc updates, screenshots, and product proof
- CMO chooses the primary narrative angle and target audience

### Day 2: Brief and outline

- Content Lead writes a one-page content brief with:
  audience, problem, proof sources, CTA, and channel reuse plan

### Days 3 to 5: Draft the website asset

- Draft the primary website asset first
- Pull supporting lines for changelog and social from the same source draft

### Day 6: Review

- CMO reviews message, CTA, and claim boundaries
- CTO reviews technical accuracy when relevant

### Day 7: Publish website asset

- Publish or queue the website page
- Update `guides/changelog.md` when the story is tied to a release or maintenance milestone

### Day 8: Create derivatives

- Publish-ready LinkedIn post
- Publish-ready X derivative
- One short outbound proof snippet saved for reuse

### Days 9 to 10: Distribution and learning capture

- Log what shipped, CTA used, and what proof resonated
- Move the next cycle from reserve to active

## Definition of Ready

A topic is ready for a cycle only when all of the following are true:

- the target audience is named
- the website surface is named
- the CTA is named
- at least two proof sources exist
- the required reviewer is known

If any of those are missing, the Content Lead must either:

- swap in a reserve topic, or
- open a child issue to the right dependency owner

## Reuse Path

Each primary asset should be reused in this order:

1. website proof asset
2. changelog line or release-note reference
3. LinkedIn post
4. X derivative
5. outbound proof snippet for later follow-up

The website asset is the canonical source. Social copy should compress it, not reinvent it.

## Six-Week Active Backlog

### Cycle 1: Weeks 1 to 2

**Topic**
`v0.5.1 release proof for self-hosted and integration-heavy shops`

**Audience**
- technical evaluators
- operations leaders close to rollout

**Website surfaces**
- update `website/src/content/docs/guides/changelog.md`
- add `website/src/content/docs/guides/release-proof-v0-5-1.md`

**Primary CTA**
`Review documentation`

**Proof requirements**
- `website/src/content/docs/guides/changelog.md`
- `website/src/content/docs/guides/deployment.md`
- `website/src/content/docs/features/batch-management.md`
- `website/src/content/docs/api/mcp-server-reference.md`

**Owner**
Content Lead draft, CMO approve, CTO technical review

**Acceptance criteria**
- explains what changed in buyer language, not only engineering language
- shows why the release matters for rollout confidence
- links to at least two supporting docs pages

### Cycle 2: Weeks 3 to 4

**Topic**
`From ERP to shop floor without spreadsheet handoffs`

**Audience**
- owners and operations leaders at metalworking job shops
- technical evaluators validating integration fit

**Website surfaces**
- add `website/src/content/docs/guides/erp-to-shop-floor.md`
- update `website/src/content/docs/features/erp-integration.md`

**Primary CTA**
`Plan a managed rollout`

**Proof requirements**
- `website/src/content/docs/features/erp-integration.md`
- `website/src/content/docs/features/csv-import.md`
- `website/src/content/docs/guides/deployment.md`
- `website/src/content/docs/managed-rollout.mdx`

**Owner**
Content Lead draft, CMO approve, CTO technical review

**Acceptance criteria**
- names the production problem before describing the feature
- shows how Eryxon fits between ERP data and operator execution
- routes higher-intent evaluators to managed rollout instead of a generic contact ask

### Cycle 3: Weeks 5 to 6

**Topic**
`Why operators actually use the terminal: queues, time tracking, and drawings in one flow`

**Audience**
- shop-floor supervisors
- operations leaders concerned about operator adoption

**Website surfaces**
- add `website/src/content/docs/guides/operator-adoption-on-the-shop-floor.md`
- update `website/src/content/docs/features/operator-terminal.md`
- update `website/src/content/docs/features/3d-viewer.md`

**Primary CTA**
`Open hosted trial`

**Proof requirements**
- `website/src/content/docs/features/operator-terminal.md`
- `website/src/content/docs/features/3d-viewer.md`
- `website/src/content/docs/guides/operator-manual.md`
- existing product screenshots in `website/src/assets/`

**Owner**
Content Lead draft, CMO approve

**Acceptance criteria**
- ties operator usability to business outcomes
- uses screenshots or workflow proof instead of abstract claims
- gives evaluators a direct path to try the hosted experience

## Reserve Queue

If an active topic misses readiness, pull the next reserve topic instead of stalling the function:

1. `Hosted trial vs managed rollout vs self-hosted: which path fits your shop?`
2. `Capacity planning and QRM flow for high-mix job shops`
3. `Batch management and production coordination without paper travelers`

## Known Dependencies to Route

### Non-blocking gap: recurring article surface

The current site has strong docs and changelog primitives, but no dedicated recurring article index or template outside the docs structure.

**Action**
- route a child issue to Website Engineer for a lightweight article/index implementation that supports this function without waiting for the full redesign

### Non-blocking gap: release proof intake discipline

Marketing can draft from public docs, but the content cycle will move faster if product updates arrive with a consistent proof packet.

**Action**
- route a child issue to CTO for a lightweight handoff format:
  shipped capabilities, supporting docs, screenshots, and claim caveats

## Success Measure for This Function

The function is working when:

- the Content Lead always has one active cycle and one reserve cycle
- every published website asset has a named audience and CTA
- social posts trace back to a website proof asset
- dependencies are surfaced as child issues instead of turning into silent delays

## Immediate Next Action

Assign Cycle 1 execution to the Content Lead with this brief as the operating contract, and open the two non-blocking dependency issues so the function can keep moving while the content work starts.
