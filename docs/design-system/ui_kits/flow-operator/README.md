# Eryxon Flow — Operator UI kit

Tablet-first, dark-mode-primary surfaces for the shop floor. Built on the
shared `colors_and_type.css` tokens.

## Files

- `index.html` — interactive demo wiring a realistic operator work-queue
  with live elapsed timer, search, "Mine only" filter, and an operation
  detail modal.
- `components.jsx` — React components (no build step; loaded via Babel).
- `styles.css` — the operator-specific layout & component CSS that
  consumes the token CSS variables.

## What's in this kit

| Component | Purpose |
|---|---|
| `OperatorStatusBar` | Top chrome — brand, cell, connectivity, time, operator avatar |
| `QueueToolbar` | Search + "Mine only" tab + Filters tab |
| `OperationCard` | The operator's atomic unit (status stripe, job, due, time, flags) |
| `CurrentlyTimingBar` | Sticky bottom bar — currently-timing operation + Pause/Issue/Complete |
| `OperationDetail` | Modal — full operation context, routing, files, Start action |
| `TerminalLogin` | Tap-your-name terminal login screen |

## Design rules in this kit

- **All buttons ≥ 56 px tall** (`--touch-comfortable`).
- **Status by color is the affordance.** Green = start, orange = pause,
  yellow = resume, blue = complete, red = issue. Never relabel.
- **Status stripe on the left of each card** — 4 px wide, animated pulse
  while timing.
- **Tabular numerals everywhere a number changes** (timer, counts,
  hours) — `font-feature-settings: 'tnum'`.
- **No gradients, no glass.** Surfaces are flat; separation is borders.
- **Modal scrim is solid 60% black**, no backdrop-blur.

## Source

Recreated from the real Flow operator components in
[`SheetMetalConnect/eryxon-flow`](https://github.com/SheetMetalConnect/eryxon-flow):

- `src/pages/operator/WorkQueue.tsx`
- `src/components/operator/OperationCard.tsx`
- `src/components/operator/OperatorStatusBar.tsx`
- `src/components/operator/OperatorFooterBar.tsx`
- `src/components/operator/CurrentlyTimingWidget.tsx`
- `src/pages/operator/TerminalLogin.tsx`

Implementations here are **cosmetic recreations only** — no Supabase,
no real-time subscriptions, no auth.
