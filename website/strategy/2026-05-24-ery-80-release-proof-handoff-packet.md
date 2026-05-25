# ERY-80 Release Proof Handoff Packet

Date: 2026-05-24
Owner: CTO
Issue: [ERY-80](/ERY/issues/ERY-80)
Parent: [ERY-67](/ERY/issues/ERY-67)
Related: [ERY-68](/ERY/issues/ERY-68), [ERY-59](/ERY/issues/ERY-59), [ERY-58](/ERY/issues/ERY-58)

## Objective

Define the smallest repeatable technical handoff that lets the Content Lead start a proof-led draft from one authoritative packet instead of reconstructing a release from repo history, issue threads, and scattered docs.

The packet must stay:

- lightweight enough to repeat every two weeks
- strict enough to prevent unsupported public claims
- concrete enough that marketing can draft without another discovery pass

## Recommendation

Use one markdown packet per release-driven or feature-driven content cycle.

- The raw proof stub comes from the technical owner closest to the shipped work.
- The authoritative packet goes to marketing from CTO after claim wording is trimmed to publish-safe language.
- Keep the packet to one short document: 3 to 5 shipped capabilities, 4 to 6 supporting links, 3 to 5 screenshot notes, and explicit claim boundaries.

## Owner And Timing

### Who supplies it

- **Raw proof supplier:** the release owner, feature owner, or umbrella issue owner closest to the shipped work
- **Authoritative sender:** CTO
- **Consumer:** Content Lead
- **Final publication approver:** CMO

This keeps source collection close to the engineering truth while giving marketing one approved technical handoff instead of multiple partial inputs.

### When it is due

- **Release-driven cycle:** within 1 business day of the release tag, repo changelog entry, or UAT/release gate reaching a stable recommendation
- **Feature-driven cycle:** when the story has at least 2 proof sources, 1 named CTA, and either 1 supporting screenshot or an explicit screenshot-gap owner
- **Publishing rule:** drafting can start with open blockers, but public copy does not publish until blockers are closed or the claim scope is reduced

## Minimum Packet Template

Copy this structure for each cycle.

### 1. Cycle metadata

- Cycle window
- Story type: `release`, `feature`, or `proof refresh`
- Working title
- Audience
- Primary CTA
- Secondary CTA
- Technical owner
- Marketing owner

### 2. Safe public narrative

Two or three sentences that answer:

- what changed
- why it matters to the buyer or operator
- what path the reader should take next

### 3. Shipped capabilities

List 3 to 5 proof-bearing items in a table with these columns:

| Capability | Buyer / operator meaning | Evidence | Content-safe wording | Caveat |
| --- | --- | --- | --- | --- |

### 4. Supporting links

- public docs or website targets
- internal release or validation docs
- any release note, changelog, or brief that defines the approved posture

### 5. Screenshot proof

Track visuals in a table with these columns:

| Asset needed | Current source | Status | Owner | Notes |
| --- | --- | --- | --- | --- |

### 6. Claim boundaries

- safe claims
- unsafe or withheld claims
- required wording or terminology

### 7. Publication blockers or dependencies

Name anything that must land before the story can publish, such as:

- stale public docs
- missing screenshots
- unresolved QA or release validation
- wording that still needs CEO, CTO, or CMO confirmation

### 8. Review state

- CTO status
- Content Lead status
- CMO status

## Example Packet - Current Release-Oriented Cycle

Assumption:
The current release-oriented content cycle is the native guided-rollout package defined in [ERY-68](/ERY/issues/ERY-68). That supersedes the earlier `v0.5.1` placeholder named in the original [ERY-67](/ERY/issues/ERY-67) backlog.

### 1. Cycle metadata

- **Cycle window:** 2026-05-25 to 2026-06-05
- **Story type:** `release`
- **Working title:** `Native iPhone/iPad, Android, and installable PWA paths for guided Eryxon rollouts`
- **Audience:** current evaluators, owners, operations leads, technical buyers
- **Primary CTA:** `Review native install and deployment docs`
- **Secondary CTA:** `Plan a managed rollout`
- **Technical owner:** CTO
- **Marketing owner:** Content Lead with CMO approval

### 2. Safe public narrative

Eryxon Flow now supports native iPhone/iPad, native Android, and installable PWA paths for guided rollouts and technical evaluation. The proof is not "mobile hype"; it is a documented touch-first operator shell, shared deployment model, and platform-specific install guidance that buyers can inspect today. The next step is either to review the install/deployment docs or to start a managed rollout conversation.

### 3. Shipped capabilities

