# Eryxon Flow Design System

**Antigravity-inspired dark-first design system for manufacturing execution**

Version: 3.1 "Antigravity"
Last Updated: November 22, 2025
Status: ✅ Active

---

## Table of Contents

- [Overview](#overview)
- [Design Philosophy](#design-philosophy)
- [Getting Started](#getting-started)
- [Typography](#typography)
- [Color Palette](#color-palette)
- [Components](#components)
- [Animations](#animations)
- [Best Practices](#best-practices)
- [Migration Guide](#migration-guide)

---

## Overview

The Eryxon Flow design system is a **modern, dark-first** UI framework built for manufacturing professionals. Release 3.1 realigns every surface with the Antigravity Browser Control pack so the product looks identical to the animated onboarding reference.

It combines:

- **Antigravity Ambient Field**: Deep #111927 base plus layered radial gradients from the `browser.css` pack
- **Floating Gradient Orbs**: Three drifting light sources that keep the background alive
- **Glass Morphism Surfaces**: Blur + saturate cards with translucent borders
- **Neon Accent Palette**: Icon tints and pills in electric blue, green, yellow, and red
- **System-Weighted Typography**: Inter blended with the OS stack for crisp UI copy
- **Touch-Optimized Layouts**: 44px+ targets, stacked content, and centered onboarding
- **shadcn/ui-Only Components**: Every primitive (button, input, badge, dialog, etc.) comes from shadcn/ui and then receives glassmorphism styling

### Antigravity DNA

1. **Ambient Gradient Shell** — `background-color: #111927` plus two radial gradients for depth.
2. **Onboarding Glass Card** — `rgba(17, 25, 40, 0.75)` panel with 16px blur, saturate(180%), and 1px translucent border.
3. **Layered Hero Stack** — Icon container, uppercase welcome text, hero gradient title, and a translucent preview pill.
4. **Narrative Sections** — Informational text capsule, workflow callout, and use-case grid with tinted stroke icons.
5. **Micro-Interactions** — Copy-on-click pill, CTA button with arrow icon, and animated pills for status states.

All values originate from the Antigravity design kit (`browser.css`) so the engineering implementation stays pixel-accurate.

### Technology Stack

- **CSS Framework**: Tailwind CSS + CSS Custom Properties
- **UI Components**: 100% shadcn/ui primitives (button, sheet, dialog, form, badge, etc.)
- **Complex Components**: Material-UI v7 (DataGrid, DatePickers) wrapped in shadcn shells when needed
- **Typography**: Inter + system UI stack
- **Styling Approach**: Dark mode only, glass morphism, animated backgrounds
- **Reference Styles**: Antigravity `browser.css` pack for gradients, pills, and layout primitives

---

## Design Philosophy

### "The Simple MES You Love to Use"

Our tagline drives every design decision and anchors the Antigravity styling pass:

1. **Simple**: A single glass card centered on an ambient stage keeps the focus on the task.
2. **Beautiful**: Animated gradients, neon pills, and microcopy echo the Antigravity Browser Control preview.
3. **Functional**: Touch-optimized layouts (44px+ targets) remain practical for shop-floor tablets.
4. **Professional**: Enterprise-grade typography, accessibility, and predictable motion keep trust high.

### Antigravity Aesthetic

- **Ambient Field + Depth** — The background is never flat; radial gradients and floating orbs add parallax.
- **Glass Cards** — Every hero surface uses blur(16px) saturate(180%) with translucent borders.
- **Layered Messaging** — Icon container, uppercase welcome text, gradient hero, preview pill, and divider.
- **Narrative Sections** — Informational capsule, workflow callout, and use-case grid tell the story.
- **Neon Icon Tints** — Blue, green, yellow, and red strokes mimic the Antigravity iconography.

### Dark Mode Only

We've removed light mode support to focus on an Antigravity-grade dark shell:

- **Deep Navy Base**: `#111927` background dampens glare in low-light facilities.
- **Radial Highlights**: `hsl(205.47, 77%, 40%)` and `hsl(218, 39%, 11%)` gradients add controlled glow.
- **Glass Surfaces**: `rgba(17, 25, 40, 0.75)` cards stay legible while showcasing blur and saturation.
- **Manufacturing Focus**: High-contrast text + iconography stays readable on large kiosks and tablets.

### Key Principles

- **shadcn-first**: If a primitive exists in shadcn/ui, import it via the generator and style it; no bespoke HTML copies.
- **Token-First Values**: Gradients, pills, and icons reference shared CSS variables (no hex literals).
- **Layered Glass Depth**: Always stack content over the animated background with a glass card or capsule.
- **Smooth Animations**: Background orbs use 20s float cycles; cards fade in with `fadeInUp`.
- **Consistent Roundings**: Use 10px, 12px, and 24px radii exactly as seen in the Antigravity card.
- **Touch-Optimized Rhythm**: Vertical spacing uses full rem steps (1rem, 1.25rem, 1.5rem, 2rem).

---

## Getting Started

### Design System Files

```
src/styles/design-system.css  ← All design tokens and base styles
src/theme/theme.ts            ← Material-UI theme configuration
tailwind.config.ts            ← Tailwind CSS configuration
src/components/AnimatedBackground.tsx  ← Background animation
components/ui/*               ← shadcn/ui primitives (auto-generated)
```

### shadcn/ui Integration

Every interactive element ships from `shadcn/ui`. Never hand-roll components when an equivalent primitive exists.

1. **Install the CLI (project root)**
   ```bash
   npx shadcn@latest init
   ```

2. **Add components**
   ```bash
   npx shadcn@latest add button input badge form dialog sheet tooltip
   ```

3. **Extend tokens**
   - Update `components.json` with our namespace (`@/components/ui`).
   - Map shadcn tokens to our CSS variables in `src/styles/design-system.css`.

4. **Wrap with Glass**
   - For elevated surfaces (card, dialog, sheet) use `.glass-card` or `.onboarding-card`.
   - Buttons, badges, and inputs adopt Antigravity gradients through Tailwind classes (e.g., `className="cta-button"`).

5. **Keep Upgrades Centralized**
   - Only edit the components inside `components/ui/`.
   - Use `npx shadcn@latest add` again if upstream releases new primitives; reapply our glass classes after merge.

### Using Design Tokens

**In CSS:**
```css
.my-component {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  border-radius: var(--radius-xl);
  padding: var(--space-md);
}
```

**In Tailwind:**
```jsx
<div className="bg-background text-foreground rounded-xl p-6">
  Content
</div>
```

**In Material-UI:**
```jsx
<Box sx={{
  bgcolor: 'background.default',
  color: 'text.primary',
  borderRadius: 2
}}>
  Content
</Box>
```

### shadcn Theme Bridge

`shadcn/ui` components pull their colors from Tailwind theme tokens. Bridge those tokens to our CSS variables in `tailwind.config.ts`.

```ts
const { fontFamily } = require('tailwindcss/defaultTheme');

module.exports = {
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        brand: {
          DEFAULT: 'hsl(var(--brand-primary))',
          light: 'hsl(var(--brand-primary-light))',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', ...fontFamily.sans],
      },
    },
  },
};
```

- Use these Tailwind tokens inside shadcn components (`buttonVariants`, `badgeVariants`, etc.).
- Keep variant logic inside the generated component files so we can reuse them across the app.

### Antigravity Layout Primer

Use the same skeleton from the Antigravity onboarding preview whenever you build full-screen flows.

```tsx
<>
  <AnimatedBackground variant="antigravity" />

  <div className="landing-container">
    <div className="onboarding-card">
      <div className="icon-container">
        <img src="/antigravity.svg" alt="Antigravity" className="browser-icon" />
      </div>

      <p className="welcome-text">Welcome to</p>

      <div className="title-container">
        <h1 className="main-title">Antigravity Browser Control</h1>
        <p className="preview-pill">Preview</p>
      </div>

      <hr className="title-divider" />
      {/* Narrative sections */}
    </div>
  </div>
</>
```

Key rules:

- `landing-container` keeps the card centered with generous padding and a top offset.
- Always render `<AnimatedBackground />` before content so the orbs sit beneath the glass layers.
- Wrap hero text in `title-container` and pair with `preview-pill` to show release status.
- Build additional sections (informational text, workflow callout, use-case grid) inside the card exactly as shown in the Antigravity pack.

---

## Typography

### Font Stack

Use Inter blended with the system stack to match the Antigravity preview.

```css
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI',
    Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', sans-serif;
}

body {
  font-family: var(--font-sans);
  letter-spacing: -0.02em;
  -webkit-font-smoothing: antialiased;
}
```

**Why this stack?**
- Inter remains the brand font while inheriting OS-level hinting for hero copy.
- System fallbacks make the Antigravity Browser Control preview look native in Safari, Chrome, and Edge.
- Negative letter-spacing and uppercase microcopy (`letter-spacing: 0.1em`) mimic the welcome text from `browser.css`.

### Microcopy & Pills

- Uppercase microcopy (e.g., "WELCOME TO") uses `font-size: 0.9rem`, `letter-spacing: 0.1em`, and muted gray (#a0a0a0).
- Preview pills combine `font-size: 1rem`, `border-radius: 0.375rem`, and `background: #80808033`.
- Hero titles apply gradient text (`hero-title`) and keep `line-height: 1.3` for a premium feel.

### Type Scale

| Level | Size | Weight | Line Height | Use Case |
|-------|------|--------|-------------|----------|
| **H1** | 2.25rem (36px) | 700 | 1.25 | Page titles |
| **H2** | 1.875rem (30px) | 700 | 1.3 | Section headings |
| **H3** | 1.5rem (24px) | 600 | 1.3 | Card titles |
| **H4** | 1.25rem (20px) | 600 | 1.4 | Component headings |
| **Body1** | 1rem (16px) | 400 | 1.5 | Standard text |
| **Body2** | 0.875rem (14px) | 400 | 1.5 | Secondary text |
| **Caption** | 0.75rem (12px) | 400 | 1.4 | Metadata |

### Font Weights

- **300 (Light)**: Rarely used, display text only
- **400 (Regular)**: Body text, descriptions
- **500 (Medium)**: Buttons, emphasized text
- **600 (Semibold)**: Headings, card titles
- **700 (Bold)**: Major headings, hero text

---

## Color Palette

### Ambient Field (Background)

Use the Antigravity cosmic shell exactly as delivered in `browser.css`.

```css
body {
  background-color: #111927;
  background-image:
    radial-gradient(at 47% 33%, hsl(205.47, 77%, 40%) 0, transparent 59%),
    radial-gradient(at 82% 65%, hsl(218, 39%, 11%) 0, transparent 55%);
}
```

- The deep navy base reduces glare on the shop floor.
- Layered gradients add halo light without using images or shaders.

### Glass Morphism Surfaces

Generated with [UI Glass](https://generator.ui.glass/) using identical settings to the design pack.

```css
.card,
.onboarding-card {
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  background-color: rgba(17, 25, 40, 0.75);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.125);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}
```

- The tint is #111927; never switch back to pure black or the effect is lost.
- Use the same blur amount for modals, cards, and onboarding flows.

### Surface Tokens

```css
:root {
  --surface-base: 218 39% 11%;      /* #111927 - ambient background */
  --surface-card: 220 27% 14%;      /* #141b29 - fallback behind blur */
  --surface-elevated: 220 23% 18%;  /* #1c2637 - pills/capsules */
  --surface-divider: 0 0% 100% / 0.08;
}
```

### Brand Colors

#### Primary: Dodger Blue
```css
--brand-primary: 211 100% 56%  /* #1e90ff */
```
- **Use**: CTA buttons, hero gradients, icon strokes
- **Character**: Modern, tech-forward, energetic

#### Accent: Light Blue
```css
--brand-primary-light: 211 100% 64%  /* #4a9eff */
```
- **Use**: Hover states, preview pills, informational capsules
- **Character**: Soft highlight that feels premium in glass surfaces

### Icon Accent Tokens

```css
.use-case-icon.icon-blue { stroke: #4a9eff; }
.use-case-icon.icon-green { stroke: #34a853; }
.use-case-icon.icon-yellow { stroke: #fbbc05; }
.use-case-icon.icon-red { stroke: #ea4335; }
```

- Works with Lucide React icons and inline SVGs.
- Keep icon size at 20px with 0.75rem gap to text (`gap: 0.75rem`).

### Semantic Colors

```css
--color-success: 140 60% 52%     /* #34a853 - Green */
--color-warning: 45 100% 51%     /* #fbbc05 - Yellow */
--color-error: 4 90% 58%         /* #ea4335 - Red */
--color-info: 199 89% 48%        /* #0891b2 - Cyan */
```

### MES-Specific Status Colors

**Work Status:**
```css
--status-active: 45 100% 51%     /* Yellow - timing active */
--status-completed: 140 60% 52%  /* Green - finished */
--status-on-hold: 25 95% 53%     /* Orange - paused */
--status-blocked: 4 90% 58%      /* Red - cannot proceed */
--status-pending: 220 12% 72%    /* Gray - not started */
```

**Usage:**
```jsx
<Badge className="bg-status-active text-black">Active</Badge>
<Badge className="bg-status-completed text-white">Completed</Badge>
```

### Manufacturing Stage Colors

```css
--stage-cutting: 199 89% 48%     /* Cyan - precision */
--stage-bending: 271 91% 65%     /* Purple - formation */
--stage-welding: 25 95% 53%      /* Orange - heat */
--stage-assembly: 140 60% 52%    /* Green - completion */
--stage-finishing: 45 100% 51%   /* Yellow - final touch */
```

### Gradient Orbs (Animated Backgrounds)

```css
.animated-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  overflow: hidden;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
  animation: float 20s infinite ease-in-out;
}

.gradient-orb.orb-1 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(30, 144, 255, 0.4) 0%, transparent 70%);
  top: -10%;
  left: -10%;
  animation-delay: 0s;
}

.gradient-orb.orb-2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(251, 188, 5, 0.3) 0%, transparent 70%);
  bottom: -10%;
  right: -10%;
  animation-delay: 7s;
}

.gradient-orb.orb-3 {
  width: 350px;
  height: 350px;
  background: radial-gradient(circle, rgba(52, 168, 83, 0.3) 0%, transparent 70%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: 14s;
}
```

- Keep blur at 80px for soft glow; smaller values introduce noise.
- Always render the animated background before any glass card layers.

---

## Components

All UI primitives (Button, Input, Badge, Card, Dialog, Sheet, Tooltip, etc.) are generated via `shadcn/ui`. We never fork these components— instead, we wrap them with Antigravity glass classes using `cn()` helpers.

```tsx
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function GlassCard(props: React.ComponentProps<typeof Card>) {
  return (
    <Card
      {...props}
      className={cn('glass-card', props.className)}
    />
  );
}
```

- Keep all custom styling in `.glass-card`, `.onboarding-card`, `.cta-button`, etc., so we can re-run `shadcn` generators without merge conflicts.
- When adding a new primitive, extend the generated file minimally (e.g., default props) and apply Antigravity classes via `className`.

### Animated Background & Landing Container

**CSS**
```css
.landing-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
  padding: 2rem;
  margin-top: 2.5rem;
  z-index: 1;
}
```

**Usage**
```tsx
<>
  <AnimatedBackground variant="antigravity" />
  <div className="landing-container">
    <div className="onboarding-card">...</div>
  </div>
</>
```

- Always mount `<AnimatedBackground />` before page content so orbs appear behind the card.
- Keep `z-index: 1` on the container to sit above the animated layer.

### Onboarding Glass Card

**CSS**
```css
.onboarding-card {
  width: 100%;
  max-width: 520px;
  padding: 1rem 2.5rem 2rem;
  text-align: center;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(20, 20, 20, 0.7);
  backdrop-filter: blur(20px) saturate(180%);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  animation: fadeInUp 0.8s ease-out;
}
```

**Usage**
```jsx
<div className="onboarding-card">
  {/* Title stack + sections */}
</div>
```

### Title Stack & Preview Pill

**CSS**
```css
.icon-container {
  display: inline-flex;
  padding: 0.25rem 0.25rem 1rem;
}

.browser-icon {
  width: 128px;
  height: 128px;
  mix-blend-mode: screen;
}

.welcome-text {
  font-size: 0.9rem;
  font-weight: 400;
  margin: 0 0 0.5rem;
  color: #a0a0a0;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.title-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.main-title {
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin: 0;
  color: #fff;
}

.preview-pill {
  background-color: #80808033;
  border-radius: 0.375rem;
  padding: 0.25rem 0.5rem;
  font-size: 1rem;
  margin: 0;
}

.hero-title {
  font-size: 1.75rem;
  font-weight: 600;
  margin: 0 0 1.25rem;
  background: linear-gradient(135deg,
    hsl(var(--brand-primary)),
    hsl(var(--brand-primary-light)),
    hsl(var(--color-warning))
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.3;
  letter-spacing: -0.02em;
}
```

**Usage**
```jsx
<div className="icon-container">
  <img src="antigravity.svg" alt="Antigravity" className="browser-icon" />
</div>
<p className="welcome-text">Welcome to</p>
<div className="title-container">
  <h1 className="main-title">Antigravity Browser Control</h1>
  <p className="preview-pill">Preview</p>
</div>
<hr className="title-divider" />
<h2 className="hero-title">Getting Started</h2>
```

### Informational Text Capsule

**CSS**
```css
.informational-text {
  font-size: 1.1rem;
  line-height: 1.7;
  color: #e0e0e0;
  margin: 0 0 2rem;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid rgba(30, 144, 255, 0.15);
  background: linear-gradient(135deg, #1e90ff14, #34a8530f);
}
```

**Usage**
```jsx
<p className="informational-text">
  The agent can click, scroll, type, and navigate web pages automatically...
</p>
```

### Workflow Callout

**CSS**
```css
.workflow-section {
  margin: 0 0 2rem;
  padding: 0.75rem 0 0.75rem 1rem;
  border-left: 3px solid rgba(30, 144, 255, 0.4);
}

.workflow-description {
  font-size: 0.95rem;
  line-height: 1.6;
  color: #b0b0b0;
  text-align: left;
  margin: 0;
  font-style: italic;
}
```

**Usage**
```jsx
<div className="workflow-section">
  <p className="workflow-description">
    Simply return to your Antigravity conversation...
  </p>
</div>
```

### Use Case Cards

**CSS**
```css
.use-cases-section {
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.use-cases-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

.use-case-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #ffffff08;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
}

.use-case-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  stroke-width: 2;
  transition: all 0.3s ease;
}

.use-case-text {
  font-size: 0.95rem;
  line-height: 1.4;
  color: #e0e0e0;
  margin: 0;
}
```

**Usage**
```jsx
<div className="use-cases-section">
  <h3 className="section-heading">Example Use Cases</h3>
  <div className="use-cases-grid">
    <div className="use-case-card">
      <MonitorPlay className="use-case-icon icon-blue" />
      <span className="use-case-text">
        Iterating on website designs and implementations
      </span>
    </div>
    {/* Additional cards */}
  </div>
</div>
```

### Action Section

**CSS**
```css
.action-section {
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.description {
  font-size: 0.95rem;
  line-height: 1.4;
  color: #909090;
  margin: 0 0 1.5rem;
}
```

**Usage**
```jsx
<div className="action-section">
  <p className="description">
    Stay in the Antigravity thread and the browser appears when needed.
  </p>
  <Button className="cta-button">
    Continue
    <ArrowRight className="arrow-icon" />
  </Button>
</div>
```

### Copy-On-Click Pill

**CSS**
```css
.copy-on-click {
  position: relative;
  background-color: #333;
  padding: 3px 24px 3px 6px;
  border-radius: 4px;
  cursor: pointer;
  font-family: monospace;
  border: 1px solid #555;
}

.copy-on-click::before {
  content: "";
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='9' y='9' width='13' height='13' rx='2' ry='2'%3E%3C/rect%3E%3Cpath d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-size: contain;
  filter: invert(75%);
}

.copy-on-click:hover {
  background-color: #444;
}

.copy-on-click.copied {
  background-color: #34a853;
  border-color: #34a853;
}
```

**Usage**
```jsx
<button className="copy-on-click" onClick={handleCopy}>
  npm run antigravity
</button>
```

### Forms & Inputs (shadcn/ui)

```tsx
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

<Form {...form}>
  <form className="space-y-4">
    <FormField
      control={form.control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input
              {...field}
              className="bg-[rgba(17,25,40,0.75)] border border-white/10 focus-visible:ring-brand/40"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </form>
</Form>
```

- Inputs always derive from shadcn `Input`; adjust visuals via Tailwind classes referencing our tokens.
- Keep focus rings luminous by borrowing `hsl(var(--brand-primary) / 0.4)`.

### CTA Button

**CSS**
```css
.cta-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1.25rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(135deg,
    hsl(var(--brand-primary)),
    hsl(var(--brand-primary-light))
  );
  color: #fff;
  text-decoration: none;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(30, 144, 255, 0.3);
}

.cta-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(30, 144, 255, 0.4);
}

.arrow-icon {
  width: 16px;
  height: 16px;
  opacity: 0.7;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.cta-button:hover .arrow-icon {
  opacity: 1;
  transform: translateX(2px);
}
```

**Usage**
```jsx
<Button className="cta-button">
  Sign In
  <ArrowRight className="arrow-icon" />
</Button>
```

### Dialogs & Sheets (shadcn/ui)

Use shadcn's `Dialog` and `Sheet` primitives, then add glassmorphism to `DialogContent`/`SheetContent`.

```tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export function GlassDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="cta-button">Launch</Button>
      </DialogTrigger>
      <DialogContent className="glass-card max-w-xl">
        <DialogHeader>
          <DialogTitle className="hero-title">Glass Dialog</DialogTitle>
          <DialogDescription>
            This content inherits the Antigravity blur and gradient dividers.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
```

- Always pass `className="glass-card"` (or `.onboarding-card` for larger sheets) into the generated shadcn component.
- Use shadcn `Form` components for validation, layering `informational-text` capsules or workflow callouts where appropriate.

### Title Divider

**CSS**
```css
.title-divider {
  border: none;
  height: 1px;
  background: linear-gradient(90deg,
    transparent 0%,
    hsl(var(--brand-primary) / 0.3) 50%,
    transparent 100%
  );
  margin: 0 0 1.75rem;
}
```

**Usage**
```jsx
<hr className="title-divider" />
```

---

## Animations

### Keyframes

#### Fade In Up
Smooth entrance animation for cards and modals.

```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Usage:**
```jsx
<div className="animate-fade-in-up">
  Content appears smoothly
</div>
```

#### Float
Smooth floating animation for gradient orbs.

```css
@keyframes float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -30px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}
```

**Usage:**
```css
.gradient-orb {
  animation: float 20s infinite ease-in-out;
}
```

### Transition Utilities

```css
.transition-base    /* 150ms cubic-bezier(0.4, 0, 0.2, 1) */
.transition-smooth  /* 200ms cubic-bezier(0.4, 0, 0.2, 1) */
.transition-slow    /* 300ms cubic-bezier(0.4, 0, 0.2, 1) */
```

**Usage:**
```jsx
<button className="transition-smooth hover:scale-105">
  Hover me
</button>
```

---

## Best Practices

### ✅ Do

1. **Start with shadcn/ui**
   ```bash
   npx shadcn@latest add button form input dialog sheet tooltip
   ```
   Use generated components everywhere; extend them with Antigravity classes rather than rewriting HTML.

2. **Compose the Antigravity Stack**
   ```tsx
   <>
     <AnimatedBackground variant="antigravity" />
     <div className="landing-container">
       <div className="onboarding-card">...</div>
     </div>
   </>
   ```

3. **Use Tokens Everywhere**
   ```jsx
   <div className="bg-[hsl(var(--surface-card))] text-foreground rounded-2xl">
   ```
   No hex literals—reference `--surface-*`, `--brand-*`, and status tokens.

4. **Keep the Hero Stack Intact**
   ```jsx
   <div className="icon-container" />
   <p className="welcome-text">Welcome to</p>
   <div className="title-container">
     <h1 className="main-title">Antigravity Browser Control</h1>
     <p className="preview-pill">Preview</p>
   </div>
   ```

5. **Tell the Narrative**
   - Informational capsule → workflow callout → use-case grid mirrors the Antigravity story.
   - Add tinted Lucide icons so each card reads instantly.

6. **Leverage Micro-Interactions**
   - Copy pill flips to `.copied`.
   - CTA arrows nudge on hover.
   - Cards fade in with `fadeInUp`.

### ❌ Don't

1. **Skip shadcn primitives**
   - Never import another component library for buttons, cards, inputs, etc.
   - If you need a component, run `npx shadcn@latest add <component>` and style it.

2. **No Flat Backgrounds**
   ```css
   body { background: #111927; } // Do this
   body { background: #0a0a0a; } // Not acceptable
   ```

3. **No Opaque Cards**
   Glass cards must use blur + saturation. Avoid `bg-gray-900` or solid fills.

4. **No Arbitrary Tailwind Values**
   Stick to `p-4`, `gap-3`, etc. Do not introduce `p-[23px]`.

5. **No Untinted Icons**
   Assign `.icon-blue`/`.icon-green` classes so icons match the pack.

6. **No Static Entrances**
   Cards and pills should animate (`fadeInUp`, float, copy success) exactly like the reference.

### Accessibility

✅ **Color Contrast**
- Body copy on #111927 backgrounds still meets WCAG AA by using `#e0e0e0`.
- Neon status colors remain distinct for colorblind operators.

✅ **Touch Targets**
- Minimum 44x44px for cards, pills, and CTA buttons.
- Copy pill uses full-bleed hit area despite compact visuals.

✅ **Keyboard Navigation**
- `copy-on-click` and CTA buttons receive focus rings.
- Use logical DOM order: icon → microcopy → hero → sections → CTA.

---

## Migration Guide

### From Old Design System

#### Move Everything to shadcn/ui

1. Initialize once per repo:
   ```bash
   npx shadcn@latest init
   ```
2. Generate every primitive you use (button, input, badge, dialog, sheet, tooltip, dropdown-menu, separator).
3. Delete bespoke component directories that duplicated shadcn functionality.
4. Route all new UI work through `components/ui/*` so upgrades remain centralized.

#### Adopt the Antigravity Ambient Field

**Before**
```jsx
<div className="min-h-screen bg-background">
```

**After**
```jsx
<>
  <AnimatedBackground variant="antigravity" />
  <div className="landing-container">
    <div className="onboarding-card">...</div>
  </div>
</>
```

#### Replace Solid Cards with Glass

**Before**
```jsx
<Card className="max-w-md bg-card shadow">
```

**After**
```jsx
<div className="onboarding-card">
  {/* Glass + blur */}
</div>
```

#### Add the Title Stack + Preview Pill

**Before**
```jsx
<h1 className="text-4xl font-bold">Welcome</h1>
```

**After**
```jsx
<div className="title-container">
  <h1 className="main-title">Antigravity Browser Control</h1>
  <p className="preview-pill">Preview</p>
</div>
<h2 className="hero-title">Getting Started</h2>
```

#### Layer Narrative Sections

```jsx
<p className="informational-text">...</p>
<div className="workflow-section">...</div>
<div className="use-cases-section">...</div>
```

- Never skip the workflow column or use-case grid; they reinforce the Antigravity storytelling arc.

#### Introduce Copy + CTA Micro-Interactions

- Replace static code blocks with `.copy-on-click`.
- Upgrade CTAs to `.cta-button` with the `ArrowRight` icon and hover translation.
- Use shadcn form primitives and wrap the `Dialog`/`Sheet` content with `.glass-card` classes.

---

## Component Examples

### Antigravity Browser Control Screen

```tsx
import AnimatedBackground from '@/components/AnimatedBackground';
import { Button } from '@/components/ui/button';
import { ArrowRight, MonitorPlay, ShieldCheck, Gauge, Repeat2 } from 'lucide-react';

const useCases = [
  { icon: MonitorPlay, tint: 'icon-blue', text: 'Iterating on website designs and implementations' },
  { icon: ShieldCheck, tint: 'icon-green', text: 'Quality assurance testing' },
  { icon: Gauge, tint: 'icon-yellow', text: 'Monitoring dashboards' },
  { icon: Repeat2, tint: 'icon-red', text: 'Automating routine tasks like rerunning CI' }
] as const;

export default function BrowserOnboarding() {
  const handleCopy = () => navigator.clipboard.writeText('npm run antigravity');

  return (
    <>
      <AnimatedBackground variant="antigravity" />

      <div className="landing-container">
        <div className="onboarding-card">
          <div className="icon-container">
            <img src="/antigravity.svg" alt="Antigravity" className="browser-icon" />
          </div>

          <p className="welcome-text">Welcome to</p>

          <div className="title-container">
            <h1 className="main-title">Antigravity Browser Control</h1>
            <p className="preview-pill">Preview</p>
          </div>

          <hr className="title-divider" />

          <h2 className="hero-title">Getting Started</h2>

          <p className="informational-text">
            The agent can click, scroll, type, and navigate web pages automatically. While working,
            it displays an overlay showing its progress and provides controls to stop execution if you
            need to intervene.
          </p>

          <div className="workflow-section">
            <p className="workflow-description">
              Simply return to your Antigravity conversation, and the browser will be used automatically
              when appropriate.
            </p>
          </div>

          <div className="use-cases-section">
            <h3 className="section-heading">Example Use Cases</h3>
            <div className="use-cases-grid">
              {useCases.map(({ icon: Icon, tint, text }) => (
                <div className="use-case-card" key={text}>
                  <Icon className={`use-case-icon ${tint}`} />
                  <span className="use-case-text">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="action-section">
            <p className="description">
              Stay in the Antigravity conversation and we will surface the browser automatically
              whenever the workflow calls for it.
            </p>
            <Button className="cta-button">
              Continue
              <ArrowRight className="arrow-icon" />
            </Button>
          </div>

          <button className="copy-on-click mt-4" onClick={handleCopy}>
            npm run antigravity
          </button>
        </div>
      </div>
    </>
  );
}
```

---

## Resources

### Design System Files

- **Main CSS**: `/src/styles/design-system.css`
- **MUI Theme**: `/src/theme/theme.ts`
- **Tailwind Config**: `/tailwind.config.ts`
- **Animated Background**: `/src/components/AnimatedBackground.tsx`
- **Reference Layout**: `docs/DESIGN_SYSTEM.md` (this guide)
- **shadcn/ui Components**: `/components/ui/*` (generated via `npx shadcn@latest add ...`)

### Inspiration

- **Antigravity Pack (`browser.css`)**: Source of gradients, pills, and iconography
- **VSCode Onboarding**: Additional reference for blur + neon cards
- **Linear + Vercel**: Typographic rhythm and motion polish
- **UI Glass Generator**: Recreate exact blur/saturate settings when new cards are needed

### Support

For questions about the design system:
1. Check this documentation first
2. Review the Antigravity Browser Control mock (HTML + CSS shared with the team)
3. Inspect `/components/ui/*` and `/src/styles/design-system.css` for component + token definitions
4. Reference https://ui.shadcn.com for component APIs and usage notes
5. Ask in team chat or create an issue with screenshots of any deviations

---

**Document Version:** 3.1 "Antigravity"
**Last Updated:** November 22, 2025
**Author:** Eryxon Development Team
**Status:** ✅ Active - Dark Mode Only
