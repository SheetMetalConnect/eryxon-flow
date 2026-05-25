# ERY-126 Responsive Visual QA — ERY-117 + ERY-103 Parity Handoff

Date: 2026-05-25  
Owner: UXDesigner (Principal Product Designer)  
Issue: ERY-126

## Scope verified

- Homepage / landing: `/`
- Docs entry: `/introduction/`, `/de/introduction/`, `/nl/introduction/`
- Splash parity surfaces: `/foundation/`, `/de/`, `/nl/`
- Buyer-path page: `/managed-rollout/`
- Viewports: Desktop `1440x900`, Mobile `390x844` (iPhone 12)

## Evidence captured

All screenshots are in:

- `website/qa/ery-126-2026-05-25/desktop__*.png`
- `website/qa/ery-126-2026-05-25/mobile__*.png`

Key captures:

- `desktop__home.png`, `mobile__home.png`
- `desktop__introduction.png`, `mobile__introduction.png`
- `desktop__de__introduction.png`, `desktop__nl__introduction.png`
- `desktop__de.png`, `desktop__nl.png`
- `desktop__managed-rollout.png`, `mobile__managed-rollout.png`

## Pass/fail summary

1. Homepage `/`: **Pass** for responsive layout and CTA hierarchy (hosted trial / managed rollout / docs) on desktop + mobile.
2. EN docs entry `/introduction/`: **Fail** for light-first parity. Path chooser exists, but route still renders in forced dark theme.
3. DE/NL docs entry (`/de/introduction/`, `/nl/introduction/`): **Fail** for IA parity and light-first parity. Path chooser pattern is missing; legacy intro pattern remains.
4. DE/NL splash (`/de/`, `/nl/`): **Fail** for token parity. Dark-assuming utility classes remain and diverge from canonical light-first contract.
5. Managed rollout `/managed-rollout/`: **Partial**. Information scent is strong and mobile layout is stable, but visual system still follows dark docs shell rather than the light-first marketing direction.

## Root-cause findings with file references

1. Theme default is still forced to dark on docs pages:
   - `website/src/components/override-components/ThemeSwitch.astro:90-99`
   - `DOMContentLoaded` branch sets `data-theme="dark"` unless `localStorage` already contains `"light"`.
2. EN intro path chooser exists (expected pattern):
   - `website/src/content/docs/introduction.md:8-25` (`data-cta-surface="docs_intro_path_chooser"` cards).
3. DE/NL intro pages still use legacy copy/CTA structure without chooser cards:
   - `website/src/content/docs/de/introduction.md:10`
   - `website/src/content/docs/nl/introduction.md:10`
4. DE/NL splash pages still contain dark-assuming classes (`bg-amber-500/10`, `text-amber-400`, etc.):
   - `website/src/content/docs/de/index.mdx:29-39`
   - `website/src/content/docs/nl/index.mdx:29-39`

## UX risk assessment (design lenses)

1. **Jakob's Law + Mental Models**: EN shows a “Choose your path” gateway while DE/NL do not; cross-locale behavior breaks expectation parity.
2. **Information Scent**: Buyer-path intent is clear on homepage, but docs-locale divergence weakens trust when users switch language.
3. **Cognitive Load + Recognition over Recall**: Path chooser cards reduce decision friction in EN; their absence in DE/NL forces scanning long prose.
4. **WCAG POUR (Perceivable)**: Forced dark default against stated light-first strategy creates inconsistent contrast and theming behavior across surfaces.

## Implementation handoff to CTO (no UX implementation in this heartbeat)

1. Theme behavior:
   - Make light the default on docs surfaces.
   - Keep dark mode as explicit user opt-in only.
   - Acceptance: fresh session, no localStorage, `/introduction/` loads with light token set.
2. Locale IA parity:
   - Port EN path chooser interaction model to DE/NL intros using localized copy.
   - Acceptance: each locale intro includes 3 chooser cards (hosted / managed rollout / self-host) with locale CTA IDs.
3. Splash parity:
   - Replace remaining dark-assuming utility color classes on DE/NL splash routes with canonical `--ery-*` token usage.
   - Acceptance: no locale-specific hardcoded `*-400`/`*-500/10` status utility classes on splash surfaces.

## Disposition recommendation

- ERY-126 should remain `in_progress` until ERY-117/ERY-103 owners confirm remediation and a second visual pass verifies parity at desktop + mobile.
