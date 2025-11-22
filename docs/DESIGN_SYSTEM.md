# Eryxon Flow Design System

**Modern dark-first design system for manufacturing execution**

Version: 3.0
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

The Eryxon Flow design system is a **modern, dark-first** UI framework built for manufacturing professionals. Inspired by industry-leading design systems (VSCode, Linear, Vercel), it combines:

- **Glass Morphism**: Beautiful depth with backdrop blur effects
- **Animated Backgrounds**: Floating gradient orbs for visual interest
- **Dark Mode Only**: Optimized for reduced eye strain in manufacturing environments
- **Touch-Optimized**: 44px+ touch targets for tablet use on the shop floor
- **Consistent Styling**: No hardcoded values - everything uses design tokens

### Technology Stack

- **CSS Framework**: Tailwind CSS + CSS Custom Properties
- **UI Components**: shadcn/ui (base primitives)
- **Complex Components**: Material-UI v7 (DataGrid, DatePickers)
- **Typography**: Inter font family
- **Styling Approach**: Dark mode only, glass morphism, animated backgrounds

---

## Design Philosophy

### "The Simple MES You Love to Use"

Our tagline drives every design decision:

1. **Simple**: Clean interfaces without unnecessary complexity
2. **Beautiful**: Modern aesthetics that delight users
3. **Functional**: Touch-optimized for real manufacturing workflows
4. **Professional**: Enterprise-grade appearance and reliability

### Dark Mode Only

We've removed light mode support to focus on the best possible dark theme experience:

- **Reduced Eye Strain**: Deep blacks (#0a0a0a) for comfortable all-day use
- **Better Contrast**: Carefully calibrated for WCAG AA compliance
- **Modern Aesthetic**: Professional appearance matching industry standards
- **Manufacturing Focus**: Optimized for dimly-lit shop floor environments

### Key Principles

- **No Hardcoded Values**: All colors, spacing, and sizing use design tokens
- **Glass Morphism**: Backdrop blur and transparency create depth
- **Smooth Animations**: GPU-accelerated transforms for 60fps performance
- **Consistent Roundings**: Modern rounded corners throughout (8px-24px)

---

## Getting Started

### Design System Files

```
src/styles/design-system.css  ← All design tokens and base styles
src/theme/theme.ts            ← Material-UI theme configuration
tailwind.config.ts            ← Tailwind CSS configuration
src/components/AnimatedBackground.tsx  ← Background animation
```

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

---

## Typography

### Font Family: Inter

**Why Inter?**
- Superior on-screen legibility
- Excellent character distinction (1, l, I clearly different)
- Optimized for small sizes
- Industry standard for modern SaaS applications

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

### Brand Colors

#### Primary: Dodger Blue
```css
--brand-primary: 211 100% 56%  /* #1e90ff */
```
- **Use**: Primary buttons, links, interactive elements
- **Character**: Modern, tech-forward, energetic
- **Contrast**: Excellent on dark backgrounds

#### Accent: Light Blue
```css
--brand-primary-light: 211 100% 64%  /* #4a9eff */
```
- **Use**: Hover states, active elements, gradients
- **Character**: Vibrant, approachable
- **Contrast**: High visibility on dark surfaces

### Background Colors

```css
--color-black: 0 0% 4%           /* #0a0a0a - Deep black */
--color-dark-surface: 0 0% 8%    /* #141414 - Card surface */
--color-dark-elevated: 0 0% 12%  /* #1f1f1f - Elevated surface */
```

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

### Glass Morphism Colors

```css
--glass-background: 0 0% 8% / 0.7      /* Semi-transparent dark */
--glass-border: 0 0% 100% / 0.1        /* Translucent white */
--glass-blur: 20px
--glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.4)
```

### Gradient Orbs (Animated Backgrounds)

```css
--gradient-blue: 211 100% 56% / 0.4    /* Blue orb */
--gradient-yellow: 45 100% 51% / 0.3   /* Yellow orb */
--gradient-green: 140 60% 52% / 0.3    /* Green orb */
```

---

## Components

### Glass Morphism Card

The signature component of the design system - used for all auth screens and modals.

**CSS Class:**
```css
.glass-card {
  background: hsl(var(--glass-background));
  backdrop-filter: blur(var(--glass-blur));
  border: 1px solid hsl(var(--glass-border));
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-glass);
}
```

**Usage:**
```jsx
<div className="glass-card p-8">
  <h2>Beautiful Card</h2>
  <p>Content with backdrop blur</p>
</div>
```

### Onboarding Card

Special glass card for auth and onboarding flows.

**CSS Class:**
```css
.onboarding-card {
  background: hsl(var(--glass-background));
  backdrop-filter: blur(20px);
  border: 1px solid hsl(var(--glass-border));
  border-radius: 24px;
  padding: 1rem 2.5rem 2rem;
  max-width: 520px;
  box-shadow: var(--shadow-glass);
  animation: fadeInUp 0.8s ease-out;
}
```

**Usage:**
```jsx
<div className="onboarding-card">
  <h1 className="hero-title">Eryxon Flow</h1>
  <p>The simple MES you love to use</p>
  {/* Form content */}
</div>
```

### Hero Title with Gradient

Gradient text used for main headings.

**CSS Class:**
```css
.hero-title {
  font-size: 1.75rem;
  font-weight: 600;
  background: linear-gradient(135deg,
    hsl(var(--brand-primary)),
    hsl(var(--brand-primary-light)),
    hsl(var(--color-warning))
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

**Usage:**
```jsx
<h1 className="hero-title">Welcome to Eryxon Flow</h1>
```

### CTA Button

Primary call-to-action button with gradient and animation.

**CSS Class:**
```css
.cta-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.25rem;
  background: linear-gradient(135deg,
    hsl(var(--brand-primary)),
    hsl(var(--brand-primary-light))
  );
  border-radius: var(--radius-base);
  box-shadow: 0 2px 8px hsl(var(--brand-primary) / 0.3);
  transition: all 0.2s ease;
}

