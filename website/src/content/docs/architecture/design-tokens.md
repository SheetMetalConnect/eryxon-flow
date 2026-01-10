---
title: "Design Tokens"
description: "Typography, color palette, and animations"
---

See also: [Design Components](/architecture/design-components/), [Design Principles](/architecture/design-principles/)

## Typography

Use **Inter** blended with the system stack for a crisp, modern UI.

### Type Scale

| Level | Size | Weight | Use Case |
|-------|------|--------|----------|
| **H1** | 2.25rem (36px) | 700 | Page titles |
| **H2** | 1.875rem (30px) | 700 | Section headings |
| **H3** | 1.5rem (24px) | 600 | Card titles |
| **Body1** | 1rem (16px) | 400 | Standard text |
| **Caption** | 0.75rem (12px) | 400 | Metadata |

---

## Color Palette

### Ambient Background
- **Surface Base**: `#111927` (Deep Navy)
- **Primary Accent**: Dodger Blue (`#1e90ff`)
- **Secondary Accent**: Light Blue (`#4a9eff`)

### Semantic Colors
- **Success**: Green (`#34a853`)
- **Warning**: Yellow (`#fbbc05`)
- **Error**: Red (`#ea4335`)
- **Info**: Cyan (`#0891b2`)

### Manufacturing Status Colors
- **Active**: Yellow (timing active)
- **Completed**: Green
- **On-Hold**: Orange
- **Blocked**: Red
- **Pending**: Gray

---

## Spacing & Radius

### Compact Spacing Scale
| Token | Value | Use Case |
|-------|-------|----------|
| `--space-sm` | 4px | Tight spacing |
| `--space-base` | 8px | Default gaps |
| `--space-md` | 12px | Section spacing |
| `--space-lg` | 16px | Large gaps |

### Border Radius
- **Small elements**: 4px
- **Buttons/Inputs**: 6px
- **Cards**: 8px
- **Modals**: 10px

---

## Animations

### Gradient Orbs
Background orbs use a 20s float cycle for organic parallax.

```css
@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -30px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
}
```

### Fade In Up
Standard entrance for cards and interactive surfaces.
```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
```