| Capability | Buyer / operator meaning | Evidence | Content-safe wording | Caveat |
| --- | --- | --- | --- | --- |
| Native iPhone / iPad path with the shared touch-first `/m/*` shell | Apple-device operators and evaluators can use the same queue/login/mobile-shell model on phones and tablets | `CHANGELOG.md` `0.5.2`; `docs/IOS.md` | Native iPhone/iPad rollout paths are available for guided deployments and technical evaluation | Do not imply broad App Store availability or a separate native codebase |
| Native Android phone / tablet path | Common shop-floor Android hardware can run the same operator shell with native packaging and device integrations | `CHANGELOG.md` `0.5.2`; `docs/ANDROID.md`; `docs/DEPLOY_AND_TEST.md` | Android phones and tablets can run the touch-first operator shell in native packaging | Do not say "built natively" and do not promise offline write-queue behavior |
| Installable PWA path | Evaluators can install the operator shell without waiting on app-store distribution | `CHANGELOG.md` `0.5.2`; `docs/ANDROID.md` PWA section; `docs/DEPLOY_AND_TEST.md` | The operator shell is also installable as a PWA for guided rollouts and evaluation | Claim installability and update prompts only; do not claim disconnected production operation |
| Guided rollout and deployment path | Buyers know the intended commercial path instead of inferring a consumer-style app launch | `website/src/content/docs/managed-rollout.mdx`; `website/strategy/2026-05-24-ery-59-v0-6-native-app-launch-brief.md` | Hosted trial remains the fastest path, and managed rollout is the right path for deployment or ERP help | Lead with rollout truth, not app-store language |

### 4. Supporting links

#### Source-of-truth proof

- `CHANGELOG.md`
- `docs/IOS.md`
- `docs/ANDROID.md`
- `docs/DEPLOY_AND_TEST.md`
- `website/src/content/docs/managed-rollout.mdx`
- `website/strategy/2026-05-24-ery-59-v0-6-native-app-launch-brief.md`
- `docs/2026-05-24-ery-58-v0.6-native-uat-gate.md`

#### Intended public surfaces

- `website/src/content/docs/guides/changelog.md`
- `website/src/content/docs/introduction.md`
- `website/src/content/docs/managed-rollout.mdx`

### 5. Screenshot proof

| Asset needed | Current source | Status | Owner | Notes |
| --- | --- | --- | --- | --- |
| iPhone queue or login flow in the touch shell | No repo-local device screenshot yet | Missing | UXDesigner | Best proof for the "operators can use the same surface on phones" claim |
| iPad split-view queue + detail | No repo-local device screenshot yet | Missing | UXDesigner | Needed to support tablet-layout language visually |
| Android tablet queue or scan flow | No repo-local device screenshot yet | Missing | UXDesigner | Best proof that the story is not Apple-only |
| PWA install or shortcut evidence | No repo-local install screenshot yet | Missing | UXDesigner + Website Engineer | Helpful for website release proof and social derivatives |
| Generic supporting product visuals | `website/src/assets/overview.png`, `step-1.png`, `step-2.png`, `step-3.png` | Available | Website Engineer | Use only as supporting product proof, not as native-device proof |

### 6. Claim boundaries

#### Safe claims

- Native iPhone/iPad, native Android, and installable PWA paths are part of guided rollout and technical evaluation
- The same touch-first `/m/*` operator shell spans those runtimes
- Scanner, biometric re-unlock, haptics, and tablet layouts are documented as supported on the relevant native paths
- Hosted trial remains the fastest path; managed rollout is the right CTA for deployment and ERP help

#### Unsafe or withheld claims

- `open source`
- `built natively (not a wrapped web view)`
- broad App Store / Play Store availability
- offline write queue or disconnected-production promises
- any wording that hides current screenshot or validation gaps

#### Required wording

- `source-available under BSL 1.1` when license framing is needed
- `guided rollout` or `technical evaluation` for release posture
- `native packaging around the shared React/mobile shell` when implementation detail matters

### 7. Publication blockers or dependencies

- `website/src/content/docs/guides/changelog.md` still presents `v0.5.1` as current and still frames native apps as upcoming; it must be refreshed before this release story publishes
- The native screenshot pack is still missing, so social and website proof should not imply device visuals exist yet
- Public wording must stay aligned with `website/strategy/2026-05-24-ery-59-v0-6-native-app-launch-brief.md`
- Claim scope must respect the caveats captured in `docs/2026-05-24-ery-58-v0.6-native-uat-gate.md`

### 8. Review state

- **CTO:** approved as the technical handoff packet for draft creation
- **Content Lead:** can draft from this packet immediately
- **CMO:** still approves the final angle, CTA emphasis, and publication timing

## Definition Of Done For Future Cycles

The packet is sufficient when:

- Content Lead can draft without another repo-discovery pass
- CTO can review the draft by checking only claims that go beyond the packet
- any missing proof is explicit, owned, and named as a blocker instead of becoming silent rework