.cta-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px hsl(var(--brand-primary) / 0.4);
}
```

**Usage:**
```jsx
<Button className="cta-button">
  Sign In
  <ArrowRight className="ml-2 h-4 w-4" />
</Button>
```

### Animated Background

Floating gradient orbs that create depth and visual interest.

**Component:**
```jsx
import AnimatedBackground from '@/components/AnimatedBackground';

// Use at root of page/layout
<>
  <AnimatedBackground />
  <div className="relative">
    {/* Your content */}
  </div>
</>
```

**Features:**
- Three floating orbs (blue, yellow, green)
- 20-second smooth animation with scale and position changes
- 80px blur for soft, dreamy appearance
- GPU-accelerated (transform only, no layout shifts)
- Zero performance impact

### Title Divider

Gradient horizontal rule for section breaks.

**CSS Class:**
```css
.title-divider {
  border: none;
  height: 1px;
  background: linear-gradient(90deg,
    transparent 0%,
    hsl(var(--brand-primary) / 0.3) 50%,
    transparent 100%
  );
}
```

**Usage:**
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

1. **Use Design Tokens**
   ```jsx
   // Good
   <div className="bg-background text-foreground rounded-xl p-6">

   // Bad
   <div style={{ background: '#0a0a0a', padding: '24px' }}>
   ```

2. **Use Semantic Color Names**
   ```jsx
   // Good
   <Badge className="bg-status-active">Active</Badge>

   // Bad
   <Badge className="bg-yellow-500">Active</Badge>
   ```

3. **Use Glass Morphism for Modals**
   ```jsx
   // Good
   <div className="glass-card">

   // Bad
   <Card className="bg-gray-900">
   ```

4. **Include Animated Background**
   ```jsx
   // Good - Auth/onboarding pages
   <>
     <AnimatedBackground />
     <div className="relative">...</div>
   </>
   ```

5. **Use Gradient Text for Heroes**
   ```jsx
   // Good
   <h1 className="hero-title">Eryxon Flow</h1>

   // Bad
   <h1 className="text-4xl text-blue-500">Eryxon Flow</h1>
   ```

### ❌ Don't

1. **Don't Hardcode Colors**
   ```jsx
   // Wrong
   style={{ color: '#1e90ff' }}

   // Right
   className="text-primary"
   ```

2. **Don't Mix Light Mode Classes**
   ```jsx
   // Wrong
   className="bg-white dark:bg-black"

   // Right (dark mode only)
   className="bg-background"
   ```

3. **Don't Use Arbitrary Values**
   ```jsx
   // Wrong
   className="p-[23px] rounded-[13px]"

   // Right
   className="p-6 rounded-xl"
   ```

4. **Don't Skip Animations**
   ```jsx
   // Wrong
   <div>Static card</div>

   // Right
   <div className="animate-fade-in-up">Smooth entrance</div>
   ```

### Accessibility

✅ **Color Contrast**
- All text meets WCAG AA minimum (4.5:1 for normal, 3:1 for large)
- Status colors distinguishable for colorblind users

✅ **Touch Targets**
- Minimum 44x44px for all interactive elements
- 48x48px recommended for comfortable use

✅ **Keyboard Navigation**
- All interactive elements keyboard accessible
- Visible focus indicators
- Logical tab order

---

## Migration Guide

### From Old Design System

#### Remove Light Mode References

**Before:**
```jsx
<div className="bg-white dark:bg-black">
```

**After:**
```jsx
<div className="bg-background">
```

#### Update Card Styling

**Before:**
```jsx
<Card className="max-w-md bg-card">
```

**After:**
```jsx
<div className="onboarding-card">
```

#### Add Animated Backgrounds

**Before:**
```jsx
<div className="min-h-screen bg-background">
```

**After:**
```jsx
<>
  <AnimatedBackground />
  <div className="relative min-h-screen">
</>
```

#### Use Gradient Titles

**Before:**
```jsx
<h1 className="text-4xl font-bold text-primary">
  Welcome to Eryxon
</h1>
```

**After:**
```jsx
<h1 className="hero-title">
  Welcome to Eryxon Flow
</h1>
```

#### Update Button Styling

**Before:**
```jsx
<Button className="w-full" variant="default">
  Sign In
</Button>
```

**After:**
```jsx
<Button className="w-full cta-button">
  Sign In
  <ArrowRight className="ml-2 h-4 w-4 arrow-icon" />
</Button>
```

---

## Component Examples

### Complete Auth Screen

```tsx
import AnimatedBackground from '@/components/AnimatedBackground';
import { Factory, ArrowRight } from 'lucide-react';

export default function Auth() {
  return (
    <>
      <AnimatedBackground />

      <div className="relative min-h-screen flex items-start justify-center p-8 pt-20">
        <div className="onboarding-card">
          {/* Icon */}
          <div className="inline-flex items-center justify-center mb-4">
            <Factory className="w-12 h-12 text-primary" strokeWidth={1.5} />
          </div>

          {/* Welcome Text */}
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">
            Welcome to
          </p>

          {/* Hero Title */}
          <h1 className="hero-title">
            Eryxon Flow
          </h1>

          {/* Tagline */}
          <p className="text-base text-foreground/80 mb-6">
            The simple MES you love to use
          </p>

          {/* Divider */}
          <hr className="title-divider" />

          {/* Form */}
          <form className="space-y-4">
            <Input placeholder="Email" />
            <Input type="password" placeholder="Password" />

            <Button className="w-full cta-button">
              Sign In
              <ArrowRight className="ml-2 h-4 w-4 arrow-icon" />
            </Button>
          </form>
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

### Inspiration

- **VSCode Onboarding**: Modern glass morphism and gradients
- **Linear**: Clean typography and spacing
- **Vercel**: Smooth animations and dark aesthetics
- **Stripe**: Professional color usage and consistency

### Support

For questions about the design system:
1. Check this documentation first
2. Review component examples in auth screens
3. Check `/src/styles/design-system.css` for all tokens
4. Ask in team chat or create an issue

---

**Document Version:** 3.0
**Last Updated:** November 22, 2025
**Author:** Eryxon Development Team
**Status:** ✅ Active - Dark Mode Only
